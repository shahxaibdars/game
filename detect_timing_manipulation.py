#!/usr/bin/env python3
"""
Timing Manipulation Detection Script for Memorix Game

This script analyzes the dataset for timing manipulation attacks including:
- Front-running
- Timestamp manipulation
- Sandwich attacks
- MEV exploitation
- Daily challenge boundary exploitation
- Coordinated batch timing

Usage:
    python3 detect_timing_manipulation.py [--dataset dataset.csv] [--threshold 0.8]
"""

import pandas as pd
import numpy as np
import argparse
from datetime import datetime
import json

class TimingManipulationDetector:
    def __init__(self, dataset_path='dataset.csv', threshold=0.8):
        self.dataset_path = dataset_path
        self.threshold = threshold
        self.df = None
        self.suspicious_rounds = []
        
    def load_data(self):
        """Load dataset and filter timing-related features"""
        try:
            self.df = pd.read_csv(self.dataset_path)
            print(f"✅ Loaded {len(self.df)} rounds from {self.dataset_path}")
            
            # Filter out rows where timing features are 'NA'
            timing_features = [
                'tx_submission_timestamp', 'block_timestamp', 'block_number',
                'submission_to_block_delay_ms', 'gas_price_used', 'tx_position_in_block'
            ]
            
            # Convert 'NA' to NaN for easier filtering
            for col in timing_features:
                if col in self.df.columns:
                    self.df[col] = pd.to_numeric(self.df[col], errors='coerce')
            
            # Count rounds with blockchain data
            rounds_with_blockchain = self.df[timing_features].notna().all(axis=1).sum()
            print(f"📊 {rounds_with_blockchain} rounds have complete blockchain timing data")
            
            return True
        except FileNotFoundError:
            print(f"❌ Error: Dataset file '{self.dataset_path}' not found")
            return False
        except Exception as e:
            print(f"❌ Error loading dataset: {e}")
            return False
    
    def detect_front_running(self):
        """Detect front-running attacks based on gas price and position"""
        if 'is_front_run_candidate' not in self.df.columns:
            return []
        
        # Convert is_front_run_candidate to numeric
        self.df['is_front_run_candidate'] = pd.to_numeric(
            self.df['is_front_run_candidate'], errors='coerce'
        )
        
        suspicious = self.df[
            (self.df['is_front_run_candidate'] == 1) &
            (pd.to_numeric(self.df['tx_position_in_block'], errors='coerce') < 3) &
            (pd.to_numeric(self.df['similar_tx_in_same_block'], errors='coerce') > 1)
        ]
        
        results = []
        for idx, row in suspicious.iterrows():
            results.append({
                'round_id': row['round_id'],
                'player_address': row['player_address'],
                'attack_type': 'FRONT_RUNNING',
                'confidence': 0.95,
                'evidence': {
                    'gas_price_vs_median': row.get('gas_price_vs_network_median', 'NA'),
                    'tx_position': row.get('tx_position_in_block', 'NA'),
                    'similar_tx_count': row.get('similar_tx_in_same_block', 'NA')
                }
            })
        
        print(f"🔴 Front-Running: {len(results)} suspicious rounds detected")
        return results
    
    def detect_timestamp_manipulation(self):
        """Detect timestamp manipulation attacks"""
        if 'block_timestamp_vs_system_time_diff' not in self.df.columns:
            return []
        
        # Convert to numeric
        self.df['block_timestamp_vs_system_time_diff'] = pd.to_numeric(
            self.df['block_timestamp_vs_system_time_diff'], errors='coerce'
        )
        self.df['is_near_day_boundary'] = pd.to_numeric(
            self.df['is_near_day_boundary'], errors='coerce'
        )
        
        # Timestamp diff > 10 seconds AND near day boundary
        suspicious = self.df[
            (self.df['block_timestamp_vs_system_time_diff'] > 10000) &
            (self.df['is_near_day_boundary'] == 1)
        ]
        
        results = []
        for idx, row in suspicious.iterrows():
            results.append({
                'round_id': row['round_id'],
                'player_address': row['player_address'],
                'attack_type': 'TIMESTAMP_MANIPULATION',
                'confidence': 0.88,
                'evidence': {
                    'timestamp_diff_ms': row['block_timestamp_vs_system_time_diff'],
                    'near_boundary': bool(row['is_near_day_boundary']),
                    'completion_hour': row.get('daily_challenge_completion_time_of_day', 'NA')
                }
            })
        
        print(f"🔴 Timestamp Manipulation: {len(results)} suspicious rounds detected")
        return results
    
    def detect_sandwich_attacks(self):
        """Detect sandwich attacks on daily challenges"""
        if 'similar_tx_in_same_block' not in self.df.columns:
            return []
        
        self.df['similar_tx_in_same_block'] = pd.to_numeric(
            self.df['similar_tx_in_same_block'], errors='coerce'
        )
        self.df['gas_price_vs_network_median'] = pd.to_numeric(
            self.df['gas_price_vs_network_median'], errors='coerce'
        )
        
        # Multiple similar tx in block + high gas price
        suspicious = self.df[
            (self.df['similar_tx_in_same_block'] > 2) &
            (self.df['gas_price_vs_network_median'] > 2.0)
        ]
        
        results = []
        for idx, row in suspicious.iterrows():
            results.append({
                'round_id': row['round_id'],
                'player_address': row['player_address'],
                'attack_type': 'SANDWICH_ATTACK',
                'confidence': 0.82,
                'evidence': {
                    'similar_tx_count': row['similar_tx_in_same_block'],
                    'gas_price_ratio': row['gas_price_vs_network_median'],
                    'block_number': row.get('block_number', 'NA')
                }
            })
        
        print(f"🔴 Sandwich Attacks: {len(results)} suspicious rounds detected")
        return results
    
    def detect_mev_exploitation(self):
        """Detect MEV bot exploitation"""
        if 'submission_to_block_delay_ms' not in self.df.columns:
            return []
        
        self.df['submission_to_block_delay_ms'] = pd.to_numeric(
            self.df['submission_to_block_delay_ms'], errors='coerce'
        )
        self.df['tx_position_in_block'] = pd.to_numeric(
            self.df['tx_position_in_block'], errors='coerce'
        )
        self.df['gas_price_vs_network_median'] = pd.to_numeric(
            self.df['gas_price_vs_network_median'], errors='coerce'
        )
        
        # Suspiciously fast inclusion + first position + high gas
        suspicious = self.df[
            (self.df['submission_to_block_delay_ms'] < 200) &
            (self.df['tx_position_in_block'] == 0) &
            (self.df['gas_price_vs_network_median'] > 3.0)
        ]
        
        results = []
        for idx, row in suspicious.iterrows():
            results.append({
                'round_id': row['round_id'],
                'player_address': row['player_address'],
                'attack_type': 'MEV_EXPLOITATION',
                'confidence': 0.91,
                'evidence': {
                    'block_delay_ms': row['submission_to_block_delay_ms'],
                    'tx_position': row['tx_position_in_block'],
                    'gas_price_ratio': row['gas_price_vs_network_median']
                }
            })
        
        print(f"🔴 MEV Exploitation: {len(results)} suspicious rounds detected")
        return results
    
    def detect_day_boundary_exploitation(self):
        """Detect daily challenge day boundary exploitation"""
        if 'daily_challenge_completion_time_of_day' not in self.df.columns:
            return []
        
        self.df['daily_challenge_completion_time_of_day'] = pd.to_numeric(
            self.df['daily_challenge_completion_time_of_day'], errors='coerce'
        )
        self.df['block_timestamp_vs_system_time_diff'] = pd.to_numeric(
            self.df['block_timestamp_vs_system_time_diff'], errors='coerce'
        )
        
        # Completion near midnight with large timestamp diff
        suspicious = self.df[
            ((self.df['daily_challenge_completion_time_of_day'] < 0.1) | 
             (self.df['daily_challenge_completion_time_of_day'] > 23.9)) &
            (self.df['block_timestamp_vs_system_time_diff'] > 30000)
        ]
        
        results = []
        for idx, row in suspicious.iterrows():
            results.append({
                'round_id': row['round_id'],
                'player_address': row['player_address'],
                'attack_type': 'DAY_BOUNDARY_EXPLOITATION',
                'confidence': 0.87,
                'evidence': {
                    'completion_hour': row['daily_challenge_completion_time_of_day'],
                    'timestamp_diff_ms': row['block_timestamp_vs_system_time_diff'],
                    'round_type': row.get('round_type', 'NA')
                }
            })
        
        print(f"🔴 Day Boundary Exploitation: {len(results)} suspicious rounds detected")
        return results
    
    def detect_batch_timing_attacks(self):
        """Detect coordinated batch timing attacks"""
        results = []
        
        # Group by player and look for batch patterns
        for player, group in self.df.groupby('player_address'):
            if len(group) < 3:
                continue
            
            # Check for similar tx in same block across multiple rounds
            batch_rounds = group[
                pd.to_numeric(group['similar_tx_in_same_block'], errors='coerce') > 3
            ]
            
            if len(batch_rounds) >= 2:
                results.append({
                    'player_address': player,
                    'attack_type': 'BATCH_TIMING',
                    'confidence': 0.79,
                    'evidence': {
                        'batch_round_count': len(batch_rounds),
                        'round_ids': batch_rounds['round_id'].tolist()[:5]  # First 5
                    }
                })
        
        print(f"🔴 Batch Timing Attacks: {len(results)} suspicious players detected")
        return results
    
    def analyze_player_timing_patterns(self):
        """Analyze timing patterns per player"""
        player_stats = []
        
        for player, group in self.df.groupby('player_address'):
            if len(group) < 2:
                continue
            
            # Calculate timing statistics
            gas_prices = pd.to_numeric(group['gas_price_vs_network_median'], errors='coerce').dropna()
            tx_positions = pd.to_numeric(group['tx_position_in_block'], errors='coerce').dropna()
            
            if len(gas_prices) == 0:
                continue
            
            stats = {
                'player_address': player,
                'total_rounds': len(group),
                'avg_gas_ratio': gas_prices.mean(),
                'max_gas_ratio': gas_prices.max(),
                'avg_tx_position': tx_positions.mean() if len(tx_positions) > 0 else 'NA',
                'front_run_count': (gas_prices > 1.5).sum(),
                'suspicious_score': 0
            }
            
            # Calculate suspicion score
            if stats['avg_gas_ratio'] > 2.0:
                stats['suspicious_score'] += 0.3
            if stats['front_run_count'] > 2:
                stats['suspicious_score'] += 0.4
            if stats['avg_tx_position'] < 5:
                stats['suspicious_score'] += 0.3
            
            if stats['suspicious_score'] >= self.threshold:
                player_stats.append(stats)
        
        return sorted(player_stats, key=lambda x: x['suspicious_score'], reverse=True)
    
    def generate_report(self):
        """Generate comprehensive timing manipulation report"""
        print("\n" + "="*80)
        print("⚠️  TIMING MANIPULATION DETECTION REPORT")
        print("="*80 + "\n")
        
        # Run all detection methods
        all_detections = []
        all_detections.extend(self.detect_front_running())
        all_detections.extend(self.detect_timestamp_manipulation())
        all_detections.extend(self.detect_sandwich_attacks())
        all_detections.extend(self.detect_mev_exploitation())
        all_detections.extend(self.detect_day_boundary_exploitation())
        all_detections.extend(self.detect_batch_timing_attacks())
        
        # Player analysis
        print("\n📊 Player Timing Pattern Analysis:")
        print("-" * 80)
        suspicious_players = self.analyze_player_timing_patterns()
        
        if suspicious_players:
            for i, player in enumerate(suspicious_players[:10], 1):  # Top 10
                print(f"{i}. {player['player_address'][:10]}... | "
                      f"Rounds: {player['total_rounds']} | "
                      f"Avg Gas Ratio: {player['avg_gas_ratio']:.2f} | "
                      f"Suspicion: {player['suspicious_score']:.2f}")
        else:
            print("✅ No suspicious timing patterns detected in player behavior")
        
        # Summary
        print("\n" + "="*80)
        print("📈 SUMMARY")
        print("="*80)
        print(f"Total rounds analyzed: {len(self.df)}")
        print(f"Total suspicious activities detected: {len(all_detections)}")
        print(f"Players with suspicious timing patterns: {len(suspicious_players)}")
        
        # Attack breakdown
        attack_types = {}
        for detection in all_detections:
            attack_type = detection.get('attack_type', 'UNKNOWN')
            attack_types[attack_type] = attack_types.get(attack_type, 0) + 1
        
        print("\nAttack Type Breakdown:")
        for attack_type, count in sorted(attack_types.items(), key=lambda x: x[1], reverse=True):
            print(f"  - {attack_type}: {count}")
        
        # Save detailed report
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_rounds': len(self.df),
            'detections': all_detections,
            'suspicious_players': suspicious_players,
            'summary': {
                'total_suspicious': len(all_detections),
                'attack_breakdown': attack_types
            }
        }
        
        report_file = 'timing_manipulation_report.json'
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\n💾 Detailed report saved to: {report_file}")
        print("="*80 + "\n")
        
        return report

def main():
    parser = argparse.ArgumentParser(description='Detect timing manipulation in Memorix game')
    parser.add_argument('--dataset', default='dataset.csv', help='Path to dataset CSV file')
    parser.add_argument('--threshold', type=float, default=0.8, 
                       help='Suspicion threshold (0.0-1.0)')
    
    args = parser.parse_args()
    
    detector = TimingManipulationDetector(args.dataset, args.threshold)
    
    if detector.load_data():
        detector.generate_report()

if __name__ == '__main__':
    main()

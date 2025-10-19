# Memorix Anti-Cheat System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MEMORIX GAME FRONTEND                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Mouse Track  │  │ Click Track  │  │ Timing Track │  │ Device Info  │   │
│  │ (x,y,speed)  │  │ (pos,time)   │  │ (reactions)  │  │ (fingerprint)│   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
└─────────┼──────────────────┼──────────────────┼──────────────────┼──────────┘
          │                  │                  │                  │
          └──────────────────┴──────────────────┴──────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND SERVER (server.js)                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     extractFeatures() Function                         │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐ │  │
│  │  │ Behavioral   │  │ Multi-Account│  │ Timing Manipulation          │ │  │
│  │  │ Features     │  │ Sybil        │  │ Detection                    │ │  │
│  │  │ (40 real-time│  │ Features     │  │ (27 blockchain timing)       │ │  │
│  │  │  80 post-proc│  │ (28 features)│  │ ┌─────────────────────────┐  │ │  │
│  │  │              │  │              │  │ │ Gas Price Analysis      │  │ │  │
│  │  │ - Reaction   │  │ - Device Hash│  │ │ Block Timestamp Check   │  │ │  │
│  │  │ - Mouse Move │  │ - IP Sharing │  │ │ Transaction Position    │  │ │  │
│  │  │ - Click Pat. │  │ - Graph Dist.│  │ │ Mempool Wait Time       │  │ │  │
│  │  │ - Session    │  │ - Reward Flow│  │ │ Day Boundary Check      │  │ │  │
│  │  └──────────────┘  └──────────────┘  │ └─────────────────────────┘  │ │  │
│  │                                       └──────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                      │                                       │
│                                      ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     Dataset Logging (147 Features)                     │  │
│  │                         dataset.csv (Append Row)                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       BLOCKCHAIN INTERACTION LAYER                           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     Smart Contract Recording                           │  │
│  │  ┌──────────────────────┐         ┌──────────────────────────────┐    │  │
│  │  │ MemorixGame.sol      │         │ Timing Data Capture          │    │  │
│  │  │ - recordInfiniteRound│    →    │ - Tx Submission Timestamp    │    │  │
│  │  │ - recordDailyChallenge│   →    │ - Block Data (number, hash)  │    │  │
│  │  │ - updateLeaderboard  │    →    │ - Gas Price Analysis         │    │  │
│  │  └──────────────────────┘         │ - Miner Address              │    │  │
│  │                                    │ - Transaction Position       │    │  │
│  │                                    │ - Similar Tx in Block Count  │    │  │
│  │                                    └──────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DETECTION & ANALYSIS LAYER                           │
│  ┌──────────────────────────────┐  ┌──────────────────────────────────────┐ │
│  │ Real-Time Detection Script   │  │ Batch Analysis Script                │ │
│  │ (detect_timing_manipulation) │  │ (Post-Processing Features)           │ │
│  │                              │  │                                      │ │
│  │ ┌────────────────────────┐   │  │ ┌──────────────────────────────────┐│ │
│  │ │ Front-Run Detector     │   │  │ │ Session Analysis                 ││ │
│  │ │ - Gas > 1.5x median?   │   │  │ │ - cv_reaction_time_across_rounds ││ │
│  │ │ - Position in block<3? │   │  │ │ - pattern_repetition_score       ││ │
│  │ └────────────────────────┘   │  │ │                                  ││ │
│  │                              │  │ │ Graph Analysis                   ││ │
│  │ ┌────────────────────────┐   │  │ │ - onchain_neighbor_stats         ││ │
│  │ │ Timestamp Manipulator  │   │  │ │ - transfer_graph_degree          ││ │
│  │ │ - Time diff > 10s?     │   │  │ │                                  ││ │
│  │ │ - Near day boundary?   │   │  │ │ Behavioral Clustering            ││ │
│  │ └────────────────────────┘   │  │ │ - device_info_hash clustering    ││ │
│  │                              │  │ │ - behavioral_hash_match_count    ││ │
│  │ ┌────────────────────────┐   │  │ └──────────────────────────────────┘│ │
│  │ │ MEV Exploiter          │   │  │                                      │ │
│  │ │ - Delay < 200ms?       │   │  │ Output: Post-processed dataset.csv   │ │
│  │ │ - First in block?      │   │  │         with all 147 features filled │ │
│  │ │ - Gas > 3x median?     │   │  └──────────────────────────────────────┘ │
│  │ └────────────────────────┘   │                                           │
│  │                              │                                           │
│  │ Output: JSON report with     │                                           │
│  │         flagged addresses    │                                           │
│  └──────────────────────────────┘                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MACHINE LEARNING MODEL (XGBoost)                     │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     Unified Anti-Cheat Classifier                      │  │
│  │                                                                        │  │
│  │  Input: 147 Features                                                  │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌───────────────────────┐   │  │
│  │  │ Behavioral (120│  │ Multi-Account  │  │ Timing Manipulation   │   │  │
│  │  │ features)      │  │ Sybil (28)     │  │ (27 features)         │   │  │
│  │  └────────────────┘  └────────────────┘  └───────────────────────┘   │  │
│  │                                                                        │  │
│  │  Model: XGBClassifier (Multi-Class)                                   │  │
│  │  ┌────────────────────────────────────────────────────────────────┐   │  │
│  │  │ Classes:                                                        │   │  │
│  │  │  - LEGITIMATE                                                  │   │  │
│  │  │  - UI_BOT                                                      │   │  │
│  │  │  - HEADLESS_BOT                                                │   │  │
│  │  │  - MULTI_ACCOUNT_FARMER                                        │   │  │
│  │  │  - FRONT_RUNNING                                               │   │  │
│  │  │  - TIMESTAMP_MANIPULATION                                      │   │  │
│  │  │  - MEV_EXPLOITATION                                            │   │  │
│  │  │  - SANDWICH_ATTACK                                             │   │  │
│  │  └────────────────────────────────────────────────────────────────┘   │  │
│  │                                                                        │  │
│  │  Feature Importance (Top 10):                                         │  │
│  │  1. gas_price_vs_network_median          (98% importance)            │  │
│  │  2. mean_reaction_time                   (96%)                       │  │
│  │  3. block_timestamp_vs_system_time_diff  (94%)                       │  │
│  │  4. cv_reaction_time_across_rounds       (91%)                       │  │
│  │  5. tx_position_in_block                 (89%)                       │  │
│  │  6. mouse_straightness_index             (87%)                       │  │
│  │  7. similar_tx_in_same_block             (85%)                       │  │
│  │  8. behavioral_hash_match_count          (83%)                       │  │
│  │  9. is_near_day_boundary                 (81%)                       │  │
│  │  10. pattern_repetition_score            (79%)                       │  │
│  │                                                                        │  │
│  │  Output: Prediction + Confidence Score                                │  │
│  │  Example: { class: 'FRONT_RUNNING', confidence: 0.94 }               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RESPONSE & ACTION LAYER                            │
│  ┌──────────────────────┐  ┌─────────────────┐  ┌──────────────────────┐   │
│  │ Automatic Actions    │  │ Admin Dashboard │  │ Investigation Queue  │   │
│  │                      │  │                 │  │                      │   │
│  │ Confidence > 0.95:   │  │ - Flagged users │  │ Confidence 0.7-0.95: │   │
│  │ → Block account      │  │ - Attack types  │  │ → Manual review      │   │
│  │ → Freeze rewards     │  │ - Evidence logs │  │ → Evidence collection│   │
│  │ → Alert admin        │  │ - ML scores     │  │ → Pattern analysis   │   │
│  └──────────────────────┘  └─────────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════

FEATURE BREAKDOWN:
┌────────────────────────────────────────────────────────────────────────────┐
│ Total Features: 147                                                        │
│                                                                            │
│ 1. Core Round Features (11) - Real-time                                   │
│ 2. Reaction Time Features (8) - Real-time                                 │
│ 3. Click Position Features (5) - Real-time                                │
│ 4. Mouse Movement Features (7) - Real-time                                │
│ 5. Device & Session Features (5) - Real-time                              │
│ 6. Verification & Label (3) - Real-time                                   │
│ 7. Cross-Round Analysis (80) - Post-processing                            │
│ 8. Multi-Account Sybil Detection (28) - Post-processing                   │
│ 9. Timing Manipulation Detection (27):                                    │
│    - Blockchain Timing (7) - Real-time                                    │
│    - Front-Running Detection (5) - Real-time                              │
│    - Daily Challenge Timing (6) - Real-time                               │
│    - Leaderboard & Reward Timing (9) - Post-processing                    │
└────────────────────────────────────────────────────────────────────────────┘

DETECTION CAPABILITIES:
┌────────────────────────────────────────────────────────────────────────────┐
│ ✅ Bot Detection:                                                          │
│    - UI Automation Bots                                                   │
│    - Headless Browser Bots                                                │
│    - OCR-based Bots                                                       │
│    - Stealthy/Adversarial Bots                                            │
│                                                                            │
│ ✅ Multi-Account Farming:                                                  │
│    - Same Device, Multiple Accounts                                       │
│    - Reward Consolidation                                                 │
│    - Coordinated Farming                                                  │
│    - Behavioral Cloning                                                   │
│    - Batch/Automated Play                                                 │
│                                                                            │
│ ✅ Timing Manipulation:                                                    │
│    - Front-Running                                                        │
│    - Back-Running                                                         │
│    - Sandwich Attacks                                                     │
│    - Block Timestamp Manipulation                                         │
│    - MEV Exploitation                                                     │
│    - Day Boundary Exploitation                                            │
│    - Leaderboard Timing Manipulation                                      │
└────────────────────────────────────────────────────────────────────────────┘

DATA FLOW:
1. Player plays round → Frontend captures telemetry
2. Submit to backend → extractFeatures() processes data
3. Record on blockchain → Capture timing data (gas, block, position)
4. Log to dataset.csv → 147 features per row
5. Detection script → Analyze timing patterns, flag suspicious
6. Post-processing → Fill cross-round/graph/behavioral features
7. XGBoost model → Classify attack type + confidence
8. Action taken → Block/flag/investigate based on score

═══════════════════════════════════════════════════════════════════════════════
```

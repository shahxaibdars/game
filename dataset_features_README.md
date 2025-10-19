
| Feature Name                           | Description                                                                | Bot Types Detected (most useful for)         |
|----------------------------------------|----------------------------------------------------------------------------|----------------------------------------------|
| total_rounds_in_session                | Total rounds played in current session                                     | Session bots, grinders                       |
| session_duration_total                 | Total time spent in current session                                        | Session bots, grinders                       |
| session_success_rate                   | Win rate in current session                                                | Session bots, grinders                       |
| session_avg_time_per_round             | Average round completion time in session                                   | Session bots, grinders                       |
| rounds_per_hour                        | Play frequency indicator                                                   | Session bots, grinders                       |
| session_pause_duration_total           | Total time between rounds in session                                       | Session bots, grinders                       |
| 24h_rounds_played                      | Rounds played in last 24 hours                                             | Schedule bots, time-based farming            |
| 7d_rounds_played                       | Rounds played in last 7 days                                               | Schedule bots, time-based farming            |
| 7d_avg_success_rate                    | Average success rate in last 7 days                                        | Schedule bots, time-based farming            |
| 7d_avg_steps                           | Average steps in last 7 days                                               | Schedule bots, time-based farming            |
| 7d_perfect_round_ratio                 | Proportion of perfect rounds in last 7 days                                | Schedule bots, time-based farming            |
| time_since_last_round_seconds          | Time since last round (seconds)                                            | Burst bots, batch play                       |
| time_since_first_round_hours           | Account age (hours since first round)                                      | New/old account abuse                        |
| trend_success_rate                     | Performance trend (improving/declining)                                    | Adaptive bots, learning bots                 |
| trend_reaction_time                    | Reaction time trend (improving/declining)                                  | Adaptive bots, learning bots                 |
| device_type                            | Device type (mobile/desktop/tablet)                                        | Device spoofing, bot farms                   |
| screen_resolution                      | Screen resolution dimensions                                               | Device spoofing, bot farms                   |
| browser_type                           | Browser type (Chrome, Firefox, etc.)                                       | Device spoofing, bot farms                   |
| os_type                                | Operating system type                                                      | Device spoofing, bot farms                   |
| is_mobile_device                       | Boolean flag for mobile device                                             | Device spoofing, bot farms                   |
| device_changes_count                   | How often device switches                                                  | Device spoofing, bot farms                   |
| unique_devices_7d                      | Device diversity in last 7 days                                            | Device spoofing, bot farms                   |
| mouse_straightness_index               | How direct are mouse movements                                             | Mouse bots, UI bots                          |
| mouse_curvature_avg                    | Average path curvature                                                     | Mouse bots, UI bots                          |
| mouse_jitter_ratio                     | Ratio of small erratic mouse movements                                     | Mouse bots, UI bots                          |
| mouse_overshoot_count                  | Overshooting targets then correcting                                       | Mouse bots, UI bots                          |
| mouse_ballistic_coefficient            | Human ballistic movement pattern                                           | Mouse bots, UI bots                          |
| mouse_idle_time_ratio                  | Proportion of time cursor is still                                         | Mouse bots, UI bots                          |
| click_anticipation_score               | Clicking before target fully appears                                       | Mouse bots, UI bots                          |
| click_accuracy_score                   | How close to optimal click positions                                       | UI bots, click bots                          |
| misclick_count                         | Clicks on wrong tiles                                                      | UI bots, click bots                          |
| double_click_count                     | Accidental double clicks                                                   | UI bots, click bots                          |
| click_rhythm_variance                  | Regularity of click timing                                                 | UI bots, click bots                          |
| click_hesitation_count                 | Pauses before clicking                                                     | UI bots, click bots                          |
| first_click_reaction_time              | Reaction to round start                                                    | UI bots, click bots                          |
| optimal_path_deviation                 | Deviation from optimal solution                                            | Strategic bots, learning bots                |
| backtrack_count                        | Clicking already-clicked tiles                                             | Strategic bots, learning bots                |
| exploration_pattern_score              | Systematic vs random approach                                              | Strategic bots, learning bots                |
| difficulty_adjustment_response         | Performance change with grid size                                          | Strategic bots, learning bots                |
| learning_curve_slope                   | Improvement rate over time                                                 | Strategic bots, learning bots                |
| z_score_reaction_time                  | How unusual reaction time is compared to player's history                  | Anomaly detection, outlier detection         |
| z_score_success_rate                   | How unusual success rate is compared to player's history                   | Anomaly detection, outlier detection         |
| outlier_round_ratio                    | Proportion of statistical outlier rounds                                   | Anomaly detection, outlier detection         |
| performance_volatility                 | Standard deviation of recent performance                                   | Anomaly detection, outlier detection         |
| consecutive_perfect_rounds             | Perfect rounds in a row                                                    | Sequence bots, batch play                    |
| consecutive_failed_rounds              | Failed rounds in a row                                                     | Sequence bots, batch play                    |
| win_streak_max                         | Longest win streak                                                         | Sequence bots, batch play                    |
| round_completion_rhythm                | Time between round completions                                             | Sequence bots, batch play                    |
| batch_playing_indicator                | Multiple rounds in rapid succession                                        | Sequence bots, batch play                    |
| perfect_to_total_ratio                 | Ratio of perfect rounds to total rounds                                    | Cross-feature, XGBoost                       |
| speed_to_accuracy_ratio                | Mean reaction time divided by correct steps                                | Cross-feature, XGBoost                       |
| mouse_efficiency                       | Mouse distance per step                                                    | Cross-feature, XGBoost                       |
| time_pressure_ratio                    | Time elapsed divided by time limit                                         | Cross-feature, XGBoost                       |
| cv_reaction_time_across_rounds         | Coefficient of variation of reaction time across rounds for a player       | Sophisticated bots, behavioral analysis      |
| cv_inter_click_interval_across_rounds  | Coefficient of variation of inter-click interval across rounds             | Sophisticated bots, behavioral analysis      |
| cv_mouse_speed_across_rounds           | Coefficient of variation of mouse speed across rounds for a player         | Sophisticated bots, behavioral analysis      |
| pattern_repetition_score               | Similarity score of click/move patterns across rounds                      | Scripted bots, replay attacks                |
| time_of_day_variance                   | Variance in the time of day the player plays                               | Bot farms, time-locked automation            |
| day_of_week_played                     | Day of week (categorical or one-hot) when round was played                 | Bot farms, human/bot schedule differences    |
# Memorix Dataset Features and Bot Detection Mapping

This document describes the features collected for each game round in Memorix, their meaning, and which types of bot/cheating they help detect.

---

## Dataset Logging Strategy: Click-Level Approach with Post-Processing Aggregation

### Design Decision: One Log Entry Per Click ✅

This dataset uses a **click-level logging approach**, where each row represents one individual click during gameplay. This raw granular data is then aggregated in post-processing to create round-level features for XGBoost training.

#### Why Click-Level Logging?

**1. Maximum Data Fidelity**
- Captures **every single click** with complete context
- No information loss - all raw behavioral data preserved
- Enables multiple aggregation strategies in post-processing
- Can create both click-level and round-level features

**2. Flexibility for Advanced Analysis**
- **Temporal sequence analysis**: Track click patterns over time
- **Mid-round behavior changes**: Detect adaptive bots that change tactics
- **Click-by-click anomalies**: Identify single suspicious clicks
- **Replay attack detection**: Compare exact click sequences across rounds
- **Future-proof**: Can apply LSTM/Transformer models if needed later

**3. Richer Feature Engineering**
- Aggregate as needed: Create `mean_reaction_time`, `std_reaction_time`, etc. from raw clicks
- Intra-round patterns: `first_half_vs_second_half_reaction_time`
- Sequential patterns: `click_N_to_click_N+1_interval_variance`
- Position tracking: `click_drift_from_optimal_path`
- Behavioral evolution: `early_click_speed_vs_late_click_speed`

**4. Post-Processing Aggregation for XGBoost**
- Raw CSV: One row per click (granular data)
- Processing script aggregates clicks into round-level features
- XGBoost input: One row per round with 149 aggregated features
- **Best of both worlds**: Granular logging + efficient ML training

**5. Dataset Size Considerations**
- Click-level: 10,000 rounds × 8 clicks/round = 80,000 rows (~120MB CSV)
- After aggregation: 10,000 rounds = 10,000 rows for XGBoost training
- Storage is cheap, but information loss is permanent
- Better to log granular and aggregate later than lose data

**6. Labeling Strategy**
- Each click inherits the round label (human/bot)
- Aggregation script groups clicks by `round_id`
- Final training dataset has one label per round
- Can also analyze click-level patterns within bot/human rounds

#### When Click-Level Logging is Superior

Click-level logging excels for:

- ✅ **Adaptive bots** that change behavior mid-round (detectable via click sequence analysis)
- ✅ **Hybrid attacks** where human starts and bot finishes (visible in click timing trends)
- ✅ **Replay attacks** where bots copy exact click sequences (detectable via pattern matching)
- ✅ **Fine-grained anomalies** like single bot-assisted clicks in otherwise human rounds
- ✅ **Sequential models** (LSTM/Transformer) for advanced detection in future

#### Aggregation Pipeline

**Raw Click Data (Logged):**
```csv
round_id, player_address, click_index, timestamp_ms, click_x, click_y, reaction_time_ms, mouse_speed, ...
round_001, 0xABC..., 1, 1696867200123, 150, 200, 234, 5.2, ...
round_001, 0xABC..., 2, 1696867200567, 300, 200, 444, 8.1, ...
round_001, 0xABC..., 3, 1696867200891, 150, 400, 324, 6.3, ...
...
```

**Aggregated Round Data (For XGBoost):**
```python
# Processing script groups by round_id
df_rounds = df_clicks.groupby('round_id').agg({
    'reaction_time_ms': ['mean', 'std', 'min', 'max', entropy],
    'mouse_speed': ['mean', 'std', 'max'],
    'click_x': ['mean', 'std'],
    # ... all 149 features
})
```

**Final Training Dataset:**
```csv
round_id, mean_reaction_time, std_reaction_time, mouse_move_count, label, ...
round_001, 334, 89, 42, human, ...
round_002, 156, 12, 8, ui_bot, ...
```

#### Alternative Approaches Comparison

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **One log per click** (NEW) | Max fidelity, flexible aggregation, future-proof | 8x storage, needs post-processing | ✅ **SELECTED** |
| One log per round | Smaller dataset, ready for ML | Loses granular patterns, info loss permanent | ❌ Rejected |
| One log per session | Captures multi-round patterns | Too coarse, misses individual round anomalies | ❌ Rejected |
| Hybrid (round + click logs) | Best of both worlds | Double maintenance, code complexity | ❌ Unnecessary with click-level |

#### Implementation Strategy

**Phase 1: Click-Level Logging (Current)**
- Log every click with all available features
- Store in `dataset_clicks.csv` (raw granular data)
- Each row = one click event

**Phase 2: Aggregation Script (Post-Processing)**
- Create `ai/scripts/aggregate_clicks_to_rounds.py`
- Group clicks by `round_id`
- Calculate 149 round-level features
- Output `dataset_rounds.csv` for XGBoost

**Phase 3: XGBoost Training**
- Load `dataset_rounds.csv` (aggregated data)
- Train on 149 features per round
- Predict: "Is this round legitimate or cheating?"

**Conclusion**: Click-level logging provides maximum flexibility and data fidelity. We can always aggregate clicks into rounds, but we can't reverse aggregation to recover individual clicks. This approach future-proofs the dataset for advanced detection techniques.

---

## 1. Core Round Features (Real-Time)

| Feature Name                | Description                                                      | Bot Types Detected (most useful for)         |
|----------------------------|------------------------------------------------------------------|----------------------------------------------|
| round_id                   | Unique round identifier                                          | All                                         |
| player_address             | Player's blockchain address                                      | All                                         |
| timestamp                  | ISO timestamp of round submission                               | All                                         |
| round_type                 | 'INFINITE' or 'DAILY_CHALLENGE'                                 | All                                         |
| grid_size                  | Size of the memory grid (e.g., 3 for 3x3)                       | All                                         |
| steps                      | Number of steps in the sequence                                 | All                                         |
| correct_steps              | Number of correct steps entered                                 | All                                         |
| time_elapsed_ms            | Total time taken for the round                                  | All                                         |
| time_limit_ms              | Time limit for the round                                        | All                                         |
| is_perfect                 | 1 if all steps correct and not timed out, else 0                | All                                         |
| time_expired               | 1 if round timed out, else 0                                    | All                                         |

## 2. Reaction Time & Click Timing Features (Real-Time)

| Feature Name                | Description                                                      | Bot Types Detected (most useful for)         |
|----------------------------|------------------------------------------------------------------|----------------------------------------------|
| mean_reaction_time         | Mean time between sequence shown and each click (ms)            | UI Bots, Headless, Stealthy, OCR            |
| std_reaction_time          | Std deviation of reaction times (ms)                            | UI Bots, Headless, Stealthy, OCR            |
| min_reaction_time          | Minimum reaction time (ms)                                      | UI Bots, Headless, Stealthy, OCR            |
| max_reaction_time          | Maximum reaction time (ms)                                      | UI Bots, Headless, Stealthy, OCR            |
| entropy_reaction_time      | Entropy of reaction times (bits)                                | Headless, Stealthy, OCR                     |
| mean_inter_click_interval  | Mean time between consecutive clicks (ms)                       | UI Bots, Headless, Stealthy, OCR            |
| std_inter_click_interval   | Std deviation of inter-click intervals (ms)                     | UI Bots, Headless, Stealthy, OCR            |
| entropy_inter_click        | Entropy of inter-click intervals (bits)                         | Headless, Stealthy, OCR                     |

## 3. Click Position Features (Real-Time)

| Feature Name                | Description                                                      | Bot Types Detected (most useful for)         |
|----------------------------|------------------------------------------------------------------|----------------------------------------------|
| mean_click_x               | Mean x position of clicks                                        | UI Bots                                     |
| std_click_x                | Std deviation of x positions                                    | UI Bots                                     |
| mean_click_y               | Mean y position of clicks                                       | UI Bots                                     |
| std_click_y                | Std deviation of y positions                                    | UI Bots                                     |
| click_position_entropy     | Entropy of click positions                                      | UI Bots, Headless                           |

## 4. Mouse Movement Features (Real-Time)

| Feature Name                | Description                                                      | Bot Types Detected (most useful for)         |
|----------------------------|------------------------------------------------------------------|----------------------------------------------|
| mouse_move_count           | Total number of mouse movements recorded                         | Mouse bots, UI bots                          |
| mouse_total_distance       | Total distance traveled by mouse (pixels)                        | Mouse bots, UI bots                          |
| mouse_avg_speed            | Average mouse movement speed (pixels/ms)                         | Mouse bots, UI bots                          |
| mouse_max_speed            | Maximum mouse movement speed (pixels/ms)                         | Mouse bots, UI bots                          |
| mouse_direction_changes    | Number of significant direction changes (>45°)                   | Mouse bots, UI bots                          |
| mouse_acceleration_changes | Number of acceleration sign changes                              | Mouse bots, UI bots                          |
| mouse_pause_count          | Number of mouse pauses (speed < 0.1)                             | Mouse bots, UI bots                          |

## 5. Device & Session Features (Real-Time)

| Feature Name                | Description                                                      | Bot Types Detected (most useful for)         |
|----------------------------|------------------------------------------------------------------|----------------------------------------------|
| device_info                | Device/browser info (JSON string)                                | Crude API, Headless                         |
| device_info_hash           | Hash/fingerprint of device_info for clustering                  | Multi-account farming, Sybil                |
| session_id                 | Session identifier                                               | Multi-account, Stealthy                     |
| session_id_hash            | Hash/fingerprint of session_id for clustering                   | Multi-account farming, Sybil                |
| round_in_session           | Index of this round in the session                              | Multi-account, Stealthy                     |

## 6. Verification & Labels (Real-Time)

| Feature Name                | Description                                                      | Bot Types Detected (most useful for)         |
|----------------------------|------------------------------------------------------------------|----------------------------------------------|
| verification_passed        | 1 if rule-based verification passed, else 0                     | All                                         |
| verification_reasons       | Reasons for rule-based fail (if any)                            | All                                         |
| label                      | 'human', 'ui_bot', 'api_bot', 'ocr_bot', 'headless_bot', etc.   | For training/ground truth                   |

## 7. Cross-Round & Session-Level Features (Post-Processing)

| Feature Name                           | Description                                                                | Bot Types Detected (most useful for)         |
|----------------------------------------|----------------------------------------------------------------------------|----------------------------------------------|
| cv_reaction_time_across_rounds         | Coefficient of variation of reaction time across rounds for a player       | Sophisticated bots, behavioral analysis      |
| cv_inter_click_interval_across_rounds  | Coefficient of variation of inter-click interval across rounds             | Sophisticated bots, behavioral analysis      |
| cv_mouse_speed_across_rounds           | Coefficient of variation of mouse speed across rounds for a player         | Sophisticated bots, behavioral analysis      |
| pattern_repetition_score               | Similarity score of click/move patterns across rounds                      | Scripted bots, replay attacks                |
| time_of_day_variance                   | Variance in the time of day the player plays                               | Bot farms, time-locked automation            |
| day_of_week_played                     | Day of week (categorical or one-hot) when round was played                 | Bot farms, human/bot schedule differences    |

## 8. Session Aggregation Features (Post-Processing)

| Feature Name                           | Description                                                                | Bot Types Detected (most useful for)         |
|----------------------------------------|----------------------------------------------------------------------------|----------------------------------------------|
| total_rounds_in_session                | Total rounds played in current session                                     | Session bots, grinders                       |
| session_duration_total                 | Total time spent in current session                                        | Session bots, grinders                       |
| session_success_rate                   | Win rate in current session                                                | Session bots, grinders                       |
| session_avg_time_per_round             | Average round completion time in session                                   | Session bots, grinders                       |
| rounds_per_hour                        | Play frequency indicator                                                   | Session bots, grinders                       |
| session_pause_duration_total           | Total time between rounds in session                                       | Session bots, grinders                       |

## 9. Historical & Temporal Features (Post-Processing)

| Feature Name                           | Description                                                                | Bot Types Detected (most useful for)         |
|----------------------------------------|----------------------------------------------------------------------------|----------------------------------------------|
| 24h_rounds_played                      | Rounds played in last 24 hours                                             | Schedule bots, time-based farming            |
| 7d_rounds_played                       | Rounds played in last 7 days                                               | Schedule bots, time-based farming            |
| 7d_avg_success_rate                    | Average success rate in last 7 days                                        | Schedule bots, time-based farming            |
| 7d_avg_steps                           | Average steps in last 7 days                                               | Schedule bots, time-based farming            |
| 7d_perfect_round_ratio                 | Proportion of perfect rounds in last 7 days                                | Schedule bots, time-based farming            |
| time_since_last_round_seconds          | Time since last round (seconds)                                            | Burst bots, batch play                       |
| time_since_first_round_hours           | Account age (hours since first round)                                      | New/old account abuse                        |
| trend_success_rate                     | Performance trend (improving/declining)                                    | Adaptive bots, learning bots                 |
| trend_reaction_time                    | Reaction time trend (improving/declining)                                  | Adaptive bots, learning bots                 |

## 10. Device & Browser Fingerprinting (Post-Processing)

| Feature Name                           | Description                                                                | Bot Types Detected (most useful for)         |
|----------------------------------------|----------------------------------------------------------------------------|----------------------------------------------|
| device_type                            | Device type (mobile/desktop/tablet)                                        | Device spoofing, bot farms                   |
| screen_resolution                      | Screen resolution dimensions                                               | Device spoofing, bot farms                   |
| browser_type                           | Browser type (Chrome, Firefox, etc.)                                       | Device spoofing, bot farms                   |
| os_type                                | Operating system type                                                      | Device spoofing, bot farms                   |
| is_mobile_device                       | Boolean flag for mobile device                                             | Device spoofing, bot farms                   |
| device_changes_count                   | How often device switches                                                  | Device spoofing, bot farms                   |
| unique_devices_7d                      | Device diversity in last 7 days                                            | Device spoofing, bot farms                   |

## 11. Advanced Mouse & Click Features (Post-Processing)

| Feature Name                           | Description                                                                | Bot Types Detected (most useful for)         |
|----------------------------------------|----------------------------------------------------------------------------|----------------------------------------------|
| mouse_straightness_index               | How direct are mouse movements                                             | Mouse bots, UI bots                          |
| mouse_curvature_avg                    | Average path curvature                                                     | Mouse bots, UI bots                          |
| mouse_jitter_ratio                     | Ratio of small erratic mouse movements                                     | Mouse bots, UI bots                          |
| mouse_overshoot_count                  | Overshooting targets then correcting                                       | Mouse bots, UI bots                          |
| mouse_ballistic_coefficient            | Human ballistic movement pattern                                           | Mouse bots, UI bots                          |
| mouse_idle_time_ratio                  | Proportion of time cursor is still                                         | Mouse bots, UI bots                          |
| click_anticipation_score               | Clicking before target fully appears                                       | Mouse bots, UI bots                          |
| click_accuracy_score                   | How close to optimal click positions                                       | UI bots, click bots                          |
| misclick_count                         | Clicks on wrong tiles                                                      | UI bots, click bots                          |
| double_click_count                     | Accidental double clicks                                                   | UI bots, click bots                          |
| click_rhythm_variance                  | Regularity of click timing                                                 | UI bots, click bots                          |
| click_hesitation_count                 | Pauses before clicking                                                     | UI bots, click bots                          |
| first_click_reaction_time              | Reaction to round start                                                    | UI bots, click bots                          |

## 12. Strategic & Gameplay Features (Post-Processing)

| Feature Name                           | Description                                                                | Bot Types Detected (most useful for)         |
|----------------------------------------|----------------------------------------------------------------------------|----------------------------------------------|
| optimal_path_deviation                 | Deviation from optimal solution                                            | Strategic bots, learning bots                |
| backtrack_count                        | Clicking already-clicked tiles                                             | Strategic bots, learning bots                |
| exploration_pattern_score              | Systematic vs random approach                                              | Strategic bots, learning bots                |
| difficulty_adjustment_response         | Performance change with grid size                                          | Strategic bots, learning bots                |
| learning_curve_slope                   | Improvement rate over time                                                 | Strategic bots, learning bots                |

## 13. Anomaly & Outlier Detection Features (Post-Processing)

| Feature Name                           | Description                                                                | Bot Types Detected (most useful for)         |
|----------------------------------------|----------------------------------------------------------------------------|----------------------------------------------|
| z_score_reaction_time                  | How unusual reaction time is compared to player's history                  | Anomaly detection, outlier detection         |
| z_score_success_rate                   | How unusual success rate is compared to player's history                   | Anomaly detection, outlier detection         |
| outlier_round_ratio                    | Proportion of statistical outlier rounds                                   | Anomaly detection, outlier detection         |
| performance_volatility                 | Standard deviation of recent performance                                   | Anomaly detection, outlier detection         |

## 14. Sequence & Pattern Features (Post-Processing)

| Feature Name                           | Description                                                                | Bot Types Detected (most useful for)         |
|----------------------------------------|----------------------------------------------------------------------------|----------------------------------------------|
| consecutive_perfect_rounds             | Perfect rounds in a row                                                    | Sequence bots, batch play                    |
| consecutive_failed_rounds              | Failed rounds in a row                                                     | Sequence bots, batch play                    |
| win_streak_max                         | Longest win streak                                                         | Sequence bots, batch play                    |
| round_completion_rhythm                | Time between round completions                                             | Sequence bots, batch play                    |
| batch_playing_indicator                | Multiple rounds in rapid succession                                        | Sequence bots, batch play                    |

## 15. Cross-Feature Ratios (Post-Processing)

| Feature Name                           | Description                                                                | Bot Types Detected (most useful for)         |
|----------------------------------------|----------------------------------------------------------------------------|----------------------------------------------|
| perfect_to_total_ratio                 | Ratio of perfect rounds to total rounds                                    | Cross-feature, XGBoost                       |
| speed_to_accuracy_ratio                | Mean reaction time divided by correct steps                                | Cross-feature, XGBoost                       |
| mouse_efficiency                       | Mouse distance per step                                                    | Cross-feature, XGBoost                       |
| time_pressure_ratio                    | Time elapsed divided by time limit                                         | Cross-feature, XGBoost                       |



## 16. Multi-Account Farming & Sybil Detection Features (Post-Processing)

| Feature Name                  | Description                                                                 | Usefulness for Multi-Account Detection         |
|------------------------------ |-----------------------------------------------------------------------------|-----------------------------------------------|
| shared_device_ratio           | Fraction of accounts sharing the same device_info_hash                       | Detects device reuse across accounts          |
| shared_ip_ratio               | Ratio of accounts using the same IP/network fingerprint (if available)       | Detects network-level Sybil clusters          |
| account_similarity_score      | Cosine similarity of behavioral vectors (reaction time, success rate, etc.)  | Flags similar play patterns across accounts   |
| co_activity_score             | Overlap of active time windows between accounts                              | Detects coordinated or simultaneous play      |
| funding_linked_accounts       | Number of accounts funded/rewarded by the same wallet address                | Finds on-chain funding/withdrawal links       |
| transfer_graph_degree         | Degree centrality in the token transfer network                              | High = interacts with many other wallets      |
| simultaneous_login_count      | Number of other accounts active in the same 5-min window                     | Detects batch/automated play                  |
| inter_account_time_gap_mean   | Average time between sessions across controlled accounts                     | Flags rapid switching between accounts        |
| synchronized_action_rate      | Proportion of actions within the same second across accounts                 | Detects macroed or cloned play                |
| behavioral_hash_match_count   | Number of accounts with nearly identical behavioral signatures               | Flags copy-paste or macroed play              |
| repetitive_pattern_similarity | Similarity of play order, level progression, or click path entropy           | Detects repeated strategies across accounts   |
| device_reuse_score            | Number of unique device_info_hash entries reused across player addresses     | Detects device sharing                        |
| reward_flow_entropy           | Entropy of where earned tokens are sent                                      | Low = rewards consolidated to few addresses   |
| same_reward_recipient_ratio   | Fraction of accounts sending rewards to the same wallet                      | Detects reward funneling/consolidation        |

## 17. On-Chain Sybil Detection Features (Post-Processing)

| Feature Name                       | Description                                                                 | Usefulness for Sybil Detection                 |
|-----------------------------------|-----------------------------------------------------------------------------|-----------------------------------------------|
| onchain_first_tx_time              | Timestamp of first transaction for the player address                       | Detects account age and creation patterns     |
| onchain_last_tx_time               | Timestamp of last transaction for the player address                        | Detects account activity/dormancy             |
| onchain_total_received             | Total tokens received by the address                                        | Detects funding patterns                      |
| onchain_total_sent                 | Total tokens sent by the address                                            | Detects withdrawal/consolidation patterns     |
| onchain_balance                    | Current token balance of the address                                        | Detects fund accumulation                     |
| onchain_contract_interaction_count | Number of smart contract interactions                                       | Detects automated/scripted behavior           |
| onchain_function_sequence          | Sequence of contract functions called                                       | Detects repetitive interaction patterns       |
| onchain_neighbor_count             | Number of unique addresses interacted with (1-2 hops)                       | Detects network centrality                    |
| onchain_neighbor_stats             | Aggregate stats over neighbor transactions (min/max/avg/var)                | Detects Sybil subgraph patterns               |
| onchain_graph_distance_to_funder   | Graph distance to known funding source addresses                            | Detects radial/chain funding patterns         |

---

## Bot Detection Strategy

### Bot Types
- **UI Automation Bots**: Caught by timing, click position, and variance features.
- **Crude API Bots**: Caught by missing device/session info, abnormal timing.
- **Screen-Capture/OCR Bots**: Caught by subtle timing/entropy features.
- **Headless Browser Bots**: Caught by low entropy, cross-session patterns.
- **Stealthy API Bots**: Only detectable by cross-account/session features and long-term analysis.
- **Multi-Account/Sybil Farmers**: Detected by device/session clustering, behavioral similarity, and on-chain graph analysis.

### Implementation Notes
- **Real-Time Features** (Sections 1-6): Calculated and logged during gameplay in `server.js`.
- **Post-Processing Features** (Sections 7-17): Filled as 'NA' during gameplay, computed later using Python/pandas/graph analysis scripts.

### Multi-Account Farming Detection

#### What Constitutes Multi-Account Farming?

Multi-account farming occurs when a single person/entity controls multiple accounts to gain unfair advantages. The following user actions are considered multi-account farming:

**🚨 HIGH SEVERITY - Clear Violations:**

1. **Same Device, Multiple Accounts**
   - Playing from same computer/laptop with different wallet addresses
   - Same browser, same IP, different wallets
   - Detection: `shared_device_ratio > 0`, identical `device_info_hash`

2. **Reward Consolidation**
   - Multiple accounts sending all earned rewards to one wallet address
   - Funneling tokens through intermediary addresses to obscure trail
   - Detection: `same_reward_recipient_ratio > 0.8`, low `reward_flow_entropy`

3. **Coordinated Farming**
   - Multiple accounts funded from same source wallet
   - Accounts created at similar times with similar funding amounts
   - Detection: `funding_linked_accounts > 1`, `onchain_graph_distance_to_funder = 1`

4. **Batch/Automated Play**
   - Playing multiple accounts in rapid succession (< 5 min gaps)
   - Sequential gameplay across 5+ accounts with similar patterns
   - Detection: High `synchronized_action_rate`, `simultaneous_login_count > 3`

5. **Behavioral Cloning**
   - Multiple accounts with nearly identical play patterns
   - Same reaction times, click patterns, mouse movements across accounts
   - Detection: `account_similarity_score > 0.85`, high `behavioral_hash_match_count`

**⚠️ MEDIUM SEVERITY - Suspicious Activities:**

6. **Shared Session/Network**
   - Multiple accounts sharing same session ID or IP address
   - Playing from same WiFi network with different devices but coordinated timing
   - Detection: `shared_ip_ratio > 0.5`, matching `session_id_hash`

7. **Rapid Account Switching**
   - Switching between 2-4 accounts with short gaps (< 10 min)
   - Alternating accounts to avoid detection
   - Detection: Low `inter_account_time_gap_mean`, high `device_changes_count`

8. **Strategic Repetition**
   - Multiple accounts using identical strategies, level progression, click paths
   - Copy-paste gameplay across accounts
   - Detection: High `repetitive_pattern_similarity`, identical `exploration_pattern_score`

**✅ NOT Multi-Account Farming (Legitimate Use):**

- Single person, single account, multiple devices (work laptop, home PC, mobile)
- Different people sharing same device (family members, roommates) with different play patterns
- Testing/development accounts clearly labeled and not claiming rewards
- Accounts with different behavioral patterns, funding sources, and reward destinations

#### Detection Strategy

- Use `device_info_hash` and `session_id_hash` to cluster accounts that share the same device or session.
- Accounts with matching hashes and similar gameplay patterns are strong candidates for multi-account farming (Sybil attacks).
- Combine with on-chain graph analysis to detect funding/reward flow patterns.
- Apply behavioral biometrics to identify same-person play across different devices.
- Use temporal analysis to detect coordinated/batch play patterns.

### How to Use
- Each round played will append a row to `dataset.csv` with all features.
- Real-time features are filled with actual values; post-processing features are filled as 'NA'.
- Use post-processing scripts to compute advanced features from the dataset.
- Train ML models (e.g., XGBoost, Random Forest) for bot detection using all features.

---

## 18. Timing Manipulation Detection Features (Real-Time + Post-Processing)

### Overview
Blockchain-based games are vulnerable to timing manipulation attacks where attackers exploit transaction ordering, block timestamps, or mempool visibility to gain unfair advantages. These 27 features detect various timing exploitation strategies.

### Blockchain Timing Features (7 features - Real-Time)

| Feature Name                           | Description                                                                | Attack Types Detected                        |
|----------------------------------------|----------------------------------------------------------------------------|----------------------------------------------|
| tx_submission_timestamp                | System timestamp when transaction was submitted to mempool (ms)           | All timing attacks                           |
| block_timestamp                        | Block timestamp when transaction was mined (Unix timestamp)               | Timestamp manipulation, miner collusion      |
| block_number                           | Block number where transaction was included                               | Transaction ordering attacks                 |
| submission_to_block_delay_ms           | Time between submission and block inclusion (ms)                          | MEV attacks, priority manipulation           |
| gas_price_used                         | Gas price paid for transaction (wei)                                      | Front-running, back-running                  |
| tx_position_in_block                   | Position of transaction within the block (0 = first)                      | Front-running, sandwich attacks              |
| block_miner_address_hash               | Hash of block miner address (for privacy)                                 | Miner collusion detection                    |

### Front-Running Detection Features (5 features - Real-Time)

| Feature Name                           | Description                                                                | Attack Types Detected                        |
|----------------------------------------|----------------------------------------------------------------------------|----------------------------------------------|
| is_front_run_candidate                 | Boolean: gas price > 1.5x network median                                  | Front-running attempts                       |
| mempool_wait_time_ms                   | How long transaction waited in mempool before mining                      | Priority manipulation                        |
| similar_tx_in_same_block               | Count of similar transactions (same function) in same block               | Sandwich attacks, batch manipulation         |
| tx_nonce_gap                           | Gap in nonce sequence (rushed submissions)                                | Coordinated multi-account attacks            |
| gas_price_vs_network_median            | Ratio of tx gas price to network median                                   | Economic front-running detection             |

### Daily Challenge Timing Features (6 features - Real-Time)

| Feature Name                           | Description                                                                | Attack Types Detected                        |
|----------------------------------------|----------------------------------------------------------------------------|----------------------------------------------|
| daily_challenge_completion_time_of_day | Hours since midnight (0-24) when daily challenge completed                | Day boundary exploitation                    |
| is_near_day_boundary                   | Boolean: within 5 minutes of midnight                                     | Timestamp manipulation near day change       |
| daily_challenge_completer_rank         | Position in completers array (1st, 2nd, 3rd...)                           | First-completer race condition exploitation  |
| time_since_last_daily_challenge        | Days since last daily challenge completion                                | Pattern analysis, automated scheduling       |
| daily_challenge_submission_order       | Order in which player completed challenge                                 | Front-running daily challenges               |
| block_timestamp_vs_system_time_diff    | Absolute difference between block timestamp and system time (ms)          | Miner timestamp manipulation indicator       |

### Leaderboard & Reward Timing Features (9 features - Post-Processing)

| Feature Name                           | Description                                                                | Attack Types Detected                        |
|----------------------------------------|----------------------------------------------------------------------------|----------------------------------------------|
| time_since_last_leaderboard_update     | Hours since last leaderboard update                                       | Strategic timing around leaderboard windows  |
| is_near_leaderboard_update             | Boolean: within 1 hour of expected leaderboard update                     | Last-minute score manipulation               |
| rounds_submitted_before_leaderboard    | Count of rounds submitted just before leaderboard update                  | Batch submission exploitation                |
| leaderboard_position_change            | Rank change from previous leaderboard update                              | Sudden rank jumps (MEV/front-run indicator)  |
| time_between_round_submissions         | Average time between consecutive round submissions (seconds)              | Bot automation, scripted timing              |
| submission_time_consistency_score      | Std deviation of submission times (low = bot-like)                        | Automated submission patterns                |
| peak_hour_submission_ratio             | Percentage of rounds submitted during off-peak hours (0-6 AM)             | Bot operation during human sleep hours       |
| weekend_vs_weekday_ratio               | Ratio of weekend vs weekday submissions                                   | Bot vs human play patterns                   |
| reward_withdrawal_timing_pattern       | Time between round completion and reward withdrawal                       | Coordinated multi-account cashout patterns   |

### Timing Manipulation Attack Scenarios

#### 🔴 **Critical Vulnerabilities Detected:**

1. **Block Timestamp Manipulation**
   - Miners adjust `block.timestamp` by ±15 seconds
   - Players collude with miners to manipulate daily challenge boundaries
   - Detection: `block_timestamp_vs_system_time_diff > 10000` (>10 sec), `is_near_day_boundary = 1`

2. **Front-Running Daily Challenges**
   - Player sees competitor's daily challenge submission in mempool
   - Submits own completion with higher gas price to get included first
   - Detection: `is_front_run_candidate = 1`, `tx_position_in_block < 3`, `similar_tx_in_same_block > 1`

3. **Sandwich Attacks on Daily Challenge**
   - Submit transaction before AND after target to manipulate completer order
   - Detection: `similar_tx_in_same_block > 2`, `gas_price_vs_network_median > 2.0`

4. **Leaderboard Update Timing Exploitation**
   - Owner calls `updateLeaderboard()` at arbitrary times
   - Players with inside knowledge submit high scores just before update
   - Detection: `is_near_leaderboard_update = 1`, `rounds_submitted_before_leaderboard > 5`

5. **MEV (Maximal Extractable Value) Exploitation**
   - MEV bots reorder transactions to extract value from reward distributions
   - Detection: `submission_to_block_delay_ms < 100` (suspiciously fast), `tx_position_in_block = 0`

6. **Coordinated Multi-Account Timing**
   - Multiple accounts submit at exact same time with sequential nonces
   - Detection: `tx_nonce_gap = 0`, `time_between_round_submissions < 5`, `similar_tx_in_same_block > 3`

7. **Day Boundary Exploitation**
   - Complete challenge at 23:59:50, miner adjusts to 00:00:05 (next day)
   - Player completes BOTH days' challenges
   - Detection: `daily_challenge_completion_time_of_day` near 0 or 24, `block_timestamp_vs_system_time_diff > 30000`

### XGBoost Detection Strategy

**Model Architecture:**
- Multi-class classification: `[LEGITIMATE, TIMESTAMP_MANIPULATION, FRONT_RUNNING, SANDWICH_ATTACK, MEV_EXPLOITATION, BATCH_TIMING]`
- Feature interactions: `(gas_price_used, tx_position_in_block, mempool_wait_time)` → Front-running score
- Anomaly detection: Compare player's timing patterns to historical baseline

**Key Feature Combinations for Detection:**
```python
# Front-Running Pattern
if (is_front_run_candidate == 1 AND 
    tx_position_in_block < 3 AND 
    similar_tx_in_same_block > 1):
    label = 'FRONT_RUNNING'

# Timestamp Manipulation Pattern  
if (block_timestamp_vs_system_time_diff > 15000 AND 
    is_near_day_boundary == 1):
    label = 'TIMESTAMP_MANIPULATION'

# MEV Bot Pattern
if (submission_to_block_delay_ms < 200 AND 
    tx_position_in_block == 0 AND 
    gas_price_vs_network_median > 3.0):
    label = 'MEV_EXPLOITATION'

# Coordinated Batch Timing
if (similar_tx_in_same_block > 5 AND 
    time_between_round_submissions < 10 AND 
    tx_nonce_gap == 0):
    label = 'BATCH_TIMING'
```

**Training Approach:**
1. Label historical data with known timing attacks (synthetic + real)
2. Use SMOTE to balance rare attack classes
3. Feature importance reveals most predictive timing signals
4. Threshold tuning: High precision for flagging (99% confidence), high recall for investigation (80% confidence)

### Prevention Strategies (Smart Contract Level)

While ML detection identifies attackers post-facto, these contract-level fixes prevent timing attacks:

1. **Commit-Reveal Scheme** - Players commit hash of solution, reveal after window closes
2. **Chainlink VRF** - Use verifiable random functions for unpredictable daily challenges
3. **Off-Chain Timing Validation** - Validate game timing client-side, only submit results
4. **Block Numbers vs Timestamps** - Use block numbers for time windows (miners can't manipulate)
5. **Batch Processing** - Process all daily challenge submissions in single transaction at fixed time
6. **MEV Protection** - Use private mempools (Flashbots) or time-delay reveals

### Feature Importance (Expected Rankings)

Based on timing attack patterns, these features will likely have highest importance in XGBoost:

1. `gas_price_vs_network_median` - Strongest front-running indicator
2. `block_timestamp_vs_system_time_diff` - Direct timestamp manipulation detection
3. `tx_position_in_block` - Transaction ordering exploitation
4. `is_near_day_boundary` - Daily challenge boundary attacks
5. `similar_tx_in_same_block` - Sandwich/batch attack detection
6. `submission_to_block_delay_ms` - MEV bot speed indicator
7. `daily_challenge_completer_rank` - First-completer race exploitation
8. `time_between_round_submissions` - Automated bot timing patterns

---

**Total Features: 147 (120 original + 27 timing manipulation)**

Use these timing features alongside behavioral biometrics and on-chain graph analysis for comprehensive anti-cheat detection!


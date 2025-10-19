# Click-Level Telemetry Logging Strategy

## Overview

The MEMORIX telemetry system now uses **click-level logging** instead of round-level logging. This provides maximum data fidelity and enables flexible post-processing aggregation for machine learning.

---

## Why Click-Level Logging?

### 1. Maximum Data Preservation
- **Every click is logged** with complete telemetry context
- No information loss - all raw behavioral data preserved
- Can aggregate into round-level features later (can't reverse aggregation)

### 2. Advanced Detection Capabilities
- **Mid-round behavior changes**: Detect adaptive bots that change tactics
- **Replay attacks**: Compare exact click sequences across rounds  
- **Hybrid attacks**: Identify when human starts, bot finishes
- **Click-by-click anomalies**: Flag individual suspicious clicks

### 3. Future-Proof Architecture
- Enables LSTM/Transformer sequence models if needed
- Supports multiple aggregation strategies
- Can create both click-level and round-level features

---

## Data Flow

### During Gameplay (Click-Level Logging)

```
User Click → TelemetryTracker.recordClick() → Server API
                                                    ↓
                                          telemetryLogger.logClick()
                                                    ↓
                                          Append to dataset_clicks.csv
                                                    ↓
                                          One row per click
```

### Post-Processing (Aggregation)

```
dataset_clicks.csv (raw)
         ↓
aggregate_clicks_to_rounds.py
         ↓
Group by round_id
Calculate aggregated features:
- mean_reaction_time = mean(all clicks in round)
- std_reaction_time = std(all clicks in round)  
- mouse_move_count = sum(mouse moves in round)
- etc.
         ↓
dataset_rounds.csv (aggregated)
         ↓
XGBoost Training
```

---

## Dataset Structure

### Click-Level CSV (`dataset_clicks.csv`)

Each click generates one row:

```csv
round_id,player_address,click_index,total_clicks_in_round,timestamp,click_x,click_y,reaction_time_ms,mouse_speed,...
round_001,0xABC...,1,8,2025-10-09T14:30:00.123Z,150,200,234,5.2,...
round_001,0xABC...,2,8,2025-10-09T14:30:00.567Z,300,200,444,8.1,...
round_001,0xABC...,3,8,2025-10-09T14:30:00.891Z,150,400,324,6.3,...
round_001,0xABC...,4,8,2025-10-09T14:30:01.123Z,450,400,232,7.8,...
```

**Columns:**
- **Metadata**: `round_id`, `click_index`, `total_clicks_in_round`
- **Real-time features**: 42 columns with actual click data
- **Post-processing placeholders**: 107 columns with "NA"
- **Total**: 149 + 3 metadata = 152 columns

### Round-Level CSV (`dataset_rounds.csv`)

Aggregated from clicks, one row per round:

```csv
round_id,player_address,mean_reaction_time,std_reaction_time,mouse_move_count,label,...
round_001,0xABC...,334,89,42,human,...
round_002,0xDEF...,156,12,8,ui_bot,...
```

**Columns:**
- **Aggregated features**: 149 features from click data
- **Labels**: `label` column (human/bot)
- **Total**: 149 columns

---

## Aggregation Script

### `ai/scripts/aggregate_clicks_to_rounds.py`

```python
import pandas as pd
import numpy as np
from scipy.stats import entropy

# Load click-level data
df_clicks = pd.read_csv('../../MEMORIX--Web3-Memory-Challenge/dataset_clicks.csv')

# Group by round_id
rounds = []

for round_id, group in df_clicks.groupby('round_id'):
    round_data = {
        'round_id': round_id,
        'player_address': group['player_address'].iloc[0],
        'timestamp': group['timestamp'].iloc[-1],  # Last click time
        'round_type': group['round_type'].iloc[0],
        
        # Reaction time features (aggregated from clicks)
        'mean_reaction_time': group['reaction_time_ms'].mean(),
        'std_reaction_time': group['reaction_time_ms'].std(),
        'min_reaction_time': group['reaction_time_ms'].min(),
        'max_reaction_time': group['reaction_time_ms'].max(),
        'entropy_reaction_time': entropy(group['reaction_time_ms']),
        
        # Inter-click intervals
        'mean_inter_click_interval': group['inter_click_interval_ms'].mean(),
        'std_inter_click_interval': group['inter_click_interval_ms'].std(),
        
        # Click positions
        'mean_click_x': group['click_x'].mean(),
        'std_click_x': group['click_x'].std(),
        'mean_click_y': group['click_y'].mean(),
        'std_click_y': group['click_y'].std(),
        
        # Mouse movements (sum across all clicks in round)
        'mouse_move_count': group['mouse_moves_in_click'].sum(),
        'mouse_total_distance': group['mouse_distance_in_click'].sum(),
        'mouse_avg_speed': group['mouse_speed'].mean(),
        'mouse_max_speed': group['mouse_speed'].max(),
        
        # ... continue for all 149 features
        
        'label': group['label'].iloc[0]  # Inherited from round
    }
    rounds.append(round_data)

# Create aggregated dataframe
df_rounds = pd.DataFrame(rounds)

# Save
df_rounds.to_csv('../../MEMORIX--Web3-Memory-Challenge/dataset_rounds.csv', index=False)
print(f"Aggregated {len(df_clicks)} clicks into {len(df_rounds)} rounds")
```

---

## Feature Extraction Per Click

### Real-Time Features (Logged Immediately)

**Per-Click Features:**
- `click_index`: Position in sequence (1, 2, 3, ...)
- `total_clicks_in_round`: Total clicks in this round
- `reaction_time_ms`: Time since sequence display ended
- `inter_click_interval_ms`: Time since previous click
- `click_x`, `click_y`: Pixel coordinates
- `mouse_moves_in_click`: Mouse movements for this click
- `mouse_distance_in_click`: Mouse travel distance
- `mouse_speed`: Average mouse speed for this click

**Round Context (Same for All Clicks in Round):**
- `round_id`, `player_address`, `round_type`
- `grid_size`, `steps`, `time_limit_ms`
- `device_info`, `device_info_hash`
- `session_id`

### Post-Processing Features (Aggregated Later)

These are computed when aggregating clicks → rounds:

- `mean_reaction_time` = mean of all `reaction_time_ms` in round
- `std_reaction_time` = std deviation
- `mouse_total_distance` = sum of all `mouse_distance_in_click`
- `consecutive_perfect_rounds` = requires historical analysis
- `24h_rounds_played` = requires temporal analysis
- etc.

---

## Implementation Changes

### Server-Side (`telemetryLogger.js`)

**OLD (Round-Level):**
```javascript
logRound(roundData) {
    // Log once at end of round
    const row = [/* all 149 features */];
    fs.appendFileSync(this.datasetPath, row);
}
```

**NEW (Click-Level):**
```javascript
logClick(clickData) {
    // Log each click as it happens
    const {
        roundId,
        playerAddress,
        clickIndex,
        totalClicksInRound,
        clickX,
        clickY,
        reactionTimeMs,
        // ... per-click telemetry
    } = clickData;
    
    const row = [
        roundId,
        playerAddress,
        clickIndex,
        totalClicksInRound,
        // ... 149 features (some real, some NA)
    ].join(',') + '\n';
    
    fs.appendFileSync(this.datasetPath, row);
}
```

### Client-Side (`public/index.html`)

**NEW: Real-Time Click Logging**
```javascript
function handleCellClick(index) {
    // ... existing click handling
    
    // Send telemetry immediately after each click
    const clickData = TelemetryTracker.getClickData(index);
    
    fetch(`${API_URL}/telemetry/log-click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            roundId: gameState.roundId,
            playerAddress: connectedAddress,
            clickIndex: gameState.currentStep,
            totalClicksInRound: gameState.sequence.length,
            clickData: clickData
        })
    });
}
```

---

## Advantages of Click-Level Logging

### 1. **Granular Anomaly Detection**
- Identify single suspicious clicks in otherwise human rounds
- Detect when bot takes over mid-round
- Track behavioral drift within round

### 2. **Sequential Pattern Analysis**
- Click-to-click timing patterns
- Mouse trajectory evolution
- Fatigue or acceleration patterns

### 3. **Replay Attack Detection**
- Compare exact click sequences
- Measure sequence similarity across rounds
- Detect copy-paste gameplay

### 4. **Flexible Aggregation**
- Can create multiple aggregation strategies:
  - Simple mean/std (for XGBoost)
  - Time-windowed features (first 3 clicks vs last 3 clicks)
  - Sequence embeddings (for deep learning)

### 5. **Research & Analysis**
- Visualize click-by-click behavior
- Study human learning patterns
- A/B test different game difficulties

---

## Storage Considerations

### Dataset Size Estimates

**Click-Level (Raw):**
```
10,000 rounds × 8 clicks/round × 500 bytes/row = 40 MB
100,000 rounds × 8 clicks/round × 500 bytes/row = 400 MB
```

**Round-Level (Aggregated):**
```
10,000 rounds × 800 bytes/row = 8 MB
100,000 rounds × 800 bytes/row = 80 MB
```

**Conclusion:** 
- Storage is cheap (~$0.02/GB)
- Information loss is permanent
- Better to log granular and aggregate later

---

## XGBoost Training Workflow

### Step 1: Collect Click-Level Data
```bash
# Play game, clicks logged to dataset_clicks.csv
# Target: 1,000+ rounds (8,000+ clicks)
```

### Step 2: Aggregate to Rounds
```bash
python ai/scripts/aggregate_clicks_to_rounds.py
# Input: dataset_clicks.csv (raw clicks)
# Output: dataset_rounds.csv (aggregated features)
```

### Step 3: Post-Processing Features
```bash
python ai/scripts/feature_engineering.py
# Input: dataset_rounds.csv
# Fills NA values (historical, cross-round, on-chain features)
# Output: dataset_rounds_enriched.csv
```

### Step 4: Train XGBoost
```bash
python ai/scripts/train_xgboost.py
# Input: dataset_rounds_enriched.csv
# Output: Trained model, feature importance
```

---

## Migration Path

### From Round-Level to Click-Level

**If you have existing round-level data:**
1. Keep it as baseline comparison
2. Start collecting click-level data
3. Aggregate new click-level data to rounds
4. Compare detection accuracy

**Backward Compatibility:**
- Old dataset: `dataset.csv` (round-level, deprecated)
- New dataset: `dataset_clicks.csv` (click-level, primary)
- Aggregated: `dataset_rounds.csv` (for XGBoost, generated)

---

## Summary

| Aspect | Click-Level Logging | Round-Level Logging |
|--------|---------------------|---------------------|
| **Granularity** | 1 row per click | 1 row per round |
| **Data Size** | 8x larger | Smaller |
| **Information** | Complete fidelity | Some loss |
| **Flexibility** | Can aggregate any way | Fixed aggregation |
| **Detection** | Fine-grained anomalies | Round-level anomalies |
| **Future-proof** | Supports advanced models | Limited to tree models |
| **Aggregation** | Post-processing | Pre-aggregated |
| **Storage Cost** | ~$0.02 for 1GB | Minimal |
| **Chosen Approach** | ✅ **SELECTED** | ❌ Deprecated |

---

**Conclusion:** Click-level logging is the superior approach. It preserves all behavioral data, enables advanced detection, and provides maximum flexibility for post-processing. The slight increase in storage cost is negligible compared to the value of complete data fidelity.

**Next Steps:**
1. Update `telemetryLogger.js` to log per click
2. Update server API to handle per-click logging
3. Create aggregation script `aggregate_clicks_to_rounds.py`
4. Collect click-level data from gameplay
5. Aggregate and train XGBoost model

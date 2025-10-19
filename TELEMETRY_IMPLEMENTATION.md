# Telemetry Implementation for MEMORIX Game

## Overview
Comprehensive telemetry logging system integrated into the MEMORIX Web3 Memory Challenge game to collect training data for XGBoost cheat detection model.

## Architecture

### Client-Side (`public/telemetryTracker.js`)
- **Purpose**: Track user interactions and device information on the browser
- **Key Features**:
  - Mouse movement tracking (x, y coordinates with timestamps)
  - Click recording with position data
  - Device fingerprinting (screen size, user agent, platform, timezone, etc.)
  - Session timing
  - Data aggregation and export

### Server-Side (`telemetryLogger.js`)
- **Purpose**: Process telemetry data and log to CSV for ML training
- **Key Features**:
  - 90+ feature extraction from raw telemetry
  - CSV output matching dataset.csv schema
  - Historical player tracking
  - Behavioral pattern analysis
  - Device consistency checks

## Data Flow

### 1. Round Start
```
User clicks "Start" → startGame() → TelemetryTracker.startRound()
```
- Initializes mouse tracking
- Resets click counters
- Starts session timer

### 2. Sequence Display
```
playSequence() completes → TelemetryTracker.recordSequenceStart()
```
- Records when user input phase begins
- Marks sequence display end timestamp

### 3. User Clicks
```
handleCellClick() → TelemetryTracker.recordClick(index, x, y)
```
- Records each click with:
  - Cell index
  - Pixel coordinates (x, y)
  - Client timestamp
  - Inter-click interval

### 4. Round Completion
```
finishRound() → TelemetryTracker.stopRound() → Server API
```
- Stops mouse tracking
- Collects device info
- Packages telemetry data:
  - `clicks[]` - All click events
  - `mouseMoves[]` - Mouse movement trace
  - `deviceInfo{}` - Browser/device fingerprint
  - `sequenceStartTs` - When input phase started

### 5. Server Processing
```
POST /api/round/submit/{infinite|daily} → telemetryLogger.logRound()
```
- Extracts 90+ features
- Appends to CSV file
- Returns verification result

## Features Logged (90+ total)

### Click Features (~30 features)
- reaction_time_1st_click_ms
- avg_click_interval_ms
- std_click_interval_ms
- min_click_interval_ms, max_click_interval_ms
- click_rhythm_variance
- click_timing_consistency
- early_click_percentage
- late_click_percentage
- click_acceleration_pattern
- click_deceleration_pattern
- click_burst_count
- avg_clicks_per_burst

### Mouse Features (~25 features)
- mouse_move_count
- avg_mouse_speed_px_per_sec
- max_mouse_speed_px_per_sec
- mouse_path_total_distance_px
- mouse_path_straightness
- mouse_idle_count
- mouse_erratic_movement_count
- avg_mouse_acceleration
- mouse_direction_changes
- mouse_hover_before_click_avg_ms
- mouse_trajectory_smoothness

### Device Features (~15 features)
- screen_width_px, screen_height_px
- browser_user_agent
- device_platform
- timezone_offset_minutes
- device_pixel_ratio
- color_depth_bits
- cpu_cores_estimate
- device_memory_gb_estimate
- device_fingerprint_hash

### Session Features (~10 features)
- session_round_count
- session_total_time_minutes
- session_avg_accuracy
- session_performance_trend
- session_consistency_score

### Historical Features (~10 features)
- player_total_rounds
- player_avg_reaction_time_ms
- player_avg_accuracy
- player_typical_device_count
- player_behavior_change_score

### Behavioral Patterns (~5 features)
- timing_manipulation_score
- bot_likelihood_score
- multi_account_risk_score
- pattern_consistency_score

### On-Chain Features (~5 features)
- on_chain_wallet_age_days (placeholder)
- on_chain_transaction_count (placeholder)
- on_chain_balance_eth (placeholder)
- on_chain_game_history (placeholder)
- on_chain_reputation_score (placeholder)

## File Structure

```
MEMORIX--Web3-Memory-Challenge/
├── public/
│   ├── index.html              # Updated with telemetry integration
│   └── telemetryTracker.js     # NEW: Client-side tracking
├── server.js                    # Updated with telemetry logging
├── telemetryLogger.js          # NEW: Server-side feature extraction
├── dataset.csv                  # Training dataset (existing)
├── dataset_features_README.md   # Feature descriptions (existing)
└── TELEMETRY_IMPLEMENTATION.md  # This file
```

## Integration Points in `index.html`

### 1. Script Import (line ~976)
```html
<script src="telemetryTracker.js"></script>
```

### 2. Round Start (in `startGame()`)
```javascript
if (window.TelemetryTracker) {
    window.TelemetryTracker.startRound();
}
```

### 3. Sequence Complete (in `playSequence()`)
```javascript
if (window.TelemetryTracker) {
    window.TelemetryTracker.recordSequenceStart();
}
```

### 4. Click Recording (in `handleCellClick()`)
```javascript
if (window.TelemetryTracker) {
    const cellRect = cell.getBoundingClientRect();
    window.TelemetryTracker.recordClick(
        index, 
        cellRect.left + cellRect.width/2, 
        cellRect.top + cellRect.height/2
    );
}
```

### 5. Round Submission (in `finishRound()`)
```javascript
let telemetryData = gameState.telemetry;
if (window.TelemetryTracker) {
    const trackerData = window.TelemetryTracker.stopRound();
    telemetryData = {
        ...gameState.telemetry,
        mouseMoves: trackerData.mouseMoves || [],
        deviceInfo: trackerData.deviceInfo || {}
    };
}
```

## Integration Points in `server.js`

### 1. Import and Initialize (lines 1-18)
```javascript
const TelemetryLogger = require('./telemetryLogger');
const telemetryLogger = new TelemetryLogger('./dataset.csv');
```

### 2. Infinite Mode Logging (in `/api/round/submit/infinite`)
```javascript
telemetryLogger.logRound({
    roundId,
    playerAddress,
    timestamp: new Date().toISOString(),
    roundType: 'INFINITE',
    gridSize: round.gridSize,
    sequence: round.sequence,
    userClicks: clickedSequence,
    telemetry: telemetry || { clicks: [], mouseMoves: [], sequenceStartTs: round.startTime, deviceInfo: {} },
    timeElapsedMs,
    timeLimitMs: round.timeLimit,
    isPerfect,
    timeExpired,
    verification
});
```

### 3. Daily Mode Logging (in `/api/round/submit/daily`)
```javascript
telemetryLogger.logRound({
    roundId,
    playerAddress,
    timestamp: new Date().toISOString(),
    roundType: 'DAILY',
    gridSize: round.gridSize,
    sequence: round.sequence,
    userClicks: clickedSequence,
    telemetry: telemetry || { clicks: [], mouseMoves: [], sequenceStartTs: round.startTime, deviceInfo: {} },
    timeElapsedMs,
    timeLimitMs: round.timeLimit,
    isPerfect,
    timeExpired,
    verification
});
```

## CSV Output Format

### Click-Level Logging (Raw Data)
Each click during gameplay generates one row in `dataset_clicks.csv`:
- **Header**: 149 column names (matches feature schema)
- **Row Data**: One row per click with all telemetry features
- **Round Context**: Each click includes `round_id`, `click_index`, `total_clicks_in_round`
- **Appending**: New rows appended as clicks occur
- **Encoding**: UTF-8
- **Delimiter**: Comma (`,`)

### Example Raw Click Data:
```csv
round_id,player_address,click_index,total_clicks_in_round,timestamp,reaction_time_ms,click_x,click_y,...
round_001,0xABC...,1,8,2025-10-09T14:30:00.123Z,234,150,200,...
round_001,0xABC...,2,8,2025-10-09T14:30:00.567Z,444,300,200,...
round_001,0xABC...,3,8,2025-10-09T14:30:00.891Z,324,150,400,...
...
```

### Post-Processing Aggregation
Create `ai/scripts/aggregate_clicks_to_rounds.py` to:
1. Load `dataset_clicks.csv` (raw click data)
2. Group by `round_id`
3. Aggregate clicks into round-level features:
   - `mean_reaction_time = mean(reaction_time_ms)`
   - `std_reaction_time = std(reaction_time_ms)`
   - `mouse_move_count = sum(mouse_moves_in_click)`
   - etc.
4. Output `dataset_rounds.csv` with 149 aggregated features per round

### Aggregated Round Data (For XGBoost):
```csv
round_id,player_address,mean_reaction_time,std_reaction_time,mouse_move_count,label,...
round_001,0xABC...,334,89,42,human,...
round_002,0xDEF...,156,12,8,ui_bot,...
```

## Testing the System

### 1. Start the Server
```bash
cd MEMORIX--Web3-Memory-Challenge
npm install
node server.js
```

### 2. Play a Round
1. Connect wallet
2. Start a round (infinite or daily)
3. Watch the sequence
4. Click the cells
5. Submit round

### 3. Verify Data Collection
```bash
# Check if dataset.csv was updated
tail -n 1 dataset.csv

# Count total rounds logged
wc -l dataset.csv
```

### 4. Inspect Telemetry Data
- Open browser DevTools Console
- Look for TelemetryTracker logs
- Check network tab for POST to `/api/round/submit/*`
- Verify telemetry object in request payload

## Privacy & Security Considerations

1. **No PII Collection**: Only wallet addresses (pseudonymous)
2. **Device Fingerprinting**: Used only for cheat detection
3. **Local Storage**: CSV file stored on server
4. **Data Retention**: Configure cleanup policy as needed
5. **Consent**: Add user consent for data collection (recommended)

## Next Steps

1. **Data Collection**: Play multiple rounds to generate training data
2. **Model Training**: Use `ai/scripts/train_xgboost.py` with collected data
3. **Feature Selection**: Analyze feature importance from model
4. **Threshold Tuning**: Adjust cheat detection thresholds
5. **Integration**: Connect trained model back to game for live detection

## Troubleshooting

### Telemetry Not Logging
- Check browser console for errors
- Verify `telemetryTracker.js` loaded successfully
- Confirm `TelemetryLogger` initialized on server
- Check file permissions for `dataset.csv`

### Missing Features in CSV
- Verify feature extraction logic in `telemetryLogger.js`
- Check for null/undefined values in telemetry data
- Ensure all required fields present in API request

### Mouse Tracking Not Working
- Verify mouse event listeners in `telemetryTracker.js`
- Check if game grid element exists when tracking starts
- Confirm `setupMouseTracking()` called in `startRound()`

## Performance Considerations

- **Mouse Move Sampling**: Throttled to 50ms intervals to reduce data size
- **Memory Usage**: Cleared after each round submission
- **CSV Writing**: Synchronous append (consider async for high traffic)
- **Feature Calculation**: O(n) complexity for most features

## Future Enhancements

1. **Real-time Detection**: Process telemetry on-the-fly during gameplay
2. **Advanced Features**: Eye tracking (if available), keyboard patterns
3. **Distributed Logging**: Send to database instead of CSV
4. **Analytics Dashboard**: Visualize player behavior patterns
5. **A/B Testing**: Different detection algorithms

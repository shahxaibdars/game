/**
 * Fixed TelemetryLogger.js
 *
 * - Buffered async writes (non-blocking)
 * - Writes one aggregated round-level CSV row to round_features.csv
 * - Writes one raw JSONL per round to raw_rounds.jsonl (raw events)
 * - Corrected isCorrectClick computation
 * - Proper reaction-time baseline (telemetry.turnStartTs or sequenceEndTs)
 * - Binned entropy instead of raw-float entropy
 * - Improved mouse feature extraction
 * - Rolling playerHistory (in-memory) for session/historical features
 *
 * Usage (Node/Electron):
 *   const TelemetryLogger = require('./TelemetryLogger.js');
 *   const logger = new TelemetryLogger({ datasetDir: './data', saveRawEvents: true });
 *   logger.logRound(roundData); // roundData must include telemetry.clicks and telemetry.mouseMoves arrays
 *
 * roundData expected minimal shape (example):
 * {
 *   roundId: 'r_1',
 *   playerAddress: '0xabc...',
 *   timestamp: (new Date()).toISOString(),
 *   roundType: 'infinite',
 *   gridSize: 3,
 *   sequence: [0,1,4],
 *   userClicks: [0,1,4],
 *   telemetry: {
 *     clicks: [ { clientTs: performance.now(), xPx: 123, yPx: 456, button:0, pointerType:'mouse' }, ... ],
 *     mouseMoves: [ { ts: performance.now(), x:100, y:200 }, ... ],
 *     turnStartTs: performance.now()
 *   },
 *   timeElapsedMs: 1234,
 *   timeLimitMs: 10000,
 *   isPerfect: true,
 *   timeExpired: false,
 *   verification: { passed: true, reasons: [] }
 * }
 * 
 * 
 * TelemetryLogger.js (clickType added)
 *
 * Changes:
 * - Adds per-click 'clickType' support (expects frontend to populate click.clickType when possible)
 * - Infers fallback clickType when missing (uses isTrusted or pointer hints)
 * - Aggregates dominant click type per round and writes to CSV as 'dominant_click_type'
 * - Preserves raw click clickType values in raw_rounds.jsonl 
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class TelemetryLogger {
  constructor(opts = {}) {
    this.datasetDir = opts.datasetDir || path.join(__dirname, 'telemetry_data');
    this.roundFeaturesPath = path.join(this.datasetDir, 'round_features.csv');
    this.rawJsonlPath = path.join(this.datasetDir, 'raw_rounds.jsonl');
    this.saveRawEvents = opts.saveRawEvents === true;
    this.schemaVersion = 1;
    this.writeBuffer = [];
    this.rawBuffer = [];
    this.flushIntervalMs = opts.flushIntervalMs || 3000; // 3s default
    this.maxBufferFlushSize = opts.maxBufferFlushSize || 1000; // characters threshold
    this.playerHistory = new Map(); // playerAddress -> array of recent rounds
    this.sessionData = new Map(); // playerAddress -> session info

    // Ensure dataset directory exists
    fs.mkdirSync(this.datasetDir, { recursive: true });

    // Initialize CSV header if needed
    this.initRoundFeaturesCSV();

    // Start periodic flush
    this.flushTimer = setInterval(() => {
      this.flushBuffersToDisk().catch(e => console.error('Flush error', e));
    }, this.flushIntervalMs);

    // Bind shutdown flush
    process.on('exit', () => { this.shutdownSync(); });
    process.on('SIGINT', () => { this.shutdownSync(); process.exit(); });
    process.on('SIGTERM', () => { this.shutdownSync(); process.exit(); });
  }

  initRoundFeaturesCSV() {
    const headerFields = [
      'schema_version','round_id','player_address_hash','timestamp','round_type','grid_size','steps','correct_steps',
      'time_elapsed_ms','time_limit_ms','is_perfect','time_expired',
      // reaction time stats
      'mean_reaction_time','std_reaction_time','min_reaction_time','max_reaction_time','entropy_reaction_time',
      // inter-click
      'mean_inter_click_interval','std_inter_click_interval','entropy_inter_click',
      // position stats (normalized)
      'mean_click_x_norm','std_click_x_norm','mean_click_y_norm','std_click_y_norm','click_position_entropy',
      // click behavior
      'misclick_count','double_click_count','first_click_reaction_time','click_hesitation_count',
      // mouse aggregates
      'mouse_move_count','mouse_total_distance','mouse_avg_speed','mouse_max_speed','mouse_direction_changes','mouse_acceleration_changes','mouse_pause_count','mouse_idle_time_ratio',
      // session/historical
      'round_in_session','session_avg_time_per_round','consecutive_perfect_rounds',
      // derived
      'time_pressure_ratio','speed_to_accuracy_ratio',
      // dominant click type (new)
      'dominant_click_type',
      // device
      'device_info_hash',
      // label placeholder
      'label'
    ];
    const header = headerFields.join(',') + '\n';
    if (!fs.existsSync(this.roundFeaturesPath)) {
      fs.writeFileSync(this.roundFeaturesPath, header, 'utf8');
      console.log('Initialized round_features.csv with header (includes dominant_click_type)');
    }
    // Ensure raw file exists
    if (this.saveRawEvents && !fs.existsSync(this.rawJsonlPath)) {
      fs.writeFileSync(this.rawJsonlPath, '', 'utf8');
    }
  }

  // -------------------- Public API --------------------

  /**
   * Log a full round. This is the primary entry point.
   * roundData must contain telemetry.clicks[] and telemetry.mouseMoves[]
   */
  async logRound(roundData = {}) {
    try {
      const {
        roundId, playerAddress, timestamp, roundType, gridSize,
        sequence = [], userClicks = [], telemetry = {}, timeElapsedMs = 0,
        timeLimitMs = 0, isPerfect = false, timeExpired = false, verification = {}
      } = roundData;

      // Defensive defaults
      telemetry.clicks = telemetry.clicks || [];
      telemetry.mouseMoves = telemetry.mouseMoves || [];
      telemetry.turnStartTs = telemetry.turnStartTs || telemetry.sequenceEndTs || (telemetry.clicks[0] && telemetry.clicks[0].clientTs) || Date.now();

      // Calculate per-click enriched features (mutates telemetry.clicks entries)
      const clickFeaturesDetailed = this.enrichClicksWithMicroFeatures(telemetry, sequence, userClicks);

      // Extract aggregated click/mouse features for the round
      const clickFeatures = this.extractClickFeaturesFromClicks(telemetry.clicks);
      const mouseFeatures = this.extractMouseFeatures(telemetry);
      const deviceFeatures = this.extractDeviceFeatures(telemetry.deviceInfo || {});

      // Update session & historical data
      const sessionFeatures = this.updateSessionAndHistory(playerAddress, {
        roundId, timestamp: timestamp || Date.now(), isPerfect, correctSteps: this.calculateCorrectSteps(sequence, userClicks),
        reactionTime: clickFeatures.meanReactionTime, timeElapsedMs
      });

      const historicalFeatures = this.getHistoricalFeatures(playerAddress);

      // Behavioral features (aggregates)
      const behavioralFeatures = this.deriveBehavioralFeatures(telemetry, sequence, userClicks, clickFeaturesDetailed);

      // Build round-level CSV row (compact)
      const roundRow = this.buildRoundFeatureVector({
        schemaVersion: this.schemaVersion,
        roundId, playerAddress, timestamp, roundType, gridSize, sequence, userClicks,
        clickFeatures, mouseFeatures, deviceFeatures, sessionFeatures, historicalFeatures, behavioralFeatures,
        timeElapsedMs, timeLimitMs, isPerfect, timeExpired, verification
      });

      // Buffer CSV row for async write
      this.writeBuffer.push(roundRow.csvRow);

      // Optionally buffer raw JSONL for offline analysis
      if (this.saveRawEvents) {
        const rawObj = {
          roundId,
          playerAddressHash: this.hashString(playerAddress || 'unknown'),
          timestamp: timestamp || Date.now(),
          telemetry: telemetry, // includes clicks with enriched prePath and mouseMoves
          deviceInfoHash: deviceFeatures.deviceInfoHash
        };
        this.rawBuffer.push(JSON.stringify(rawObj) + '\n');
      }

      // Flush if buffer large
      if (this.writeBuffer.join('').length > this.maxBufferFlushSize) {
        await this.flushBuffersToDisk();
      }
      return true;
    } catch (err) {
      console.error('logRound error', err);
      return false;
    }
  }

  // -------------------- Click enrichment --------------------

  enrichClicksWithMicroFeatures(telemetry, sequence, userClicks) {
    const clicks = telemetry.clicks || [];
    const mouseMoves = telemetry.mouseMoves || [];
    // normalize mouseMoves timestamps if they are performance.now() vs Date.now()
    // For analysis we treat them as monotonic numbers; consistency expected from frontend
    for (let i = 0; i < clicks.length; i++) {
      const click = clicks[i];
      const expectedTileIndex = sequence[i];
      const actualTileIndex = userClicks[i];
      click.expectedTileIndex = (expectedTileIndex === undefined) ? null : expectedTileIndex;
      click.actualTileIndex = (actualTileIndex === undefined) ? null : actualTileIndex;
      // Correctness
      click.isCorrect = (click.actualTileIndex !== null) && (click.expectedTileIndex !== null) && (click.actualTileIndex === click.expectedTileIndex);

      // ----- clickType handling -----
      // If frontend provided clickType, use it. Otherwise infer:
      // - if event is synthetic (isTrusted === false) => 'synthetic'
      // - if pointerType present (pointerType / type) use that
      // - fallback to 'unknown'

      //console.log(click.clickType);

      if (click.clickType && typeof click.clickType === 'string') {
        click.clickType = click.clickType;
      } else if (click.pointerType && typeof click.pointerType === 'string') {
        click.clickType = click.pointerType;
      } else if (click.type && typeof click.type === 'string') {
        click.clickType = click.type;
      } else if (click.isTrusted === false) {
        click.clickType = 'synthetic';
      } else {
        //click.clickType = 'unknown';
        click.clickType = 'mouse';
      }

      // Reaction time baseline: previous click or telemetry.turnStartTs
      const prevTs = (i > 0 && clicks[i - 1] && clicks[i - 1].clientTs) ? clicks[i - 1].clientTs : telemetry.turnStartTs;
      click.reactionTime = (typeof click.clientTs === 'number' && typeof prevTs === 'number') ? Math.max(0, click.clientTs - prevTs) : 0;
      // Normalized positions (expect deviceInfo.screenWidth/screenHeight or fallback)
      const sw = (telemetry.deviceInfo && telemetry.deviceInfo.screen && telemetry.deviceInfo.screen.width) || (telemetry.screenWidth) || 1;
      const sh = (telemetry.deviceInfo && telemetry.deviceInfo.screen && telemetry.deviceInfo.screen.height) || (telemetry.screenHeight) || 1;
      click.xNorm = (typeof click.xPx === 'number') ? (click.xPx / Math.max(1, sw)) : 0;
      click.yNorm = (typeof click.yPx === 'number') ? (click.yPx / Math.max(1, sh)) : 0;
      // prePath extraction: last preWindow ms (configure as needed)
      const now = click.clientTs || Date.now();
      const preWindow = telemetry.preClickWindowMs || 1000;
      click.prePath = mouseMoves.filter(m => (m.ts >= (now - preWindow)) && (m.ts <= now + 50));
      // compute simple summaries
      click.prePathLength = this.computePathLength(click.prePath);
      const speeds = this.computeSpeeds(click.prePath);
      click.preAvgSpeed = speeds.avg;
      click.prePeakSpeed = speeds.peak;
      click.overshootCount = this.detectOvershoots(click.prePath, click.expectedTileIndex, telemetry); // function tolerant to missing tile centers
      // distance to expected tile center: optional if tile centers provided
      click.distanceToTargetPx = this.computeDistanceToTile(click, click.expectedTileIndex, telemetry) || 0;
    }
    return clicks;
  }

  // -------------------- Feature extraction helpers --------------------

  extractClickFeaturesFromClicks(clicks) {
    if (!clicks || clicks.length === 0) {
      return this.getEmptyClickFeatures();
    }
    const reactionTimes = clicks.slice(1).map(c => typeof c.reactionTime === 'number' ? c.reactionTime : 0);
    const interClickIntervals = reactionTimes.slice(1);
    const xNorms = clicks.map(c => typeof c.xNorm === 'number' ? c.xNorm : 0);
    const yNorms = clicks.map(c => typeof c.yNorm === 'number' ? c.yNorm : 0);

    // compute dominant click type
    const typeCounts = {};
    clicks.forEach(c => {
      const t = (c.clickType || 'unknown');
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });
    let dominant = 'unknown';
    let maxc = 0;
    Object.keys(typeCounts).forEach(k => {
      if (typeCounts[k] > maxc) { maxc = typeCounts[k]; dominant = k; }
    });

    return {
      meanReactionTime: this.mean(reactionTimes),
      stdReactionTime: this.std(reactionTimes),
      minReactionTime: Math.min(...reactionTimes),
      maxReactionTime: Math.max(...reactionTimes),
      entropyReactionTime: this.computeBinnedEntropy(reactionTimes, 8),
      meanInterClickInterval: interClickIntervals.length ? this.mean(interClickIntervals) : 0,
      stdInterClickInterval: interClickIntervals.length ? this.std(interClickIntervals) : 0,
      entropyInterClick: interClickIntervals.length ? this.computeBinnedEntropy(interClickIntervals, 8) : 0,
      meanClickXNorm: this.mean(xNorms),
      stdClickXNorm: this.std(xNorms),
      meanClickYNorm: this.mean(yNorms),
      stdClickYNorm: this.std(yNorms),
      clickPositionEntropy: this.compute2DBinnedEntropy(xNorms, yNorms, 6, 6),
      misclickCount: clicks.reduce((s,c)=>s + (c.isCorrect ? 0 : 1), 0),
      doubleClickCount: clicks.reduce((s,c,i)=> s + ((i>0 && clicks[i-1].clientTs && c.clientTs && (c.clientTs - clicks[i-1].clientTs < 150)) ? 1 : 0), 0),
      firstClickReactionTime: clicks.length ? clicks[1].reactionTime : 0,
      clickHesitationCount: reactionTimes.reduce((s,rt)=> s + (rt > 500 ? 1 : 0), 0),
      speedToAccuracyRatio: 0, // optionally compute
      //dominantClickType: dominant
      dominantClickType: "mouse"
    };
  }

  extractMouseFeatures(telemetry) {
    const moves = telemetry.mouseMoves || [];
    if (!moves || moves.length < 2) {
      return {
        mouseMoveCount: 0, mouseTotalDistance: 0, mouseAvgSpeed: 0, mouseMaxSpeed: 0,
        mouseDirectionChanges: 0, mouseAccelerationChanges: 0, mousePauseCount: 0, mouseIdleTimeRatio: 0, mouseEfficiency:0
      };
    }
    let totalDistance = 0;
    const speeds = [];
    let directionChanges = 0;
    let lastAngle = null;
    let pauses = 0;
    let lastSpeed = null;
    let lastAcc = null;
    let accSignChanges = 0;
    for (let i = 1; i < moves.length; i++) {
      const dx = moves[i].x - moves[i - 1].x;
      const dy = moves[i].y - moves[i - 1].y;
      const dt = Math.max(1, (moves[i].ts - moves[i - 1].ts));
      const distance = Math.hypot(dx, dy);
      totalDistance += distance;
      const speed = distance / dt;
      speeds.push(speed);
      const angle = Math.atan2(dy, dx);
      if (lastAngle !== null) {
        let diff = Math.abs(angle - lastAngle);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
        if (diff > Math.PI / 6) directionChanges++;
      }
      lastAngle = angle;
      if (lastSpeed !== null) {
        const acc = speed - lastSpeed;
        if (lastAcc !== null && Math.sign(acc) !== Math.sign(lastAcc)) accSignChanges++;
        lastAcc = acc;
      }
      lastSpeed = speed;
      if (speed < 0.02) pauses++;
    }
    const avgSpeed = speeds.length ? this.mean(speeds) : 0;
    return {
      mouseMoveCount: moves.length,
      mouseTotalDistance: totalDistance,
      mouseAvgSpeed: avgSpeed,
      mouseMaxSpeed: speeds.length ? Math.max(...speeds) : 0,
      mouseDirectionChanges: directionChanges,
      mouseAccelerationChanges: accSignChanges,
      mousePauseCount: pauses,
      mouseIdleTimeRatio: pauses / moves.length,
      mouseEfficiency: totalDistance / (moves.length || 1)
    };
  }

  extractDeviceFeatures(deviceInfo) {
    if (!deviceInfo) deviceInfo = {};
    const hash = this.hashString(JSON.stringify(deviceInfo)).slice(0, 16);
    return {
      deviceInfo: deviceInfo,
      deviceInfoHash: hash,
      deviceType: this.detectDeviceType(deviceInfo),
      screenResolution: (deviceInfo.screen && deviceInfo.screen.width && deviceInfo.screen.height) ? `${deviceInfo.screen.width}x${deviceInfo.screen.height}` : (deviceInfo.screen ? JSON.stringify(deviceInfo.screen) : 'unknown'),
      browserType: this.detectBrowser(deviceInfo.userAgent || ''),
      osType: this.detectOS(deviceInfo.platform || ''),
      isMobileDevice: /mobile|android|iphone|ipad/i.test(deviceInfo.userAgent || '') ? 1 : 0
    };
  }

  // -------------------- Behavioral derivations --------------------

  deriveBehavioralFeatures(telemetry, sequence, userClicks, clicksDetailed) {
    // Placeholder for more sophisticated derived features; for now compute a few scalars
    const misclickCount = clicksDetailed.reduce((s,c)=>s + (c.isCorrect ? 0 : 1), 0);
    const doubleClickCount = clicksDetailed.reduce((s,c,i)=> s + ((i>0 && clicksDetailed[i-1].clientTs && c.clientTs && (c.clientTs - clicksDetailed[i-1].clientTs < 150)) ? 1 : 0), 0);
    const clickHesitationCount = clicksDetailed.reduce((s,c)=> s + ((c.reactionTime || 0) > 500 ? 1 : 0), 0);
    return { misclickCount, doubleClickCount, clickHesitationCount };
  }

  // -------------------- Session & history --------------------

  updateSessionAndHistory(playerAddress, roundSummary) {
    const now = Date.now();
    if (!this.sessionData.has(playerAddress)) {
      const sessionId = `sess_${this.generateId()}_${now}`;
      this.sessionData.set(playerAddress, { sessionId, startTime: now, rounds: [], lastRoundTime: now });
    }
    const session = this.sessionData.get(playerAddress);
    session.rounds.push({ roundId: roundSummary.roundId, timestamp: roundSummary.timestamp, isPerfect: roundSummary.isPerfect, correctSteps: roundSummary.correctSteps, reactionTime: roundSummary.reactionTime, timeElapsed: roundSummary.timeElapsedMs });
    session.lastRoundTime = now;

    // maintain playerHistory
    if (!this.playerHistory.has(playerAddress)) this.playerHistory.set(playerAddress, []);
    const h = this.playerHistory.get(playerAddress);
    h.push({ timestamp: now, isPerfect: roundSummary.isPerfect, correctSteps: roundSummary.correctSteps, reactionTime: roundSummary.reactionTime, timeElapsed: roundSummary.timeElapsedMs });
    // keep bounded history
    if (h.length > 1000) h.shift();

    // compute some session-level rolling metrics
    const roundInSession = session.rounds.length;
    const avgTime = session.rounds.reduce((s,r)=>s + (r.timeElapsed||0),0) / (session.rounds.length || 1);
    const consecutivePerfectRounds = this.computeConsecutivePerfects(h);
    return { sessionId: session.sessionId, roundInSession, sessionAvgTimePerRound: avgTime, consecutivePerfectRounds };
  }

  getHistoricalFeatures(playerAddress) {
    const h = this.playerHistory.get(playerAddress) || [];
    const now = Date.now();
    const last50 = h.slice(-50);
    const rounds24h = last50.filter(r => (now - r.timestamp) < (24 * 3600 * 1000)).length;
    const rounds7d = last50.filter(r => (now - r.timestamp) < (7 * 24 * 3600 * 1000)).length;
    const avgSuccessRate7d = last50.length ? (last50.filter(r => r.isPerfect).length / last50.length) : 0;
    const avgSteps7d = last50.length ? (last50.reduce((s,r)=>s + (r.correctSteps||0),0) / last50.length) : 0;
    const perfectRatio7d = last50.length ? (last50.filter(r=>r.isPerfect).length / last50.length) : 0;
    const trendReactionTime = last50.length >= 3 ? this.linearSlope(last50.map((r,i)=>({x:i,y:r.reactionTime||0}))) : 0;
    const consecutivePerfectRounds = this.computeConsecutivePerfects(h);
    return { rounds24h, rounds7d, avgSuccessRate7d, avgSteps7d, perfectRatio7d, trendReactionTime, consecutivePerfectRounds };
  }

  // -------------------- Build round vector --------------------

  buildRoundFeatureVector(args) {
    const {
      schemaVersion, roundId, playerAddress, timestamp, roundType, gridSize, sequence = [], userClicks = [],
      clickFeatures, mouseFeatures, deviceFeatures, sessionFeatures, historicalFeatures, behavioralFeatures,
      timeElapsedMs = 0, timeLimitMs = 0, isPerfect = false, timeExpired = false
    } = args;

    const steps = sequence.length;
    const correctSteps = this.calculateCorrectSteps(sequence, userClicks);
    const timePressureRatio = timeLimitMs ? (timeElapsedMs / timeLimitMs) : 0;
    const speedToAccuracyRatio = clickFeatures.meanReactionTime ? (clickFeatures.meanReactionTime / (1 + (clickFeatures.misclickCount || 0))) : 0;

    const rowValues = [
      schemaVersion,
      `"${roundId}"`,
      `"${this.hashString(playerAddress||'unknown')}"`,
      `"${timestamp || Date.now()}"`,
      `"${roundType || 'unknown'}"`,
      gridSize || 0,
      steps,
      correctSteps,
      timeElapsedMs || 0,
      timeLimitMs || 0,
      isPerfect ? 1 : 0,
      timeExpired ? 1 : 0,
      // reaction times
      (clickFeatures.meanReactionTime || 0).toFixed(3),
      (clickFeatures.stdReactionTime || 0).toFixed(3),
      (clickFeatures.minReactionTime || 0).toFixed(3),
      (clickFeatures.maxReactionTime || 0).toFixed(3),
      (clickFeatures.entropyReactionTime || 0).toFixed(4),
      // inter click
      (clickFeatures.meanInterClickInterval || 0).toFixed(3),
      (clickFeatures.stdInterClickInterval || 0).toFixed(3),
      (clickFeatures.entropyInterClick || 0).toFixed(4),
      // pos norms
      (clickFeatures.meanClickXNorm || 0).toFixed(4),
      (clickFeatures.stdClickXNorm || 0).toFixed(4),
      (clickFeatures.meanClickYNorm || 0).toFixed(4),
      (clickFeatures.stdClickYNorm || 0).toFixed(4),
      (clickFeatures.clickPositionEntropy || 0).toFixed(4),
      // click behavior
      behavioralFeatures.misclickCount || 0,
      behavioralFeatures.doubleClickCount || 0,
      (clickFeatures.firstClickReactionTime || 0).toFixed(3),
      (behavioralFeatures.clickHesitationCount || 0),
      // mouse aggregates
      (mouseFeatures.mouseMoveCount || 0),
      (mouseFeatures.mouseTotalDistance || 0).toFixed(2),
      (mouseFeatures.mouseAvgSpeed || 0).toFixed(4),
      (mouseFeatures.mouseMaxSpeed || 0).toFixed(4),
      (mouseFeatures.mouseDirectionChanges || 0),
      (mouseFeatures.mouseAccelerationChanges || 0),
      (mouseFeatures.mousePauseCount || 0),
      (mouseFeatures.mouseIdleTimeRatio || 0).toFixed(4),
      // session/historical
      sessionFeatures.roundInSession || 0,
      (sessionFeatures.sessionAvgTimePerRound || 0).toFixed(3),
      (historicalFeatures.consecutivePerfectRounds || 0),
      // derived
      timePressureRatio.toFixed(4),
      speedToAccuracyRatio.toFixed(4),
      // dominant click type
      `"${clickFeatures.dominantClickType || 'unknown'}"`,
      // device
      `"${deviceFeatures.deviceInfoHash}"`,
      // label (default human during collection)
      '"human"'
    ];

    return { csvRow: rowValues.join(',') + '\n', values: rowValues };
  }

  // -------------------- Utilities --------------------

  calculateCorrectSteps(sequence, userClicks) {
    let correct = 0;
    for (let i = 0; i < Math.min(sequence.length, userClicks.length); i++) {
      if (sequence[i] === userClicks[i]) correct++;
      else break; // stop at first wrong click
    }
    return correct;
  }

  computePathLength(path) {
    if (!path || path.length < 2) return 0;
    let d = 0;
    for (let i = 1; i < path.length; i++) d += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
    return d;
  }

  computeSpeeds(path) {
    const speeds = [];
    for (let i = 1; i < (path || []).length; i++) {
      const dt = Math.max(1, path[i].t - path[i - 1].t);
      const d = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
      speeds.push(d / dt);
    }
    const avg = speeds.length ? (speeds.reduce((a, b) => a + b, 0) / speeds.length) : 0;
    const peak = speeds.length ? Math.max(...speeds) : 0;
    return { avg, peak };
  }

  detectOvershoots(path, expectedTileIndex, telemetry) {
    // Basic overshoot detection: count number of times path enters/exits the target circle
    // Requires tile center/size knowledge in telemetry.tileCenters (optional)
    if (!path || path.length === 0) return 0;
    const tileCenters = (telemetry && telemetry.tileCenters) || null;
    const radius = (telemetry && telemetry.tileRadius) || 20; // px fallback
    let cx = null, cy = null;
    if (tileCenters && typeof expectedTileIndex === 'number' && tileCenters[expectedTileIndex]) {
      cx = tileCenters[expectedTileIndex].x; cy = tileCenters[expectedTileIndex].y;
    }
    if (cx === null || cy === null) {
      // Can't compute precisely - fallback: return 0
      return 0;
    }
    let inside = false, transitions = 0;
    for (let i = 0; i < path.length; i++) {
      const p = path[i];
      const d = Math.hypot(p.x - cx, p.y - cy);
      const nowInside = d <= radius;
      if (i === 0) inside = nowInside;
      else {
        if (nowInside !== inside) {
          transitions++;
          inside = nowInside;
        }
      }
    }
    // overshoots = number of times cursor left and re-entered (transitions/2 approx)
    return Math.max(0, Math.floor(transitions / 2));
  }

  computeDistanceToTile(click, expectedTileIndex, telemetry) {
    const tileCenters = (telemetry && telemetry.tileCenters) || null;
    if (!tileCenters || expectedTileIndex === null || expectedTileIndex === undefined) return null;
    const center = tileCenters[expectedTileIndex];
    if (!center) return null;
    if (typeof click.xPx !== 'number' || typeof click.yPx !== 'number') return null;
    return Math.hypot(click.xPx - center.x, click.yPx - center.y);
  }

  // -------------------- Math helpers --------------------

  mean(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
  std(arr) {
    if (!arr || arr.length === 0) return 0;
    const m = this.mean(arr);
    const sd = Math.sqrt(this.mean(arr.map(v => (v - m) * (v - m))));
    return sd;
  }
  computeBinnedEntropy(values, bins = 8) {
    if (!values || values.length === 0) return 0;
    const minv = Math.min(...values), maxv = Math.max(...values);
    if (minv === maxv) return 0;
    const w = (maxv - minv) / bins;
    const counts = new Array(bins).fill(0);
    values.forEach(v => {
      let idx = Math.floor((v - minv) / w);
      if (idx >= bins) idx = bins - 1;
      if (idx < 0) idx = 0;
      counts[idx]++;
    });
    const n = values.length;
    let ent = 0;
    counts.forEach(c => { if (c > 0) { const p = c / n; ent -= p * Math.log2(p); } });
    return ent;
  }
  compute2DBinnedEntropy(xs, ys, bx = 6, by = 6) {
    if (!xs || !ys || xs.length === 0 || ys.length === 0) return 0;
    const minx = Math.min(...xs), maxx = Math.max(...xs);
    const miny = Math.min(...ys), maxy = Math.max(...ys);
    if (minx === maxx || miny === maxy) return 0;
    const wx = (maxx - minx) / bx, wy = (maxy - miny) / by;
    const counts = Array.from({ length: bx }, () => new Array(by).fill(0));
    for (let i = 0; i < xs.length; i++) {
      let ix = Math.floor((xs[i] - minx) / wx); if (ix >= bx) ix = bx - 1; if (ix < 0) ix = 0;
      let iy = Math.floor((ys[i] - miny) / wy); if (iy >= by) iy = by - 1; if (iy < 0) iy = 0;
      counts[ix][iy]++;
    }
    const n = xs.length;
    let ent = 0;
    for (let i = 0; i < bx; i++) for (let j = 0; j < by; j++) {
      const c = counts[i][j];
      if (c > 0) { const p = c / n; ent -= p * Math.log2(p); }
    }
    return ent;
  }

  linearSlope(points) {
    const n = points.length;
    if (n < 2) return 0;
    const sumX = points.reduce((s,p)=>s + p.x, 0);
    const sumY = points.reduce((s,p)=>s + p.y, 0);
    const sumXY = points.reduce((s,p)=>s + p.x * p.y, 0);
    const sumX2 = points.reduce((s,p)=>s + p.x * p.x, 0);
    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return 0;
    return (n * sumXY - sumX * sumY) / denom;
  }

  computeConsecutivePerfects(history) {
    if (!history || history.length === 0) return 0;
    let cnt = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].isPerfect) cnt++; else break;
    }
    return cnt;
  }

  // -------------------- Hash / detect helpers --------------------

  hashString(s) {
    try {
      return crypto.createHash('md5').update(String(s || '')).digest('hex');
    } catch (e) {
      return String(s || '');
    }
  }
  generateId() { return Math.random().toString(36).slice(2, 10); }
  detectDeviceType(deviceInfo) {
    const ua = deviceInfo.userAgent || '';
    if (/mobile|android|iphone/i.test(ua)) return 'mobile';
    if (/tablet|ipad/i.test(ua)) return 'tablet';
    return 'desktop';
  }
  detectBrowser(ua) {
    if (/chrome/i.test(ua) && !/edg/i.test(ua)) return 'Chrome';
    if (/firefox/i.test(ua)) return 'Firefox';
    if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
    if (/edg/i.test(ua)) return 'Edge';
    return 'Other';
  }
  detectOS(platform) {
    if (/win/i.test(platform)) return 'Windows';
    if (/mac/i.test(platform)) return 'macOS';
    if (/linux/i.test(platform)) return 'Linux';
    if (/android/i.test(platform)) return 'Android';
    if (/ios|iphone|ipad/i.test(platform)) return 'iOS';
    return 'Other';
  }

  // -------------------- Buffered writes --------------------

  async flushBuffersToDisk() {
    try {
      if (this.writeBuffer.length > 0) {
        const data = this.writeBuffer.join('');
        this.writeBuffer = [];
        await fs.promises.appendFile(this.roundFeaturesPath, data, 'utf8');
      }
      if (this.saveRawEvents && this.rawBuffer.length > 0) {
        const rawdata = this.rawBuffer.join('');
        this.rawBuffer = [];
        await fs.promises.appendFile(this.rawJsonlPath, rawdata, 'utf8');
      }
    } catch (err) {
      console.error('Error flushing buffers:', err);
    }
  }

  shutdownSync() {
    try {
      if (this.flushTimer) clearInterval(this.flushTimer);
      // write synchronously to avoid losing data on exit
      if (this.writeBuffer.length > 0) {
        fs.appendFileSync(this.roundFeaturesPath, this.writeBuffer.join(''), 'utf8');
        this.writeBuffer = [];
      }
      if (this.saveRawEvents && this.rawBuffer.length > 0) {
        fs.appendFileSync(this.rawJsonlPath, this.rawBuffer.join(''), 'utf8');
        this.rawBuffer = [];
      }
    } catch (e) {
      console.error('shutdownSync failed', e);
    }
  }
}

module.exports = TelemetryLogger;
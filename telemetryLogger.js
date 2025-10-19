/**
 * Enhanced Telemetry Logging System for MEMORIX Game
 * 
 * This module captures comprehensive telemetry data per click for anti-cheat ML model training.
 * Features are based on the dataset.csv schema for XGBoost training.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class TelemetryLogger {
    constructor() {
        this.datasetPath = path.join(__dirname, 'dataset.csv');
        this.sessionData = new Map(); // playerAddress -> session data
        this.playerHistory = new Map(); // playerAddress -> historical data
        this.initializeDataset();
    }

    initializeDataset() {
        // Check if dataset exists, if not create with headers
        if (!fs.existsSync(this.datasetPath)) {
            const headers = [
                'round_id', 'click_number', 'player_address', 'timestamp', 'round_type', 'grid_size', 'steps', 'correct_steps',
                'time_elapsed_ms', 'time_limit_ms', 'is_perfect', 'time_expired',
                // Reaction time features
                'mean_reaction_time', 'std_reaction_time', 'min_reaction_time', 'max_reaction_time', 'entropy_reaction_time',
                // Inter-click interval features
                'mean_inter_click_interval', 'std_inter_click_interval', 'entropy_inter_click',
                // Click position features
                'mean_click_x', 'std_click_x', 'mean_click_y', 'std_click_y', 'click_position_entropy',
                // Mouse movement features
                'mouse_move_count', 'mouse_total_distance', 'mouse_avg_speed', 'mouse_max_speed',
                'mouse_direction_changes', 'mouse_acceleration_changes', 'mouse_pause_count',
                // Device info
                'device_info', 'device_info_hash', 'session_id', 'session_id_hash', 'round_in_session',
                // Cross-round features
                'cv_reaction_time_across_rounds', 'cv_inter_click_interval_across_rounds', 'cv_mouse_speed_across_rounds',
                'pattern_repetition_score', 'time_of_day_variance', 'day_of_week_played',
                // Session aggregation features  
                'total_rounds_in_session', 'session_duration_total', 'session_success_rate', 'session_avg_time_per_round',
                'rounds_per_hour', 'session_pause_duration_total',
                // Time-based features
                '24h_rounds_played', '7d_rounds_played', '7d_avg_success_rate', '7d_avg_steps', '7d_perfect_round_ratio',
                'time_since_last_round_seconds', 'time_since_first_round_hours',
                // Trend features
                'trend_success_rate', 'trend_reaction_time',
                // Device features
                'device_type', 'screen_resolution', 'browser_type', 'os_type', 'is_mobile_device',
                'device_changes_count', 'unique_devices_7d',
                // Mouse behavior features
                'mouse_straightness_index', 'mouse_curvature_avg', 'mouse_jitter_ratio', 'mouse_overshoot_count',
                'mouse_ballistic_coefficient', 'mouse_idle_time_ratio',
                // Click behavior features
                'click_anticipation_score', 'click_accuracy_score', 'misclick_count', 'double_click_count',
                'click_rhythm_variance', 'click_hesitation_count', 'first_click_reaction_time',
                // Strategy features
                'optimal_path_deviation', 'backtrack_count', 'exploration_pattern_score',
                'difficulty_adjustment_response', 'learning_curve_slope',
                // Anomaly detection features
                'z_score_reaction_time', 'z_score_success_rate', 'outlier_round_ratio', 'performance_volatility',
                // Sequence features
                'consecutive_perfect_rounds', 'consecutive_failed_rounds', 'win_streak_max',
                'round_completion_rhythm', 'batch_playing_indicator',
                // Cross features
                'perfect_to_total_ratio', 'speed_to_accuracy_ratio', 'mouse_efficiency', 'time_pressure_ratio',
                // Verification
                'verification_passed', 'verification_reasons',
                // Label
                'label',
                // Multi-account features
                'shared_device_ratio', 'shared_ip_ratio', 'account_similarity_score', 'co_activity_score',
                'funding_linked_accounts', 'transfer_graph_degree', 'simultaneous_login_count',
                'inter_account_time_gap_mean', 'synchronized_action_rate', 'behavioral_hash_match_count',
                'repetitive_pattern_similarity', 'device_reuse_score',
                // Reward flow features
                'reward_flow_entropy', 'same_reward_recipient_ratio',
                // On-chain features
                'onchain_first_tx_time', 'onchain_last_tx_time', 'onchain_total_received', 'onchain_total_sent',
                'onchain_balance', 'onchain_contract_interaction_count', 'onchain_function_sequence',
                'onchain_neighbor_count', 'onchain_neighbor_stats', 'onchain_graph_distance_to_funder',
                // Timing manipulation features (Section 18)
                'tx_submission_timestamp', 'block_timestamp', 'block_number', 'submission_to_block_delay_ms',
                'gas_price_used', 'tx_position_in_block', 'block_miner_address_hash',
                'is_front_run_candidate', 'mempool_wait_time_ms', 'similar_tx_in_same_block', 
                'tx_nonce_gap', 'gas_price_vs_network_median',
                'daily_challenge_completion_time_of_day', 'is_near_day_boundary', 'daily_challenge_completer_rank',
                'time_since_last_daily_challenge', 'daily_challenge_submission_order', 'block_timestamp_vs_system_time_diff',
                'time_since_last_leaderboard_update', 'is_near_leaderboard_update', 'rounds_submitted_before_leaderboard',
                'leaderboard_position_change', 'time_between_round_submissions', 'submission_time_consistency_score',
                'peak_hour_submission_ratio', 'weekend_vs_weekday_ratio', 'reward_withdrawal_timing_pattern'
            ].join(',') + '\n';
            
            fs.writeFileSync(this.datasetPath, headers);
            console.log('✅ Dataset initialized with headers');
        }
    }

    /**
     * Log a complete round with comprehensive telemetry
     */
    logRound(roundData) {
        const {
            roundId,
            playerAddress,
            timestamp,
            roundType,
            gridSize,
            sequence,
            userClicks,
            telemetry,
            timeElapsedMs,
            timeLimitMs,
            isPerfect,
            timeExpired,
            verification
        } = roundData;

        // Calculate basic metrics
        const correctSteps = this.calculateCorrectSteps(sequence, userClicks);
        const steps = sequence.length;

        // Extract click-level features (aggregated for the round)
        const clickFeatures = this.extractClickFeatures(telemetry);
        
        // Extract mouse movement features
        const mouseFeatures = this.extractMouseFeatures(telemetry);
        
        // Extract device features
        const deviceFeatures = this.extractDeviceFeatures(telemetry.deviceInfo);
        
        // Get session features
        const sessionFeatures = this.getSessionFeatures(playerAddress, roundId);
        
        // Get historical features
        const historicalFeatures = this.getHistoricalFeatures(playerAddress);
        
        // Get cross-round features
        const crossRoundFeatures = this.getCrossRoundFeatures(playerAddress, clickFeatures);
        
        // Get behavioral features
        const behavioralFeatures = this.getBehavioralFeatures(telemetry, sequence, userClicks);

        // Multi-account detection (placeholder - would need IP tracking)
        const multiAccountFeatures = this.getMultiAccountFeatures(playerAddress);

        // On-chain features (placeholder - would need blockchain queries)
        const onchainFeatures = this.getOnchainFeatures(playerAddress);

        // ====== CLICK-LEVEL LOGGING ======
        // Generate a log entry for EACH click in the round
        const clicks = telemetry.clicks || [];
        const mouseMoves = telemetry.mouseMoves || [];
        
        for (let clickIndex = 0; clickIndex < clicks.length; clickIndex++) {
            const click = clicks[clickIndex];
            const clickTimestamp = new Date(click.clientTs || Date.now()).toISOString();
            
            // Calculate per-click features
            const clickNumber = clickIndex + 1;
            const isCorrectClick = clickIndex < correctSteps;
            const expectedTileIndex = sequence[clickIndex];
            const actualTileIndex = userClicks[clickIndex];
            
            // Reaction time for this specific click
            const prevClickTime = clickIndex > 0 ? clicks[clickIndex - 1].clientTs : telemetry.sequenceStartTs;
            const reactionTime = prevClickTime ? (click.clientTs - prevClickTime) : 0;
            
            this.logSingleClick(roundData, {
                clickIndex,
                clickNumber,
                click,
                clickTimestamp,
                isCorrectClick,
                expectedTileIndex,
                actualTileIndex,
                reactionTime,
                clickFeatures,
                mouseFeatures,
                deviceFeatures,
                sessionFeatures,
                historicalFeatures,
                crossRoundFeatures,
                behavioralFeatures,
                multiAccountFeatures,
                onchainFeatures,
                verification
            });
        }
        
        // Update session and historical data (after all clicks logged)
        this.updatePlayerData(playerAddress, roundData, {
            clickFeatures,
            mouseFeatures,
            deviceFeatures,
            sessionFeatures,
            historicalFeatures
        });

        console.log(`✅ Logged ${clicks.length} click-level entries for round ${roundId}`);
    }

    logSingleClick(roundData, clickData) {
        const {
            roundId,
            playerAddress,
            roundType,
            gridSize,
            sequence,
            userClicks,
            timeElapsedMs,
            timeLimitMs,
            isPerfect,
            timeExpired
        } = roundData;

        const {
            clickIndex,
            clickNumber,
            click,
            clickTimestamp,
            isCorrectClick,
            expectedTileIndex,
            actualTileIndex,
            reactionTime,
            clickFeatures,
            mouseFeatures,
            deviceFeatures,
            sessionFeatures,
            historicalFeatures,
            crossRoundFeatures,
            behavioralFeatures,
            multiAccountFeatures,
            onchainFeatures,
            verification
        } = clickData;

        const steps = sequence.length;
        const correctSteps = this.calculateCorrectSteps(sequence, userClicks);

        // Build CSV row for this single click
        const row = [
            `"${roundId}"`, // Clean round ID without click number
            clickNumber, // Separate click number column
            `"${playerAddress}"`,
            `"${clickTimestamp}"`,
            `"${roundType}"`,
            gridSize,
            steps,
            correctSteps,
            timeElapsedMs,
            timeLimitMs,
            isPerfect ? 1 : 0,
            timeExpired ? 1 : 0,
            // Reaction time features
            reactionTime, // THIS CLICK'S reaction time
            clickFeatures.stdReactionTime,
            clickFeatures.minReactionTime,
            clickFeatures.maxReactionTime,
            clickFeatures.entropyReactionTime,
            // Inter-click features
            clickFeatures.meanInterClickInterval,
            clickFeatures.stdInterClickInterval,
            clickFeatures.entropyInterClick,
            // Click position features for THIS click
            click.xPx || 0,
            clickFeatures.stdClickX,
            click.yPx || 0,
            clickFeatures.stdClickY,
            clickFeatures.clickPositionEntropy,
            // Mouse features
            mouseFeatures.mouseMoveCount,
            mouseFeatures.mouseTotalDistance,
            mouseFeatures.mouseAvgSpeed,
            mouseFeatures.mouseMaxSpeed,
            mouseFeatures.mouseDirectionChanges,
            mouseFeatures.mouseAccelerationChanges,
            mouseFeatures.mousePauseCount,
            // Device info
            `"${JSON.stringify(deviceFeatures.deviceInfo).replace(/"/g, '""')}"`,
            `"${deviceFeatures.deviceInfoHash}"`,
            `"${sessionFeatures.sessionId}"`,
            `"${sessionFeatures.sessionIdHash}"`,
            sessionFeatures.roundInSession,
            // Cross-round features
            crossRoundFeatures.cvReactionTime || '"NA"',
            crossRoundFeatures.cvInterClickInterval || '"NA"',
            crossRoundFeatures.cvMouseSpeed || '"NA"',
            crossRoundFeatures.patternRepetitionScore || '"NA"',
            crossRoundFeatures.timeOfDayVariance || '"NA"',
            crossRoundFeatures.dayOfWeekPlayed || '"NA"',
            // Session features
            sessionFeatures.totalRoundsInSession || '"NA"',
            sessionFeatures.sessionDurationTotal || '"NA"',
            sessionFeatures.sessionSuccessRate || '"NA"',
            sessionFeatures.sessionAvgTimePerRound || '"NA"',
            sessionFeatures.roundsPerHour || '"NA"',
            sessionFeatures.sessionPauseDurationTotal || '"NA"',
            // Time-based features
            historicalFeatures.rounds24h || '"NA"',
            historicalFeatures.rounds7d || '"NA"',
            historicalFeatures.avgSuccessRate7d || '"NA"',
            historicalFeatures.avgSteps7d || '"NA"',
            historicalFeatures.perfectRoundRatio7d || '"NA"',
            historicalFeatures.timeSinceLastRoundSeconds || '"NA"',
            historicalFeatures.timeSinceFirstRoundHours || '"NA"',
            // Trend features
            historicalFeatures.trendSuccessRate || '"NA"',
            historicalFeatures.trendReactionTime || '"NA"',
            // Device features
            `"${deviceFeatures.deviceType}"`,
            `"${deviceFeatures.screenResolution}"`,
            `"${deviceFeatures.browserType}"`,
            `"${deviceFeatures.osType}"`,
            deviceFeatures.isMobileDevice,
            deviceFeatures.deviceChangesCount || '"NA"',
            deviceFeatures.uniqueDevices7d || '"NA"',
            // Mouse behavior
            mouseFeatures.mouseStraightnessIndex || '"NA"',
            mouseFeatures.mouseCurvatureAvg || '"NA"',
            mouseFeatures.mouseJitterRatio || '"NA"',
            mouseFeatures.mouseOvershootCount || '"NA"',
            mouseFeatures.mouseBallisticCoefficient || '"NA"',
            mouseFeatures.mouseIdleTimeRatio || '"NA"',
            // Click behavior
            behavioralFeatures.clickAnticipationScore || '"NA"',
            behavioralFeatures.clickAccuracyScore || '"NA"',
            behavioralFeatures.misclickCount || '"NA"',
            behavioralFeatures.doubleClickCount || '"NA"',
            behavioralFeatures.clickRhythmVariance || '"NA"',
            behavioralFeatures.clickHesitationCount || '"NA"',
            behavioralFeatures.firstClickReactionTime || '"NA"',
            // Strategy features
            behavioralFeatures.optimalPathDeviation || '"NA"',
            behavioralFeatures.backtrackCount || '"NA"',
            behavioralFeatures.explorationPatternScore || '"NA"',
            behavioralFeatures.difficultyAdjustmentResponse || '"NA"',
            behavioralFeatures.learningCurveSlope || '"NA"',
            // Anomaly detection
            historicalFeatures.zScoreReactionTime || '"NA"',
            historicalFeatures.zScoreSuccessRate || '"NA"',
            historicalFeatures.outlierRoundRatio || '"NA"',
            historicalFeatures.performanceVolatility || '"NA"',
            // Sequence features
            historicalFeatures.consecutivePerfectRounds || '"NA"',
            historicalFeatures.consecutiveFailedRounds || '"NA"',
            historicalFeatures.winStreakMax || '"NA"',
            historicalFeatures.roundCompletionRhythm || '"NA"',
            historicalFeatures.batchPlayingIndicator || '"NA"',
            // Cross features
            historicalFeatures.perfectToTotalRatio || '"NA"',
            clickFeatures.speedToAccuracyRatio || '"NA"',
            mouseFeatures.mouseEfficiency || '"NA"',
            (timeElapsedMs / timeLimitMs).toFixed(4),
            // Verification
            verification.passed ? 1 : 0,
            `"${JSON.stringify(verification.reasons || []).replace(/"/g, '""')}"`,
            // Label (default to human, should be labeled manually or by admin)
            '"human"',
            // Multi-account features
            multiAccountFeatures.sharedDeviceRatio || '"NA"',
            multiAccountFeatures.sharedIpRatio || '"NA"',
            multiAccountFeatures.accountSimilarityScore || '"NA"',
            multiAccountFeatures.coActivityScore || '"NA"',
            multiAccountFeatures.fundingLinkedAccounts || '"NA"',
            multiAccountFeatures.transferGraphDegree || '"NA"',
            multiAccountFeatures.simultaneousLoginCount || '"NA"',
            multiAccountFeatures.interAccountTimeGapMean || '"NA"',
            multiAccountFeatures.synchronizedActionRate || '"NA"',
            multiAccountFeatures.behavioralHashMatchCount || '"NA"',
            multiAccountFeatures.repetitivePatternSimilarity || '"NA"',
            multiAccountFeatures.deviceReuseScore || '"NA"',
            // Reward flow
            multiAccountFeatures.rewardFlowEntropy || '"NA"',
            multiAccountFeatures.sameRewardRecipientRatio || '"NA"',
            // On-chain features
            onchainFeatures.firstTxTime || '"NA"',
            onchainFeatures.lastTxTime || '"NA"',
            onchainFeatures.totalReceived || '"NA"',
            onchainFeatures.totalSent || '"NA"',
            onchainFeatures.balance || '"NA"',
            onchainFeatures.contractInteractionCount || '"NA"',
            onchainFeatures.functionSequence || '"NA"',
            onchainFeatures.neighborCount || '"NA"',
            onchainFeatures.neighborStats || '"NA"',
            onchainFeatures.graphDistanceToFunder || '"NA"',
            // Timing manipulation features (all NA for now - need blockchain integration)
            '"NA"', // tx_submission_timestamp
            '"NA"', // block_timestamp
            '"NA"', // block_number
            '"NA"', // submission_to_block_delay_ms
            '"NA"', // gas_price_used
            '"NA"', // tx_position_in_block
            '"NA"', // block_miner_address_hash
            '"NA"', // is_front_run_candidate
            '"NA"', // mempool_wait_time_ms
            '"NA"', // similar_tx_in_same_block
            '"NA"', // tx_nonce_gap
            '"NA"', // gas_price_vs_network_median
            '"NA"', // daily_challenge_completion_time_of_day
            '"NA"', // is_near_day_boundary
            '"NA"', // daily_challenge_completer_rank
            '"NA"', // time_since_last_daily_challenge
            '"NA"', // daily_challenge_submission_order
            '"NA"', // block_timestamp_vs_system_time_diff
            '"NA"', // time_since_last_leaderboard_update
            '"NA"', // is_near_leaderboard_update
            '"NA"', // rounds_submitted_before_leaderboard
            '"NA"', // leaderboard_position_change
            '"NA"', // time_between_round_submissions
            '"NA"', // submission_time_consistency_score
            '"NA"', // peak_hour_submission_ratio
            '"NA"', // weekend_vs_weekday_ratio
            '"NA"'  // reward_withdrawal_timing_pattern
        ].join(',') + '\n';

        // Append this click's data to dataset
        fs.appendFileSync(this.datasetPath, row);
    }

    calculateCorrectSteps(sequence, userClicks) {
        let correct = 0;
        for (let i = 0; i < Math.min(sequence.length, userClicks.length); i++) {
            if (sequence[i] === userClicks[i]) correct++;
            else break; // Stop at first wrong click
        }
        return correct;
    }

    extractClickFeatures(telemetry) {
        const clicks = telemetry.clicks || [];
        if (clicks.length === 0) {
            return this.getEmptyClickFeatures();
        }

        // Calculate reaction times
        const reactionTimes = clicks.map((click, i) => {
            if (i === 0) {
                return click.clientTs - (telemetry.sequenceStartTs || click.clientTs);
            }
            return click.clientTs - clicks[i - 1].clientTs;
        });

        // Calculate inter-click intervals (same as reaction times for this game)
        const interClickIntervals = reactionTimes.slice(1); // Skip first click

        // Position features
        const clickXPositions = clicks.map(c => c.xPx || 0);
        const clickYPositions = clicks.map(c => c.yPx || 0);

        return {
            meanReactionTime: this.mean(reactionTimes),
            stdReactionTime: this.std(reactionTimes),
            minReactionTime: Math.min(...reactionTimes),
            maxReactionTime: Math.max(...reactionTimes),
            entropyReactionTime: this.entropy(reactionTimes),
            meanInterClickInterval: interClickIntervals.length > 0 ? this.mean(interClickIntervals) : 0,
            stdInterClickInterval: interClickIntervals.length > 0 ? this.std(interClickIntervals) : 0,
            entropyInterClick: interClickIntervals.length > 0 ? this.entropy(interClickIntervals) : 0,
            meanClickX: this.mean(clickXPositions),
            stdClickX: this.std(clickXPositions),
            meanClickY: this.mean(clickYPositions),
            stdClickY: this.std(clickYPositions),
            clickPositionEntropy: this.entropy(clicks.map(c => `${c.xPx},${c.yPx}`)),
            speedToAccuracyRatio: 0 // Calculated at round level
        };
    }

    extractMouseFeatures(telemetry) {
        const mouseMoves = telemetry.mouseMoves || [];
        
        if (mouseMoves.length === 0) {
            return {
                mouseMoveCount: 0,
                mouseTotalDistance: 0,
                mouseAvgSpeed: 0,
                mouseMaxSpeed: 0,
                mouseDirectionChanges: 0,
                mouseAccelerationChanges: 0,
                mousePauseCount: 0,
                mouseStraightnessIndex: 0,
                mouseCurvatureAvg: 0,
                mouseJitterRatio: 0,
                mouseOvershootCount: 0,
                mouseBallisticCoefficient: 0,
                mouseIdleTimeRatio: 0,
                mouseEfficiency: 0
            };
        }

        // Calculate mouse metrics
        let totalDistance = 0;
        let speeds = [];
        let directionChanges = 0;
        let accelerationChanges = 0;
        let pauseCount = 0;

        for (let i = 1; i < mouseMoves.length; i++) {
            const dx = mouseMoves[i].x - mouseMoves[i - 1].x;
            const dy = mouseMoves[i].y - mouseMoves[i - 1].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const dt = mouseMoves[i].ts - mouseMoves[i - 1].ts;
            
            totalDistance += distance;
            
            if (dt > 0) {
                const speed = distance / dt;
                speeds.push(speed);
                
                if (speed < 0.1) pauseCount++;
            }

            // Track direction changes
            if (i > 1) {
                const prevDx = mouseMoves[i - 1].x - mouseMoves[i - 2].x;
                const prevDy = mouseMoves[i - 1].y - mouseMoves[i - 2].y;
                
                const angle1 = Math.atan2(prevDy, prevDx);
                const angle2 = Math.atan2(dy, dx);
                
                if (Math.abs(angle2 - angle1) > Math.PI / 4) {
                    directionChanges++;
                }
            }
        }

        return {
            mouseMoveCount: mouseMoves.length,
            mouseTotalDistance: totalDistance,
            mouseAvgSpeed: speeds.length > 0 ? this.mean(speeds) : 0,
            mouseMaxSpeed: speeds.length > 0 ? Math.max(...speeds) : 0,
            mouseDirectionChanges: directionChanges,
            mouseAccelerationChanges: 0, // Would need acceleration tracking
            mousePauseCount: pauseCount,
            mouseStraightnessIndex: 0, // Placeholder
            mouseCurvatureAvg: 0, // Placeholder
            mouseJitterRatio: 0, // Placeholder
            mouseOvershootCount: 0, // Placeholder
            mouseBallisticCoefficient: 0, // Placeholder
            mouseIdleTimeRatio: pauseCount / mouseMoves.length,
            mouseEfficiency: 0 // Placeholder
        };
    }

    extractDeviceFeatures(deviceInfo) {
        if (!deviceInfo) {
            return {
                deviceInfo: {},
                deviceInfoHash: 'unknown',
                deviceType: 'unknown',
                screenResolution: 'unknown',
                browserType: 'unknown',
                osType: 'unknown',
                isMobileDevice: 0,
                deviceChangesCount: 0,
                uniqueDevices7d: 0
            };
        }

        const hash = crypto.createHash('md5').update(JSON.stringify(deviceInfo)).digest('hex').substring(0, 12);
        
        return {
            deviceInfo: deviceInfo,
            deviceInfoHash: hash,
            deviceType: this.detectDeviceType(deviceInfo),
            screenResolution: `${deviceInfo.screen?.width}x${deviceInfo.screen?.height}`,
            browserType: this.detectBrowser(deviceInfo.userAgent),
            osType: this.detectOS(deviceInfo.platform),
            isMobileDevice: /mobile|android|iphone|ipad/i.test(deviceInfo.userAgent) ? 1 : 0,
            deviceChangesCount: 0, // Calculated from history
            uniqueDevices7d: 0 // Calculated from history
        };
    }

    getSessionFeatures(playerAddress, roundId) {
        if (!this.sessionData.has(playerAddress)) {
            const sessionId = `sess_${this.generateId()}${Date.now()}`;
            const sessionIdHash = crypto.createHash('md5').update(sessionId).digest('hex').substring(0, 12);
            
            this.sessionData.set(playerAddress, {
                sessionId,
                sessionIdHash,
                startTime: Date.now(),
                rounds: [],
                lastRoundTime: Date.now()
            });
        }

        const session = this.sessionData.get(playerAddress);
        const roundInSession = session.rounds.length + 1;
        
        return {
            sessionId: session.sessionId,
            sessionIdHash: session.sessionIdHash,
            roundInSession,
            totalRoundsInSession: '"NA"',
            sessionDurationTotal: '"NA"',
            sessionSuccessRate: '"NA"',
            sessionAvgTimePerRound: '"NA"',
            roundsPerHour: '"NA"',
            sessionPauseDurationTotal: '"NA"'
        };
    }

    getHistoricalFeatures(playerAddress) {
        // Placeholder - would need to track historical data
        return {
            rounds24h: '"NA"',
            rounds7d: '"NA"',
            avgSuccessRate7d: '"NA"',
            avgSteps7d: '"NA"',
            perfectRoundRatio7d: '"NA"',
            timeSinceLastRoundSeconds: '"NA"',
            timeSinceFirstRoundHours: '"NA"',
            trendSuccessRate: '"NA"',
            trendReactionTime: '"NA"',
            zScoreReactionTime: '"NA"',
            zScoreSuccessRate: '"NA"',
            outlierRoundRatio: '"NA"',
            performanceVolatility: '"NA"',
            consecutivePerfectRounds: '"NA"',
            consecutiveFailedRounds: '"NA"',
            winStreakMax: '"NA"',
            roundCompletionRhythm: '"NA"',
            batchPlayingIndicator: '"NA"',
            perfectToTotalRatio: '"NA"'
        };
    }

    getCrossRoundFeatures(playerAddress, clickFeatures) {
        // Placeholder
        return {
            cvReactionTime: '"NA"',
            cvInterClickInterval: '"NA"',
            cvMouseSpeed: '"NA"',
            patternRepetitionScore: '"NA"',
            timeOfDayVariance: '"NA"',
            dayOfWeekPlayed: '"NA"'
        };
    }

    getBehavioralFeatures(telemetry, sequence, userClicks) {
        return {
            clickAnticipationScore: '"NA"',
            clickAccuracyScore: '"NA"',
            misclickCount: '"NA"',
            doubleClickCount: '"NA"',
            clickRhythmVariance: '"NA"',
            clickHesitationCount: '"NA"',
            firstClickReactionTime: '"NA"',
            optimalPathDeviation: '"NA"',
            backtrackCount: '"NA"',
            explorationPatternScore: '"NA"',
            difficultyAdjustmentResponse: '"NA"',
            learningCurveSlope: '"NA"'
        };
    }

    getMultiAccountFeatures(playerAddress) {
        return {
            sharedDeviceRatio: '"NA"',
            sharedIpRatio: '"NA"',
            accountSimilarityScore: '"NA"',
            coActivityScore: '"NA"',
            fundingLinkedAccounts: '"NA"',
            transferGraphDegree: '"NA"',
            simultaneousLoginCount: '"NA"',
            interAccountTimeGapMean: '"NA"',
            synchronizedActionRate: '"NA"',
            behavioralHashMatchCount: '"NA"',
            repetitivePatternSimilarity: '"NA"',
            deviceReuseScore: '"NA"',
            rewardFlowEntropy: '"NA"',
            sameRewardRecipientRatio: '"NA"'
        };
    }

    getOnchainFeatures(playerAddress) {
        return {
            firstTxTime: '"NA"',
            lastTxTime: '"NA"',
            totalReceived: '"NA"',
            totalSent: '"NA"',
            balance: '"NA"',
            contractInteractionCount: '"NA"',
            functionSequence: '"NA"',
            neighborCount: '"NA"',
            neighborStats: '"NA"',
            graphDistanceToFunder: '"NA"'
        };
    }

    updatePlayerData(playerAddress, roundData, features) {
        // Update session data
        if (this.sessionData.has(playerAddress)) {
            const session = this.sessionData.get(playerAddress);
            session.rounds.push({
                roundId: roundData.roundId,
                timestamp: roundData.timestamp,
                isPerfect: roundData.isPerfect,
                correctSteps: features.correctSteps,
                reactionTime: features.clickFeatures.meanReactionTime
            });
            session.lastRoundTime = Date.now();
        }
    }

    // Utility functions
    mean(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    std(arr) {
        if (arr.length === 0) return 0;
        const avg = this.mean(arr);
        const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
        return Math.sqrt(this.mean(squareDiffs));
    }

    entropy(arr) {
        if (arr.length === 0) return 0;
        const freq = {};
        arr.forEach(val => {
            freq[val] = (freq[val] || 0) + 1;
        });
        let ent = 0;
        Object.values(freq).forEach(count => {
            const p = count / arr.length;
            ent -= p * Math.log2(p);
        });
        return ent;
    }

    detectDeviceType(deviceInfo) {
        const ua = deviceInfo.userAgent || '';
        if (/mobile|android|iphone/i.test(ua)) return 'mobile';
        if (/tablet|ipad/i.test(ua)) return 'tablet';
        return 'desktop';
    }

    detectBrowser(userAgent) {
        if (/chrome/i.test(userAgent) && !/edg/i.test(userAgent)) return 'Chrome';
        if (/firefox/i.test(userAgent)) return 'Firefox';
        if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) return 'Safari';
        if (/edg/i.test(userAgent)) return 'Edge';
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

    generateId() {
        return Math.random().toString(36).substring(2, 15);
    }

    getEmptyClickFeatures() {
        return {
            meanReactionTime: 0,
            stdReactionTime: 0,
            minReactionTime: 0,
            maxReactionTime: 0,
            entropyReactionTime: 0,
            meanInterClickInterval: 0,
            stdInterClickInterval: 0,
            entropyInterClick: 0,
            meanClickX: 0,
            stdClickX: 0,
            meanClickY: 0,
            stdClickY: 0,
            clickPositionEntropy: 0,
            speedToAccuracyRatio: 0
        };
    }
}

module.exports = TelemetryLogger;
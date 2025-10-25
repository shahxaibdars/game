// Use localhost for local-only mode. Change to tunnel URL for remote access.
const API_URL = 'http://localhost:3001/api';
const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

let web3Provider = null;
let signer = null;
let contract = null;
let connectedAddress = null;
let currentMode = 'infinite';
let timerInterval = null;
let leaderboardInterval = null;
let pendingPollInterval = null;

// track last-known values so we only update when something changed
let lastPendingRewards = '0';
let lastLeaderboardHash = null;

let gameState = {
    roundId: null,
    sequence: [],
    userClicks: [],
    gridSize: 3,
    isWatching: false,
    isPlaying: false,
    currentStep: 0,
    currentLevel: 1,
    timeLimit: 20000,
    roundStartTime: null,
    telemetry: { clicks: [], sequenceStartTs: null },
    showDuration: 600,
    intervalBetween: 400
};

const elements = {
    connectBtn: document.getElementById('connectBtn'),
    walletDisplay: document.getElementById('walletDisplay'),
    grid: document.getElementById('grid'),
    startBtn: document.getElementById('startBtn'),
    withdrawBtn: document.getElementById('withdrawBtn'),
    status: document.getElementById('status'),
    scoreValue: document.getElementById('scoreValue'),
    totalScore: document.getElementById('totalScore'),
    pendingRewards: document.getElementById('pendingRewards'),
    dailyBanner: document.getElementById('dailyChallengeBanner'),
    timerValue: document.getElementById('timerValue'),
    timerCard: document.getElementById('timerCard'),
    resultModal: document.getElementById('resultModal'),
    playerCount: document.getElementById('playerCount'),
    toastContainer: document.getElementById('toastContainer')
};

// small ABI for event listening and withdraw
const CONTRACT_ABI = [
    "function playerStats(address) view returns (uint256 totalRounds, uint256 totalScore, uint256 totalRewards, uint256 bestScore, uint256 currentLevel, uint256 dailyTriesUsed, uint256 lastDailyDate, bool dailyCompleted)",
    "function pendingRewards(address) view returns (uint256)",
    "function withdrawReward() external",
    "event RewardWithdrawn(address indexed player, uint256 amount)",
    "event DailyCompleted(address indexed player, uint256 date)",
    "event LeaderboardUpdated(uint256 timestamp)"
];

// show a toast message
function showToast(msg, timeout = 4000) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    elements.toastContainer.appendChild(t);
    setTimeout(() => {
        t.remove();
    }, timeout);
}

async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        alert('MetaMask is not installed. Please install MetaMask to play.');
        return;
    }

    try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = web3Provider.getSigner();
        connectedAddress = await signer.getAddress();
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        elements.connectBtn.classList.add('hidden');
        elements.walletDisplay.textContent = `${connectedAddress.slice(0,6)}...${connectedAddress.slice(-4)}`;
        elements.walletDisplay.classList.remove('hidden');
        elements.startBtn.disabled = false;
        elements.startBtn.textContent = 'Start Game';
        elements.withdrawBtn.disabled = false;

        await loadPlayerStats();
        await loadLeaderboard();

        // Start auto-refresh for leaderboard and pending rewards
        startLeaderboardAutoRefresh();
        startPendingRewardsPoll();

        // start listening to on-chain events (using MetaMask provider primarily)
        startEventListeners(web3Provider);

        if (currentMode === 'daily') {
            await checkDailyChallengeStatus();
        }

        showStatus('Wallet connected successfully!', 'success');
        setTimeout(hideStatus, 2000);
    } catch (error) {
        console.error('Error connecting wallet:', error);
        showStatus('Failed to connect wallet', 'error');
    }
}

function startLeaderboardAutoRefresh() {
    if (leaderboardInterval) clearInterval(leaderboardInterval);
    leaderboardInterval = setInterval(() => {
        loadLeaderboard();
    }, 10000); // Refresh every 10 seconds
}

function startPendingRewardsPoll() {
    if (pendingPollInterval) clearInterval(pendingPollInterval);
    pendingPollInterval = setInterval(() => {
        if (connectedAddress) loadPlayerStats(true); // true = silent / only-update-if-changed
    }, 5000); // check every 5s
}

async function loadPlayerStats(silent = false) {
    if (!connectedAddress) return null;

    try {
        const response = await fetch(`${API_URL}/player/${connectedAddress}/stats`);
        const data = await response.json();

        if (data.success) {
            const stats = data.stats;
            gameState.currentLevel = parseInt(stats.currentLevel) || 1;
            elements.scoreValue.textContent = gameState.currentLevel;
            elements.totalScore.textContent = stats.totalScore;
            elements.pendingRewards.textContent = `${parseFloat(stats.pendingRewards).toFixed(4)} ETH`;

            document.getElementById('statCurrentLevel').textContent = stats.currentLevel;
            document.getElementById('statRounds').textContent = stats.totalRounds;
            document.getElementById('statBestScore').textContent = stats.bestScore;
            document.getElementById('statTotalRewards').textContent = `${parseFloat(stats.totalRewards).toFixed(4)} ETH`;

            // If pendingRewards changed since last check, notify and enable withdraw
            if (!silent) {
                lastPendingRewards = stats.pendingRewards;
            } else {
                if (stats.pendingRewards !== lastPendingRewards) {
                    // reward balance changed — update UI and show toast
                    lastPendingRewards = stats.pendingRewards;
                    showToast(`🎉 New pending rewards: ${parseFloat(stats.pendingRewards).toFixed(4)} ETH`);
                    elements.pendingRewards.textContent = `${parseFloat(stats.pendingRewards).toFixed(4)} ETH`;
                    elements.withdrawBtn.disabled = false;
                    // refresh leaderboard too because payouts may have changed rankings
                    loadLeaderboard();
                }
            }

            return stats;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
    return null;
}

async function loadLeaderboard() {
    try {
        const response = await fetch(`${API_URL}/leaderboard`);
        const data = await response.json();

        const list = document.getElementById('leaderboardList');

        if (data.success && data.leaderboard.length > 0) {
            elements.playerCount.textContent = `${data.totalPlayers || data.leaderboard.length} players`;

            // small hash of leaderboard to detect change
            const hash = JSON.stringify(data.leaderboard.slice(0,20));
            if (hash !== lastLeaderboardHash) {
                lastLeaderboardHash = hash;
                list.innerHTML = data.leaderboard.map(entry => {
                    const isCurrentUser = connectedAddress && entry.address.toLowerCase() === connectedAddress.toLowerCase();
                    const isTop3 = entry.rank <= 3;
                    let rankClass = '';
                    if (entry.rank === 1) rankClass = 'gold';
                    else if (entry.rank === 2) rankClass = 'silver';
                    else if (entry.rank === 3) rankClass = 'bronze';

                    const entryClass = `leaderboard-entry ${isTop3 ? 'top-3' : ''} ${isCurrentUser ? 'current-user' : ''}`;

                    return `
                        <div class="${entryClass}">
                            <span class="rank ${rankClass}">#${entry.rank}</span>
                            <div class="player-info">
                                <span class="player-address">${entry.address.substring(0, 6)}...${entry.address.substring(38)}</span>
                                ${isCurrentUser ? '<span style="color: #667eea; font-weight: bold;">(You)</span>' : ''}
                            </div>
                            <div class="player-stats">
                                <span class="stat-badge">Lv${entry.level}</span>
                                <span class="stat-badge">${entry.score}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } else {
            elements.playerCount.textContent = '0 players';
            list.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No players yet. Be the first!</p>';
        }
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

async function checkDailyChallengeStatus() {
    if (!connectedAddress) return;

    try {
        const response = await fetch(`${API_URL}/daily-challenge/status/${connectedAddress}`);
        const data = await response.json();

        const statusEl = document.getElementById('challengeStatus');
        const triesEl = document.getElementById('challengeTries');

        triesEl.textContent = `${data.maxTries - data.triesUsed}/${data.maxTries}`;

        if (data.completed) {
            statusEl.textContent = '✅ Completed today! Come back tomorrow.';
            statusEl.style.color = '#4caf50';
            elements.startBtn.disabled = true;
            elements.startBtn.textContent = 'Already Completed Today';
        } else if (data.triesUsed >= data.maxTries) {
            statusEl.textContent = '❌ No tries left today. Come back tomorrow.';
            statusEl.style.color = '#f44336';
            elements.startBtn.disabled = true;
            elements.startBtn.textContent = 'No Tries Left';
        } else {
            statusEl.textContent = '🎯 Ready to play!';
            statusEl.style.color = 'rgba(255,255,255,0.9)';
            elements.startBtn.disabled = false;
            elements.startBtn.textContent = 'Start Daily Challenge';
        }
    } catch (error) {
        console.error('Error checking daily challenge:', error);
    }
}

function createGrid(size) {
    elements.grid.innerHTML = '';
    elements.grid.className = `grid size-${size}`;

    for (let i = 0; i < size * size; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;
        cell.addEventListener('click', (e) => handleCellClick(i, e));
        elements.grid.appendChild(cell);
    }
}

function showStatus(message, type) {
    elements.status.textContent = message;
    elements.status.className = `status ${type}`;
    elements.status.classList.remove('hidden');
}

function hideStatus() {
    elements.status.classList.add('hidden');
}

function startTimer(durationMs) {
    stopTimer();
    gameState.roundStartTime = Date.now();
    gameState.timeLimit = durationMs;

    elements.timerValue.textContent = (durationMs / 1000).toFixed(1) + 's';
    elements.timerCard.classList.remove('warning');

    timerInterval = setInterval(() => {
        const elapsed = Date.now() - gameState.roundStartTime;
        const remaining = Math.max(0, durationMs - elapsed);
        const seconds = (remaining / 1000).toFixed(1);

        elements.timerValue.textContent = seconds + 's';

        if (remaining <= 5000) {
            elements.timerCard.classList.add('warning');
        }

        if (remaining <= 0 && gameState.isPlaying) {
            finishRound(true);
        }
    }, 100);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    elements.timerCard.classList.remove('warning');
    elements.timerValue.textContent = '--';
}

function handleCellClick(index, event) {
    if (!gameState.isPlaying || gameState.isWatching) return;

    const cell = elements.grid.querySelectorAll('.cell')[index];
    const clickTime = Date.now();

    // Determine click type
    let clickType = 'unknown';

    if (event.pointerType) {
        // Pointer Events API (covers mouse, pen, touch)
        clickType = event.pointerType; // "mouse" | "touch" | "pen"
    } else if (event.type === 'click' || event.type === 'mousedown') {
        clickType = 'mouse';
    } else if (event.type === 'touchstart' || event.type === 'touchend') {
        clickType = 'touch';
    } else if (event.type.startsWith('key')) {
        clickType = 'keyboard';
    } else if (event.isTrusted === false) {
        clickType = 'synthetic'; // programmatically generated event
    }

    // Get click coordinates (center of the clicked cell)
    const rect = cell.getBoundingClientRect();
    const clickX = rect.left + rect.width / 2;
    const clickY = rect.top + rect.height / 2;

    // Record click in telemetry tracker if available
    if (window.TelemetryTracker) {
        window.TelemetryTracker.recordClick(index, cell, event , {
            ...event,
            clickType,
            xPx: clickX,
            yPx: clickY,
            clientTs: clickTime
        });
    }

    // Log to game state telemetry (for raw data collection)
    gameState.telemetry.clicks.push({
        index,
        clientTs: clickTime,
        clickType,
        xPx: clickX,
        yPx: clickY
    });

    // Game logic
    gameState.userClicks.push(index);
    const expectedIndex = gameState.sequence[gameState.currentStep];

    if (index === expectedIndex) {
        cell.classList.add('correct');
        setTimeout(() => cell.classList.remove('correct'), 300);
        gameState.currentStep++;

        if (gameState.currentStep === gameState.sequence.length) {
            finishRound(false);
        }
    } else {
        cell.classList.add('wrong');
        setTimeout(() => cell.classList.remove('wrong'), 300);
        finishRound(false);
    }
}



async function finishRound(timeExpired = false) {
    gameState.isPlaying = false;
    stopTimer();

    const cells = elements.grid.querySelectorAll('.cell');
    cells.forEach(cell => cell.classList.add('disabled'));
    showStatus('Submitting results...', 'watching');

    // Stop tracking and collect telemetry data
    let telemetryData = gameState.telemetry;
    if (window.TelemetryTracker) {
        window.TelemetryTracker.stopRound();
        const trackerData = window.TelemetryTracker.getTelemetryData();
        telemetryData = {
            ...gameState.telemetry,
            mouseMoves: trackerData.mouseMoves || [],
            deviceInfo: trackerData.deviceInfo || {}
        };
    }

    try {
        const endpoint = currentMode === 'infinite' ? 'infinite' : 'daily';
        const response = await fetch(`${API_URL}/round/submit/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roundId: gameState.roundId,
                playerAddress: connectedAddress,
                clicks: gameState.userClicks.map((index, i) => ({
                    index,
                    clientTs: gameState.telemetry.clicks[i]?.clientTs || Date.now(),
                    xPx: 0,
                    yPx: 0
                })),
                telemetry: telemetryData
            })
        });

        const result = await response.json();

        if (result.success) {
            await loadPlayerStats();
            await loadLeaderboard();
            showResultModal(result, timeExpired);
        } else {
            if (result.error === 'ALREADY_COMPLETED') {
                showStatus(result.message, 'error');
                await checkDailyChallengeStatus();
            } else if (result.error === 'TRIES_EXCEEDED') {
                showStatus(result.message, 'error');
                await checkDailyChallengeStatus();
            } else {
                throw new Error(result.error || 'Failed to submit round');
            }
        }

    } catch (error) {
        showStatus(`Error: ${error.message}`, 'error');
    }

    elements.startBtn.disabled = false;
}

function showResultModal(result, timeExpired) {
    hideStatus();

    const modal = elements.resultModal;
    const isPerfect = result.isPerfect;
    const canContinue = result.canContinue && currentMode === 'infinite';

    let title = 'Round Complete!';
    let message = '';

    if (timeExpired) {
        title = '⏱️ Time Expired!';
        if (currentMode === 'infinite') {
            message = `Time ran out on Level ${result.currentLevel}. Your progress is saved for leaderboard ranking.`;
        } else {
            message = 'Time expired! You still have tries left.';
        }
    } else if (isPerfect) {
        title = '🎉 Perfect!';
        if (currentMode === 'infinite') {
            message = `Amazing! You completed Level ${result.currentLevel} perfectly! Moving to Level ${result.nextLevel}!`;
        } else {
            message = `Congratulations! You completed today's daily challenge and earned ${result.rewardAmount} ETH!`;
        }
    } else {
        title = '😔 Not Perfect!';
        if (currentMode === 'infinite') {
            message = `You got ${result.correctSteps}/${result.totalSteps} correct on Level ${result.currentLevel}. Your progress is saved!`;
        } else {
            message = `You got ${result.correctSteps}/${result.totalSteps} correct. You can try again!`;
        }
    }

    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('modalScore').textContent = result.score;
    document.getElementById('modalCorrect').textContent = `${result.correctSteps}/${result.totalSteps}`;
    document.getElementById('modalTime').textContent = (result.timeElapsedMs / 1000).toFixed(2) + 's';

    const rewardRow = document.getElementById('modalRewardRow');
    if (result.rewardEarned && currentMode === 'daily') {
        rewardRow.classList.remove('hidden');
        document.getElementById('modalReward').textContent = `${result.rewardAmount} ETH`;
    } else {
        rewardRow.classList.add('hidden');
    }

    const continueBtn = document.getElementById('modalContinueBtn');
    const closeBtn = document.getElementById('modalCloseBtn');

    if (canContinue) {
        continueBtn.classList.remove('hidden');
        continueBtn.textContent = `Continue to Level ${result.nextLevel}`;
        closeBtn.textContent = 'Stop Playing';
        gameState.currentLevel = result.nextLevel;
    } else {
        continueBtn.classList.add('hidden');
        if (currentMode === 'infinite') {
            closeBtn.textContent = 'Close';
        } else {
            closeBtn.textContent = 'Close';
        }
    }

    modal.classList.remove('hidden');
}

async function withdrawRewards() {
    if (!contract || !connectedAddress) {
        showStatus('Please connect your wallet first', 'error');
        return;
    }

    try {
        showStatus('Initiating withdrawal...', 'watching');
        elements.withdrawBtn.disabled = true;

        const tx = await contract.withdrawReward();
        showStatus('Transaction submitted. Waiting for confirmation...', 'watching');

        await tx.wait();

        showStatus('Withdrawal successful! Check your wallet.', 'success');
        await loadPlayerStats();

        setTimeout(() => {
            hideStatus();
            elements.withdrawBtn.disabled = false;
        }, 3000);

    } catch (error) {
        console.error('Withdrawal error:', error);

        let errorMessage = 'Withdrawal failed';
        if (error.message && error.message.includes('No rewards')) {
            errorMessage = 'No rewards to withdraw';
        } else if (error.message && (error.message.includes('user rejected') || error.message.includes('rejected by user'))) {
            errorMessage = 'Transaction cancelled';
        }

        showStatus(errorMessage, 'error');
        elements.withdrawBtn.disabled = false;

        setTimeout(hideStatus, 3000);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function playSequence(sequence, showDuration = 600, intervalBetween = 300, timeLimit = 20000) {
    gameState.showDuration = showDuration;
    gameState.intervalBetween = intervalBetween;
    gameState.timeLimit = timeLimit;
    gameState.sequence = sequence;
    gameState.userClicks = [];
    gameState.currentStep = 0;
    gameState.isWatching = true;
    gameState.isPlaying = false;

    showStatus(`Watch carefully! ${sequence.length} steps...`, 'watching');

    const cells = elements.grid.querySelectorAll('.cell');
    cells.forEach(cell => cell.classList.add('disabled'));

    await sleep(800);

    for (let i = 0; i < sequence.length; i++) {
        const idx = sequence[i];
        const cell = cells[idx];
        if (!cell) continue;

        cell.classList.add('active');
        await sleep(showDuration);
        cell.classList.remove('active');

        if (i < sequence.length - 1) await sleep(intervalBetween);
    }

    gameState.isWatching = false;
    gameState.isPlaying = true;
    cells.forEach(cell => cell.classList.remove('disabled'));
    showStatus('Your turn! Click the sequence...', 'playing');

    // Record sequence completion and start user input tracking
    if (window.TelemetryTracker) {
        window.TelemetryTracker.recordSequenceStart();
    }

    startTimer(timeLimit);
}

async function startGame() {
    if (!connectedAddress) {
        showStatus('Please connect your wallet first', 'error');
        return;
    }

    showStatus('Starting new round...', 'watching');
    elements.startBtn.disabled = true;

    try {
        const endpoint = currentMode === 'infinite' ? 'infinite' : 'daily';
        const bodyData = {
            playerAddress: connectedAddress
        };

        if (currentMode === 'infinite') {
            bodyData.level = gameState.currentLevel;
        }

        const response = await fetch(`${API_URL}/round/start/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });

        const data = await response.json();

        if (!data.success) {
            if (data.error === 'ALREADY_COMPLETED' || data.error === 'TRIES_EXCEEDED') {
                showStatus(data.message, 'error');
                await checkDailyChallengeStatus();
                return;
            }
            throw new Error(data.error || 'Failed to start round');
        }

        gameState.roundId = data.roundId;
        gameState.sequence = data.sequence || [];
        gameState.gridSize = data.gridSize || 3;
        gameState.timeLimit = data.timeLimit || 20000;
        gameState.userClicks = [];
        gameState.currentStep = 0;
        gameState.telemetry.clicks = [];
        gameState.telemetry.sequenceStartTs = Date.now();

        // Initialize telemetry tracking for this round
        if (window.TelemetryTracker) {
            window.TelemetryTracker.startRound();
        }

        createGrid(data.gridSize || 3);
        await playSequence(
            data.sequence || [],
            data.showDuration || 600,
            data.intervalBetween || 300,
            data.timeLimit || 20000
        );

    } catch (error) {
        showStatus(`Error: ${error.message}`, 'error');
        elements.startBtn.disabled = false;
        stopTimer();
    }
}

// Event listeners + fallback polling
async function startEventListeners(primaryProvider) {
    // prefer the provider from MetaMask if available
    let providerForEvents = null;
    try {
        if (primaryProvider) {
            providerForEvents = primaryProvider;
        } else {
            // fallback to localhost JSON-RPC (useful in local dev)
            providerForEvents = new ethers.providers.JsonRpcProvider('https://isa-size-termination-draft.trycloudflare.com');
        }
    } catch (err) {
        console.warn('Could not create event provider:', err);
        return;
    }

    try {
        const readContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, providerForEvents);

        // LeaderboardUpdated: refresh leaderboard and player stats
        readContract.on('LeaderboardUpdated', async (timestamp) => {
            console.log('Event: LeaderboardUpdated', timestamp && timestamp.toNumber ? timestamp.toNumber() : timestamp);
            showToast('🏆 Leaderboard updated — refreshing...');
            await loadLeaderboard();
            if (connectedAddress) await loadPlayerStats();
        });

        // DailyCompleted: a player completed daily challenge (could be many)
        readContract.on('DailyCompleted', async (player, date) => {
            console.log('Event: DailyCompleted', player, date && date.toNumber ? date.toNumber() : date);
            // if it's the connected user, refresh their stats
            if (connectedAddress && player && player.toLowerCase() === connectedAddress.toLowerCase()) {
                showToast('⭐ Daily challenge completed — reward recorded!');
                await loadPlayerStats();
            } else {
                // update leaderboard only
                await loadLeaderboard();
            }
        });

        // RewardWithdrawn: someone withdrew — update pending balances
        readContract.on('RewardWithdrawn', async (player, amount) => {
            console.log('Event: RewardWithdrawn', player, amount && amount.toString ? amount.toString() : amount);
            if (connectedAddress && player && player.toLowerCase() === connectedAddress.toLowerCase()) {
                showToast('💸 Your withdrawal was processed!');
                await loadPlayerStats();
            } else {
                // general update
                await loadLeaderboard();
            }
        });

        console.log('Listening for on-chain events (LeaderboardUpdated, DailyCompleted, RewardWithdrawn).');
    } catch (err) {
        console.warn('Could not attach event listeners:', err);
    }
}

// attach UI handlers
elements.connectBtn.addEventListener('click', connectWallet);

// Open the current page inside the MetaMask mobile app browser
if (elements.openInMetaMaskBtn) {
    elements.openInMetaMaskBtn.addEventListener('click', () => {
        const currentUrl = window.location.href;

        // Build the metamask.app.link universal link — remove protocol
        // metamask.app.link expects host/path without https:// prefix
        try {
            const u = new URL(currentUrl);
            // keep hostname + pathname + search
            const target = `${u.hostname}${u.pathname}${u.search}`;

            // If using a custom port other than 80/443, include it (e.g., 8000)
            if (u.port) {
                // hostname doesn't include port, so add it
                // metamask.app.link supports including the port after the host
                // e.g., metamask.app.link/dapp/example.com:8000/path
                const hostWithPort = `${u.hostname}:${u.port}`;
                window.location.href = `https://metamask.app.link/dapp/${hostWithPort}${u.pathname}${u.search}`;
            } else {
                window.location.href = `https://metamask.app.link/dapp/${target}`;
            }
        } catch (err) {
            // fallback: try simple redirect
            window.location.href = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}${window.location.search}`;
        }
    });
}

elements.startBtn.addEventListener('click', startGame);
elements.withdrawBtn.addEventListener('click', withdrawRewards);

document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;

        if (currentMode === 'daily') {
            elements.dailyBanner.classList.remove('hidden');
            document.getElementById('scoreLabel').textContent = 'Challenge';
            if (connectedAddress) {
                checkDailyChallengeStatus();
            }
        } else {
            elements.dailyBanner.classList.add('hidden');
            document.getElementById('scoreLabel').textContent = 'Level';
            elements.scoreValue.textContent = gameState.currentLevel;
            if (connectedAddress) {
                elements.startBtn.disabled = false;
                elements.startBtn.textContent = 'Start Game';
            }
        }
    });
});

document.getElementById('modalContinueBtn').addEventListener('click', () => {
    elements.resultModal.classList.add('hidden');
    startGame();
});

document.getElementById('modalCloseBtn').addEventListener('click', () => {
    elements.resultModal.classList.add('hidden');
    if (currentMode === 'daily') {
        checkDailyChallengeStatus();
    }
});

if (window.ethereum && window.ethereum.on) {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            location.reload();
        } else if (accounts[0] !== connectedAddress) {
            location.reload();
        }
    });

    // also listen for chain changes and reload (because provider/contract may change)
    window.ethereum.on('chainChanged', () => {
        location.reload();
    });
}

// initial render
createGrid(3);
loadLeaderboard();

// Auto-refresh leaderboard every 10 seconds for all users as a baseline
setInterval(loadLeaderboard, 10000);
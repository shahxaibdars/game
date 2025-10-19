// =============================================================================
// MEMORIX ADVANCED BEHAVIORAL BOT - For training anti-cheat systems
// =============================================================================

class MemorixAutoPlayer {
  constructor(profile = 'HUMAN_LIKE') {
    this.profiles = this.defineProfiles();
    this.currentProfile = this.profiles[profile] || this.profiles.HUMAN_LIKE;
    this.isPlaying = false;
    this.roundsPlayed = 0;
    this.perfectRounds = 0;

    console.log(`🤖 Bot initialized with profile: ${profile}`);
    console.table(this.currentProfile);
  }

  // -----------------------------------------------------------
  // PROFILE DEFINITIONS — each defines distinct behavior logic
  // -----------------------------------------------------------
  defineProfiles() {
    return {
      PERFECT_BOT: {
        label: "Perfect Machine Precision",
        reactionTime: [50, 80],
        accuracy: 1.0,
        clickDelay: 10,
        hesitationRate: 0,
        focusLossChance: 0,
        doubleClickChance: 0,
        adaptive: false,
        jitter: false,
        panicBehavior: false,
        playStrategy: "linear"
      },
      FAST_BOT: {
        label: "Speed-Runner Bot",
        reactionTime: [100, 160],
        accuracy: 0.98,
        clickDelay: 20,
        hesitationRate: 0.02,
        focusLossChance: 0.01,
        doubleClickChance: 0.03,
        adaptive: true,
        jitter: true,
        panicBehavior: false,
        playStrategy: "aggressive"
      },
      HUMAN_LIKE: {
        label: "Casual Player Simulation",
        reactionTime: [250, 450],
        accuracy: 0.85,
        clickDelay: 50,
        hesitationRate: 0.05,
        focusLossChance: 0.03,
        doubleClickChance: 0.05,
        adaptive: true,
        jitter: true,
        panicBehavior: false,
        playStrategy: "moderate"
      },
      SKILLED_HUMAN: {
        label: "Experienced Player",
        reactionTime: [180, 320],
        accuracy: 0.92,
        clickDelay: 30,
        hesitationRate: 0.02,
        focusLossChance: 0.01,
        doubleClickChance: 0.02,
        adaptive: true,
        jitter: false,
        panicBehavior: false,
        playStrategy: "optimized"
      },
      ERRATIC_HUMAN: {
        label: "Distracted or Tired Player",
        reactionTime: [150, 900],
        accuracy: 0.7,
        clickDelay: 80,
        hesitationRate: 0.15,
        focusLossChance: 0.1,
        doubleClickChance: 0.07,
        adaptive: false,
        jitter: true,
        panicBehavior: true,
        playStrategy: "randomized"
      },
      CAREFUL_PLAYER: {
        label: "Slow but Accurate",
        reactionTime: [350, 600],
        accuracy: 0.95,
        clickDelay: 80,
        hesitationRate: 0.08,
        focusLossChance: 0.01,
        doubleClickChance: 0,
        adaptive: true,
        jitter: false,
        panicBehavior: false,
        playStrategy: "methodical"
      },
      CONFUSED_PLAYER: {
        label: "New/Confused User",
        reactionTime: [300, 1000],
        accuracy: 0.6,
        clickDelay: 100,
        hesitationRate: 0.12,
        focusLossChance: 0.08,
        doubleClickChance: 0.1,
        adaptive: false,
        jitter: true,
        panicBehavior: true,
        playStrategy: "chaotic"
      },
      ADAPTIVE_BOT: {
        label: "Learning Bot (ML-like)",
        reactionTime: [200, 400],
        accuracy: 0.9,
        clickDelay: 25,
        hesitationRate: 0.03,
        focusLossChance: 0.02,
        doubleClickChance: 0.01,
        adaptive: true,
        jitter: true,
        panicBehavior: false,
        playStrategy: "learning"
      }
    };
  }

  // -----------------------------------------------------------
  // Core Utilities
  // -----------------------------------------------------------

  sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

  randBetween(min, max) { return min + Math.random() * (max - min); }

  getReactionTime() {
    const [min, max] = this.currentProfile.reactionTime;
    // Normal distribution-like random variation
    const u = Math.random(), v = Math.random();
    const normal = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    const mean = (min + max) / 2;
    const stdDev = (max - min) / 6;
    return Math.max(min, Math.min(max, mean + normal * stdDev));
  }

  shouldMakeMistake() {
    return Math.random() > this.currentProfile.accuracy;
  }

  getWrongIndex(correctIndex, gridSize) {
    const total = gridSize * gridSize;
    let wrong;
    do { wrong = Math.floor(Math.random() * total); } while (wrong === correctIndex);
    return wrong;
  }

  // -----------------------------------------------------------
  // DOM Interactions
  // -----------------------------------------------------------

  async watchSequence() {
    console.log("👀 Watching sequence...");
    let attempts = 0;
    while (true) {
      const status = document.getElementById("status");
      if (status && status.textContent.includes("Your turn")) break;
      await this.sleep(100);
      if (++attempts > 200) break;
    }
  }

  getSequence() { return typeof gameState !== "undefined" ? gameState.sequence : null; }
  getGridSize() { return typeof gameState !== "undefined" ? gameState.gridSize || 3 : 3; }

  async clickCell(index, isCorrect) {
    const cells = document.querySelectorAll(".cell");
    const cell = cells[index];
    if (!cell) return;
    cell.click();
    console.log(`${isCorrect ? "✅" : "❌"} Clicked cell ${index}`);
  }

  // -----------------------------------------------------------
  // BEHAVIOR-BASED PLAY STRATEGIES
  // -----------------------------------------------------------

  async playSequence() {
    const seq = this.getSequence();
    const grid = this.getGridSize();
    if (!seq) return false;

    console.log(`🎯 Playing sequence (${seq.length} steps) as ${this.currentProfile.label}`);

    for (let i = 0; i < seq.length; i++) {
      let idx = seq[i];
      let correct = true;

      // Simulate mistake
      if (this.shouldMakeMistake()) {
        idx = this.getWrongIndex(idx, grid);
        correct = false;
      }

      // Hesitation
      if (Math.random() < this.currentProfile.hesitationRate) {
        console.log("🤔 Hesitating...");
        await this.sleep(500 + Math.random() * 800);
      }

      // Lost focus
      if (Math.random() < this.currentProfile.focusLossChance) {
        console.log("😵 Lost focus briefly...");
        await this.sleep(1500 + Math.random() * 1000);
      }

      // Random jitter before click
      if (this.currentProfile.jitter && Math.random() < 0.2) {
        console.log("🖱️ Adjusting aim (jitter)...");
        await this.sleep(100 + Math.random() * 200);
      }

      // Panic behavior — might click wrong twice
      if (this.currentProfile.panicBehavior && Math.random() < 0.03) {
        console.log("😱 Panic! Clicking wrong button quickly...");
        await this.clickCell(this.getWrongIndex(idx, grid), false);
      }

      // Reaction delay
      await this.sleep(this.getReactionTime());

      // Main click
      await this.clickCell(idx, correct);

      // Double click chance
      if (Math.random() < this.currentProfile.doubleClickChance) {
        await this.sleep(80 + Math.random() * 120);
        console.log("🖱️ Double-click!");
        await this.clickCell(idx, correct);
      }

      await this.sleep(this.currentProfile.clickDelay);
      if (!correct) return false;
    }

    console.log("🎉 Sequence completed.");
    return true;
  }

  // -----------------------------------------------------------
  // Main Round Logic
  // -----------------------------------------------------------

  async playRound() {
    console.log(`\n${"━".repeat(40)}\n🎮 Starting Round ${this.roundsPlayed + 1}\n${"━".repeat(40)}`);

    const start = document.getElementById("startBtn");
    if (!start) return false;
    start.click();

    await this.sleep(1000);
    await this.watchSequence();

    const perfect = await this.playSequence();
    this.roundsPlayed++;
    if (perfect) this.perfectRounds++;

    console.log(`📊 Stats: Rounds ${this.roundsPlayed}, Perfect ${this.perfectRounds}`);
    return perfect;
  }

  // -----------------------------------------------------------
  // Auto Play & Stop
  // -----------------------------------------------------------

  // async autoPlay(maxRounds = 5) {
  //   this.isPlaying = true;
  //   console.log(`🤖 AUTO-PLAY (${maxRounds} rounds)`);
  //   for (let i = 0; i < maxRounds && this.isPlaying; i++) {
  //     const ok = await this.playRound();
  //     if (!ok) break;

  //     // Adaptive timing
  //     if (this.currentProfile.adaptive && Math.random() < 0.4) {
  //       const delta = Math.random() < 0.5 ? -0.9 : 1.1;
  //       this.currentProfile.reactionTime = this.currentProfile.reactionTime.map(v => v * delta);
  //       console.log("⚙️ Adjusting reaction times adaptively...");
  //     }

  //     await this.sleep(1000 + Math.random() * 2000);
  //   }
  //   this.stop();
  // }

  // -----------------------------------------------------------
// Auto Play & Stop (Modified with DOM Level Check)
// -----------------------------------------------------------
  async autoPlay(maxRounds = 5) {
    this.isPlaying = true;
    console.log(`🤖 AUTO-PLAY (DOM-level tracking)`);

    // detect mode from gameState (if available)
    const isDailyMode = typeof gameState !== "undefined" && gameState.mode === "daily";

    for (let i = 0; i < maxRounds && this.isPlaying; i++) {
      // Read current level from the DOM
      const levelElem = document.getElementById("scoreValue");
      const currentLevel = levelElem ? parseInt(levelElem.textContent.trim(), 10) || 0 : 0;

      // Set target rounds: 1 in daily mode, stop at Level 19 in infinite mode
      const targetLevel = isDailyMode ? 1 : 19;

      // Stop condition based on level
      if (!isDailyMode && currentLevel >= targetLevel) {
        console.log(`🏁 Reached Level ${currentLevel} — stopping bot.`);
        break;
      }

      const ok = await this.playRound();

      // ⬇️ Changed: continue even on incorrect move
      if (!ok) {
        console.log("⚠️ Incorrect move made — continuing anyway...");
      }

      // Adaptive timing (unchanged)
      if (this.currentProfile.adaptive && Math.random() < 0.4) {
        const delta = Math.random() < 0.5 ? -0.9 : 1.1;
        this.currentProfile.reactionTime = this.currentProfile.reactionTime.map(v => v * delta);
        console.log("⚙️ Adjusting reaction times adaptively...");
      }

      await this.sleep(1000 + Math.random() * 2000);
    }

    this.stop();
  }


  stop() {
    this.isPlaying = false;
    console.log("🛑 Bot stopped.");
  }
}

// =============================================================================
// USAGE
// =============================================================================
console.log(`
╔════════════════════════════════════════════════════════════════╗
║           🤖 MEMORIX ADVANCED BEHAVIORAL BOT LOADED            ║
╚════════════════════════════════════════════════════════════════╝

Examples:
  bot = new MemorixAutoPlayer('HUMAN_LIKE');
  bot.autoPlay(5);

  // Try others:
  new MemorixAutoPlayer('FAST_BOT').autoPlay(3);
  new MemorixAutoPlayer('ERRATIC_HUMAN').autoPlay(3);
  new MemorixAutoPlayer('CONFUSED_PLAYER').autoPlay(3);
`);

window.bot = new MemorixAutoPlayer('HUMAN_LIKE');
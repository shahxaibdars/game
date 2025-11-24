const fs = require('fs');
const path = require('path');

class ReactionTimeProver {
    constructor(circuitDir = './circuits', keyDir = './') {
        this.circuitDir = circuitDir;
        this.keyDir = keyDir;
        this.snarkjs = null;
        this.zkey = null;
        this.wasmBuffer = null;
        this.verificationKey = null;
        
        // Realistic thresholds based on your statistical data
        // Human mean: 488ms, Bot mean: 278ms
        // Set threshold between them at 350ms
        this.DEFAULT_THRESHOLD = 350;
        
        // Safety limits based on 12-bit system (0-4095)
        this.MIN_REACTION_TIME = 25;    // Bot minimum from your data
        this.MAX_REACTION_TIME = 2500;  // Safe upper limit (your max is ~2246ms)
        this.MAX_MEAN = 2500;           // Maximum mean we can handle
    }

    async init() {
        console.log('Initializing ReactionTimeProver...');
        this.snarkjs = require('snarkjs');

        const zkeyPath = path.join(this.keyDir, 'ReactionTimeProof_0001.zkey');
        const vkPath = path.join(this.keyDir, 'verification_key.json');
        const wasmPath = path.join(this.circuitDir, 'ReactionTimeProof_js', 'ReactionTimeProof.wasm');

        this.zkey = fs.readFileSync(zkeyPath);
        this.verificationKey = JSON.parse(fs.readFileSync(vkPath, 'utf8'));
        this.wasmBuffer = fs.readFileSync(wasmPath);

        console.log(`✓ Loaded proving key: ${zkeyPath}`);
        console.log(`✓ Loaded verification key: ${vkPath}`);
        console.log(`✓ Loaded WASM module: ${wasmPath}`);
        console.log(`✓ Default threshold: ${this.DEFAULT_THRESHOLD}ms`);
        console.log(`✓ Valid reaction time range: ${this.MIN_REACTION_TIME}-${this.MAX_REACTION_TIME}ms`);
        console.log('ReactionTimeProver ready!\n');
    }

    validateInputs(reactionTimes, threshold) {
        // Check array length
        if (!Array.isArray(reactionTimes) || reactionTimes.length === 0) {
            throw new Error('reactionTimes must be a non-empty array');
        }

        // Check each reaction time is within bounds
        for (let i = 0; i < reactionTimes.length; i++) {
            const rt = reactionTimes[i];
            if (typeof rt !== 'number' || isNaN(rt)) {
                throw new Error(`reactionTimes[${i}] is not a valid number: ${rt}`);
            }
            if (rt < this.MIN_REACTION_TIME) {
                throw new Error(`reactionTimes[${i}] = ${rt}ms is too low (min: ${this.MIN_REACTION_TIME}ms)`);
            }
            if (rt > this.MAX_REACTION_TIME) {
                throw new Error(`reactionTimes[${i}] = ${rt}ms is too high (max: ${this.MAX_REACTION_TIME}ms)`);
            }
        }

        // Check threshold
        if (typeof threshold !== 'number' || isNaN(threshold)) {
            throw new Error(`threshold is not a valid number: ${threshold}`);
        }
        if (threshold < 0 || threshold > this.MAX_MEAN) {
            throw new Error(`threshold ${threshold}ms is out of range (0-${this.MAX_MEAN}ms)`);
        }

        // Check mean won't overflow
        const sum = reactionTimes.reduce((a, b) => a + b, 0);
        const mean = Math.floor(sum / reactionTimes.length);
        if (mean > this.MAX_MEAN) {
            throw new Error(`Mean ${mean}ms exceeds maximum ${this.MAX_MEAN}ms`);
        }

        return { sum, mean };
    }

    calculateMean(reactionTimes) {
        const sum = reactionTimes.reduce((a, b) => a + b, 0);
        return Math.floor(sum / reactionTimes.length);
    }

    // 12-bit decomposition (returns numbers, not strings)
    decomposeToBits(num, bitLength = 12) {
        const bits = [];
        let n = num < 0 ? num + 4096 : num; // wrap negatives safely
        for (let i = 0; i < bitLength; i++) {
            bits.push(n & 1); // number, not string
            n = n >>> 1;
        }
        return bits;
    }

    async generateProof(reactionTimes, threshold = null) {
        // Use default threshold if not provided
        if (threshold === null) {
            threshold = this.DEFAULT_THRESHOLD;
        }

        console.log('GENERATING ZERO-KNOWLEDGE PROOF');
        console.log('══════════════════════════════════════════════════');

        // Validate all inputs
        const { sum, mean } = this.validateInputs(reactionTimes, threshold);

        const borrow = mean < threshold ? 1 : 0;
        const d = mean - threshold + borrow * 4096;
        const dBits = this.decomposeToBits(d, 12);

        const input = {
            reactionTimes: reactionTimes.map(String), // still strings for circuit
            threshold: threshold.toString(),
            sumProver: sum.toString(),
            meanProver: mean.toString(),
            borrow: borrow.toString(),
            dBits // numbers!
        };

        console.log(`Input Data:`);
        console.log(` Reaction times: [${reactionTimes.join(', ')}] ms`);
        console.log(` Threshold: ${threshold} ms`);
        console.log(` Sum: ${sum} ms`);
        console.log(` Mean: ${mean} ms (sum / ${reactionTimes.length})`);
        console.log(` Borrow: ${borrow}`);
        console.log(` d = ${d} → bits [${dBits.join(', ')}]`);

        const { proof, publicSignals } = await this.snarkjs.groth16.fullProve(
            input,
            this.wasmBuffer,
            this.zkey
        );

        const isHuman = borrow === 0;
        console.log(`✓ Proof generated! isHuman = ${isHuman ? 'HUMAN ✓' : 'BOT ✗'}`);
        console.log('══════════════════════════════════════════════════');

        return { proof, publicSignals, isHuman, mean, threshold };
    }

    async verifyProof(proof, publicSignals) {
        return await this.snarkjs.groth16.verify(this.verificationKey, publicSignals, proof);
    }

    // Helper method to get recommended threshold based on your data
    getRecommendedThreshold() {
        return this.DEFAULT_THRESHOLD;
    }

    // Helper to check if a mean would be classified as human
    wouldBeClassifiedAsHuman(mean, threshold = null) {
        if (threshold === null) {
            threshold = this.DEFAULT_THRESHOLD;
        }
        return mean >= threshold;
    }
}

module.exports = ReactionTimeProver;

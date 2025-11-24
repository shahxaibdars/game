pragma circom 2.2.0;

include "circomlib/circuits/comparators.circom";

template ReactionTimeProof(n) {
    // Private inputs
    signal input reactionTimes[n];

    // Public inputs
    signal input threshold;
    signal input sumProver;
    signal input meanProver;
    signal input borrow;
    signal input dBits[12];        // 12 bits → supports up to 4095

    // Output
    signal output isHuman;

    // 1. Reconstruct sum
    signal acc[n+1];
    acc[0] <== 0;
    for (var i = 0; i < n; i++) {
        acc[i+1] <== acc[i] + reactionTimes[i];
    }
    acc[n] === sumProver;

    // 2. Mean check WITH remainder handling
    // Instead of: meanProver * n === sumProver
    // We use: meanProver * n + remainder === sumProver where 0 <= remainder < n
    signal remainder;
    remainder <== sumProver - (meanProver * n);
    
    // Ensure remainder is in valid range [0, n)
    // For n=4, remainder must be 0, 1, 2, or 3
    component remainderInRange = LessThan(12);
    remainderInRange.in[0] <== remainder;
    remainderInRange.in[1] <== n;
    remainderInRange.out === 1;

    // 3. d = mean - threshold + borrow * 4096
    signal d;
    d <== meanProver - threshold + borrow * 4096;

    // 4. Reconstruct d from 12 bits + force each bit to be 0 or 1
    signal recon[13];
    recon[0] <== 0;
    for (var j = 0; j < 12; j++) {
        dBits[j] * (dBits[j] - 1) === 0;                  // ← bit constraint
        recon[j+1] <== recon[j] + dBits[j] * (1 << j);
    }
    recon[12] === d;

    // 5. borrow ∈ {0,1}
    borrow * (borrow - 1) === 0;

    // 6. Final output
    isHuman <== 1 - borrow;
}

component main {public [threshold, sumProver, meanProver, borrow, dBits]} = ReactionTimeProof(4);

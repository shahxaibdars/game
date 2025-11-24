const ReactionTimeProver = require('./ReactionTimeProver');

// Updated test cases with realistic threshold (350ms based on your data)
// Human mean: 488ms, Bot mean: 278ms
const testCases = [
    { 
        name: 'Typical Human (from your data)', 
        reactionTimes: [480, 490, 485, 495], 
        threshold: 350, 
        expectedMean: 487, 
        expectedHuman: true 
    },
    { 
        name: 'Typical Bot (from your data)', 
        reactionTimes: [270, 280, 275, 285], 
        threshold: 350, 
        expectedMean: 277, 
        expectedHuman: false 
    },
    { 
        name: 'Fast Human', 
        reactionTimes: [380, 390, 385, 395], 
        threshold: 350, 
        expectedMean: 387, 
        expectedHuman: true 
    },
    { 
        name: 'Slow Bot', 
        reactionTimes: [320, 330, 325, 335], 
        threshold: 350, 
        expectedMean: 327, 
        expectedHuman: false 
    },
    { 
        name: 'Average Human (edge case with remainder)', 
        reactionTimes: [400, 450, 420, 480], 
        threshold: 350, 
        expectedMean: 437, 
        expectedHuman: true 
    },
    { 
        name: 'Right at Threshold', 
        reactionTimes: [348, 350, 352, 350], 
        threshold: 350, 
        expectedMean: 350, 
        expectedHuman: true 
    },
    { 
        name: 'Just Below Threshold', 
        reactionTimes: [348, 349, 349, 349], 
        threshold: 350, 
        expectedMean: 348, 
        expectedHuman: false 
    },
    {
        name: 'Very Fast Bot (min from data)',
        reactionTimes: [25, 26, 27, 28],
        threshold: 350,
        expectedMean: 26,
        expectedHuman: false
    },
    {
        name: 'Very Slow Human (near max)',
        reactionTimes: [2000, 2100, 2050, 2150],
        threshold: 350,
        expectedMean: 2075,
        expectedHuman: true
    },
    {
        name: 'Edge Case - Sum not divisible by 4',
        reactionTimes: [500, 501, 502, 503],
        threshold: 350,
        expectedMean: 501, // 2006/4 = 501.5 → floor = 501
        expectedHuman: true
    },
    {
        name: 'Default Threshold Test',
        reactionTimes: [480, 490, 485, 495],
        threshold: null, // Will use DEFAULT_THRESHOLD (350)
        expectedMean: 487,
        expectedHuman: true
    }
];

async function runTests() {
    console.log('\n' + '═'.repeat(80));
    console.log('REACTION TIME ZKP PROVER TEST SUITE (Fixed Version)');
    console.log('Based on real statistical data: Human mean=488ms, Bot mean=278ms');
    console.log('═'.repeat(80));

    const prover = new ReactionTimeProver('./circuits', './');
    await prover.init();

    let passed = 0;
    let failed = 0;

    for (let i = 0; i < testCases.length; i++) {
        const t = testCases[i];
        const testThreshold = t.threshold !== null ? t.threshold : prover.DEFAULT_THRESHOLD;
        
        console.log(`\n${'─'.repeat(80)}`);
        console.log(`TEST ${i+1}/${testCases.length}: ${t.name}`);
        console.log(`Expected: mean=${t.expectedMean}ms, isHuman=${t.expectedHuman}, threshold=${testThreshold}ms`);

        try {
            const result = await prover.generateProof(t.reactionTimes, t.threshold);
            const verified = await prover.verifyProof(result.proof, result.publicSignals);

            const meanOK = result.mean === t.expectedMean;
            const humanOK = result.isHuman === t.expectedHuman;

            console.log(`\nResults:`);
            console.log(`   Mean: ${result.mean}ms ${meanOK ? '✓ PASS' : '✗ FAIL'}`);
            console.log(`   isHuman: ${result.isHuman} ${humanOK ? '✓ PASS' : '✗ FAIL'}`);
            console.log(`   Proof verified: ${verified ? '✓ PASS' : '✗ FAIL'}`);

            if (meanOK && humanOK && verified) {
                console.log(`\n✓ TEST PASSED`);
                passed++;
            } else {
                console.log(`\n✗ TEST FAILED`);
                failed++;
            }
        } catch (e) {
            console.log(`\n✗ TEST ERROR: ${e.message}`);
            console.error(e);
            failed++;
        }
    }

    console.log('\n' + '═'.repeat(80));
    console.log(`SUMMARY: ${passed}/${testCases.length} tests passed, ${failed} failed`);
    if (passed === testCases.length) {
        console.log('✓✓✓ ALL TESTS PASSED – Ready for production! ✓✓✓');
    } else {
        console.log(`✗ ${failed} test(s) failed. Please review.`);
    }
    console.log('═'.repeat(80));
}

runTests().catch(console.error);

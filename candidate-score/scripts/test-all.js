'use strict';

// Run the scoring-input tests in one command.
// Usage: npm run test:all [-- --live] [-- --iterations 20000] [-- --seed 12345]
//
// Default: offline unit + fuzz tests. --live adds the read-only Zoho smoke test
// and maps the first candidate in the org.

const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
const live = args.includes('--live');

function argValue(flag) {
    const index = args.indexOf(flag);
    if (index === -1) {
        return null;
    }
    const value = args[index + 1];
    return value && !value.startsWith('--') ? value : null;
}

const iterations = argValue('--iterations');
const seed = argValue('--seed');
const failures = [];

function run(label, script, scriptArgs = []) {
    console.log(`\n=== ${label} ===`);
    const result = spawnSync(process.execPath, [path.join(__dirname, script), ...scriptArgs], {
        stdio: 'inherit'
    });

    if (result.error) {
        failures.push(label);
        console.error(`ERROR ${label}: ${result.error.message}`);
        return false;
    }
    if (result.status !== 0) {
        failures.push(label);
        return false;
    }
    return true;
}

const fuzzArgs = [];
if (seed) {
    fuzzArgs.push(iterations || '5000', seed);
} else if (iterations) {
    fuzzArgs.push(iterations);
}

run('unit tests', 'test-scoring-input.js');
run('fuzz test', 'fuzz-scoring-input.js', fuzzArgs);

if (live) {
    const envPath = path.join(__dirname, '..', '.env');
    if (!existsSync(envPath)) {
        failures.push('live checks');
        console.error('\nFAIL  live checks — candidate-score/.env not found');
    } else {
        run('Zoho smoke test', 'smoke.js');
        run('first candidate mapping', 'inspect-candidate.js', ['--first']);
    }
}

console.log('\n========================================');
if (failures.length) {
    console.error(`FAIL  ${failures.length} suite(s): ${failures.join(', ')}`);
    process.exitCode = 1;
} else {
    console.log(live ? 'PASS  offline + live checks' : 'PASS  offline checks');
}

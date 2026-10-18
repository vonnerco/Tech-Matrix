'use strict';

// Seeded fuzz test for C4.1: extractScoringInput().
// Usage: npm run test:fuzz [-- <iterations> <seed>]

const { inspect } = require('node:util');
const { extractScoringInput } = require('../src/scoring-input');

const DEFAULT_ITERATIONS = 5000;
const DEFAULT_SEED = 0x5eed;

const requestedIterations = Number(process.argv[2]);
const ITERATIONS =
    Number.isInteger(requestedIterations) && requestedIterations > 0
        ? requestedIterations
        : DEFAULT_ITERATIONS;

const requestedSeed = Number(process.argv[3]);
const SEED = Number.isInteger(requestedSeed) ? requestedSeed : DEFAULT_SEED;

const STRINGS = [
    '',
    ' ',
    '   ',
    'Python',
    'Python, Django',
    ' A , , B ',
    'C, C++',
    'Node,TypeScript',
    'Python;Django',
    'Ψ, 日本語',
    '5',
    '5.5',
    '5,5',
    '5 years',
    '0',
    '-2',
    'N/A',
    '1,234',
    ',',
    ',,',
    'a\nb',
    'a\tb'
];

const SCALARS = [
    undefined,
    null,
    0,
    1,
    -2,
    5.5,
    NaN,
    Infinity,
    -Infinity,
    true,
    false,
    {},
    { a: 1 },
    []
];

// Deterministic PRNG so failures are reproducible from the printed seed.
function mulberry32(seed) {
    let state = seed >>> 0;
    return function random() {
        state = (state + 0x6d2b79f5) | 0;
        let value = Math.imul(state ^ (state >>> 15), 1 | state);
        value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

const random = mulberry32(SEED);

function pick(list) {
    return list[Math.floor(random() * list.length)];
}

function randomText() {
    const alphabet = 'ab ,.-_/;:0123456789\t\nΨ日';
    const length = Math.floor(random() * 16);
    let text = '';
    for (let index = 0; index < length; index += 1) {
        text += alphabet[Math.floor(random() * alphabet.length)];
    }
    return text;
}

function randomValue(depth = 0) {
    const roll = random();
    if (roll < 0.35) {
        return pick(SCALARS);
    }
    if (roll < 0.7) {
        return random() < 0.5 ? pick(STRINGS) : randomText();
    }
    if (roll < 0.85 || depth >= 2) {
        return randomText();
    }

    const length = Math.floor(random() * 4);
    return Array.from({ length }, () => randomValue(depth + 1));
}

function randomCandidate() {
    const roll = random();
    if (roll < 0.05) {
        return null;
    }
    if (roll < 0.1) {
        return randomText();
    }
    if (roll < 0.15) {
        return [randomValue()];
    }

    const candidate = {};
    if (random() < 0.8) {
        candidate.Skill_Set = randomValue();
    }
    if (random() < 0.8) {
        candidate.Years_of_Experience = randomValue();
    }
    if (random() < 0.2) {
        candidate.First_Name = 'Test';
    }
    return candidate;
}

function assertInvariants(candidate) {
    const input = extractScoringInput(candidate);

    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new Error('output is not an object');
    }

    const keys = Object.keys(input).sort().join(',');
    if (keys !== 'skills,yearsExperience') {
        throw new Error(`unexpected output keys: ${keys}`);
    }

    if (!Array.isArray(input.skills)) {
        throw new Error('skills is not an array');
    }

    for (const skill of input.skills) {
        if (typeof skill !== 'string' || !skill || skill !== skill.trim()) {
            throw new Error(`invalid skill: ${inspect(skill)}`);
        }
    }

    if (
        typeof input.yearsExperience !== 'number' ||
        !Number.isFinite(input.yearsExperience) ||
        input.yearsExperience < 0
    ) {
        throw new Error(`invalid yearsExperience: ${inspect(input.yearsExperience)}`);
    }
}

console.log('Candidate Score — scoring input fuzz test\n');

for (let index = 0; index < ITERATIONS; index += 1) {
    const candidate = randomCandidate();
    try {
        assertInvariants(candidate);
    } catch (error) {
        console.error(`FAIL  case ${index}`);
        console.error(`  seed: ${SEED}`);
        console.error(`  candidate: ${inspect(candidate, { depth: 6 })}`);
        console.error(`  error: ${error.message}`);
        process.exit(1);
    }
}

console.log(`PASS  ${ITERATIONS} cases (seed ${SEED})`);

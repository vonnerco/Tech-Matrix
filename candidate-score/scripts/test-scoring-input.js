'use strict';

// Unit tests for C4.1: extractScoringInput().
// Usage: npm test

const assert = require('node:assert/strict');
const { extractScoringInput } = require('../src/scoring-input');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        passed += 1;
        console.log(`PASS  ${name}`);
    } catch (error) {
        failed += 1;
        console.error(`FAIL  ${name} — ${error.message}`);
    }
}

console.log('Candidate Score — scoring input tests\n');

test('skills: comma-separated string', () => {
    assert.deepStrictEqual(
        extractScoringInput({ Skill_Set: 'Python, Django, AWS' }),
        { skills: ['Python', 'Django', 'AWS'], yearsExperience: 0 }
    );
});

test('skills: trims whitespace and drops empty entries', () => {
    assert.deepStrictEqual(
        extractScoringInput({ Skill_Set: ' Python , , Django , ' }),
        { skills: ['Python', 'Django'], yearsExperience: 0 }
    );
});

test('skills: multi-select array', () => {
    assert.deepStrictEqual(
        extractScoringInput({ Skill_Set: ['React', 'Node'] }),
        { skills: ['React', 'Node'], yearsExperience: 0 }
    );
});

test('skills: array entries containing commas', () => {
    assert.deepStrictEqual(
        extractScoringInput({ Skill_Set: ['React', 'Node, TypeScript'] }),
        { skills: ['React', 'Node', 'TypeScript'], yearsExperience: 0 }
    );
});

test('experience: number', () => {
    assert.deepStrictEqual(
        extractScoringInput({ Years_of_Experience: 7 }),
        { skills: [], yearsExperience: 7 }
    );
});

test('experience: decimal string', () => {
    assert.deepStrictEqual(
        extractScoringInput({ Years_of_Experience: '5.5' }),
        { skills: [], yearsExperience: 5.5 }
    );
});

test('experience: comma decimal', () => {
    assert.deepStrictEqual(
        extractScoringInput({ Years_of_Experience: '5,5' }),
        { skills: [], yearsExperience: 5.5 }
    );
});

test('experience: prose string', () => {
    assert.deepStrictEqual(
        extractScoringInput({ Years_of_Experience: '5 years' }),
        { skills: [], yearsExperience: 5 }
    );
});

test('experience: negative value clamps to zero', () => {
    assert.deepStrictEqual(
        extractScoringInput({ Years_of_Experience: -2 }),
        { skills: [], yearsExperience: 0 }
    );
});

test('missing fields do not throw', () => {
    assert.deepStrictEqual(extractScoringInput({}), {
        skills: [],
        yearsExperience: 0
    });
});

test('empty fields do not throw', () => {
    assert.deepStrictEqual(
        extractScoringInput({ Skill_Set: '', Years_of_Experience: '' }),
        { skills: [], yearsExperience: 0 }
    );
});

test('null fields do not throw', () => {
    assert.deepStrictEqual(
        extractScoringInput({ Skill_Set: null, Years_of_Experience: null }),
        { skills: [], yearsExperience: 0 }
    );
});

test('whitespace-only skills do not throw', () => {
    assert.deepStrictEqual(
        extractScoringInput({ Skill_Set: '   ', Years_of_Experience: '   ' }),
        { skills: [], yearsExperience: 0 }
    );
});

test('empty skills array does not throw', () => {
    assert.deepStrictEqual(
        extractScoringInput({ Skill_Set: [], Years_of_Experience: 0 }),
        { skills: [], yearsExperience: 0 }
    );
});

test('null candidate does not throw', () => {
    assert.deepStrictEqual(extractScoringInput(null), {
        skills: [],
        yearsExperience: 0
    });
});

test('unexpected field types do not throw', () => {
    assert.deepStrictEqual(
        extractScoringInput({ Skill_Set: 42, Years_of_Experience: {} }),
        { skills: [], yearsExperience: 0 }
    );
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) {
    process.exitCode = 1;
}

'use strict';

// Read-only inspector: fetch one Zoho candidate and show extractScoringInput() output.
// Usage: npm run inspect:candidate -- <numeric-candidate-id>
//        npm run inspect:candidate -- --first
//        npm run inspect:candidate -- --list [count]

const { getCandidate, makeRequest } = require('../src/zoho-client');
const { extractScoringInput } = require('../src/scoring-input');

const FIELDS = [
    'Candidate_ID',
    'First_Name',
    'Last_Name',
    'Email',
    'Current_Job_Title',
    'Skill_Set',
    'Years_of_Experience'
];

function valueType(value) {
    if (value === null) {
        return 'null';
    }
    if (Array.isArray(value)) {
        return 'array';
    }
    return typeof value;
}

function show(label, value) {
    console.log(`  ${label}: ${JSON.stringify(value)} (${valueType(value)})`);
}

function usage() {
    console.error('Usage:');
    console.error('  npm run inspect:candidate -- <numeric-candidate-id>');
    console.error('  npm run inspect:candidate -- --first');
    console.error('  npm run inspect:candidate -- --list [count]');
    process.exitCode = 1;
}

function renderCandidate(candidate, fallbackId) {
    console.log(`Candidate ${candidate.id || fallbackId}\n`);
    console.log('Raw Zoho fields:');
    for (const field of FIELDS) {
        show(field, candidate[field]);
    }

    const input = extractScoringInput(candidate);
    console.log('\nMapped scoring input:');
    console.log(JSON.stringify(input, null, 2));

    const warnings = [];
    if (input.skills.length === 0) {
        warnings.push('no skills extracted — check Skill_Set');
    }
    if (input.yearsExperience === 0) {
        warnings.push('yearsExperience is 0 — check Years_of_Experience');
    }
    if (warnings.length) {
        console.log(`\nWARN\n- ${warnings.join('\n- ')}`);
    }
}

async function firstCandidate() {
    const body = await makeRequest('GET', '/Candidates', {
        params: { per_page: 1 }
    });
    const row = body && Array.isArray(body.data) ? body.data[0] : null;
    if (!row) {
        throw new Error('No candidates found in this org.');
    }
    return getCandidate(row.id);
}

async function listCandidates(limit) {
    const body = await makeRequest('GET', '/Candidates', {
        params: { per_page: limit }
    });
    const rows = body && Array.isArray(body.data) ? body.data : [];

    if (rows.length === 0) {
        console.log('No candidates found in this org.');
        return;
    }

    console.table(
        rows.map((candidate) => ({
            id: candidate.id,
            candidate_id: candidate.Candidate_ID,
            name: [candidate.First_Name, candidate.Last_Name].filter(Boolean).join(' '),
            email: candidate.Email
        }))
    );
    console.log(`\nUse one of the numeric id values above:`);
    console.log(`  npm run inspect:candidate -- ${rows[0].id}`);
}

async function main() {
    const first = process.argv[2];
    if (!first) {
        usage();
        return;
    }

    if (first === '--list' || first === '-l') {
        const requested = Number(process.argv[3]);
        const limit = Number.isInteger(requested) && requested > 0 ? Math.min(requested, 200) : 10;
        await listCandidates(limit);
        return;
    }

    if (first === '--first' || first === '-f') {
        const candidate = await firstCandidate();
        renderCandidate(candidate, 'first');
        return;
    }

    const candidate = await getCandidate(first);
    renderCandidate(candidate, first);
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});

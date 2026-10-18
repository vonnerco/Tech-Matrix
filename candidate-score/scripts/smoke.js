'use strict';

// Read-only smoke test for the Zoho read flow.
// Usage: npm run smoke
// Optional: ZOHO_SMOKE_JOB_ID=ZR_1_JOB npm run smoke

const http = require('http');
const {
    apiBaseUrl,
    makeRequest,
    getApplicationsForJob,
    getCandidatesForJob,
    getCandidate,
    updateCandidate
} = require('../src/zoho-client');

let passed = 0;
let failed = 0;

function pass(name, detail) {
    passed += 1;
    console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, error) {
    failed += 1;
    console.error(`FAIL  ${name} — ${error.message}`);
}

function skip(name, reason) {
    console.log(`SKIP  ${name} — ${reason}`);
}

async function check(name, fn) {
    try {
        const detail = await fn();
        pass(name, detail);
        return true;
    } catch (error) {
        fail(name, error);
        return false;
    }
}

async function testRetryAfter() {
    let hits = 0;
    const server = http.createServer((req, res) => {
        hits += 1;
        if (hits === 1) {
            res.writeHead(429, {
                'Retry-After': '0',
                'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({ code: 'TOO_MANY_REQUESTS' }));
            return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, hits }));
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    try {
        const body = await makeRequest('GET', `http://127.0.0.1:${port}/retry`);
        if (!body.ok || body.hits !== 2) {
            throw new Error(`expected 2 attempts, got ${JSON.stringify(body)}`);
        }
        return '429 retried once';
    } finally {
        server.close();
    }
}

async function main() {
    console.log('Candidate Score — Zoho read-flow smoke test\n');

    await check('API base URL', () => {
        const base = apiBaseUrl();
        if (!/^https:\/\/recruit\.zoho\.[^/]+\/recruit\/v2$/.test(base)) {
            throw new Error(`unexpected base: ${base}`);
        }
        return base;
    });

    let sampleCandidateId = null;
    await check('GET /Candidates', async () => {
        const body = await makeRequest('GET', '/Candidates', { params: { per_page: 1 } });
        if (!body || !Array.isArray(body.data)) {
            throw new Error('response has no data[]');
        }
        sampleCandidateId = body.data[0] ? body.data[0].id : null;
        return `${body.data.length} record(s)`;
    });

    if (sampleCandidateId) {
        await check('getCandidate()', async () => {
            const candidate = await getCandidate(sampleCandidateId);
            if (candidate.id !== sampleCandidateId) {
                throw new Error('returned a different candidate');
            }
            return 'id match';
        });
    } else {
        skip('getCandidate()', 'no candidates in the org');
    }

    let jobKey = process.env.ZOHO_SMOKE_JOB_ID || null;
    await check('GET /Job_Openings', async () => {
        const body = await makeRequest('GET', '/Job_Openings', { params: { per_page: 1 } });
        if (!body || !Array.isArray(body.data)) {
            throw new Error('response has no data[]');
        }
        const job = body.data[0];
        if (!jobKey && job) {
            jobKey = job.Job_Opening_ID || job.id;
        }
        return `${body.data.length} record(s)`;
    });

    if (jobKey) {
        await check('getApplicationsForJob()', async () => {
            const apps = await getApplicationsForJob(jobKey);
            return `${apps.length} application(s) for ${jobKey}`;
        });

        await check('getCandidatesForJob()', async () => {
            const candidates = await getCandidatesForJob(jobKey);
            if (!Array.isArray(candidates)) {
                throw new Error('expected an array');
            }
            return `${candidates.length} candidate(s) for ${jobKey}`;
        });
    } else {
        skip('job checks', 'no job openings and ZOHO_SMOKE_JOB_ID is unset');
    }

    await check('updateCandidate() input guard', async () => {
        try {
            await updateCandidate('1', {});
        } catch (error) {
            if (/non-empty object/.test(error.message)) {
                return 'rejects empty fields before any request';
            }
            throw error;
        }
        throw new Error('empty fields were accepted');
    });

    await check('429 Retry-After handling', testRetryAfter);

    console.log(`\n${passed} passed, ${failed} failed`);
    if (failed) {
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error(`smoke test crashed: ${error.message}`);
    process.exitCode = 1;
});

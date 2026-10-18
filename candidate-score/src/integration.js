'use strict';

// Orchestrator: pull candidates from Zoho, extract scoring inputs, score, write back.
// Wired end-to-end after C3/C4. Until then `npm start` reports what is still pending.

const { getAccessToken } = require('./auth');
const { getCandidatesForJob } = require('./zoho-client');
const { scoreCandidate } = require('./scoring-engine');

const PENDING = 'Integration orchestrator is not implemented yet (after C3/C4)';

/**
 * Run the read/scoring flow for one job opening.
 * @param {object} [options]
 * @param {string|number} [options.jobId]
 * @returns {Promise<object>}
 */
async function main(options = {}) {
    void getAccessToken;
    void getCandidatesForJob;
    void scoreCandidate;
    void options;
    throw new Error(PENDING);
}

module.exports = { main };

if (require.main === module) {
    main()
        .then(() => {
            console.log('Integration finished.');
        })
        .catch((error) => {
            console.error(error.message);
            process.exitCode = 1;
        });
}

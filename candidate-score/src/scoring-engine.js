'use strict';

// Scoring engine (post-C4).
// Pure functions: no network, no Zoho types. Input is what extractScoringInput() produces.

/**
 * @typedef {object} ScoringInput
 * @property {string[]} skills
 * @property {number} yearsExperience
 * @property {object} [requirements] Role requirements to score against
 */

/**
 * Score one candidate against role requirements.
 * @param {ScoringInput} input
 * @returns {{ score: number, breakdown: object }}
 */
function scoreCandidate(input) {
    void input;
    throw new Error('scoreCandidate() is not implemented yet (after C4)');
}

module.exports = { scoreCandidate };

'use strict';

// Zoho Recruit → ScoringInput (C4).
// Pure mapping: no network, no writes. Missing or malformed fields degrade to empty input.

/**
 * @typedef {object} ScoringInput
 * @property {string[]} skills
 * @property {number} yearsExperience
 */

/**
 * Split a Zoho Skill_Set value into skill names.
 * Accepts a comma-separated string, an array (multi-select), or empty values.
 * @param {unknown} value
 * @returns {string[]}
 */
function splitSkills(value) {
    if (Array.isArray(value)) {
        return value.flatMap(splitSkills);
    }
    if (typeof value !== 'string') {
        return [];
    }
    return value
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean);
}

/**
 * Parse Years_of_Experience into a non-negative number.
 * Handles numbers, numeric strings, and strings such as "5 years" or "5,5".
 * @param {unknown} value
 * @returns {number}
 */
function parseYearsExperience(value) {
    if (typeof value === 'number') {
        return Number.isFinite(value) && value > 0 ? value : 0;
    }
    if (typeof value !== 'string') {
        return 0;
    }

    const normalized = value.trim().replace(/^(\d+),(\d+)$/, '$1.$2');
    const match = normalized.match(/\d+(?:\.\d+)?/);
    if (!match) {
        return 0;
    }

    const years = Number(match[0]);
    return Number.isFinite(years) ? years : 0;
}

/**
 * Map a Zoho Recruit candidate record to the scoring engine's input shape (C4.1).
 * Empty or missing fields become [] / 0 instead of throwing.
 * @param {object|null|undefined} candidate
 * @returns {ScoringInput}
 */
function extractScoringInput(candidate) {
    const source = candidate && typeof candidate === 'object' ? candidate : {};

    return {
        skills: splitSkills(source.Skill_Set),
        yearsExperience: parseYearsExperience(source.Years_of_Experience)
    };
}

module.exports = { extractScoringInput };

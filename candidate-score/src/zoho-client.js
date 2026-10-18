'use strict';

// Zoho Recruit API client (C3).
// All calls go through makeRequest() so auth, retries, and errors stay in one place.

const axios = require('axios');
const { getAccessToken } = require('./auth');

const API_PATH = '/recruit/v2';
const DEFAULT_TIMEOUT_MS = 15000;
const MAX_RETRIES = 3;
const MAX_RETRY_DELAY_MS = 30000;

class ZohoApiError extends Error {
    constructor(status, body, { method, endpoint }) {
        const code =
            body && typeof body === 'object' ? body.code || body.errorCode : undefined;
        const detail =
            body && typeof body === 'object'
                ? body.message || body.error_description || body.error
                : body;
        super(
            `Zoho ${method} ${endpoint} failed (HTTP ${status}${code ? `, ${code}` : ''})` +
                (detail ? `: ${detail}` : '')
        );
        this.name = 'ZohoApiError';
        this.status = status;
        this.code = code;
        this.details = body;
    }
}

function env(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

function trimSlash(value) {
    return value.replace(/\/+$/, '');
}

// Recruit uses recruit.zoho.<region>, not the CRM/accounts www.zohoapis.<region> host.
function recruitDomain() {
    if (process.env.ZOHO_RECRUIT_API_DOMAIN) {
        return trimSlash(process.env.ZOHO_RECRUIT_API_DOMAIN);
    }

    const apiDomain = trimSlash(env('ZOHO_API_DOMAIN'));
    if (/\/\/recruit\.zoho\./i.test(apiDomain)) {
        return apiDomain;
    }

    const match = apiDomain.match(/^https?:\/\/(?:www\.)?zohoapis\.(.+)$/i);
    if (!match) {
        throw new Error(
            'Cannot derive the Recruit domain from ZOHO_API_DOMAIN; set ZOHO_RECRUIT_API_DOMAIN explicitly'
        );
    }
    return `https://recruit.zoho.${match[1]}`;
}

function apiBaseUrl() {
    return `${recruitDomain()}${API_PATH}`;
}

function apiUrl(endpoint) {
    if (/^https?:\/\//i.test(endpoint)) {
        return endpoint;
    }
    return `${apiBaseUrl()}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(headers, attempt) {
    const raw = headers && (headers['retry-after'] ?? headers['Retry-After']);
    if (raw !== undefined) {
        const seconds = Number(raw);
        if (Number.isFinite(seconds)) {
            return Math.min(Math.max(seconds * 1000, 0), MAX_RETRY_DELAY_MS);
        }
        const at = Date.parse(raw);
        if (!Number.isNaN(at)) {
            return Math.min(Math.max(at - Date.now(), 0), MAX_RETRY_DELAY_MS);
        }
    }
    return Math.min(1000 * 2 ** attempt, MAX_RETRY_DELAY_MS);
}

function isRetryableNetworkError(error) {
    return ['ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED', 'EAI_AGAIN'].includes(error.code);
}

/**
 * Perform an authenticated request against Zoho Recruit (C3.1).
 * Refreshes the token once on 401 and retries 429 responses using Retry-After (C3.2).
 *
 * @param {string} method HTTP method
 * @param {string} endpoint Path under /recruit/v2, e.g. "/Candidates"
 * @param {object} [options] { params, data, timeout, retries }
 * @returns {Promise<object>} Parsed response body
 */
async function makeRequest(method, endpoint, options = {}) {
    const {
        params,
        data,
        timeout = DEFAULT_TIMEOUT_MS,
        retries = MAX_RETRIES
    } = options;

    const url = apiUrl(endpoint);
    let attempt = 0;
    let forceRefresh = false;
    let refreshTried = false;

    for (;;) {
        const token = await getAccessToken({ forceRefresh });
        forceRefresh = false;

        let response;
        try {
            response = await axios.request({
                method,
                url,
                params,
                data,
                timeout,
                headers: {
                    Authorization: `Zoho-oauthtoken ${token}`,
                    ...(data ? { 'Content-Type': 'application/json' } : {})
                },
                validateStatus: () => true
            });
        } catch (error) {
            if (isRetryableNetworkError(error) && attempt < retries) {
                await sleep(retryDelayMs(null, attempt));
                attempt += 1;
                continue;
            }
            throw new Error(`Zoho ${method} ${endpoint} request failed: ${error.message}`);
        }

        if (response.status === 401 && !refreshTried && attempt < retries) {
            refreshTried = true;
            forceRefresh = true;
            attempt += 1;
            continue;
        }

        if (response.status === 429 && attempt < retries) {
            await sleep(retryDelayMs(response.headers, attempt));
            attempt += 1;
            continue;
        }

        if (response.status >= 200 && response.status < 300) {
            return response.data;
        }

        throw new ZohoApiError(response.status, response.data, { method, endpoint });
    }
}

/**
 * Fetch every page of a list endpoint.
 * @param {string} endpoint
 * @param {object} [options] { params, perPage, maxPages }
 * @returns {Promise<object[]>}
 */
async function listAll(endpoint, options = {}) {
    const { params = {}, perPage = 200, maxPages = 20 } = options;
    const items = [];

    for (let page = 1; page <= maxPages; page += 1) {
        const body = await makeRequest('GET', endpoint, {
            params: { ...params, page, per_page: perPage }
        });
        const rows = body && Array.isArray(body.data) ? body.data : [];
        items.push(...rows);

        if (!body || !body.info || !body.info.more_records) {
            break;
        }
    }

    return items;
}

function escapeCriteriaValue(value) {
    return String(value).replace(/([(),\\])/g, '\\$1');
}

/**
 * Accept either a numeric record id or a Job_Opening_ID such as ZR_1_JOB.
 * @param {string|number} jobId
 * @returns {Promise<string>} Numeric record id
 */
async function resolveJobId(jobId) {
    const value = String(jobId ?? '').trim();
    if (!value) {
        throw new Error('jobId is required');
    }
    if (/^\d+$/.test(value)) {
        return value;
    }

    const body = await makeRequest('GET', '/Job_Openings/search', {
        params: {
            criteria: `(Job_Opening_ID:equals:${escapeCriteriaValue(value)})`,
            per_page: 1
        }
    });
    const job = body && Array.isArray(body.data) ? body.data[0] : null;
    if (!job) {
        throw new Error(`Job opening ${value} not found`);
    }
    return job.id;
}

/**
 * Raw application records for one job opening.
 * @param {string|number} jobId Numeric id or Job_Opening_ID
 * @param {object} [options] { perPage, maxPages }
 * @returns {Promise<object[]>}
 */
async function getApplicationsForJob(jobId, options = {}) {
    const id = await resolveJobId(jobId);
    return listAll(`/Job_Openings/${encodeURIComponent(id)}/Applications`, options);
}

/**
 * Fetch one candidate by ID (C3.3).
 * @param {string|number} candidateId
 * @returns {Promise<object>}
 */
async function getCandidate(candidateId) {
    const value = String(candidateId ?? '').trim();
    if (!value) {
        throw new Error('candidateId is required');
    }

    const body = await makeRequest('GET', `/Candidates/${encodeURIComponent(value)}`);
    const candidate = body && Array.isArray(body.data) ? body.data[0] : null;
    if (!candidate) {
        throw new Error(`Candidate ${value} not found`);
    }
    return candidate;
}

async function mapLimit(items, limit, fn) {
    const results = new Array(items.length);
    let index = 0;
    const size = Math.max(1, Math.min(limit, items.length));

    await Promise.all(
        Array.from({ length: size }, async () => {
            while (index < items.length) {
                const current = index;
                index += 1;
                results[current] = await fn(items[current], current);
            }
        })
    );

    return results;
}

/**
 * Candidates linked to a job opening (C3.3).
 * Reads applications, then hydrates unique candidate ids.
 *
 * @param {string|number} jobId Numeric id or Job_Opening_ID
 * @param {object} [options] { hydrate, concurrency, perPage, maxPages }
 * @returns {Promise<object[]>}
 */
async function getCandidatesForJob(jobId, options = {}) {
    const { hydrate = true, concurrency = 5, perPage, maxPages } = options;
    const applications = await getApplicationsForJob(jobId, { perPage, maxPages });

    const ids = [
        ...new Set(
            applications
                .map((application) => application.$Candidate_Id)
                .filter(Boolean)
                .map(String)
        )
    ];

    if (!hydrate) {
        return ids;
    }

    return mapLimit(ids, concurrency, getCandidate);
}

/**
 * Patch a candidate record (C3.3).
 * @param {string|number} candidateId
 * @param {object} fields Fields to update
 * @returns {Promise<object>} Zoho's per-record result
 */
async function updateCandidate(candidateId, fields) {
    const value = String(candidateId ?? '').trim();
    if (!value) {
        throw new Error('candidateId is required');
    }
    if (!fields || typeof fields !== 'object' || Array.isArray(fields) || !Object.keys(fields).length) {
        throw new Error('fields must be a non-empty object');
    }

    const body = await makeRequest('PUT', '/Candidates', {
        data: { data: [{ ...fields, id: value }] }
    });
    const result = body && Array.isArray(body.data) ? body.data[0] : null;

    if (result && result.status === 'error') {
        throw new Error(
            `Zoho update failed for candidate ${value}` +
                (result.code ? ` (${result.code})` : '') +
                (result.message ? `: ${result.message}` : '')
        );
    }
    return result;
}

module.exports = {
    ZohoApiError,
    apiBaseUrl,
    makeRequest,
    getApplicationsForJob,
    getCandidatesForJob,
    getCandidate,
    updateCandidate
};

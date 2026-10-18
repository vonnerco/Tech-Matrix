'use strict';

const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env'), quiet: true });

// Refresh 5 minutes before Zoho's expiry so callers never see a dead token.
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

let cachedToken = null; // { accessToken, expiresAt }
let inflight = null;

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

// Zoho issues tokens from the accounts host that matches the API region:
// www.zohoapis.com -> accounts.zoho.com, www.zohoapis.eu -> accounts.zoho.eu, ...
function accountsDomain() {
    if (process.env.ZOHO_ACCOUNTS_DOMAIN) {
        return trimSlash(process.env.ZOHO_ACCOUNTS_DOMAIN);
    }

    const apiDomain = trimSlash(env('ZOHO_API_DOMAIN'));
    const match = apiDomain.match(/^https?:\/\/(?:www\.)?zohoapis\.(.+)$/i);
    if (!match) {
        throw new Error(
            'Cannot derive the accounts domain from ZOHO_API_DOMAIN; set ZOHO_ACCOUNTS_DOMAIN explicitly'
        );
    }
    return `https://accounts.zoho.${match[1]}`;
}

function tokenError(status, data) {
    const detail = data && (data.error_description || data.error || data.message);
    return new Error(`Zoho token refresh failed (HTTP ${status})${detail ? `: ${detail}` : ''}`);
}

async function requestToken() {
    const response = await axios.post(
        `${accountsDomain()}/oauth/v2/token`,
        new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: env('ZOHO_CLIENT_ID'),
            client_secret: env('ZOHO_CLIENT_SECRET'),
            refresh_token: env('ZOHO_REFRESH_TOKEN')
        }),
        {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 15000,
            validateStatus: () => true
        }
    );

    const data = response.data || {};
    if (response.status !== 200 || !data.access_token) {
        throw tokenError(response.status, data);
    }

    const expiresIn = Number(data.expires_in) || 3600;
    // If a token is shorter-lived than the buffer, keep at least half its life.
    const buffer = Math.min(EXPIRY_BUFFER_MS, (expiresIn * 1000) / 2);

    return {
        accessToken: data.access_token,
        expiresAt: Date.now() + expiresIn * 1000 - buffer
    };
}

async function getAccessToken({ forceRefresh = false } = {}) {
    if (!forceRefresh && cachedToken && Date.now() < cachedToken.expiresAt) {
        return cachedToken.accessToken;
    }

    // Collapse concurrent callers into one refresh request.
    if (!inflight) {
        inflight = requestToken()
            .then((token) => {
                cachedToken = token;
                return token;
            })
            .finally(() => {
                inflight = null;
            });
    }

    const token = await inflight;
    return token.accessToken;
}

function clearTokenCache() {
    cachedToken = null;
    inflight = null;
}

module.exports = { getAccessToken, clearTokenCache, accountsDomain };

if (require.main === module) {
    getAccessToken()
        .then((token) => {
            const preview = `${token.slice(0, 6)}...${token.slice(-4)}`;
            console.log(`OK: fresh access token received (${preview}, ${token.length} chars)`);
        })
        .catch((error) => {
            console.error(error.message);
            process.exitCode = 1;
        });
}

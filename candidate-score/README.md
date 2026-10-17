# Candidate Score — Zoho Recruit read flow

Node integration that pulls candidates from Zoho Recruit for scoring.

## Setup

```sh
npm install
cp .env.example .env   # then fill in real values
```

Required environment variables:

| Variable | Purpose |
| --- | --- |
| `ZOHO_CLIENT_ID` | OAuth self-client ID |
| `ZOHO_CLIENT_SECRET` | OAuth self-client secret |
| `ZOHO_REFRESH_TOKEN` | Long-lived refresh token |
| `ZOHO_API_DOMAIN` | Region host, e.g. `https://www.zohoapis.com` |

`.env` holds credentials and is git-ignored. Never commit it.

## Planned layout

Files for C2/C3 are added in those steps; C1 creates the folder, `src/`, and `.env`.

```text
candidate-score/
├── .env                 # credentials (git-ignored)
├── src/
│   ├── auth.js          # token management (C2)
│   ├── zoho-client.js   # API wrapper (C3)
│   ├── scoring-engine.js
│   └── integration.js   # orchestrator
├── package.json
└── README.md
```

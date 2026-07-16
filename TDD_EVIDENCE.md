# TDD Evidence Log
## Phase 1: RED
* Goal: Protect against Brute-Force attacks on login.
* Result: 🔴 FAILED. No limits applied.

## Phase 2: GREEN
* Action: Implemented rate limiter in app.js.
* Result: 🟢 PASSED. Returns 429 Too Many Requests.

## Phase 3: REFACTOR
* Action: Moved JWT_SECRET to process.env securely.
* Result: 🟢 PASSED. All tests green.
# 🍎 NutriTrack Backend API
This backend service powers the NutriTrack ecosystem. It is built using Node.js, Express, and SQLite, developed strictly under Test-Driven Development (TDD) guidelines.
## 🚀 1. Live Demo: Running Automated Tests
The system includes **15 automated test cases** checking core features and security.
### How to Run:
1. Open your terminal in this directory (`api-server`).
2. Run the command: `npm install`
3. Run the test command: `npm test`
## 🔒 2. Documented Vulnerabilities & Fixes
### A. Brute-Force Password Guessing (Mitigated)
* **Vulnerability**: Attackers could automate endless login attempts to guess user passwords.
* **The Fix**: Implemented an in-memory memory registry. After **5 consecutive failed attempts**, the server locks out the user for 15 minutes, returning an HTTP `429 Too Many Requests` status.
### B. Broken Object Level Authorization / IDOR (Mitigated)
* **Vulnerability**: A logged-in User A could change the meal ID in the URL to view or delete meals belonging to User B.
- **The Fix**: Enforced strict database ownership checks on updates and deletions (`WHERE id = ? AND user_id = ?`). A mismatch safely returns a `404 Not Found`.

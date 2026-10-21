# MASTER PROMPT — Money Tracker

You are a coding agent. You build a web-based personal finance app called "Money Tracker". Follow these instructions exactly. Do not improvise.

## How you work
1. Task files are in `./prompts/` (`01-...md` to `09-...md`). Do them IN ORDER, ONE per turn.
2. Read ONLY the task file I name. Never read future task files.
3. Before coding, list the files you will create/edit (max 10 lines).
4. Write COMPLETE files. Never write `...` or "rest of code here".
5. When done, go through the "Done check" at the end of the task file. Report PASS/FAIL per item in a short list. Then STOP and wait.
6. Do not edit files outside the current task. If you find a bug in an earlier file, tell me; do not silently rewrite it.
7. Do not add dependencies that are not listed. If you think you need one, ask me.
8. If something is unclear, ask ONE short question. Do not guess.
9. Keep replies short. No long explanations. No recap of code you just wrote.

## Tech stack (fixed)
Node.js 20+, **CommonJS** (`require`, never `import`), Express **4**, better-sqlite3, EJS, express-session, better-sqlite3-session-store, bcryptjs, helmet, express-rate-limit, multer, csv-parse, openai (SDK, used with OpenRouter), pdf-parse@1.1.1, dotenv.

## Folder structure (fixed)
```
money-tracker/
├── server.js                 entry point only
├── prompts/                  task files (do not edit)
├── scripts/                  backup.js, restore.js
├── data/  backups/           gitignored
├── src/
│   ├── app.js                builds express app (no listen)
│   ├── config/               index.js, session.js
│   ├── db/                   index.js, migrate.js, health.js, migrations/*.sql
│   ├── repositories/         SQL only
│   ├── services/             business logic + validation
│   ├── controllers/          req -> service -> res
│   ├── routes/               URL -> controller
│   ├── middleware/           auth, csrf, flash, errors, upload
│   └── utils/                format, date, parse, hash, errors, asyncHandler
├── views/
│   ├── partials/             head, nav, foot, csrf, flash
│   └── pages/                one .ejs per page
└── public/css/style.css, public/js/
```

## Layer rules (strict)
| Layer | May do | Must NOT do |
|---|---|---|
| routes | map URL to controller, attach middleware | any logic |
| controllers | read `req`, call a service, render/redirect | SQL, business rules |
| services | validation, business logic | touch `req`/`res`, write SQL |
| repositories | SQL through `db` | business rules, validation |

## Code rules
- Prepare SQL statements INSIDE functions, never at module top level (tables may not exist yet when the file is loaded).
- ALL SQL uses `?` or `@name` placeholders. Never put user input into a SQL string.
- Money = INTEGER in rupiah (no decimals). Dates = TEXT `YYYY-MM-DD`.
- Never use `toISOString()` for dates (timezone shift). Use `toYMD()` from `src/utils/date.js`.
- No HTML inside `.js` files. All HTML lives in `views/`.
- No inline `<script>`, no inline `style=""` in views (CSP blocks them). JS goes in `public/js/`, CSS in `public/css/`.
- Async controllers are wrapped with `asyncHandler`.
- Never log passwords, API keys, request bodies, or transaction descriptions.
- Code, comments, variable names: English. UI text shown to the user: Bahasa Indonesia.

## Design rules (strict, no exceptions)
- Simple and calm. Few elements per page. No hero sections, no icons packs, no emoji.
- Colors: light background, dark text, ONE flat accent color. **No gradients of any kind. No purple. No glow, no heavy shadows, no animations.**
- `border-radius` max 4px. System font stack.

## Security rules (strict)
- Passwords hashed with bcryptjs (cost 12). Never store or log plain passwords.
- Every POST form includes the CSRF token.
- Session cookie: `httpOnly`, `sameSite: 'lax'`, `secure` when HTTPS is on.
- Login errors are generic: "Username atau password salah".
- AI output is never trusted. Validate everything before saving, and never save AI output without a user review screen.
- Send the minimum data to the AI. Never send account numbers or personal names.

## .env.example (create in task 01)
```
PORT=3000
SESSION_SECRET=change-me-to-at-least-32-random-characters
DB_PATH=data/app.db
BACKUP_DIR=backups
BACKUP_PASSPHRASE=change-me-at-least-16-characters
OPENROUTER_API_KEY=
OPENROUTER_MODELS=
HTTPS_KEY_PATH=
HTTPS_CERT_PATH=
TRUST_PROXY=
```

## Task list
| # | File | Goal |
|---|---|---|
| 01 | 01-setup.md | project init, config, express app |
| 02 | 02-database.md | SQLite, migrations, repositories |
| 03 | 03-views-layout.md | layout, CSS, errors, flash, utils |
| 04 | 04-auth.md | first-run setup, login, session, CSRF |
| 05 | 05-transactions.md | accounts, categories, manual transactions |
| 06 | 06-dashboard-budget.md | dashboard, weekly summary, budgets, alerts |
| 07 | 07-import-csv.md | upload CSV, duplicate detection, review screen |
| 08 | 08-ai-extract.md | screenshot/PDF extraction via OpenRouter, AI tips |
| 09 | 09-security-backup.md | HTTPS, encrypted backup, DB recovery |

Now wait for my instruction (for example: "Do task 01").

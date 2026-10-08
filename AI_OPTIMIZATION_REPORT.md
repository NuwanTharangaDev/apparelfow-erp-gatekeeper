# AI Optimization Report

## 1. Tools and prompting

I used Claude AI Tool while building this project.

- Planning: [what you asked it, e.g. breaking the brief into daily steps]
- Schema and SQL: [e.g. first draft of schema.sql and the triggers]
- Express routes: [e.g. first draft of the order and verification routes]
- React and styling: [e.g. the Tailwind layout and the traffic light badges]
- Tests: [e.g. first draft of the supertest cases]

I worked one small step at a time. After each step I ran the code, checked the result in the browser or the database, and made one commit. [Add how you wrote prompts, e.g. pasting the exact error back in.]

## 2. Flawed or broken AI output

**Setup commands with a placeholder.** The commands I was given to set up the test database contained the text `<your TEST connection string>`. I pasted it as it was, so `db:setup` and `db:seed` failed with `getaddrinfo ENOTFOUND`, and the error showed the placeholder as the hostname. A second command also copied `$env:TEST_DATABASE_URL` into `DATABASE_URL`, but that variable is empty in PowerShell because dotenv only loads `.env` inside Node. I fixed it by reading the value out of `server/.env` in PowerShell and checking that it starts with `postgresql://` before running anything. The setup scripts then ran against the test database.


**A test block left open.** In `api.test.js` the `approving a batch` block was never closed, so the reject, role and validation tests ended up nested inside it, with an extra closing bracket at the end of the file. It still ran, but the grouping in the test output was wrong. I closed the block, removed the extra bracket and re-ran the suite (24 tests passed).

[Add any other real cases you caught, such as a contrast problem, a bypassable check, or a re-render loop. Only write what actually happened.]

## 3. Human refactoring

- Counts and quantities are checked with `Number.isInteger` and a range, never with `Number(value)`. A string like `"50"`, `"abc"`, `null`, a decimal or a negative number is refused with 422. The tests send each of those.
- Fabric maths works in hundredths of a yard, because Postgres returns `NUMERIC` as a string and floating point drifts.
- Approve works the traffic light out again from `expected_qty` and `actual_qty` and does not trust the saved status column.
- Status changes run inside a transaction that locks the order row with `SELECT ... FOR UPDATE`.
- CHECK constraints and two triggers sit in the database as a last line of defence: logs cannot be edited, and counts are locked after approval.
- The tests run against a separate database, and `test-setup.js` refuses to start if it is the same as the development database.
- An accidental `"apparelflow-erp": "file:.."` dependency had been added to both `package.json` files, so the project depended on itself. I found it while reviewing the repo before deployment and removed it.
- [Add anything else you changed after reading the code, in your own words.]

## 4. Defensive Architecture

The brief says hidden buttons are not security, so every rule below is enforced on the server. The main ones are covered by tests in `server/api.test.js`.

**Status changes.** No endpoint accepts a status from the request body. The server checks the current status before every change:
- Submit and start sewing use `UPDATE ... WHERE id = $1 AND status = '<expected status>'`. If no row changes, the route answers 404 (missing) or 409 (wrong state).
- Counts, approve, reject and resubmit lock the order row with `SELECT ... FOR UPDATE` inside a transaction, then check the status. Two verifiers acting on the same order cannot both approve it; the second gets 409.

**Access control.** `requireLogin` reads the JWT from the httpOnly cookie and `requireRole` checks the role before any query runs. The verification and sewing routers apply the role check once at the top of the router. No cookie gives 401, and the wrong role gives 403.

**Hard stop.** Approve does not trust the saved GREEN, YELLOW or RED status. It reads `expected_qty` and `actual_qty` again and recalculates every light. An uncounted or RED component returns 422 with the list of problems, rolls back and writes no log row. YELLOW (excess) does not block approval.

**Identity and time.** The verifier id in `verification_logs` and `created_by` on an order come from the signed token (`req.user.id`), never from the body. The decision time is the database default `NOW()`. Expected piece counts and expected fabric are calculated by the server when the order is created.

**Database rules.**
- CHECK constraints on quantities, order statuses, rejection note length (at least 5 characters), and count/status being both empty or both set.
- A trigger rejects every UPDATE and DELETE on `verification_logs`.
- A trigger rejects changes to `verification_items` once the order is `VERIFIED` or `SEWING_IN_PROGRESS`.
- Each decision stores a `variance_snapshot`, so the audit record survives a later resubmit.

**Query isolation.** The sewing queue and the sewing order detail filter with `o.status = 'VERIFIED'` and join to an `APPROVED` log row. A sewing supervisor who guesses the id of a pending, rejected or started order gets 404. The sewing routes build their responses field by field and never return raw rows.

**What I would improve.** The allowed transitions are written inside each route, not in one shared table. The role is read from the token and not looked up on every request, so a role change only applies after the session expires.

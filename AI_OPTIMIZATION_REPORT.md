# AI Optimization Report

## 4. Defensive Architecture

The brief says disabled buttons and hidden tabs are not security, so every rule below is enforced on the server and checked by tests in `server/api.test.js`.

### Status changes

No endpoint takes a status from the request body. A status only changes inside a SQL statement that names the status it expects:

- Submit: `UPDATE ... WHERE id = $1 AND status = 'CUTTING_IN_PROGRESS'`. If no row changes, the route checks whether the order is missing (404) or in another state (409).
- Counts, approve, reject and resubmit: the order row is locked with `SELECT ... FOR UPDATE` inside a transaction, then the status is checked. Two verifiers acting on the same order at once cannot both approve it; the second one gets 409.
- Start sewing: `UPDATE ... WHERE id = $1 AND status = 'VERIFIED'`.

### Who can call what

`requireLogin` reads the JWT from the httpOnly cookie and `requireRole` checks the role. The verification and sewing routers apply `requireRole` once at the top of the router, so a new route in those files cannot be left unprotected by accident. The orders router checks `cutting_supervisor` on each route. Unauthenticated calls get 401 and the wrong role gets 403.

### The hard stop

The approve route does not trust the saved GREEN, YELLOW or RED status. It reads `expected_qty` and `actual_qty` for every component and works the light out again with `getLight`. A component with no count blocks approval, and so does any RED component. The route answers 422, rolls the transaction back and writes no log row.

### Identity and time

The verifier id written to `verification_logs` is `req.user.id`, taken from the signed token. Any `verifierId` in the request body is ignored. The decision time is the database default `NOW()`, not a value from the client.

### The database as the last line of defence

- CHECK constraints: `target_qty > 0`, `expected_qty > 0`, `actual_qty >= 0`, a fixed list of allowed statuses, and a count and its status must be both empty or both set.
- A trigger on `verification_logs` rejects every UPDATE and DELETE, so the audit trail cannot be edited.
- A trigger on `verification_items` rejects changes once the order is `VERIFIED` or `SEWING_IN_PROGRESS`, so counts cannot be changed after approval.

### Query isolation

The sewing queue and the sewing order detail both filter in SQL with `o.status = 'VERIFIED'`, joined to an `APPROVED` log row. A sewing supervisor who guesses the id of a pending, rejected or in-progress order gets 404.

### What I would improve

The allowed transitions are written inside each route and not in one table or module. That works for five statuses, but one shared place for them would be easier to review. The role is also read from the token and not looked up again on every request, so a role change only takes effect when the session expires.
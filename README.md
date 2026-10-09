# ApparelFlow ERP: Cutting Gatekeeper Terminal

Cutting verification and sewing queue gate for a garment factory. A cutting batch cannot reach the sewing queue unless a cutting verifier has counted every component and none is short.

Built for the Webtezza software engineering intern assessment.

**Live URL:** https://keen-elf-01b35f.netlify.app/

## Stack

- React, Vite, Tailwind CSS
- Node.js, Express 5
- PostgreSQL (Neon)
- JWT in an httpOnly cookie, bcrypt password hashes
- Vitest and supertest for tests

## Roles

| Role | Can do | Cannot do |
|---|---|---|
| cutting_supervisor | Create and submit cutting orders | Verify batches, see the sewing queue |
| cutting_verifier | Count components, approve or reject | Create orders, see the sewing queue |
| sewing_supervisor | See verified batches, start sewing | See pending or rejected orders |

Every rule is enforced on the server. Hidden buttons in the UI are only a convenience.

## Demo accounts

Password for all three: `Demo@1234`

| Role | Email |
|---|---|
| Cutting Supervisor | supervisor@apparelflow.com |
| Cutting Verifier | verifier@apparelflow.com |
| Sewing Supervisor | sewing@apparelflow.com |

These accounts are public on purpose so the app can be tested. They hold only seed data and should be removed in a real deployment. The login page also has one-click buttons for the three accounts, and the navbar lets you switch role without typing.

## Seed recipes

| Code | Name | Standard fabric | Wastage cap | Components (pieces per garment) |
|---|---|---|---|---|
| REC-BL01 | Casual Blouse | 1.8 yards | 5% | Front Body Panel 1, Back Body Panel 1, Sleeves (Left & Right) 2, Collar & Stand 1, Sleeve Cuffs 2 |
| REC-CT02 | Crop Top | 1.1 yards | 8% | Front Chest Panel 1, Back Support Panel 1, Neck Binding Strip 1, Hem Elastic Casing 1, Side Strap Accents 2 |

## Architecture

```
client/            React app (Vite, Tailwind)
  src/pages/       Login, Orders, Verification, Sewing
  src/components/  Navbar, NewOrder modal, CountTerminal, SewingDetail
server/
  app.js           Express app, mounts the route files
  server.js        Starts the server
  db.js            pg connection pool
  domain.js        Traffic light, expected fabric and wastage calculations
  middleware/      requireLogin, requireRole
  routes/          auth, recipes, orders, verification, sewing
  schema.sql       Tables, constraints and triggers
  seed.js          Demo users and the two recipes
  api.test.js      API tests (supertest)
  domain.test.js   Unit tests for domain.js
```

The browser talks to Express over `/api`. A login sets a signed JWT in an httpOnly cookie. Every route runs `requireLogin`, and the role is checked with `requireRole` before any query runs. The client only decides what to show. The server decides what is allowed.

### Order flow

```
CUTTING_IN_PROGRESS --submit--> PENDING_VERIFICATION --approve--> VERIFIED --start--> SEWING_IN_PROGRESS
                                        |
                                     reject (note required)
                                        v
                                     REJECTED --resubmit--> PENDING_VERIFICATION
```

A status only changes inside a SQL statement that names the status it expects (`WHERE status = ...`) or after locking the order row with `FOR UPDATE`. No endpoint accepts a status from the request body.

### Rules

- Expected pieces for a component = target quantity x pieces per garment. The server works this out when the order is created.
- Traffic light: count equal to expected is GREEN, more is YELLOW, fewer is RED.
- Approve is refused with 422 if any component is RED or has no count. The server works the lights out again from the raw counts and does not trust the saved status.
- Expected fabric = target quantity x standard yards. Wastage % = (actual yards - expected yards) / expected yards x 100, rounded to 2 decimals.
- The verifier id and the decision time on every approval or rejection come from the session and the database clock.

## Database schema

| Table | Purpose | Main columns |
|---|---|---|
| `users` | The three demo roles | `email` (unique), `password_hash`, `role`, `full_name` |
| `recipes` | Garment recipes | `recipe_code` (unique), `name`, `std_fabric_yards`, `wastage_cap` |
| `recipe_components` | Pieces in a recipe | `recipe_id`, `component_name`, `pieces_per_garment`, `image_url` |
| `cutting_orders` | One cutting batch | `order_no`, `recipe_id`, `target_qty`, `fabric_roll_id`, `actual_fabric_yds`, `expected_fabric_yds`, `wastage_cap`, `status`, `created_by`, `sewing_started_by`, `sewing_started_at` |
| `verification_items` | One row per component of an order | `order_id`, `component_id`, `expected_qty`, `actual_qty` (NULL until counted), `status` |
| `verification_logs` | Audit trail of every decision | `order_id`, `verifier_id`, `decision`, `rejection_note`, `approval_note`, `wastage_pct`, `variance_snapshot`, `decided_at` |

How they connect: a recipe has many components. An order belongs to one recipe and one creator. When an order is created, the server adds one `verification_items` row for each component of its recipe. Every approval or rejection adds one `verification_logs` row that points to the order and to the verifier.

Rules kept in the database itself:

- `order_no` looks like `CO-0001` and comes from a sequence.
- CHECK constraints: `target_qty > 0`, `expected_qty > 0`, `actual_qty >= 0`, `actual_fabric_yds > 0`, a fixed list of allowed order statuses, and a rejection log needs a note of at least 5 characters. A count and its status are either both empty or both set.
- A trigger on `verification_logs` blocks UPDATE and DELETE, so the audit trail cannot be changed.
- A trigger on `verification_items` blocks changes once the order is `VERIFIED` or `SEWING_IN_PROGRESS`.
- `variance_snapshot` stores the expected, counted and variance for each component at the moment of the decision, so the sewing supervisor sees what the verifier saw.

## API

All routes are under `/api` and need the login cookie, except login and the health checks.

| Method and path | Role | What it does |
|---|---|---|
| POST `/auth/login` | anyone | Sign in, sets the cookie |
| GET `/auth/me` | any signed-in user | Current user |
| POST `/auth/logout` | anyone | Clears the cookie |
| GET `/recipes` | supervisor, verifier | Recipes with their components |
| POST `/orders` | cutting_supervisor | Create an order |
| GET `/orders` | cutting_supervisor | List all orders |
| POST `/orders/:id/submit` | cutting_supervisor | Send an order for verification |
| POST `/orders/:id/resubmit` | cutting_supervisor | Send a rejected order back, counts cleared |
| GET `/verification/queue` | cutting_verifier | Orders waiting for verification |
| GET `/verification/:id` | cutting_verifier | One pending order with its components |
| PUT `/verification/:id/counts` | cutting_verifier | Save component counts |
| POST `/verification/:id/approve` | cutting_verifier | Approve (422 if any RED or uncounted) |
| POST `/verification/:id/reject` | cutting_verifier | Reject, note of 5 to 500 characters required |
| GET `/sewing/queue` | sewing_supervisor | Verified orders only |
| GET `/sewing/in-progress` | sewing_supervisor | Orders where sewing has started |
| GET `/sewing/:id` | sewing_supervisor | One verified order with audit details |
| POST `/sewing/:id/start` | sewing_supervisor | Start sewing on a verified order |
| GET `/health`, GET `/health/db` | anyone | Server and database check |

Status codes: 400 for a body that is not valid JSON, 401 not signed in, 403 wrong role, 404 order not found or not visible to that role, 409 order is in the wrong state, 422 invalid input or a business rule (shortage, uncounted component).


## Running locally

You need Node 22 or newer and a PostgreSQL database.

1. Copy `server/.env.example` to `server/.env` and fill in the values:

| Variable | Meaning |
|---|---|
| `PORT` | Port for the API, default 5000 |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Long random string used to sign login tokens |
| `TEST_DATABASE_URL` | Connection string of a separate database, only used by the tests |

2. Create the tables and seed data:

```
cd server
npm install
npm run db:setup
npm run db:seed
```

3. Start the API (port 5000):

```
npm run dev
```

4. In another terminal, start the client (port 5173):

```
cd client
npm install
npm run dev
```

Open http://localhost:5173. Vite forwards `/api` requests to Express, so the login cookie works without CORS.

## Production build

From the project root, `npm run build` builds the client and `npm start` runs Express. With `NODE_ENV=production` Express serves the built client, so the app runs on one origin. The server stops at startup if `JWT_SECRET` or `DATABASE_URL` is missing.

## Running the tests

The tests call the real Express app with supertest and use a separate database, so they never touch your development data.

1. Create a second empty database and put its connection string in `server/.env` as `TEST_DATABASE_URL`. The tests refuse to run if it is missing or equal to `DATABASE_URL`.
2. Create the tables and seed data in that database once, by running the two setup scripts with `DATABASE_URL` pointed at it:

```
cd server
DATABASE_URL="<test connection string>" npm run db:setup
DATABASE_URL="<test connection string>" npm run db:seed
```

On Windows PowerShell, set `$env:DATABASE_URL = "<test connection string>"` first, run the two scripts, then run `Remove-Item Env:DATABASE_URL`.

3. Run the tests:

```
npm test
```

The five tests the brief asks for are in `server/api.test.js`:

| Brief test | Test name |
|---|---|
| 1. All GREEN order can be approved | approves an order where every component is green |
| 2. RED component blocks approval | blocks approval when a component is short |
| 3. Reject without a reason fails | refuses a missing, blank or too short reason |
| 4. Non-verifier roles get 403 | stops the supervisor and sewing roles from approving or rejecting |
| 5. Unapproved orders never reach the sewing queue | lists only verified orders |

The rest of the file covers login, the verifier being blocked from creating orders, invalid input (negative, decimal, text and empty values) and hiding unverified orders from the sewing detail route.

## Decisions

- Fabric yards are whole numbers, because the brief says inputs must reject decimals.
- Wastage above the recipe cap shows a warning but does not block approval, since the brief only blocks on a shortage.
- A component count of 0 is a real count (and is a shortage). A count that was never entered is stored as NULL and blocks approval.
- Expected quantities are calculated by the server when the order is created. The client never sends them.
- Bad input returns 422 with the fields that failed. A body that is not valid JSON returns 400, a wrong order state returns 409, and a missing or hidden order returns 404.
- When sewing starts, the order moves to `SEWING_IN_PROGRESS`. The sewing queue only lists `VERIFIED` orders, and started orders appear in a separate in-progress list.
- A rejected order goes back to the supervisor. On resubmit the counts are cleared, so the verifier must count again.

## Status

- [x] Database schema, seed data
- [x] Login, logout, session check, role guard
- [x] Login page with demo accounts, navbar role switch
- [x] Cutting orders: create, submit, resubmit after rejection
- [x] Verification terminal: counts, traffic lights, approve and reject with server hard stop
- [x] Sewing queue and start sewing
- [x] Automated tests
- [x] AI optimization report
- [ ] Deployment

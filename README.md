# ApparelFlow ERP: Cutting Gatekeeper Terminal

Cutting verification and sewing queue gate for a garment factory. A cutting batch cannot reach the sewing queue unless a cutting verifier has counted every component and none is short.

Built for the Webtezza software engineering intern assessment.

**Live URL:** not deployed yet

## Stack

- React, Vite, Tailwind CSS
- Node.js, Express 5
- PostgreSQL (Neon)
- JWT in an httpOnly cookie, bcrypt password hashes

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

These accounts are public on purpose so the app can be tested. They hold only seed data and should be removed in a real deployment.

## Running locally

You need Node 22 or newer and a PostgreSQL database.

1. Copy `server/.env.example` to `server/.env` and fill in the values.
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

From the project root, `npm run build` builds the client and `npm start` runs Express. With `NODE_ENV=production` Express serves the built client, so the app runs on one origin.

## Decisions

- Fabric yards are whole numbers, because the brief says inputs must reject decimals.
- Wastage above the recipe cap shows a warning but does not block approval, since the brief only blocks on a shortage.
- A component count of 0 is a real count (and is a shortage). A count that was never entered is stored as NULL and blocks approval.
- Expected quantities are calculated by the server when the order is created. The client never sends them.

## Status

- [x] Database schema for users and recipes, seed data
- [x] Login, logout, session check, role guard
- [x] Login page with demo accounts, navbar role switch
- [ ] Cutting orders
- [ ] Verification terminal and hard stop
- [ ] Sewing queue
- [ ] Automated tests
- [ ] Deployment
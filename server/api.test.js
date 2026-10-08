import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import app from './app.js'
import pool from './db.js'

const demoPassword = 'Demo@1234'

async function loginAs(email) {
  const agent = request.agent(app)
  await agent.post('/api/auth/login').send({ email, password: demoPassword }).expect(200)
  return agent
}

async function createOrder(supervisor) {
  const recipe = await pool.query("SELECT id FROM recipes WHERE recipe_code = 'REC-BL01'")

  const created = await supervisor
    .post('/api/orders')
    .send({
      recipeId: recipe.rows[0].id,
      targetQty: 50,
      fabricRollId: 'ROLL-TEST-01',
      actualFabricYds: 90,
    })
    .expect(201)

  return created.body.id
}

async function createPendingOrder(supervisor) {
  const orderId = await createOrder(supervisor)
  await supervisor.post(`/api/orders/${orderId}/submit`).expect(200)
  return orderId
}

async function createVerifiedOrder(supervisor, verifier) {
  const orderId = await createPendingOrder(supervisor)
  await countAll(verifier, orderId)
  await verifier.post(`/api/verification/${orderId}/approve`).send({}).expect(200)
  return orderId
}


async function countAll(verifier, orderId, shortBy = {}) {
  const detail = await verifier.get(`/api/verification/${orderId}`).expect(200)
  const counts = detail.body.items.map((item) => ({
    itemId: item.id,
    actualQty: item.expectedQty - (shortBy[item.name] ?? 0),
  }))

  await verifier.put(`/api/verification/${orderId}/counts`).send({ counts }).expect(200)
}

beforeEach(async () => {
  await pool.query(
    'TRUNCATE verification_logs, verification_items, cutting_orders RESTART IDENTITY'
  )
})

afterAll(async () => {
  await pool.end()
})

describe('login', () => {
  it('signs in each demo role', async () => {
    const accounts = [
      ['supervisor@apparelflow.com', 'cutting_supervisor'],
      ['verifier@apparelflow.com', 'cutting_verifier'],
      ['sewing@apparelflow.com', 'sewing_supervisor'],
    ]

    for (const [email, role] of accounts) {
      const agent = await loginAs(email)
      const res = await agent.get('/api/auth/me').expect(200)
      expect(res.body.role).toBe(role)
    }
  })

  it('rejects a wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sewing@apparelflow.com', password: 'wrong-password' })

    expect(res.status).toBe(401)
  })
})

describe('sewing queue', () => {
  it('needs a login', async () => {
    const res = await request(app).get('/api/sewing/queue')

    expect(res.status).toBe(401)
  })

  it('lists only verified orders', async () => {
    const supervisor = await loginAs('supervisor@apparelflow.com')
    const verifier = await loginAs('verifier@apparelflow.com')
    const sewing = await loginAs('sewing@apparelflow.com')

    await createOrder(supervisor)
    await createPendingOrder(supervisor)

    const rejectedId = await createPendingOrder(supervisor)
    await verifier
      .post(`/api/verification/${rejectedId}/reject`)
      .send({ note: 'Sleeve panels are damaged' })
      .expect(200)

    const startedId = await createVerifiedOrder(supervisor, verifier)
    await sewing.post(`/api/sewing/${startedId}/start`).expect(200)

    const verifiedId = await createVerifiedOrder(supervisor, verifier)

    const res = await sewing.get('/api/sewing/queue').expect(200)

    expect(res.body.map((order) => order.id)).toEqual([verifiedId])
    expect(res.body[0].verifierName).toBeTruthy()
  })

  it('hides unverified orders from the detail view', async () => {
    const supervisor = await loginAs('supervisor@apparelflow.com')
    const verifier = await loginAs('verifier@apparelflow.com')
    const sewing = await loginAs('sewing@apparelflow.com')

    const draftId = await createOrder(supervisor)
    const pendingId = await createPendingOrder(supervisor)

    const rejectedId = await createPendingOrder(supervisor)
    await verifier
      .post(`/api/verification/${rejectedId}/reject`)
      .send({ note: 'Sleeve panels are damaged' })
      .expect(200)

    const startedId = await createVerifiedOrder(supervisor, verifier)
    await sewing.post(`/api/sewing/${startedId}/start`).expect(200)

    const verifiedId = await createVerifiedOrder(supervisor, verifier)

    for (const id of [draftId, pendingId, rejectedId, startedId]) {
      const res = await sewing.get(`/api/sewing/${id}`)
      expect(res.status).toBe(404)
    }

    await sewing.get(`/api/sewing/${verifiedId}`).expect(200)
  })
})

describe('approving a batch', () => {
  it('approves an order where every component is green', async () => {
    const supervisor = await loginAs('supervisor@apparelflow.com')
    const verifier = await loginAs('verifier@apparelflow.com')

    const orderId = await createPendingOrder(supervisor)
    await countAll(verifier, orderId)

    const res = await verifier.post(`/api/verification/${orderId}/approve`).send({})

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('VERIFIED')

    const order = await pool.query('SELECT status FROM cutting_orders WHERE id = $1', [orderId])
    expect(order.rows[0].status).toBe('VERIFIED')

    const me = await verifier.get('/api/auth/me').expect(200)
    const logs = await pool.query(
      'SELECT verifier_id, decision FROM verification_logs WHERE order_id = $1',
      [orderId]
    )
    expect(logs.rows).toHaveLength(1)
    expect(logs.rows[0].decision).toBe('APPROVED')
    expect(logs.rows[0].verifier_id).toBe(me.body.id)
  })

  it('blocks approval when a component is short', async () => {
    const supervisor = await loginAs('supervisor@apparelflow.com')
    const verifier = await loginAs('verifier@apparelflow.com')

    const orderId = await createPendingOrder(supervisor)
    await countAll(verifier, orderId, { 'Front Body Panel': 1 })

    const res = await verifier.post(`/api/verification/${orderId}/approve`).send({})

    expect(res.status).toBe(422)
    expect(res.body.problems.map((problem) => problem.name)).toEqual(['Front Body Panel'])

    const order = await pool.query('SELECT status FROM cutting_orders WHERE id = $1', [orderId])
    expect(order.rows[0].status).toBe('PENDING_VERIFICATION')

    const logs = await pool.query('SELECT id FROM verification_logs WHERE order_id = $1', [orderId])
    expect(logs.rows).toHaveLength(0)
  })

describe('rejecting a batch', () => {
  it('refuses a missing, blank or too short reason', async () => {
    const supervisor = await loginAs('supervisor@apparelflow.com')
    const verifier = await loginAs('verifier@apparelflow.com')
    const orderId = await createPendingOrder(supervisor)

    const attempts = [{}, { note: '' }, { note: '     ' }, { note: 'abc' }]

    for (const body of attempts) {
      const res = await verifier.post(`/api/verification/${orderId}/reject`).send(body)
      expect(res.status).toBe(422)
    }

    const order = await pool.query('SELECT status FROM cutting_orders WHERE id = $1', [orderId])
    expect(order.rows[0].status).toBe('PENDING_VERIFICATION')

    const logs = await pool.query('SELECT id FROM verification_logs WHERE order_id = $1', [orderId])
    expect(logs.rows).toHaveLength(0)
  })

  it('rejects the order when a proper reason is given', async () => {
    const supervisor = await loginAs('supervisor@apparelflow.com')
    const verifier = await loginAs('verifier@apparelflow.com')
    const orderId = await createPendingOrder(supervisor)

    const res = await verifier
      .post(`/api/verification/${orderId}/reject`)
      .send({ note: 'Sleeve panels are damaged' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('REJECTED')

    const me = await verifier.get('/api/auth/me').expect(200)
    const logs = await pool.query(
      'SELECT verifier_id, decision, rejection_note FROM verification_logs WHERE order_id = $1',
      [orderId]
    )
    expect(logs.rows).toHaveLength(1)
    expect(logs.rows[0].decision).toBe('REJECTED')
    expect(logs.rows[0].rejection_note).toBe('Sleeve panels are damaged')
    expect(logs.rows[0].verifier_id).toBe(me.body.id)
  })
})
describe('role checks', () => {
  it('stops the supervisor and sewing roles from approving or rejecting', async () => {
    const supervisor = await loginAs('supervisor@apparelflow.com')
    const verifier = await loginAs('verifier@apparelflow.com')
    const sewing = await loginAs('sewing@apparelflow.com')

    const orderId = await createPendingOrder(supervisor)
    await countAll(verifier, orderId)

    for (const agent of [supervisor, sewing]) {
      const approve = await agent.post(`/api/verification/${orderId}/approve`).send({})
      expect(approve.status).toBe(403)

      const reject = await agent
        .post(`/api/verification/${orderId}/reject`)
        .send({ note: 'Not allowed to do this' })
      expect(reject.status).toBe(403)
    }

    const order = await pool.query('SELECT status FROM cutting_orders WHERE id = $1', [orderId])
    expect(order.rows[0].status).toBe('PENDING_VERIFICATION')

    const logs = await pool.query('SELECT id FROM verification_logs WHERE order_id = $1', [orderId])
    expect(logs.rows).toHaveLength(0)
  })

  it('stops the verifier from creating an order', async () => {
    const verifier = await loginAs('verifier@apparelflow.com')

    const res = await verifier
      .post('/api/orders')
      .send({ recipeId: 1, targetQty: 10, fabricRollId: 'ROLL-X', actualFabricYds: 20 })

    expect(res.status).toBe(403)
  })

  it('needs a login to approve', async () => {
    const res = await request(app).post('/api/verification/1/approve').send({})

    expect(res.status).toBe(401)
  })
})

describe('input validation', () => {
  const badNumbers = [-5, 0, 2.5, '50', 'abc', null]
  const goodOrder = { recipeId: 1, targetQty: 50, fabricRollId: 'ROLL-TEST-01', actualFabricYds: 90 }

  it('rejects bad quantities and yards when creating an order', async () => {
    const supervisor = await loginAs('supervisor@apparelflow.com')

    for (const targetQty of badNumbers) {
      const res = await supervisor.post('/api/orders').send({ ...goodOrder, targetQty })
      expect(res.status).toBe(422)
      expect(res.body.errors.targetQty).toBeTruthy()
    }

    for (const actualFabricYds of badNumbers) {
      const res = await supervisor.post('/api/orders').send({ ...goodOrder, actualFabricYds })
      expect(res.status).toBe(422)
      expect(res.body.errors.actualFabricYds).toBeTruthy()
    }

    const orders = await pool.query('SELECT COUNT(*)::int AS total FROM cutting_orders')
    expect(orders.rows[0].total).toBe(0)
  })

  it('rejects an empty, missing or broken body when creating an order', async () => {
    const supervisor = await loginAs('supervisor@apparelflow.com')

    const empty = await supervisor.post('/api/orders').send({})
    expect(empty.status).toBe(422)

    const missing = await supervisor.post('/api/orders')
    expect(missing.status).toBe(422)

    const broken = await supervisor
      .post('/api/orders')
      .set('Content-Type', 'application/json')
      .send('{"targetQty": ')
    expect(broken.status).toBe(400)
  })

  it('rejects bad counts and leaves the components uncounted', async () => {
    const supervisor = await loginAs('supervisor@apparelflow.com')
    const verifier = await loginAs('verifier@apparelflow.com')

    const orderId = await createPendingOrder(supervisor)
    const detail = await verifier.get(`/api/verification/${orderId}`).expect(200)
    const itemId = detail.body.items[0].id

    for (const actualQty of [-1, 1.5, '10', 'abc', null]) {
      const res = await verifier
        .put(`/api/verification/${orderId}/counts`)
        .send({ counts: [{ itemId, actualQty }] })
      expect(res.status).toBe(422)
    }

    const noCounts = await verifier.put(`/api/verification/${orderId}/counts`).send({})
    expect(noCounts.status).toBe(422)

    const emptyList = await verifier.put(`/api/verification/${orderId}/counts`).send({ counts: [] })
    expect(emptyList.status).toBe(422)

    const items = await pool.query('SELECT actual_qty FROM verification_items WHERE order_id = $1', [
      orderId,
    ])
    expect(items.rows.every((row) => row.actual_qty === null)).toBe(true)
  })
})

})
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function route({ denied = false, failure = false } = {}) {
  const calls = []
  const result = { data: [
    { id: 'active', name: 'Ativo', active: true, stock_items: { quantity: 0, price_points: 10, price_cash: 1 } },
    { id: 'inactive', name: 'Inativo', active: false, stock_items: { quantity: 2 } },
  ], count: 1, error: failure ? { message: 'failure' } : null }
  const query = { select(...args) { calls.push(['select', ...args]); return this }, eq(...args) { calls.push(['eq', ...args]); return this }, order() { return this }, range(...args) { calls.push(['range', ...args]); return Promise.resolve(result) } }
  const exports = {}
  const requireMock = name => {
    if (name === 'next/server') return { NextResponse: { json: (body, options = {}) => ({ body, ...options }) } }
    if (name.endsWith('admin-guard')) return { requireAdmin: async () => ({ error: denied ? { status: 403 } : null }) }
    if (name.endsWith('supabase/admin')) return { createAdminClient: () => ({ from(table) { calls.push(['from', table]); return query } }) }
    if (name.endsWith('price-editor')) return {}
    throw new Error(name)
  }
  const js = ts.transpileModule(fs.readFileSync('src/app/api/admin/prices/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  vm.runInNewContext(js, { exports, require: requireMock, URL })
  return { get: exports.GET, calls }
}

test('price list queries active catalog before pagination and excludes inactive rows', async () => {
  const { get, calls } = route()
  const response = await get({ url: 'https://example.test/api/admin/prices?page=2' })
  assert.equal(calls[0][1], 'catalog_items')
  assert.ok(calls.findIndex(x => x[0] === 'eq' && x[1] === 'active' && x[2] === true) < calls.findIndex(x => x[0] === 'range'))
  assert.equal(JSON.stringify(calls.find(x => x[0] === 'range')), JSON.stringify(['range', 500, 999]))
  assert.equal(response.body.items.length, 1)
  assert.equal(response.body.items[0].catalog_item_id, 'active')
  assert.equal(response.body.items[0].quantity, 0)
  assert.equal(response.body.total, 1)
  assert.equal(response.headers['Cache-Control'], 'no-store')
})

test('price list requires admin and does not expose a partial list on failure', async () => {
  const denied = route({ denied: true })
  assert.equal((await denied.get({ url: 'https://example.test/api/admin/prices' })).status, 403)
  assert.equal(denied.calls.length, 0)
  const failed = route({ failure: true })
  const response = await failed.get({ url: 'https://example.test/api/admin/prices' })
  assert.equal(response.status, 500)
  assert.equal(response.body.items, undefined)
})

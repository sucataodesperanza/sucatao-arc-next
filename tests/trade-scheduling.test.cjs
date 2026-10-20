const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const vm = require('node:vm')
const exportsObject = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/trade-scheduling.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exportsObject, Intl, Date, Set })
const { generateTradeSlots, availableTradeSlots, tradeDate, validateTradeHours, defaultTradeHours } = exportsObject
const hours = { operating_hours_start: '09:00', operating_hours_end: '10:00', slot_duration_minutes: 5 }

test('Postgres time fields with seconds preserve production opening hours and hourly interval', () => {
  const stored = { operating_hours_start: '08:00:00', operating_hours_end: '22:00:00', slot_duration_minutes: 60 }
  assert.equal(validateTradeHours(stored), true)
  const slots = generateTradeSlots(stored, new Date('2026-10-20T15:12:00Z'), 1)
  assert.equal(slots[0].scheduled_for, '2026-10-20T16:00:00.000Z')
  assert.equal(slots.at(-1).scheduled_for, '2026-10-21T01:00:00.000Z')
  assert.equal(slots.length, 10)
})

test('daily hours generate future delivery times without manual slots', () => {
  const now = new Date('2026-10-20T13:12:00Z') // 09:12 Cuiaba
  const slots = generateTradeSlots(hours, now, 1)
  assert.equal(slots.length, 9)
  assert.equal(slots[0].scheduled_for, '2026-10-20T13:15:00.000Z')
  assert.equal(slots.at(-1).scheduled_for, '2026-10-20T13:55:00.000Z')
  assert.ok(slots.every(s => s.capacity === 1 && s.id === 'daily:' + s.scheduled_for))
})

test('closing at midnight and overnight windows use Cuiaba dates instead of server UTC', () => {
  assert.equal(tradeDate('2026-10-21T02:30:00Z'), '2026-10-20')
  const midnight = generateTradeSlots(defaultTradeHours, new Date('2026-10-21T03:56:00Z'), 2)
  assert.equal(midnight[0].scheduled_for, '2026-10-21T13:00:00.000Z')
  const overnight = generateTradeSlots({ ...hours, operating_hours_start: '22:00', operating_hours_end: '02:00' }, new Date('2026-10-21T04:30:00Z'), 1)
  assert.equal(overnight[0].scheduled_for, '2026-10-21T04:35:00.000Z')
  assert.ok(overnight.every(s => tradeDate(s.scheduled_for) === '2026-10-21'))
  assert.equal(new Set(overnight.map(s => s.id)).size, overnight.length)
})

test('other customers reservations block the same instant regardless of ISO offset', () => {
  const slots = generateTradeSlots(hours, new Date('2026-10-20T12:00:00Z'), 1)
  const available = availableTradeSlots(slots, [{ scheduled_at: '2026-10-20T09:00:00-04:00' }, { scheduled_at: null }])
  assert.equal(available.length, slots.length - 1)
  assert.equal(available[0].scheduled_for, '2026-10-20T13:05:00.000Z')
})

test('invalid settings fail rather than looping or inventing availability', () => {
  for (const invalid of [{ ...hours, slot_duration_minutes: 0 }, { ...hours, slot_duration_minutes: -5 }, { ...hours, slot_duration_minutes: 1.5 }, { ...hours, operating_hours_start: '25:00' }]) {
    assert.equal(validateTradeHours(invalid), false)
    assert.throws(() => generateTradeSlots(invalid))
  }
})

function acceptRoute({ slots = [], signedIn = true } = {}) {
  const inserted = []
  const client = { auth: { getUser: async () => ({ data: { user: signedIn ? { id: 'customer' } : null } }) }, from(table) {
    const q = { select() { return q }, eq() { return q }, neq() { return q },
      limit: async () => ({ data: [], error: null }),
      insert(row) { inserted.push(row); return q },
      single: async () => ({ data: table === 'trades' ? { id: 'trade', status: 'active', offer_points: 10 } : table === 'profiles' ? null : { id: 'acceptance' }, error: null }),
    }; return q
  } }
  const target = {}
  const requireMock = name => {
    if (name === 'next/server') return { NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200 }) } }
    if (name.endsWith('supabase/server')) return { createClient: async () => client }
    if (name.endsWith('supabase/admin')) return { createAdminClient: () => client }
    if (name.endsWith('trade-scheduling-store')) return { readTradeAvailability: async () => slots }
    if (name.endsWith('discord-bot')) return {}
    throw new Error(name)
  }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/trades/[id]/accept/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: target, require: requireMock, Date })
  return { post: body => target.POST({ json: async () => body }, { params: Promise.resolve({ id: 'trade' }) }), inserted }
}

test('acceptance uses the validated daily timestamp and no synthetic UUID foreign key', async () => {
  const slot = { id: 'daily:2026-10-21T13:00:00.000Z', scheduled_for: '2026-10-21T13:00:00.000Z', label: '21/10 09:00' }
  const route = acceptRoute({ slots: [slot] })
  const response = await route.post({ slot_id: slot.id, game_id: 'Player#1234' })
  assert.equal(response.status, 200)
  assert.equal(route.inserted.length, 1)
  assert.equal(route.inserted[0].slot_id, null)
  assert.equal(route.inserted[0].scheduled_at, slot.scheduled_for)
})

test('occupied or outdated daily times do not create an acceptance; login is mandatory', async () => {
  const route = acceptRoute()
  assert.equal((await route.post({ slot_id: 'daily:2026-10-21T13:00:00.000Z', game_id: 'Player' })).status, 409)
  assert.equal(route.inserted.length, 0)
  const anonymous = acceptRoute({ signedIn: false })
  assert.equal((await anonymous.post({})).status, 401)
  assert.equal(anonymous.inserted.length, 0)
})

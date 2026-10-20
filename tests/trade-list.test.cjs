const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const vm = require('node:vm')
const context = { exports: {} }
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/trade-list.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context)
const { filterAvailableTrades } = context.exports

test('taken trades disappear regardless of customer or completion status', () => {
  const trades = ['free', 'pending', 'scheduled', 'completed', 'cancelled'].map(id => ({ id }))
  const acceptances = ['pending', 'scheduled', 'completed', 'cancelled'].map(status => ({ trade_id: status, status }))
  assert.deepEqual(Array.from(filterAvailableTrades(trades, acceptances), t => t.id), ['free', 'cancelled'])
  assert.equal(trades.length, 5)
})

test('an older cancelled request does not make a newly taken trade available', () => {
  assert.equal(filterAvailableTrades([{ id: 'trade' }], [{ trade_id: 'trade', status: 'cancelled' }, { trade_id: 'trade', status: 'scheduled' }]).length, 0)
})

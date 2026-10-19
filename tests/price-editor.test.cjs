const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const context = { exports: {} }
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/lib/price-editor.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context)
const { parsePriceInput, validatePriceBatch } = context.exports

test('price input accepts Brazilian cash and integer points without silently rounding', () => {
  for (const [text, field, expected] of [['1,50', 'price_cash', 1.5], ['1.50', 'price_cash', 1.5], ['1.500,50', 'price_cash', 1500.5], ['15.000', 'price_points', 15000], ['15000', 'price_points', 15000]]) assert.equal(parsePriceInput(text, field), expected)
  for (const text of ['', '0', '-1', 'NaN', 'Infinity', '1,234', '1.2345', '1000000001']) assert.equal(parsePriceInput(text, 'price_cash'), null, text)
  for (const text of ['1,50', '1.50', '2e3', '10abc']) assert.equal(parsePriceInput(text, 'price_points'), null, text)
})

test('price batches change only selected price fields and require their original values', () => {
  const row = { id: 'item', changes: { price_cash: 1.5 }, expected: { price_cash: 2 } }
  const valid = validatePriceBatch({ items: [row] })
  assert.equal(valid[0].changes.price_cash, 1.5)
  assert.equal(valid[0].changes.price_points, undefined)
  assert.equal(valid[0].expected.price_cash, 2)
  assert.ok(validatePriceBatch({ items: [{ ...row, expected: { price_cash: null } }] }))
  for (const changes of [{ quantity: 99999 }, { price_cash: -1 }, { price_cash: 0 }, { price_cash: 1.555 }, { price_points: 1.5 }, {}]) assert.equal(validatePriceBatch({ items: [{ ...row, changes }] }), null)
  assert.equal(validatePriceBatch({ items: [{ ...row, expected: {} }] }), null)
  assert.equal(validatePriceBatch({ items: [row, row] }), null)
  assert.equal(validatePriceBatch({ items: [] }), null)
  assert.equal(validatePriceBatch({ items: Array.from({ length: 101 }, (_, i) => ({ ...row, id: `item-${i}` })) }), null)
})

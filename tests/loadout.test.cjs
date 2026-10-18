const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const path = require('node:path')
const root = path.join(__dirname, '..')
const raw = fs.readFileSync(path.join(root, 'src/data/arc-data.js'), 'utf8')
const game = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))
const context = { exports: {}, require: id => {
  assert.equal(id, '@/data/arc-data')
  return { __esModule: true, default: game }
} }
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, 'src/lib/loadout.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } }).outputText, context)
const { acceptsLoadoutItem: accepts, loadoutSlots: slots, slotQuantityLimit, summarizeLoadout, buildLoadoutItems, isSurvivor, loadoutPurchaseIssue } = context.exports
const item = (type, extra = {}) => ({ id: type, name: type, type, ...extra })

test('capacity matches the agreed MK3 test layout', () => {
  for (const [kind, count] of Object.entries({ bag: 20, weapon: 2, quick: 5, gadget: 1, safe: 3, shield: 1, backpack: 1, attachment: 6 })) assert.equal(slots.filter(slot => slot.kind === kind).length, count)
})
test('bag accepts weapons, shields, blueprints, materials and gadgets', () => {
  for (const type of ['Weapon', 'Shield', 'Blueprint', 'Material', 'Gadget']) assert.equal(accepts('bag', item(type)), true)
})
test('equipment slots reject incompatible items and blueprints', () => {
  assert.equal(accepts('weapon', item('Weapon')), true)
  assert.equal(accepts('weapon', item('Blueprint', { isWeapon: true, isBlueprint: true })), false)
  assert.equal(accepts('weapon', item('Shield')), false)
  assert.equal(accepts('shield', item('Shield')), true)
  assert.equal(accepts('shield', item('Material')), false)
})
test('safe pocket excludes weapons and shields but allows everything else', () => {
  assert.equal(accepts('safe', item('Weapon')), false)
  assert.equal(accepts('safe', item('Misc', { isWeapon: true })), false)
  assert.equal(accepts('safe', item('Shield')), false)
  for (const type of ['Blueprint', 'Ammunition', 'Material', 'Augment', 'Modification', 'Gadget', 'Consumable']) assert.equal(accepts('safe', item(type)), true)
})
test('quick use accepts grenades, consumables, gadgets but no weapons or blueprints', () => {
  for (const type of ['Grenade', 'Throwable', 'Consumable', 'Quick Use', 'Gadget', 'Deployable']) assert.equal(accepts('quick', item(type)), true)
  for (const type of ['Weapon', 'Shield', 'Material', 'Blueprint']) assert.equal(accepts('quick', item(type)), false)
})
test('enhanced slot only accepts gadgets including legacy gadgets', () => {
  for (const type of ['Weapon', 'Shield', 'Throwable', 'Consumable']) assert.equal(accepts('gadget', item(type)), false)
  assert.equal(accepts('gadget', item('Gadget')), true)
  assert.equal(accepts('gadget', game.items.find(row => row.id === 'zipline')), true)
  assert.equal(accepts('gadget', game.items.find(row => row.id === 'bandage')), false)
})
test('the fixed backpack is the survivor augment, not its blueprint', () => {
  assert.equal(isSurvivor(game.items.find(row => row.id === 'looting_mk3_survivor')), true)
  assert.equal(accepts('backpack', game.items.find(row => row.id === 'looting_mk3_survivor_blueprint')), false)
  assert.equal(accepts('backpack', item('Augment', { name: 'Combate Mk. 3' })), false)
})
test('attachments require an explicit compatible weapon, including translated names and tiers', () => {
  const mod = item('Modification', { description: 'Reduz recuo. Compatível com: Ferro, Venator, Vulcão' })
  assert.equal(accepts('attachment', mod, item('Weapon', { name: 'Ferro IV' })), true)
  assert.equal(accepts('attachment', mod, item('Weapon', { name: 'Bettina IV' })), false)
  assert.equal(accepts('attachment', mod), false)
  assert.equal(accepts('attachment', item('Modification'), item('Weapon', { name: 'Ferro IV' })), false)
})
test('stack quantities respect slots and item stack sizes', () => {
  assert.equal(slotQuantityLimit('weapon', item('Weapon', { stackSize: 10 })), 1)
  assert.equal(slotQuantityLimit('bag', item('Ammunition', { stackSize: 80 })), 80)
  assert.equal(slotQuantityLimit('safe', item('Material')), 1)
})
test('review aggregates repeated items instead of charging once per occupied slot', () => {
  const rows = summarizeLoadout({ 'bag-0': { itemId: 'x', quantity: 5 }, 'quick-0': { itemId: 'x', quantity: 3 } }, [item('Consumable', { id: 'x' })])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].quantity, 8)
})
test('stock prices and identifiers override local game metadata without duplicate items', () => {
  const local = game.items.find(row => row.id === 'looting_mk3_survivor')
  const merged = buildLoadoutItems([{ ...local, id: 'stock-id', pricePoints: 100, quantity: 2 }])
  assert.equal(merged.filter(row => row.name === local.name).length, 1)
  assert.equal(merged.find(row => row.name === local.name).id, 'stock-id')
  assert.equal(merged.find(row => row.name === local.name).pricePoints, 100)
})
test('checkout requires a real configured price and enough stock including existing cart', () => {
  const stocked = item('Consumable', { id: 'x', quantity: 10, pricePoints: 100 })
  assert.equal(loadoutPurchaseIssue('x', 8, 'points', [stocked], [{ itemId: 'x', quantity: 2 }]), null)
  assert.match(loadoutPurchaseIssue('x', 9, 'points', [stocked], [{ itemId: 'x', quantity: 2 }]), /estoque/)
  assert.match(loadoutPurchaseIssue('x', 1, 'cash', [stocked], []), /Indisponível/)
  assert.match(loadoutPurchaseIssue('missing', 1, 'points', [stocked], []), /Indisponível/)
  assert.match(loadoutPurchaseIssue('x', 1, 'points', [{ ...stocked, pricePoints: 0 }], []), /Indisponível/)
  assert.match(loadoutPurchaseIssue('x', 1, 'points', [{ ...stocked, quantity: 0 }], []), /estoque/)
})

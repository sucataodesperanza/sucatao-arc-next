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
  if (id === '@/data/weapon-attachments.json') return { __esModule: true, default: require('../src/data/weapon-attachments.json') }
  assert.equal(id, '@/data/arc-data')
  return { __esModule: true, default: game }
} }
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, 'src/lib/loadout.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } }).outputText, context)
const { acceptsLoadoutItem: accepts, loadoutSlots: slots, slotQuantityLimit, summarizeLoadout, buildLoadoutItems, isSurvivor, loadoutPurchaseIssue, getWeaponAttachmentSlots, getWeaponProfile, restoreLoadoutDraft, loadoutItemSearchText } = context.exports
const item = (type, extra = {}) => ({ id: type, name: type, type, ...extra })

test('loadout prices sum quantities and mark missing currencies independently', () => {
  const { loadoutPrice, loadoutTotals } = context.exports
  for (const value of [undefined, 0, -1, NaN, Infinity]) assert.equal(loadoutPrice(value), null)
  assert.equal(loadoutPrice(0.1, 3), 0.3)
  const rows = summarizeLoadout({ a: { itemId: 'a', quantity: 2 }, b: { itemId: 'a', quantity: 3 }, c: { itemId: 'b', quantity: 1 } }, [item('Modification', { id: 'a', pricePoints: 100, priceCash: 0.1 }), item('Weapon', { id: 'b', priceCash: 2.5 })])
  const totals = loadoutTotals(rows)
  assert.equal(totals.pricePoints.total, 500)
  assert.equal(totals.pricePoints.missing, 1)
  assert.equal(totals.priceCash.total, 3)
  assert.equal(totals.priceCash.missing, 0)
  assert.equal(loadoutTotals([]).pricePoints.total, 0)
})

test('all weapon tiers expose every attachment of each available mounting category', () => {
  const data = require('../src/data/weapon-attachments.json')
  const all = buildLoadoutItems([])
  for (const mod of data.mods) {
    assert.ok(mod.slot, `Unclassified mod: ${mod.name}`)
    assert.ok(all.some(row => row.type === 'Modification' && (row.id.replace(/_/g, '-') === mod.id || row.name === mod.name || game.items.some(meta => meta.id === row.id && meta.nameEn === mod.name))), `Missing mod: ${mod.name}`)
  }
  const weapons = [...data.weapons.map(row => ({ ...row, type: 'Weapon' })), ...game.items.filter(row => row.isWeapon && !row.isBlueprint)]
  for (const weapon of weapons) {
    const profile = getWeaponProfile(weapon)
    assert.ok(profile, weapon.name)
    for (const mod of data.mods) {
      assert.equal(accepts('attachment', { ...mod, type: 'Modification' }, weapon, mod.slot), !!profile.slots?.includes(mod.slot), `${weapon.name}: ${mod.name}`)
    }
  }
})

test('Osprey IV exposes all six stocks, including padded and lightweight stocks', () => {
  const weapon = game.items.find(row => row.nameEn === 'Osprey IV')
  assert.ok(weapon)
  const data = require('../src/data/weapon-attachments.json')
  const stocks = data.mods.filter(row => row.slot === 'stock')
  assert.equal(stocks.length, 6)
  for (const mod of stocks) assert.equal(accepts('attachment', { ...mod, type: 'Modification' }, weapon, 'stock'), true, mod.name)
})

test('horizontal grip supports verified families and only the underbarrel mount', () => {
  const grip = game.items.find(row => row.id === 'horizontal_grip')
  assert.ok(grip)
  const weapons = require('../src/data/weapon-attachments.json').weapons
  for (const family of ['ferro', 'kettle', 'rattler', 'stitcher', 'arpeggio', 'il toro', 'venator', 'bettina', 'bobcat', 'tempest', 'vulcano', 'aphelion']) {
    const weapon = weapons.find(row => row.family === family && row.name.startsWith('Amplified ')) || weapons.find(row => row.family === family)
    assert.ok(weapon, family)
    for (const mod of [grip, { ...grip, id: 'stock-uuid' }]) assert.equal(accepts('attachment', mod, { ...weapon, type: 'Weapon' }, 'underbarrel'), true, family)
    assert.equal(accepts('attachment', grip, { ...weapon, type: 'Weapon' }, 'stock'), false)
  }
  const noMount = weapons.find(row => row.family === 'renegade')
  assert.equal(accepts('attachment', grip, { ...noMount, type: 'Weapon' }, 'underbarrel'), false)
})

test('kinetic converter supports verified stock families and respects amplified stock removal', () => {
  const converter = game.items.find(row => row.id === 'kinetic_converter')
  const stockConverter = { ...converter, id: 'stock-uuid' }
  for (const family of ['aphelion', 'arpeggio', 'bettina', 'bobcat', 'ferro', 'hullcracker', 'il toro', 'kettle', 'osprey', 'rattler', 'renegade', 'stitcher', 'torrente', 'vulcano']) {
    const weapon = require('../src/data/weapon-attachments.json').weapons.find(row => row.family === family && row.slots?.includes('stock'))
    assert.ok(weapon, family)
    for (const mod of [converter, stockConverter]) assert.equal(accepts('attachment', mod, { ...weapon, type: 'Weapon' }, 'stock'), true, family)
    assert.equal(accepts('attachment', converter, { ...weapon, type: 'Weapon' }, 'muzzle'), false)
  }
  const removed = require('../src/data/weapon-attachments.json').weapons.find(row => row.name.includes('Amplified Osprey') && row.name.includes('Ergonomic Bolt'))
  assert.ok(removed)
  assert.equal(accepts('attachment', converter, { ...removed, type: 'Weapon' }, 'stock'), false)
})

test('capacity matches the agreed MK3 test layout', () => {
  for (const [kind, count] of Object.entries({ bag: 20, weapon: 2, quick: 5, gadget: 1, safe: 3, shield: 1, backpack: 1, attachment: 0 })) assert.equal(slots.filter(slot => slot.kind === kind).length, count)
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
test('attachments use structured compatibility and the specific mounting point', () => {
  const mod = item('Modification', { name: 'Empunhadura Angulada I' })
  assert.equal(accepts('attachment', mod, item('Weapon', { name: 'Ferro IV' })), true)
  assert.equal(accepts('attachment', mod, item('Weapon', { name: 'Bettina IV' })), true)
  assert.equal(accepts('attachment', mod, item('Weapon', { name: 'Ferro IV' }), 'muzzle'), false)
  assert.equal(accepts('attachment', mod, item('Weapon', { name: 'Ferro IV' }), 'underbarrel'), true)
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
test('weapon mounting points vary from zero to four and do not assume three', () => {
  for (const [name, expected] of [['Kettle IV',4],['Ferro IV',3],['Renegade IV',3],['Burletta IV',2],['Anvil IV',1],['Jupiter',0],['Dolabra',0]]) assert.equal(getWeaponAttachmentSlots(item('Weapon',{name}),'weapon-1').length,expected,name)
  assert.equal(getWeaponAttachmentSlots(undefined,'weapon-1').length,0)
  assert.equal(getWeaponAttachmentSlots(item('Weapon',{name:'Unknown V'}),'weapon-1').length,0)
})
test('amplified paths remove only the mounting points they actually block', () => {
  for (const [name, expected] of [['Amplified Renegade',3],['Amplified Renegade (Scoped)',2],['Amplified Canto',4],['Amplified Canto (Carbine Conversion)',3],['Amplified Osprey (Ergonomic Bolt)',3],['Amplified Kettle (X-Rounds)',3],['Renegado V',3]]) assert.equal(getWeaponAttachmentSlots(item('Weapon',{name}),'weapon-1').length,expected,name)
})
test('magazine types and shotguns do not share incompatible muzzle or magazine mods', () => {
  const shotgun=item('Weapon',{name:'Il Toro IV'})
  assert.equal(accepts('attachment',item('Modification',{name:'Extended Light Mag II'}),shotgun,'shotgun-mag'),false)
  assert.equal(accepts('attachment',item('Modification',{name:'Shotgun Choke III'}),shotgun,'shotgun-muzzle'),true)
  assert.equal(accepts('attachment',item('Modification',{name:'Kinetic Converter'}),item('Weapon',{name:'Ferro IV'}),'stock'),true)
  assert.equal(accepts('attachment',item('Modification',{name:'Kinetic Converter'}),item('Weapon',{name:'Ferro IV'}),'underbarrel'),false)
})
test('old anonymous accessory slots migrate to their valid mounting points', () => {
  const weapon=item('Weapon',{id:'w',name:'Ferro IV'}), grip=item('Modification',{id:'g',name:'Empunhadura Angulada I'}),mag=item('Modification',{id:'m',name:'Extended Light Mag II'})
  const draft=restoreLoadoutDraft({'weapon-1':{itemId:'w',quantity:1},'attachment-1-1':{itemId:'g',quantity:1},'attachment-1-2':{itemId:'m',quantity:1}},[weapon,grip,mag])
  assert.equal(draft['attachment-1-underbarrel'].itemId,'g')
  assert.equal(Object.values(draft).some(entry=>entry.itemId==='m'),false)
  assert.equal(draft['attachment-1-1'],undefined)
})
test('restoring a tier V variant drops incompatible magazine attachments before checkout', () => {
  const weapon=item('Weapon',{id:'w',name:'Amplified Renegade (Scoped)'}),mag=item('Modification',{id:'m',name:'Extended Medium Mag II'})
  const draft=restoreLoadoutDraft({'weapon-1':{itemId:'w',quantity:1},'attachment-1-medium-mag':{itemId:'m',quantity:1}},[weapon,mag])
  assert.equal(Object.keys(draft).length,1)
})
test('translated legacy weapons resolve by exact English tier without losing variants', () => {
  for (const weapon of game.items.filter(item => item.isWeapon && !item.isBlueprint)) assert.ok(getWeaponProfile(weapon), weapon.name)
  assert.equal(getWeaponAttachmentSlots(item('Weapon',{name:'Afélio'}),'weapon-1').length,2)
})
test('tier V variants can be found with the Portuguese weapon name', () => {
  assert.match(loadoutItemSearchText(item('Weapon',{name:'Amplified Renegade (Scoped)'})),/renegado v/)
  assert.match(loadoutItemSearchText(item('Weapon',{name:'Amplified Canto (Carbine Conversion)'})),/canto v/)
})

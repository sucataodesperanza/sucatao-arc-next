const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const path = require('node:path')
const root = path.join(__dirname, '..')
const raw = fs.readFileSync(path.join(root, 'src/data/arc-data.js'), 'utf8')
const game = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))
const modules = {
  '@/data/arc-data': { __esModule: true, default: game },
  '@/data/weapon-attachments.json': { __esModule: true, default: require('../src/data/weapon-attachments.json') },
}
for (const name of ['loadout', 'weapon-kits', 'weapon-configurator']) {
  const context = { exports: {}, require: id => { assert.ok(modules[id], id); return modules[id] } }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, `src/lib/${name}.ts`), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context)
  modules[`@/lib/${name}`] = context.exports
}
const loadout = modules['@/lib/loadout']
const kits = modules['@/lib/weapon-kits']

test('renaming a catalogue item keeps one loadout entry with the original identity', () => {
  const original = game.items.find(item => item.isWeapon)
  assert.ok(original)
  const renamed = { ...original, name: 'Nome revisado pelo admin', quantity: 2 }
  const matches = loadout.buildLoadoutItems([renamed]).filter(item => item.id === original.id)
  assert.equal(matches.length, 1)
  assert.equal(matches[0].name, renamed.name)
  assert.equal(matches[0].quantity, 2)
})

test('weapon configurator uses real tiers and exact amplified combinations', () => {
  const config = modules['@/lib/weapon-configurator']
  const items = loadout.buildLoadoutItems([])
  const base = config.findWeaponConfiguration(items, 'renegade', 'V')
  const scoped = config.findWeaponConfiguration(items, 'renegade', 'V', ['Scoped', 'More Reload'])
  assert.ok(base)
  assert.ok(scoped)
  assert.equal(config.weaponLevel(scoped), 'V')
  assert.equal(config.findWeaponConfiguration(items, 'renegade', 'V', ['Invented Upgrade']), undefined)
  const iv = config.findWeaponConfiguration(items, 'renegade', 'IV')
  const mag = items.find(item => item.name === 'Carregador Estendido Médio III')
  const stock = items.find(item => item.name === 'Coronha Acolchoada')
  assert.ok(mag); assert.ok(stock)
  const next = config.changeConfiguredWeapon({ 'weapon-1': { itemId: iv.id, quantity: 1 }, 'attachment-1-medium-mag': { itemId: mag.id, quantity: 1 }, 'attachment-1-stock': { itemId: stock.id, quantity: 1 } }, scoped, items)
  assert.equal(next['attachment-1-medium-mag'], undefined)
  assert.equal(next['attachment-1-stock'].itemId, stock.id)
  assert.equal(next['weapon-1'].itemId, scoped.id)
})

test('admin kit validation rejects invalid mounts, unknown items and malformed settings', () => {
  const items = loadout.buildLoadoutItems([])
  const weapon = kits.suggestedKitWeapons(items)[0]
  const valid = { name: '  Kit em destaque  ', active: true, featured: true, position: 2, draft: kits.suggestedWeaponKit(weapon, items) }
  assert.equal(kits.validateWeaponKit(valid, items).value.name, 'Kit em destaque')
  for (const field of [{ name: '' }, { active: 'true' }, { position: -1 }, { draft: {} }, { draft: { ...valid.draft, invented: { itemId: weapon.id, quantity: 1 } } }]) assert.ok(kits.validateWeaponKit({ ...valid, ...field }, items).error)
  const wrong = { 'weapon-1': { itemId: weapon.id, quantity: 1 }, 'attachment-1-stock': { itemId: weapon.id, quantity: 1 } }
  assert.ok(kits.validateWeaponKit({ ...valid, draft: wrong }, items).error)
  assert.ok(kits.validateWeaponKit({ ...valid, draft: { 'weapon-1': { itemId: 'missing', quantity: 1 } } }, items).error)
})

test('suggested kits use exact tiers, compatible mounts and actual stock identities', () => {
  const local = game.items.find(item => item.nameEn === 'Osprey IV')
  const items = loadout.buildLoadoutItems([{ ...local, id: 'real-stock-weapon', quantity: 10, pricePoints: 500 }])
  const weapons = kits.suggestedKitWeapons(items)
  assert.equal(weapons.length, 3)
  assert.equal(weapons[0].id, 'real-stock-weapon')
  for (const weapon of weapons) {
    const draft = kits.suggestedWeaponKit(weapon, items)
    assert.equal(draft['weapon-1'].itemId, weapon.id)
    const mounts = loadout.getWeaponAttachmentSlots(weapon, 'weapon-1')
    for (const mount of mounts) {
      const mod = items.find(item => item.id === draft[mount.id]?.itemId)
      assert.ok(mod, mount.label)
      assert.equal(loadout.acceptsLoadoutItem('attachment', mod, weapon, mount.attachmentType), true)
    }
    assert.equal(Object.keys(draft).length, mounts.length + 1)
  }
})

test('kit quantity validates all components and existing cart before allowing purchase', () => {
  const weapon = { id: 'w', name: 'Weapon', pricePoints: 100, quantity: 5 }
  const mod = { id: 'm', name: 'Mod', pricePoints: 10, quantity: 2 }
  const rows = [{ item: weapon, quantity: 1 }, { item: mod, quantity: 1 }]
  assert.equal(kits.weaponKitPurchaseIssues(rows, 2, 'points', [weapon, mod], []).length, 0)
  assert.equal(kits.weaponKitPurchaseIssues(rows, 3, 'points', [weapon, mod], []).length, 1)
  assert.equal(kits.weaponKitPurchaseIssues(rows, 2, 'points', [weapon, mod], [{ itemId: 'm', quantity: 1 }]).length, 1)
  assert.equal(kits.weaponKitPurchaseIssues(rows, 1, 'cash', [weapon, mod], []).length, 2)
})

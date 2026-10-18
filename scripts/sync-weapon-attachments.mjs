// MetaForge supplies identities and compatibleWeapons; slot rules are curated from the cited wiki pages.
import fs from "node:fs/promises"

const target = new URL("../src/data/weapon-attachments.json", import.meta.url)
const snapshot = JSON.parse(await fs.readFile(target, "utf8"))
const items = []
for (let page = 1; page <= 50; page++) {
  const response = await fetch(`${snapshot.sources.api}?limit=100&page=${page}`, { signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error(`MetaForge: HTTP ${response.status} na página ${page}`)
  const body = await response.json()
  if (!Array.isArray(body.data) || !body.pagination) throw new Error("Formato inesperado do MetaForge; cópia anterior preservada.")
  items.push(...body.data)
  if (!body.pagination.hasNextPage) break
  if (page === 50) throw new Error("Limite de paginação excedido; cópia anterior preservada.")
}
const family = name => name.toLowerCase().replace(/^amplified /, "").replace(/\s*\(.*\)$/, "").replace(/\s+[iv]+$/, "").replace(/ rifle$/, "")
const modSlot = name => /Shotgun (Choke|Silencer)/i.test(name) ? "shotgun-muzzle"
  : /Extended Shotgun Mag/i.test(name) ? "shotgun-mag" : /Extended Light Mag/i.test(name) ? "light-mag"
  : /Extended Medium Mag/i.test(name) ? "medium-mag" : /Grip/i.test(name) ? "underbarrel"
  : /Stock|Kinetic Converter/i.test(name) ? "stock" : /Silencer|Compensator|Muzzle Brake|Extended Barrel/i.test(name) ? "muzzle" : null
snapshot.weapons = items.filter(item => item.item_type === "Weapon").map(item => {
  const key = family(item.name)
  let slots = snapshot.familySlots[key] ? [...snapshot.familySlots[key]] : null
  if (slots && item.name.startsWith("Amplified ")) {
    for (const rule of snapshot.amplificationBlocks) {
      if (rule.family === key && rule.upgrades.some(upgrade => item.name.includes(upgrade))) slots = slots.filter(slot => !rule.slots.includes(slot))
    }
  }
  return { id: item.id, name: item.name, family: key, slots, image: item.icon, rarity: item.rarity }
})
snapshot.mods = items.filter(item => item.item_type === "Modification").map(item => ({
  id: item.id, name: item.name, slot: modSlot(item.name),
  compatibleWeapons: typeof item.stat_block?.compatibleWeapons === "string"
    ? item.stat_block.compatibleWeapons.split(",").map(name => name.toLowerCase().trim().replace(/^ii toro$/, "il toro")) : null,
}))
snapshot.updatedAt = new Date().toISOString().slice(0, 10)
await fs.writeFile(target, JSON.stringify(snapshot, null, 2) + "\n")
console.log(`${snapshot.weapons.length} armas e ${snapshot.mods.length} acessórios atualizados. Novas famílias sem regra confirmada permanecem sem encaixes.`)

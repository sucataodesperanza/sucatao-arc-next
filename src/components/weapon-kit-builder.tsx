"use client"

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { useRouter } from "next/navigation"
import { Plus, ShoppingCart, X } from "lucide-react"
import type { CatalogItem } from "@/lib/catalog"
import { useCart, type CartMode } from "@/lib/cart-context"
import { acceptsLoadoutItem, attachmentLabels, buildLoadoutItems, getWeaponAttachmentSlots, getWeaponProfile, loadoutItemSearchText, loadoutTotals, normalizeLoadoutText, summarizeLoadout, type LoadoutDraft, type LoadoutSlot } from "@/lib/loadout"
import { suggestedKitWeapons, suggestedWeaponKit, weaponKitPurchaseIssues, type SavedWeaponKit } from "@/lib/weapon-kits"
import { getItemGlowColor } from "@/lib/use-items-catalog"
import "@/styles/weapon-kits.css"
import { changeConfiguredWeapon, describeWeaponConfiguration } from "@/lib/weapon-configurator"

const cash = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const image = (item: CatalogItem) => item.image?.startsWith("http") || item.image?.startsWith("/") ? item.image : item.image ? `/${item.image}` : undefined
const glow = (item: CatalogItem) => ({ "--rarity-color": getItemGlowColor(item) } as CSSProperties)
function Prices({ rows }: { rows: { item: CatalogItem; quantity: number }[] }) {
  const totals = loadoutTotals(rows)
  return <span className="weapon-kit-prices"><span>{totals.pricePoints.missing ? "Pontos: preço incompleto" : `${totals.pricePoints.total.toLocaleString("pt-BR")} pts`}</span><span>{totals.priceCash.missing ? "Reais: preço incompleto" : cash(totals.priceCash.total)}</span></span>
}

export function WeaponKitBuilder({ stock, loading, userId }: { stock: CatalogItem[]; loading: boolean; userId: string | null }) {
  const [savedKits, setSavedKits] = useState<SavedWeaponKit[] | null>(null)
  const [kitItems, setKitItems] = useState<CatalogItem[]>([])
  const [kitError, setKitError] = useState("")
  const [kitsLoading, setKitsLoading] = useState(true)
  const items = useMemo(() => buildLoadoutItems([...stock, ...kitItems.filter(item => !stock.some(row => row.id === item.id))]), [stock, kitItems])
  const suggestions = useMemo(() => savedKits === null
    ? suggestedKitWeapons(items).map(weapon => ({ id: weapon.id, name: weapon.name, weapon, draft: suggestedWeaponKit(weapon, items) }))
    : savedKits.flatMap(kit => { const weapon = items.find(item => item.id === kit.draft["weapon-1"]?.itemId); return weapon ? [{ id: kit.id, name: kit.name, weapon, draft: kit.draft }] : [] }), [items, savedKits])
  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/store/weapon-kits", { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error()
      const body = await response.json()
      setKitItems(body.items ?? [])
      if (body.configured) setSavedKits(body.kits ?? [])
    }).catch(() => { if (!controller.signal.aborted) { setSavedKits([]); setKitError("Não foi possível carregar os destaques. Atualize a página para tentar novamente.") } })
      .finally(() => { if (!controller.signal.aborted) setKitsLoading(false) })
    return () => controller.abort()
  }, [])
  const [custom, setCustom] = useState<LoadoutDraft | null>(null)
  const draft = custom ?? suggestions[0]?.draft ?? {}
  const weapon = items.find(item => item.id === draft["weapon-1"]?.itemId)
  const mounts = getWeaponAttachmentSlots(weapon, "weapon-1")
  const configurations = useMemo(() => {
    const map = new Map<string, NonNullable<ReturnType<typeof describeWeaponConfiguration>>>()
    for (const item of items) {
      const entry = describeWeaponConfiguration(item)
      if (entry && (!map.has(entry.profile.id) || ((item.quantity ?? 0) > 0 && (map.get(entry.profile.id)!.item.quantity ?? 0) <= 0))) map.set(entry.profile.id, entry)
    }
    return [...map.values()]
  }, [items])
  const selectedProfile = weapon ? getWeaponProfile(weapon) : undefined
  const current = configurations.find(entry => entry.profile.id === selectedProfile?.id)
  const family = current?.family ?? "", level = current?.level ?? "", upgrades = current?.upgrades ?? []
  const families = useMemo(() => [...new Set(configurations.map(entry => entry.family))].map(key => {
    const base = configurations.find(entry => entry.family === key && entry.level !== "V")
    return { key, name: base?.item.name.replace(/\s(IV|III|II|I)$/, "") ?? key }
  }).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")), [configurations])
  const modifications = [...new Set(configurations.filter(entry => entry.family === family && entry.level === "V").flatMap(entry => entry.upgrades))].sort()
  const findConfiguration = (key: string, tier: string, mods: string[] = []) => configurations.find(entry => entry.family === key && entry.level === tier && entry.upgrades.join("|") === [...mods].sort().join("|"))?.item
  function configure(target: CatalogItem | undefined) { if (target) { setCustom(changeConfiguredWeapon(draft, target, items)); setMessage("") } }
  const [count, setCount] = useState(1)
  const [mode, setMode] = useState<CartMode>("points")
  const [query, setQuery] = useState("")
  const [selection, setSelection] = useState<LoadoutSlot | "weapon" | null>(null)
  const [message, setMessage] = useState("")
  const dialog = useRef<HTMLDialogElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const editor = useRef<HTMLDivElement>(null)
  const cart = useCart()
  const router = useRouter()
  const rows = summarizeLoadout(draft, items)
  const totals = rows.map(row => ({ ...row, quantity: row.quantity * count }))
  const issues = weaponKitPurchaseIssues(rows, count, mode, stock, cart.items)
  const purchasable = !!weapon && issues.length === 0
  const choices = selection ? items.filter(item => selection === "weapon" ? acceptsLoadoutItem("weapon", item) : acceptsLoadoutItem("attachment", item, weapon, selection.attachmentType))
    .filter(item => loadoutItemSearchText(item).includes(normalizeLoadoutText(query)))
    .sort((a, b) => Number((b.quantity ?? 0) > 0) - Number((a.quantity ?? 0) > 0) || a.name.localeCompare(b.name, "pt-BR")) : []

  function open(slot: LoadoutSlot | "weapon") {
    setSelection(slot); setQuery(""); setMessage("")
    dialog.current?.showModal()
    search.current?.focus()
  }
  function choose(item: CatalogItem) {
    if (selection === "weapon") setCustom({ "weapon-1": { itemId: item.id, quantity: 1 } })
    else if (selection && acceptsLoadoutItem("attachment", item, weapon, selection.attachmentType)) setCustom({ ...draft, [selection.id]: { itemId: item.id, quantity: 1 } })
    dialog.current?.close()
  }
  function buy() {
    if (!purchasable) return
    if (!userId) { router.push("/login"); return }
    for (const { item, quantity } of totals) cart.addItem({ itemId: item.id, name: item.name, type: item.type, rarity: item.rarity, value: item.value ?? 0, pricePoints: item.pricePoints, priceCash: item.priceCash, image: item.image, weightKg: item.weightKg, mode }, quantity)
    setMessage(`${count} kit(s) adicionado(s) ao carrinho.`)
    cart.openDrawer()
  }

  if (loading || kitsLoading) return <p role="status">Carregando kits de armas…</p>
  return <section className="weapon-kits" aria-label="Kits de armas">
    <header><h2>Configure sua arma</h2><p>Escolha a arma, o nível e as modificações.</p></header>
    <details className="weapon-config-presets"><summary>Kits em destaque</summary>
    {kitError && <p role="status">{kitError}</p>}
    {!suggestions.length && <p>Novos kits em breve. Você pode montar sua arma abaixo.</p>}
    <div className="weapon-kit-presets">{suggestions.map(preset => <article key={preset.id} className={`weapon-kit-preset${draft === preset.draft ? " is-selected" : ""}`}>
      <div><h3>{preset.name}</h3><Prices rows={summarizeLoadout(preset.draft, items)} /></div>
      <p>Arma + {Object.keys(preset.draft).length - 1} acessórios · 1 kit</p>
      <div className="weapon-kit-art" style={glow(preset.weapon)}>{image(preset.weapon) && <img src={image(preset.weapon)} alt={preset.weapon.name} />}</div>
      <ul className="weapon-kit-includes">{summarizeLoadout(preset.draft, items).filter(row => row.item.id !== preset.weapon.id).map(({ item }) => <li key={item.id}>{item.name}</li>)}</ul>
      <button type="button" onClick={() => { setCustom(preset.draft); setCount(1); setMessage(""); editor.current?.scrollIntoView({ behavior: "smooth", block: "start" }) }}>Personalizar kit</button>
    </article>)}</div>
    </details>
    <div className="weapon-kit-layout" ref={editor}>
      <div className="weapon-kit-editor"><h3>Configure sua arma</h3><p>Escolha a arma, o nível e os acessórios.</p>
        <div className="weapon-config-controls"><label>Arma<select aria-label="Arma" value={family} onChange={event => {
          const key = event.target.value
          const target = findConfiguration(key, level) ?? ["IV", "III", "II", "I", "base", "V"].map(tier => findConfiguration(key, tier)).find(Boolean)
          configure(target)
        }}><option value="">Escolher arma</option>{families.map(row => <option key={row.key} value={row.key}>{row.name}</option>)}</select></label><div role="group" aria-label="Nível da arma"><span>Nível</span>{[...(configurations.some(entry => entry.family === family && entry.level === "base") ? ["base"] : []), "I", "II", "III", "IV", "V"].map(tier => <button type="button" key={tier} aria-pressed={level === tier} disabled={!findConfiguration(family, tier)} onClick={() => configure(findConfiguration(family, tier))}>{tier === "base" ? "Base" : tier}</button>)}</div></div>
        <button className="weapon-kit-weapon" type="button" onClick={() => open("weapon")} aria-label={`Escolher arma e tier${weapon ? `: ${weapon.name}` : ""}`}>
          <strong>{weapon?.name ?? "Escolher arma e tier"}</strong><span>Trocar arma / tier</span>
          <div className="weapon-kit-art" style={weapon ? glow(weapon) : undefined}>{weapon && image(weapon) ? <img src={image(weapon)} alt="" /> : <Plus />}</div>
        </button>
        <div className="weapon-kit-mounts">{mounts.map(slot => {
          const mod = items.find(item => item.id === draft[slot.id]?.itemId)
          return <div className="weapon-kit-mount" key={slot.id}><button type="button" onClick={() => open(slot)} aria-label={`Escolher ${slot.label}${mod ? `: ${mod.name}` : ""}`}><strong>{attachmentLabels[slot.attachmentType!]}</strong><div className="weapon-kit-art" style={mod ? glow(mod) : undefined}>{mod && image(mod) ? <img src={image(mod)} alt="" /> : <Plus />}</div><span>{mod?.name ?? "Selecionar acessório"}</span></button>{mod && <button className="weapon-kit-remove" type="button" aria-label={`Remover ${mod.name}`} onClick={() => { const next = { ...draft }; delete next[slot.id]; setCustom(next) }}><X size={14} /></button>}</div>
        })}</div>
        {level === "V" && <div className="weapon-config-selected"><h4>Modificações da variante</h4><p>{upgrades.length ? upgrades.join(" + ") : "Amplificada base · sem melhorias adicionais selecionadas"}</p></div>}
        {weapon && mounts.length === 0 && <p>{getWeaponProfile(weapon)?.slots ? "Esta arma não possui encaixes de acessórios." : "Encaixes desta arma ainda não confirmados."}</p>}
      </div>
      <aside className="weapon-config-upgrades" aria-label="Modificações da arma"><h3>{level === "V" ? "Modificações · Tier V" : "Modificações Amplified"}</h3><p>{level === "V" ? "Escolha uma combinação disponível para esta arma." : "Selecione o nível V para configurar as melhorias da variante."}</p>
        {level === "V" && <label>Configuração<select aria-label="Configuração Amplified" value={weapon?.id ?? ""} onChange={event => configure(configurations.find(entry => entry.item.id === event.target.value)?.item)}>{configurations.filter(entry => entry.family === family && entry.level === "V").map(entry => <option key={entry.item.id} value={entry.item.id}>{entry.upgrades.join(" + ") || "Amplificada base"}</option>)}</select></label>}
        {level === "V" && modifications.map(mod => {
          const active = upgrades.includes(mod)
          const next = active ? upgrades.filter(name => name !== mod) : [...upgrades, mod]
          const target = findConfiguration(family, "V", next)
          return <button key={mod} type="button" aria-pressed={active} disabled={!target} onClick={() => configure(target)}><strong>{mod}</strong><span>{active ? "Selecionada" : target ? "Selecionar" : "Indisponível nesta combinação"}</span></button>
        })}
        {level === "V" && !modifications.length && <p>Não há melhorias adicionais confirmadas para esta arma.</p>}
        <p>As melhorias fazem parte da variante da arma. Os encaixes e o preço acompanham a configuração escolhida.</p>
      </aside>
      <aside className="weapon-kit-summary" aria-label="Resumo do kit"><h3>Seu kit</h3>
        <ul>{rows.map(({ item }) => <li key={item.id}><strong>{item.name}</strong><Prices rows={[{ item, quantity: count }]} /></li>)}</ul>
        <label className="weapon-kit-count">Quantidade de kits<input type="number" min={1} max={99} value={count} onChange={event => setCount(Math.max(1, Math.min(99, Math.floor(Number(event.target.value) || 1))))} /></label>
        <div className="weapon-kit-payment" role="group" aria-label="Pagar kit com"><button type="button" aria-pressed={mode === "points"} onClick={() => setMode("points")}>Pontos</button><button type="button" aria-pressed={mode === "cash"} onClick={() => setMode("cash")}>Reais</button></div>
        <div aria-live="polite"><p>Total de {count} kit(s)</p><Prices rows={totals} /></div>
        {issues.length > 0 && <p className="weapon-kit-warning">{issues[0].item.name}: {issues[0].issue}. Ajuste o kit para comprar.</p>}
        <button type="button" className="weapon-kit-buy" disabled={!purchasable} onClick={buy}><ShoppingCart size={17} />{userId ? "Adicionar kit ao carrinho" : "Entrar para comprar kit"}</button>
        <p role="status">{message || "Preço calculado com os itens selecionados. A montagem não reserva estoque."}</p>
      </aside>
    </div>
    <dialog ref={dialog} className="weapon-kit-dialog" onClose={() => setSelection(null)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close() }} aria-labelledby="weapon-kit-dialog-title">
      <header><h3 id="weapon-kit-dialog-title">{selection === "weapon" ? "Escolher arma e tier" : selection?.label}</h3><button type="button" aria-label="Fechar seleção de kit" onClick={() => dialog.current?.close()}><X /></button></header>
      <input ref={search} type="search" placeholder="Buscar arma ou acessório…" value={query} onChange={event => setQuery(event.target.value)} />
      <div className="weapon-kit-choices">{choices.map(item => <button type="button" key={item.id} onClick={() => choose(item)}><div className="weapon-kit-art" style={glow(item)}>{image(item) && <img src={image(item)} alt="" loading="lazy" />}</div><strong>{item.name}</strong><Prices rows={[{ item, quantity: 1 }]} /><small>{(item.quantity ?? 0) > 0 ? "Em estoque" : "Sem estoque · montagem"}</small></button>)}</div>
      {!choices.length && <p>Nenhum item compatível encontrado.</p>}
    </dialog>
  </section>
}

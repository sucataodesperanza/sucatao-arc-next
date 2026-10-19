"use client"

import { useMemo, useRef, useState, type CSSProperties } from "react"
import { useRouter } from "next/navigation"
import { Plus, ShoppingCart, X } from "lucide-react"
import type { CatalogItem } from "@/lib/catalog"
import { useCart, type CartMode } from "@/lib/cart-context"
import { acceptsLoadoutItem, attachmentLabels, buildLoadoutItems, getWeaponAttachmentSlots, getWeaponProfile, loadoutItemSearchText, loadoutTotals, normalizeLoadoutText, summarizeLoadout, type LoadoutDraft, type LoadoutSlot } from "@/lib/loadout"
import { suggestedKitWeapons, suggestedWeaponKit, weaponKitPurchaseIssues } from "@/lib/weapon-kits"
import { getItemGlowColor } from "@/lib/use-items-catalog"
import "@/styles/weapon-kits.css"

const cash = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const image = (item: CatalogItem) => item.image?.startsWith("http") || item.image?.startsWith("/") ? item.image : item.image ? `/${item.image}` : undefined
const glow = (item: CatalogItem) => ({ "--rarity-color": getItemGlowColor(item) } as CSSProperties)
function Prices({ rows }: { rows: { item: CatalogItem; quantity: number }[] }) {
  const totals = loadoutTotals(rows)
  return <span className="weapon-kit-prices"><span>{totals.pricePoints.missing ? "Pontos: preço incompleto" : `${totals.pricePoints.total.toLocaleString("pt-BR")} pts`}</span><span>{totals.priceCash.missing ? "Reais: preço incompleto" : cash(totals.priceCash.total)}</span></span>
}

export function WeaponKitBuilder({ stock, loading, userId }: { stock: CatalogItem[]; loading: boolean; userId: string | null }) {
  const items = useMemo(() => buildLoadoutItems(stock), [stock])
  const suggestions = useMemo(() => suggestedKitWeapons(items).map(weapon => ({ weapon, draft: suggestedWeaponKit(weapon, items) })), [items])
  const [custom, setCustom] = useState<LoadoutDraft | null>(null)
  const draft = custom ?? suggestions[0]?.draft ?? {}
  const weapon = items.find(item => item.id === draft["weapon-1"]?.itemId)
  const mounts = getWeaponAttachmentSlots(weapon, "weapon-1")
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

  if (loading) return <p role="status">Carregando kits de armas…</p>
  return <section className="weapon-kits" aria-label="Kits de armas">
    <header><h2>Kits de armas</h2><p>Escolha uma combinação sugerida ou personalize sua arma.</p></header>
    <h3>Kits prontos</h3>
    <div className="weapon-kit-presets">{suggestions.map(preset => <article key={preset.weapon.id} className={`weapon-kit-preset${weapon?.id === preset.weapon.id ? " is-selected" : ""}`}>
      <div><h3>{preset.weapon.name}</h3><Prices rows={summarizeLoadout(preset.draft, items)} /></div>
      <p>Arma + {Object.keys(preset.draft).length - 1} acessórios · 1 kit</p>
      <div className="weapon-kit-art" style={glow(preset.weapon)}>{image(preset.weapon) && <img src={image(preset.weapon)} alt={preset.weapon.name} />}</div>
      <ul className="weapon-kit-includes">{summarizeLoadout(preset.draft, items).filter(row => row.item.id !== preset.weapon.id).map(({ item }) => <li key={item.id}>{item.name}</li>)}</ul>
      <button type="button" onClick={() => { setCustom(preset.draft); setCount(1); setMessage(""); editor.current?.scrollIntoView({ behavior: "smooth", block: "start" }) }}>Personalizar kit</button>
    </article>)}</div>
    <div className="weapon-kit-layout" ref={editor}>
      <div className="weapon-kit-editor"><h3>Personalize seu kit</h3><p>Clique na arma ou em um acessório para trocar.</p>
        <button className="weapon-kit-weapon" type="button" onClick={() => open("weapon")} aria-label={`Escolher arma e tier${weapon ? `: ${weapon.name}` : ""}`}>
          <strong>{weapon?.name ?? "Escolher arma e tier"}</strong><span>Trocar arma / tier</span>
          <div className="weapon-kit-art" style={weapon ? glow(weapon) : undefined}>{weapon && image(weapon) ? <img src={image(weapon)} alt="" /> : <Plus />}</div>
        </button>
        <div className="weapon-kit-mounts">{mounts.map(slot => {
          const mod = items.find(item => item.id === draft[slot.id]?.itemId)
          return <div className="weapon-kit-mount" key={slot.id}><button type="button" onClick={() => open(slot)} aria-label={`Escolher ${slot.label}${mod ? `: ${mod.name}` : ""}`}><strong>{attachmentLabels[slot.attachmentType!]}</strong><div className="weapon-kit-art" style={mod ? glow(mod) : undefined}>{mod && image(mod) ? <img src={image(mod)} alt="" /> : <Plus />}</div><span>{mod?.name ?? "Selecionar acessório"}</span></button>{mod && <button className="weapon-kit-remove" type="button" aria-label={`Remover ${mod.name}`} onClick={() => { const next = { ...draft }; delete next[slot.id]; setCustom(next) }}><X size={14} /></button>}</div>
        })}</div>
        {weapon && mounts.length === 0 && <p>{getWeaponProfile(weapon)?.slots ? "Esta arma não possui encaixes de acessórios." : "Encaixes desta arma ainda não confirmados."}</p>}
      </div>
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

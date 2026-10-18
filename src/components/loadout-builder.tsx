"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowRight, Backpack, Crosshair, Plus, Search, Shield, Trash2, Wrench, X } from "lucide-react"
import { useRouter } from "next/navigation"
import type { CatalogItem } from "@/lib/catalog"
import { getItemTypeLabel } from "@/lib/catalog"
import { useCart, type CartMode } from "@/lib/cart-context"
import { acceptsLoadoutItem, attachmentFamily, buildLoadoutItems, isSurvivor, loadoutPurchaseIssue, loadoutSlots, normalizeLoadoutText, slotQuantityLimit, summarizeLoadout, type LoadoutDraft, type LoadoutSlot } from "@/lib/loadout"
import "@/styles/loadout.css"

const STORAGE_KEY = "sucatao-loadout-mk3-v1"
const cash = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
function itemImage(item: CatalogItem) { return item.image ? (item.image.startsWith("http") || item.image.startsWith("/") ? item.image : `/${item.image}`) : undefined }

export function LoadoutBuilder({ stock, loading, userId }: { stock: CatalogItem[]; loading: boolean; userId: string | null }) {
  const items = useMemo(() => buildLoadoutItems(stock), [stock])
  const [draft, setDraft] = useState<LoadoutDraft>({})
  const [ready, setReady] = useState(false)
  const [popup, setPopup] = useState<LoadoutSlot | "review" | null>(null)
  const [query, setQuery] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [mode, setMode] = useState<CartMode>("points")
  const [message, setMessage] = useState("")
  const dialog = useRef<HTMLDialogElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const initialized = useRef(false)
  const cart = useCart()
  const router = useRouter()

  useEffect(() => {
    if (loading || initialized.current) return
    initialized.current = true
    const all = buildLoadoutItems(stock)
    const initial: LoadoutDraft = {}
    const survivor = all.find(isSurvivor)
    if (survivor) initial.backpack = { itemId: survivor.id, quantity: 1 }
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")
      if (saved && typeof saved === "object") {
        for (const slot of loadoutSlots) {
          const entry = saved[slot.id]
          if (!entry) continue
          const item = all.find(item => item.id === entry.itemId || (typeof entry.name === "string" && normalizeLoadoutText(item.name) === normalizeLoadoutText(entry.name)))
          const weapon = slot.weaponSlot ? all.find(item => item.id === initial[slot.weaponSlot!]?.itemId) : undefined
          if (!item || !acceptsLoadoutItem(slot.kind, item, weapon)) continue
          if (slot.kind === "attachment" && loadoutSlots.some(other => other.weaponSlot === slot.weaponSlot && all.some(equipped => equipped.id === initial[other.id]?.itemId && attachmentFamily(equipped) === attachmentFamily(item)))) continue
          initial[slot.id] = { itemId: item.id, quantity: Math.max(1, Math.min(slotQuantityLimit(slot.kind, item), Number.isFinite(entry.quantity) ? Math.floor(entry.quantity) : 1)) }
        }
      }
    } catch { /* Invalid or inaccessible storage starts a fresh loadout. */ }
    setDraft(initial)
    setReady(true)
  }, [loading, stock])

  useEffect(() => {
    if (!ready) return
    try {
      const saved = Object.fromEntries(Object.entries(draft).map(([id, entry]) => [id, { ...entry, name: items.find(item => item.id === entry.itemId)?.name }]))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    } catch { /* Building remains available when storage is disabled. */ }
  }, [draft, ready, items])

  useEffect(() => {
    if (popup) { dialog.current?.showModal(); search.current?.focus() }
    else dialog.current?.close()
  }, [popup])

  function open(slot: LoadoutSlot) {
    setMessage("")
    setQuery("")
    setQuantity(draft[slot.id]?.quantity ?? 1)
    setPopup(slot)
  }

  function remove(slot: LoadoutSlot) {
    setDraft(previous => {
      const next = { ...previous }
      delete next[slot.id]
      if (slot.kind === "weapon") for (const attachment of loadoutSlots.filter(item => item.weaponSlot === slot.id)) delete next[attachment.id]
      return next
    })
  }

  function equip(slot: LoadoutSlot, item: CatalogItem) {
    const weapon = slot.weaponSlot ? items.find(item => item.id === draft[slot.weaponSlot!]?.itemId) : undefined
    if (!acceptsLoadoutItem(slot.kind, item, weapon)) return
    setDraft(previous => {
      const next = { ...previous, [slot.id]: { itemId: item.id, quantity: Math.min(quantity, slotQuantityLimit(slot.kind, item)) } }
      if (slot.kind === "weapon" && previous[slot.id]?.itemId !== item.id) for (const attachment of loadoutSlots.filter(item => item.weaponSlot === slot.id)) delete next[attachment.id]
      return next
    })
    setPopup(null)
  }

  function renderSlot(slot: LoadoutSlot, large = false) {
    const entry = draft[slot.id]
    const item = items.find(item => item.id === entry?.itemId)
    const Icon = slot.kind === "shield" ? Shield : slot.kind === "weapon" ? Crosshair : slot.kind === "backpack" ? Backpack : slot.kind === "attachment" ? Wrench : Plus
    const disabled = !ready || (slot.kind === "attachment" && !draft[slot.weaponSlot!])
    return <div key={slot.id} className={`loadout-slot${large ? " loadout-slot--weapon" : ""}${slot.kind === "attachment" ? " loadout-slot--attachment" : ""}`}>
      <button type="button" className="loadout-slot-select" disabled={disabled} onClick={() => open(slot)} aria-label={`${slot.label}${item ? `: ${item.name}, quantidade ${entry.quantity}. Alterar` : ": selecionar item"}`}>
        {large && <strong className="loadout-weapon-label">{slot.label}</strong>}
        {item ? itemImage(item) ? <img src={itemImage(item)} alt="" loading="lazy" /> : <span className="loadout-fallback">{item.name.slice(0, 2)}</span> : <Icon className="loadout-empty-icon" size={large ? 48 : 28} strokeWidth={1.5} />}
        {(slot.kind === "backpack" || slot.kind === "shield") && <span className="loadout-slot-name">{slot.kind === "backpack" ? "MK3 Sobrevivente" : item?.name ?? "Escudo"}</span>}
        {item && !large && !["backpack", "shield", "attachment"].includes(slot.kind) && <span className="loadout-slot-quantity">×{entry.quantity}</span>}
        {item && large && <span className="loadout-weapon-name">{item.name}</span>}
      </button>
      {item && slot.kind !== "backpack" && <button type="button" className="loadout-remove" onClick={() => remove(slot)} aria-label={`Remover ${item.name} de ${slot.label}`}><X size={15} /></button>}
      {large && <div className="loadout-attachments">{loadoutSlots.filter(attachment => attachment.weaponSlot === slot.id).map(attachment => renderSlot(attachment))}</div>}
    </div>
  }

  const selectedSlot = popup && popup !== "review" ? popup : null
  const selectedWeapon = selectedSlot?.weaponSlot ? items.find(item => item.id === draft[selectedSlot.weaponSlot!]?.itemId) : undefined
  const choices = selectedSlot ? items.filter(item => acceptsLoadoutItem(selectedSlot.kind, item, selectedWeapon))
    .filter(item => selectedSlot.kind !== "attachment" || !loadoutSlots.some(other => other.id !== selectedSlot.id && other.weaponSlot === selectedSlot.weaponSlot && items.some(equipped => equipped.id === draft[other.id]?.itemId && attachmentFamily(equipped) === attachmentFamily(item))))
    .filter(item => normalizeLoadoutText(item.name).includes(normalizeLoadoutText(query)))
    .sort((a, b) => Number(stock.some(item => item.id === b.id && (item.quantity ?? 0) > 0)) - Number(stock.some(item => item.id === a.id && (item.quantity ?? 0) > 0)) || a.name.localeCompare(b.name, "pt-BR")) : []
  const summary = summarizeLoadout(draft, items)
  const price = (item: CatalogItem) => mode === "points" ? item.pricePoints : item.priceCash
  const total = summary.reduce((sum, row) => sum + (price(row.item) ?? 0) * row.quantity, 0)
  const problem = (item: CatalogItem, quantity: number) => loadoutPurchaseIssue(item.id, quantity, mode, stock, cart.items)
  const canAdd = summary.length > 0 && summary.every(row => !problem(row.item, row.quantity))
  function addToCart() {
    if (!canAdd) return
    if (!userId) { router.push("/login"); return }
    for (const { item, quantity } of summary) cart.addItem({ itemId: item.id, name: item.name, type: item.type, rarity: item.rarity, value: item.value ?? 0, pricePoints: item.pricePoints, priceCash: item.priceCash, weightKg: item.weightKg, image: item.image, mode }, quantity)
    setPopup(null)
    setMessage("Loadout adicionado ao carrinho. Revise os itens para finalizar a compra.")
    cart.openDrawer()
  }

  const section = (kind: "bag" | "quick" | "gadget" | "safe", title: string, hint: string) => {
    const slots = loadoutSlots.filter(slot => slot.kind === kind)
    return <section className={`loadout-section loadout-section--${kind}`} aria-label={title}>
      <div className="loadout-section-heading"><h3>{title}</h3><span>{slots.filter(slot => draft[slot.id]).length}/{slots.length}</span></div>
      <p className="loadout-section-hint">{hint}</p>
      <div className={`loadout-grid loadout-grid--${kind}`}>{slots.map(slot => renderSlot(slot))}</div>
    </section>
  }

  return <div className="loadout-builder" aria-busy={!ready}>
    <header className="loadout-heading"><h2>Monte seu loadout</h2><p>Clique em um espaço para escolher um item.</p><span>Teste com MK3 Sobrevivente</span></header>
    {!ready ? <p role="status" className="loadout-loading">Carregando equipamentos…</p> : <>
      <div className="loadout-workspace">
        <section className="loadout-section loadout-equipment" aria-label="Equipamento">
          <div className="loadout-section-heading"><h3>Equipamento</h3></div><p className="loadout-section-hint">Mochila, escudo e duas armas.</p>
          <div className="loadout-equipment-top">{loadoutSlots.filter(slot => ["backpack", "shield"].includes(slot.kind)).map(slot => renderSlot(slot))}</div>
          {loadoutSlots.filter(slot => slot.kind === "weapon").map(slot => renderSlot(slot, true))}
        </section>
        {section("bag", "Mochila", "20 espaços para qualquer item do jogo.")}
        <div className="loadout-special">{section("quick", "Uso rápido", "Granadas, consumíveis e gadgets.")}{section("gadget", "Espaço aperfeiçoado", "Somente gadgets.")}{section("safe", "Bolso seguro", "Qualquer item, exceto armas e escudos.")}</div>
      </div>
      <footer className="loadout-actions"><p role="status">{message || "Sua montagem é salva neste navegador."}</p><button type="button" onClick={() => { const survivor = items.find(isSurvivor); setDraft(survivor ? { backpack: { itemId: survivor.id, quantity: 1 } } : {}); setMessage("Loadout limpo. MK3 Sobrevivente mantida para o teste.") }}><Trash2 size={16} />Limpar loadout</button><button type="button" className="loadout-primary" onClick={() => { setMessage(""); setPopup("review") }}>Revisar loadout<ArrowRight size={17} /></button></footer>
    </>}
    <dialog ref={dialog} className="loadout-dialog" onClose={() => setPopup(null)} onClick={event => { if (event.target === event.currentTarget) setPopup(null) }} aria-labelledby="loadout-dialog-title">
      <div className="loadout-dialog-content">
        <div className="loadout-dialog-heading"><h2 id="loadout-dialog-title">{popup === "review" ? "Revisar loadout" : selectedSlot?.label}</h2><button type="button" onClick={() => setPopup(null)} aria-label="Fechar seleção"><X size={20} /></button></div>
        {selectedSlot && <>
          <p className="loadout-dialog-help">Selecione um item compatível com este espaço.{selectedSlot.kind === "attachment" && " Somente acessórios com compatibilidade informada para esta arma."}</p>
          <div className="loadout-picker-controls"><label className="loadout-search"><Search size={17} /><input ref={search} type="search" placeholder="Buscar item compatível…" value={query} onChange={event => setQuery(event.target.value)} /></label>{["bag", "quick", "safe"].includes(selectedSlot.kind) && <label className="loadout-quantity">Quantidade<input aria-label="Quantidade do item" type="number" min={1} max={999} value={quantity} onChange={event => setQuantity(Math.max(1, Math.min(999, Math.floor(Number(event.target.value) || 1))))} /></label>}</div>
          <p className="loadout-dialog-help">{choices.length} itens • Quantidades limitadas ao tamanho da pilha de cada item. Itens sem estoque podem ser usados na montagem.</p>
          <div className="loadout-picker">{choices.map(item => <button key={item.id} type="button" className="loadout-choice" onClick={() => equip(selectedSlot, item)}>
            <div className="loadout-choice-image">{itemImage(item) ? <img src={itemImage(item)} alt="" loading="lazy" /> : <Backpack size={26} />}</div><strong>{item.name}</strong><small>{getItemTypeLabel(item.type)}{item.stackSize ? ` · Pilha ${item.stackSize}` : ""}</small><span>{stock.some(row => row.id === item.id && (row.quantity ?? 0) > 0) ? "Em estoque" : "Sem estoque · montagem"}</span>
          </button>)}</div>
          {choices.length === 0 && <p className="loadout-empty">Nenhum item compatível encontrado.{selectedSlot.kind === "attachment" ? " Tente outra arma ou busque outro acessório." : " Ajuste a busca."}</p>}
        </>}
        {popup === "review" && <>
          <p className="loadout-dialog-help">Itens repetidos nos espaços são somados. A montagem não reserva estoque.</p>
          <div className="loadout-payment" role="group" aria-label="Forma de pagamento"><button type="button" aria-pressed={mode === "points"} onClick={() => setMode("points")}>Pontos</button><button type="button" aria-pressed={mode === "cash"} onClick={() => setMode("cash")}>Reais</button></div>
          <ul className="loadout-review-list">{summary.map(({ item, quantity }) => <li key={item.id}><span><strong>{item.name}</strong><small>Quantidade: {quantity}</small>{problem(item, quantity) && <em>{problem(item, quantity)}</em>}</span><strong>{price(item) === undefined ? "—" : mode === "points" ? `${((price(item) ?? 0) * quantity).toLocaleString("pt-BR")} pts` : cash((price(item) ?? 0) * quantity)}</strong></li>)}</ul>
          <div className="loadout-review-total"><span>{canAdd ? "Total" : "Subtotal dos itens com preço"}</span><strong>{mode === "points" ? `${total.toLocaleString("pt-BR")} pts` : cash(total)}</strong></div>
          {!canAdd && <p className="loadout-dialog-help">Troque ou remova os itens indisponíveis e ajuste as quantidades para adicionar o loadout completo ao carrinho.</p>}
          <button type="button" className="loadout-primary loadout-checkout" disabled={!canAdd} onClick={addToCart}>{userId ? "Adicionar loadout ao carrinho" : "Entrar para adicionar ao carrinho"}<ArrowRight size={17} /></button>
        </>}
      </div>
    </dialog>
  </div>
}

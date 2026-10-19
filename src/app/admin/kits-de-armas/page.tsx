"use client"

import { useCallback, useEffect, useState } from "react"
import type { CatalogItem } from "@/lib/catalog"
import { acceptsLoadoutItem, attachmentLabels, getWeaponAttachmentSlots, type LoadoutDraft } from "@/lib/loadout"
import { suggestedKitWeapons, suggestedWeaponKit, type SavedWeaponKit } from "@/lib/weapon-kits"
import "@/styles/admin-weapon-kits.css"

type Form = Omit<SavedWeaponKit, "id"> & { id?: string }
const blank = (): Form => ({ name: "", active: true, featured: true, position: 0, draft: {} })

export default function AdminWeaponKitsPage() {
  const [kits, setKits] = useState<SavedWeaponKit[]>([])
  const [items, setItems] = useState<CatalogItem[]>([])
  const [form, setForm] = useState<Form | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const load = useCallback(async () => {
    const response = await fetch("/api/admin/weapon-kits", { cache: "no-store" })
    const body = await response.json()
    if (!response.ok) throw new Error(body.error ?? "Não foi possível carregar os kits.")
    setKits(body.kits); setItems(body.items)
  }, [])
  useEffect(() => { load().catch(error => setMessage(error.message)).finally(() => setLoading(false)) }, [load])

  async function persist(value: Form) {
    const response = await fetch("/api/admin/weapon-kits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) })
    const body = await response.json()
    if (!response.ok) throw new Error(body.error ?? "Não foi possível salvar o kit.")
  }
  async function save(value: Form) {
    setBusy(true); setMessage("")
    try { await persist(value); await load(); setForm(null); setMessage("Kit salvo. Os destaques atualizam ao abrir ou atualizar a aba Armas da loja.") }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar.") }
    finally { setBusy(false) }
  }
  async function importSuggestions() {
    setBusy(true); setMessage("")
    try {
      for (const weapon of suggestedKitWeapons(items)) await persist({ ...blank(), name: weapon.name, position: suggestedKitWeapons(items).indexOf(weapon), draft: suggestedWeaponKit(weapon, items) })
      await load(); setMessage("Sugestões cadastradas. Agora você pode editar os kits e os destaques.")
    } catch (error) { await load().catch(() => {}); setMessage(error instanceof Error ? error.message : "Não foi possível importar.") }
    finally { setBusy(false) }
  }
  const weapon = items.find(item => item.id === form?.draft["weapon-1"]?.itemId)
  const mounts = getWeaponAttachmentSlots(weapon, "weapon-1")

  return <div className="admin-weapon-kits"><header><h1>Kits de armas</h1><p>Escolha os kits prontos que aparecem na loja. O preço é a soma dos componentes cadastrados.</p><button disabled={loading || busy} onClick={() => { setForm(blank()); setMessage("") }}>Novo kit</button></header>
    <p role="status">{message}</p>
    {loading ? <p>Carregando kits…</p> : <>
      {!kits.length && <section><p>Nenhum kit cadastrado. Enquanto isso, a loja exibe as três sugestões iniciais. Ao salvar o primeiro kit, somente seus kits ativos e em destaque serão exibidos.</p><button disabled={busy || !items.length} onClick={importSuggestions}>Cadastrar as três sugestões iniciais</button></section>}
      <div className="admin-kit-list">{kits.map(kit => <article key={kit.id}><h2>{kit.name}</h2><p>Posição: {kit.position} · {kit.active ? "Ativo" : "Inativo"} · {kit.featured ? "Em destaque" : "Sem destaque"}</p><ul>{Object.values(kit.draft).map(entry => <li key={entry.itemId}>{items.find(item => item.id === entry.itemId)?.name ?? "Componente indisponível"}</li>)}</ul><div><button disabled={busy} onClick={() => { setForm({ ...kit, draft: { ...kit.draft } }); setMessage("") }}>Editar</button><button disabled={busy} onClick={() => save({ ...kit, featured: !kit.featured })}>{kit.featured ? "Retirar do destaque" : "Colocar em destaque"}</button><button disabled={busy} onClick={() => save({ ...kit, active: !kit.active })}>{kit.active ? "Desativar" : "Ativar"}</button></div></article>)}</div>
    </>}
    {form && <form className="admin-kit-form" onSubmit={event => { event.preventDefault(); save(form) }}><h2>{form.id ? "Editar kit" : "Novo kit"}</h2>
      <label>Nome do kit<input required maxLength={80} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
      <label>Posição na loja<input required type="number" min={0} max={999} value={form.position} onChange={event => setForm({ ...form, position: Number(event.target.value) })} /></label>
      <label>Arma e tier<select required value={weapon?.id ?? ""} onChange={event => setForm({ ...form, draft: { "weapon-1": { itemId: event.target.value, quantity: 1 } } })}><option value="">Selecione uma arma</option>{items.filter(item => acceptsLoadoutItem("weapon", item)).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      {mounts.map(slot => <label key={slot.id}>{attachmentLabels[slot.attachmentType!]}<select value={form.draft[slot.id]?.itemId ?? ""} onChange={event => { const next: LoadoutDraft = { ...form.draft }; if (event.target.value) next[slot.id] = { itemId: event.target.value, quantity: 1 }; else delete next[slot.id]; setForm({ ...form, draft: next }) }}><option value="">Sem acessório</option>{items.filter(item => acceptsLoadoutItem("attachment", item, weapon, slot.attachmentType)).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>)}
      <label className="admin-kit-checkbox"><input type="checkbox" checked={form.active} onChange={event => setForm({ ...form, active: event.target.checked })} />Kit ativo</label>
      <label className="admin-kit-checkbox"><input type="checkbox" checked={form.featured} onChange={event => setForm({ ...form, featured: event.target.checked })} />Exibir em destaque na aba Armas</label>
      <p>Posições menores aparecem primeiro. Trocar a arma limpa os acessórios. Estoque e preços serão conferidos na compra.</p>
      <div><button disabled={busy || !weapon} type="submit">{busy ? "Salvando…" : "Salvar kit"}</button><button disabled={busy} type="button" onClick={() => setForm(null)}>Cancelar</button></div>
    </form>}
  </div>
}

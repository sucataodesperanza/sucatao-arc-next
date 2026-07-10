"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, Banknote, ChevronLeft, CircleDollarSign, Clock, Coins, Gavel, Package, Plus, ScrollText, ShoppingCart, Sparkles, Star, Target, Zap } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getItemTypeLabel, type CatalogItem } from "@/lib/catalog"
import { ArcIntelPanel } from "@/components/arc-intel-panel"
import { CatalogFilters } from "@/components/catalog-filters"
import { CatalogGrid } from "@/components/catalog-grid"
import { CatalogItemModal } from "@/components/catalog-item-modal"
import { useItemsCatalog } from "@/lib/use-items-catalog"
import SidePanelUserHeader from "@/components/side-panel-user-header"
import { SorteiosTab } from "@/components/sorteios-tab"
import { MISSION_COLORS, TIER_COLORS, expiresInStr } from "@/components/active-contract-card"
import type { Contract as ApiContract } from "@/app/api/contratos/route"
import "../../../styles/loja.css"
import "../../../styles/contratos.css"
import "../../../styles/contratos-venda.css"
import "../../../styles/sorteios.css"

function resolveImage(image?: string) {
  if (!image) return undefined
  return image.startsWith("http") ? image : `/${image}`
}

const rarityOrder = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Unknown"]
const rarityMetaLabels: Record<string, string> = {
  Common: "Comum", Uncommon: "Incomum", Rare: "Raro", Epic: "Epico", Legendary: "Lendario", Unknown: "Desconhecido"
}
const rarityColors: Record<string, string> = {
  Common: "#8b99aa", Uncommon: "#3df28b", Rare: "#5fa8ff", Epic: "#b477ff", Legendary: "#ffd400", Unknown: "#566171"
}

function getRarity(item: CatalogItem) {
  return rarityOrder.includes(item.rarity ?? "") ? (item.rarity as string) : "Unknown"
}
function getType(item: CatalogItem) { return item.type ?? "Item" }
function formatNumber(n: number | undefined) { return (n ?? 0).toLocaleString("pt-BR") }

const MISSION_LABELS: Record<string, string> = { diario: "Diário", semanal: "Semanal", mensal: "Mensal" }

function RewardBadge({ sucatas, xp, rep }: { sucatas: number; xp: number; rep: number | null }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {sucatas > 0 && <span style={{ color: "#ffd400", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}><Coins size={11} />{sucatas.toLocaleString("pt-BR")}</span>}
      {xp     > 0 && <span style={{ color: "#5fa8ff", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}><Zap size={11} />{xp}</span>}
      {rep       && <span style={{ color: "#b477ff", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}><Star size={11} />{rep}</span>}
    </div>
  )
}

type BuyModal = { contract: ApiContract; step: "choose" | "points" | "cash" }

const tabs: { key: string; label: string; href?: string }[] = [
  { key: "destaques", label: "Destaques" },
  { key: "itens", label: "Itens" },
  { key: "passes", label: "Contratos à Venda" },
  { key: "sorteios", label: "Sorteios" },
  { key: "servicos", label: "Leilões" },
  { key: "giftcards", label: "Gift Cards" },
]

type RewardItem = { id: string; name: string; description: string | null; image_url: string | null; price: number; stock: number; expires_at: string | null }

const categories: { key: string; tag: string; tone: string; image: string; title: string; text: string; href?: string }[] = [
  { key: "itens", tag: "CATÁLOGO", tone: "yellow", image: "/assets/bots/arc_leaper.png", title: "Itens", text: "Catálogo completo para resgatar ou comprar com pontos.", href: "/loja" },
  { key: "passes", tag: "CONTRATOS", tone: "cyan", image: "/assets/maps/the_spaceport.png", title: "Contratos à Venda", text: "Compre contratos exclusivos e ganhe recompensas especiais." },
  { key: "sorteios", tag: "SORTEIOS", tone: "red", image: "/assets/bots/arc_pop.png", title: "Sorteios", text: "Participe de sorteios e concorra a itens raros." },
  { key: "servicos", tag: "LEILÕES", tone: "green", image: "/assets/maps/stella_montis_upper.png", title: "Leilões", text: "Dispute itens raros em leilões com tempo limitado." },
  { key: "giftcards", tag: "GIFT CARDS", tone: "yellow", image: "/assets/bots/arc_snitch.png", title: "Gift Cards", text: "Cartões de presente para usar dentro da loja." },
]

const auctionItems: {
  id: string; name: string; description: string; rarity: string
  currentBid: number; minIncrement: number; endsAt: string; bids: number; image?: string
}[] = [
  { id: "a1", name: "Capacete ARC Sentinel", description: "Capacete de combate de alta tecnologia recuperado de um ARC Sentinel.", rarity: "Épico", currentBid: 12500, minIncrement: 500, endsAt: "2h 14m", bids: 8, image: "/assets/bots/arc_sentinel.png" },
  { id: "a2", name: "Lâmina da Matriarca", description: "Arma lendária extraída do núcleo de energia de um ARC Matriarch.", rarity: "Lendário", currentBid: 48000, minIncrement: 2000, endsAt: "4h 52m", bids: 23, image: "/assets/bots/arc_matriarch.png" },
  { id: "a3", name: "Módulo Furtivo", description: "Dispositivo raro que reduz a assinatura de radar dos Raiders.", rarity: "Raro", currentBid: 4200, minIncrement: 200, endsAt: "0h 38m", bids: 5, image: "/assets/bots/arc_snitch.png" },
  { id: "a4", name: "Núcleo ARC Pop", description: "Fonte de energia instável com grande potencial de modificação.", rarity: "Incomum", currentBid: 1800, minIncrement: 100, endsAt: "6h 05m", bids: 3, image: "/assets/bots/arc_pop.png" },
  { id: "a5", name: "Exoesqueleto Shredder", description: "Armadura pesada recuperada de uma unidade ARC Shredder destruída.", rarity: "Épico", currentBid: 21000, minIncrement: 1000, endsAt: "1h 20m", bids: 14, image: "/assets/bots/arc_shredder.png" },
  { id: "a6", name: "Caixa Pintada", description: "Caixa misteriosa com decorações únicas. Conteúdo desconhecido.", rarity: "Raro", currentBid: 3500, minIncrement: 150, endsAt: "3h 47m", bids: 6, image: "/assets/items/painted_box.png" },
]

const auctionRarityColors: Record<string, { color: string; bg: string; border: string }> = {
  Incomum:  { color: "#3df28b", bg: "rgba(61,242,139,0.12)",  border: "rgba(61,242,139,0.28)"  },
  Raro:     { color: "#5fa8ff", bg: "rgba(95,168,255,0.12)",  border: "rgba(95,168,255,0.28)"  },
  Épico:    { color: "#b477ff", bg: "rgba(180,119,255,0.12)", border: "rgba(180,119,255,0.28)" },
  Lendário: { color: "#ffd400", bg: "rgba(255,212,0,0.12)",   border: "rgba(255,212,0,0.28)"   },
}

export default function LojaPage() {
  const catalog = useItemsCatalog()
  const [activeTab, setActiveTab] = useState("destaques")
  const [panelOpen, setPanelOpen] = useState(false)
  const [weeklyItems, setWeeklyItems] = useState<RewardItem[]>([])
  const [timer, setTimer] = useState("")
  const [points, setPoints] = useState(0)
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])
  const [loadingHighlights, setLoadingHighlights] = useState(true)

  // Contratos à venda
  const [apiContracts, setApiContracts]     = useState<ApiContract[]>([])
  const [loadingContracts, setLoadingContracts] = useState(false)
  const [contractStats, setContractStats]   = useState<{ completed: number; failed: number; expired: number; total: number; success_rate: number } | null>(null)
  const [acceptingId, setAcceptingId]       = useState<string | null>(null)
  const [buyModal, setBuyModal]             = useState<BuyModal | null>(null)
  const [userPoints, setUserPoints]         = useState<number | null>(null)
  const [buyingId, setBuyingId]             = useState<string | null>(null)

  type ActiveExpedition = {
    id: string; name: string; description: string | null; ends_at: string
    slots_per_pack: number; item_name: string | null; item_image_url: string | null
    price_points: number | null; price_cash: number | null; featured: boolean
  }
  const [activeExpedition, setActiveExpedition] = useState<ActiveExpedition | null>(null)
  const [vaultQty, setVaultQty]       = useState(1)
  const [vaultMode, setVaultMode]     = useState<"points" | "cash">("points")
  const [buyingVault, setBuyingVault] = useState(false)
  const [vaultMsg, setVaultMsg]       = useState("")

  const saleContracts   = apiContracts.filter(c => c.user_status !== "active" && c.user_status !== "completed" && c.user_status !== "expired")
  const activeContracts = apiContracts.filter(c => c.user_status === "active")

  // Lê ?tab= da URL para auto-selecionar aba
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get("tab")
    if (tab && tabs.some(t => t.key === tab)) setActiveTab(tab)
  }, [])

  useEffect(() => {
    fetch("/api/loja/weekly")
      .then(r => r.json())
      .then(d => setWeeklyItems(d.items ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (localStorage.getItem("store-panel-open") === "false") setPanelOpen(false)
  }, [])

  function setPanel(val: boolean) {
    setPanelOpen(val)
    localStorage.setItem("store-panel-open", String(val))
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from("profiles").select("points").eq("id", user.id).single().then(({ data }) => {
        if (data) setPoints(data.points ?? 0)
      })
    })
  }, [])

  useEffect(() => {
    fetch("/api/catalog")
      .then(res => res.json())
      .then(body => setCatalogItems(body.items ?? []))
      .finally(() => setLoadingHighlights(false))
  }, [])

  useEffect(() => {
    fetch("/api/expeditions/active")
      .then(res => res.json())
      .then(body => setActiveExpedition(body.expedition ?? null))
      .catch(() => {})
  }, [])

  // Carrega contratos quando entra na aba passes
  const loadContracts = useCallback(async () => {
    setLoadingContracts(true)
    const res  = await fetch("/api/contratos")
    const body = await res.json().catch(() => ({ contracts: [] }))
    setApiContracts(body.contracts ?? [])
    setLoadingContracts(false)
  }, [])

  useEffect(() => {
    if (activeTab === "passes") {
      loadContracts()
      fetch("/api/contratos/stats").then(r => r.json()).then(d => setContractStats(d)).catch(() => {})
    }
  }, [activeTab, loadContracts])

  // Ações de contrato
  async function handleAcceptFree(id: string) {
    setAcceptingId(id)
    const res = await fetch(`/api/contratos/${id}/accept`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
    setAcceptingId(null)
    if (res.ok || res.status === 409) await loadContracts()
  }

  async function handleBuyPoints(contract: ApiContract) {
    setBuyingId(contract.id)
    const res = await fetch(`/api/contratos/${contract.id}/accept`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "points" }),
    })
    setBuyingId(null)
    const body = await res.json().catch(() => ({}))
    if (res.ok) { setBuyModal(null); await loadContracts() }
    else alert(body.error ?? "Erro ao comprar com pontos.")
  }

  async function handleBuyCash(contract: ApiContract) {
    setBuyingId(contract.id)
    const res = await fetch(`/api/contratos/${contract.id}/accept`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "cash" }),
    })
    const body = await res.json().catch(() => ({}))
    setBuyingId(null)
    if (res.ok && body.orderId) { window.location.href = `/pagar/${body.orderId}`; return }
    alert(body.error ?? "Erro ao iniciar pagamento.")
  }

  function openBuyModal(contract: ApiContract) {
    setBuyModal({ contract, step: "choose" })
    fetch("/api/profile/points").then(r => r.json()).then(d => setUserPoints(d.points ?? null)).catch(() => {})
  }

  async function buyVaultPack() {
    setBuyingVault(true); setVaultMsg("")
    const res = await fetch("/api/store/expedition-vault", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: vaultQty, mode: vaultMode }),
    })
    const d = await res.json().catch(() => ({}))
    setBuyingVault(false)
    if (res.ok) {
      if (vaultMode === "points") {
        setPoints(d.pointsLeft ?? points)
        setVaultMsg(`✅ ${vaultQty * (activeExpedition?.slots_per_pack ?? 20)} slots adicionados ao seu cofre!`)
      } else {
        setVaultMsg("⏳ PIX gerado! Acesse o pedido para pagar.")
      }
    } else {
      setVaultMsg(`❌ ${d.error ?? "Erro ao comprar."}`)
    }
  }

  const expeditionAsCatalogItem = useMemo(() => activeExpedition ? {
    id: activeExpedition.id,
    name: activeExpedition.item_name ?? "Pacote de Cofre de Expedição",
    description: `Adiciona ${activeExpedition.slots_per_pack} slots ao cofre da expedição por compra. Acumula com múltiplos pacotes. Os slots expiram ao fim da expedição.`,
    type: "expedition_vault_pack",
    rarity: "Epic",
    value: activeExpedition.price_cash ?? 0,
    pricePoints: activeExpedition.price_points ?? undefined,
    priceCash: activeExpedition.price_cash ?? undefined,
    quantity: 999,
    image: activeExpedition.item_image_url ?? undefined,
  } : null, [activeExpedition])

  const highlightItems = useMemo(() => {
    const featured = catalogItems.filter(i => i.featured)
    const rest = catalogItems.filter(i => !i.featured).sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    return [...featured, ...rest].slice(0, 5)
  }, [catalogItems])

  useEffect(() => {
    const nearest = weeklyItems
      .map(i => i.expires_at ? new Date(i.expires_at).getTime() : null)
      .filter(Boolean)
      .sort()[0]

    if (!nearest) { setTimer(""); return }

    function tick() {
      const diff = nearest! - Date.now()
      if (diff <= 0) { setTimer("Expirado"); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setTimer(`${d}d ${h}h ${m}m`)
    }
    tick()
    const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, [weeklyItems])

  const vaultSectionRef = useRef<HTMLElement>(null)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 })

  useLayoutEffect(() => {
    function updateIndicator() {
      const el = tabRefs.current[activeTab]
      if (el) setTabIndicator({ left: el.offsetLeft, width: el.offsetWidth })
    }
    updateIndicator()
    window.addEventListener("resize", updateIndicator)
    return () => window.removeEventListener("resize", updateIndicator)
  }, [activeTab])

  return (
    <div className={`store-page${panelOpen ? "" : " store-page--panel-closed"}`}>
      <div className={`store-layout${panelOpen ? "" : " store-layout--no-panel"}`}>
        <div className="store-main">
          <div className="store-topbar">
            <h1 className="page-title">Loja do Sucatão</h1>
            <div className="store-balance">
              <Coins size={16} />
              {formatNumber(points)} Pontos
              <button type="button" className="store-balance-add" aria-label="Adicionar pontos">
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="store-tabs">
            {tabs.map(tab => tab.href ? (
              <Link key={tab.key} href={tab.href} className="store-tab">{tab.label}</Link>
            ) : (
              <button
                key={tab.key}
                type="button"
                ref={el => { tabRefs.current[tab.key] = el }}
                className={`store-tab${activeTab === tab.key ? " active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
            <span className="store-tab-indicator" style={{ left: tabIndicator.left, width: tabIndicator.width }} />
          </div>

          {/* ── Aba: Destaques ── */}
          {activeTab === "destaques" ? (
            <>
              <section aria-label="Pacote em destaque">
                <div className="hero-banner" style={{ backgroundImage: "url(/assets/bots/arc_the_queen.png)" }}>
                  <div className="hero-banner-content">
                    <span className="hero-banner-tag">
                      <Sparkles size={12} />
                      Pacote exclusivo
                    </span>
                    <h2>Pacote Mercador do Sucatão</h2>
                    <p>Um lote selecionado de itens raros e materiais de alto valor, direto do estoque do Sucatão. Disponível por tempo limitado.</p>
                    <Link href="/loja" className="hero-banner-cta">
                      Ver pacote
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                  <div className="hero-banner-dots">
                    <span className="active" />
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </section>

              <section aria-label="Itens em destaque">
                <div className="store-section-head">
                  <h2>
                    Itens em destaque
                    <span className="store-update-timer">
                      <Clock size={12} />
                      Atualiza em breve
                    </span>
                  </h2>
                  <Link href="/loja" className="store-see-all" onClick={() => setActiveTab("itens")}>
                    Ver todos os itens
                    <ArrowRight size={14} />
                  </Link>
                </div>
                <div className="store-highlight-grid">
                  {!loadingHighlights && activeExpedition?.featured && expeditionAsCatalogItem && (
                    <article
                      key="expedition-vault"
                      className="store-highlight-card"
                      style={{ "--rarity-color": "#f59e0b" } as React.CSSProperties}
                      tabIndex={0}
                      role="button"
                      aria-label={`Ver detalhes de ${activeExpedition.item_name ?? "Pacote de Cofre de Expedição"}`}
                      onClick={() => catalog.setSelectedItem(expeditionAsCatalogItem)}
                      onKeyDown={e => { if (e.key === "Enter") catalog.setSelectedItem(expeditionAsCatalogItem) }}
                    >
                      <div className="store-highlight-media">
                        {activeExpedition.item_image_url
                          ? <img src={activeExpedition.item_image_url} alt={activeExpedition.item_name ?? ""} loading="lazy" />
                          : <div className="placeholder"><Package size={28} /></div>}
                        <span className="store-highlight-badge">Expedição</span>
                      </div>
                      <div className="store-highlight-body">
                        <p className="store-highlight-type">Cofre de Expedição</p>
                        <h3>{activeExpedition.item_name ?? "Pacote de Cofre de Expedição"}</h3>
                        <div className="store-highlight-footer">
                          <span className="store-highlight-price">
                            {activeExpedition.price_points != null && (
                              <span className="store-highlight-price-points">
                                <Coins size={14} />
                                {formatNumber(activeExpedition.price_points)}
                              </span>
                            )}
                            {activeExpedition.price_cash != null && (
                              <span className="store-highlight-price-cash">
                                <Banknote size={14} />
                                R$ {activeExpedition.price_cash.toFixed(2).replace(".", ",")}
                              </span>
                            )}
                          </span>
                          <button type="button" className="store-highlight-cart" tabIndex={-1} aria-hidden>
                            <ShoppingCart size={14} />
                          </button>
                        </div>
                      </div>
                    </article>
                  )}

                  {loadingHighlights ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <article key={i} className="store-highlight-card skeleton">
                        <div className="store-highlight-media skeleton-block" />
                        <div className="store-highlight-body">
                          <div className="skeleton-line skeleton-line-sm" />
                          <div className="skeleton-line skeleton-line-lg" />
                          <div className="store-highlight-footer">
                            <div className="skeleton-line skeleton-line-md" />
                          </div>
                        </div>
                      </article>
                    ))
                  ) : highlightItems.map(item => {
                    const r = getRarity(item)
                    return (
                      <article
                        key={item.id}
                        className="store-highlight-card"
                        style={{ "--rarity-color": rarityColors[r] } as React.CSSProperties}
                        tabIndex={0}
                        role="button"
                        aria-label={`Abrir detalhe de ${item.name}`}
                        onClick={() => catalog.setSelectedItem(item)}
                        onKeyDown={e => { if (e.key === "Enter") catalog.setSelectedItem(item) }}
                      >
                        <div className="store-highlight-media">
                          {item.image
                            ? <img src={resolveImage(item.image)} alt={item.name} loading="lazy" />
                            : <div className="placeholder">{item.name[0]?.toUpperCase()}</div>}
                          <span className="store-highlight-badge">{rarityMetaLabels[r]}</span>
                        </div>
                        <div className="store-highlight-body">
                          <p className="store-highlight-type">{getItemTypeLabel(getType(item))}</p>
                          <h3>{item.name}</h3>
                          <div className="store-highlight-footer">
                            <span className="store-highlight-price">
                              <span className="store-highlight-price-cash">
                                <Banknote size={14} />
                                R$ {formatNumber(item.priceCash ?? item.value)}
                              </span>
                              <span className="store-highlight-price-points">
                                <Coins size={14} />
                                {formatNumber(item.pricePoints ?? Math.round((item.value ?? 0) * 24))}
                              </span>
                            </span>
                            <button
                              type="button"
                              className="store-highlight-cart"
                              disabled={item.quantity === 0}
                              tabIndex={-1}
                              aria-hidden
                            >
                              <ShoppingCart size={14} />
                            </button>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>

              <section aria-label="Categorias da loja">
                <div className="store-section-head">
                  <h2>Categorias</h2>
                </div>
                <div className="store-category-row">
                  {categories.map(cat => cat.href ? (
                    <Link key={cat.key} href={cat.href} className="category-card">
                      <div className="category-card-bg" style={{ backgroundImage: `url(${cat.image})` }} />
                      <span className={`category-card-tag tone-${cat.tone}`}>{cat.tag}</span>
                      <strong>{cat.title}</strong>
                      <span>{cat.text}</span>
                    </Link>
                  ) : (
                    <button
                      key={cat.key}
                      type="button"
                      className="category-card category-card-button"
                      onClick={() => setActiveTab(cat.key)}
                    >
                      <div className="category-card-bg" style={{ backgroundImage: `url(${cat.image})` }} />
                      <span className={`category-card-tag tone-${cat.tone}`}>{cat.tag}</span>
                      <strong>{cat.title}</strong>
                      <span>{cat.text}</span>
                    </button>
                  ))}
                </div>
              </section>
            </>

          ) : activeTab === "itens" ? (
            <>
              <section aria-label="Sobre o catálogo de itens">
                <div className="hero-banner hero-banner-compact" style={{ backgroundImage: "url(/assets/bots/arc_sentinel.png)" }}>
                  <div className="hero-banner-content">
                    <span className="hero-banner-tag">
                      <Package size={12} />
                      Catálogo completo
                    </span>
                    <h2>Todos os itens do jogo em um só lugar</h2>
                    <p>Pesquise pelo nome, filtre por raridade ou tipo e veja os detalhes de cada item. Resgate com pontos do site ou compre direto com saldo real.</p>
                  </div>
                </div>
              </section>

              {activeExpedition && (
                <section ref={vaultSectionRef} aria-label="Cofre de Expedição" style={{ marginBottom: 8 }}>
                  <div
                    role={expeditionAsCatalogItem ? "button" : undefined}
                    tabIndex={expeditionAsCatalogItem ? 0 : undefined}
                    aria-label={expeditionAsCatalogItem ? `Ver detalhes de ${activeExpedition.item_name ?? "Pacote de Cofre de Expedição"}` : undefined}
                    onClick={() => expeditionAsCatalogItem && catalog.setSelectedItem(expeditionAsCatalogItem)}
                    onKeyDown={e => { if (e.key === "Enter" && expeditionAsCatalogItem) catalog.setSelectedItem(expeditionAsCatalogItem) }}
                    style={{
                    background: "linear-gradient(135deg, rgba(245,158,11,0.10) 0%, rgba(245,158,11,0.04) 55%, rgba(14,21,32,0.0) 100%)",
                    border: "1px solid rgba(245,158,11,0.30)",
                    borderRadius: 12,
                    padding: "18px 20px",
                    display: "flex",
                    gap: 18,
                    alignItems: "flex-start",
                    boxShadow: "0 0 40px rgba(245,158,11,0.10), 0 0 80px rgba(245,158,11,0.05), inset 0 1px 0 rgba(245,158,11,0.12)",
                    cursor: expeditionAsCatalogItem ? "pointer" : "default",
                  }}>
                    <div style={{ width: 80, height: 80, borderRadius: 10, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.20)", flexShrink: 0, overflow: "hidden", display: "grid", placeItems: "center" }}>
                      {activeExpedition.item_image_url
                        ? <img src={activeExpedition.item_image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <Package size={28} style={{ color: "#f59e0b" }} />
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#f59e0b" }}>Expedição Ativa</span>
                        <span style={{ fontSize: 10, color: "var(--gray-500)" }}>— {activeExpedition.name}</span>
                      </div>
                      <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 900, color: "var(--paper)" }}>
                        {activeExpedition.item_name ?? "Pacote de Cofre de Expedição"}
                      </h3>
                      <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--gray-400)", lineHeight: 1.4 }}>
                        Adiciona <strong style={{ color: "var(--paper)" }}>{activeExpedition.slots_per_pack} slots</strong> ao cofre da expedição por compra. Acumula com múltiplos pacotes. Os slots expiram ao fim da expedição.
                      </p>
                      <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: 10, flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(255,255,255,0.10)" }}>
                          {activeExpedition.price_points != null && (
                            <button type="button" onClick={() => setVaultMode("points")} style={{ padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", border: "none", background: vaultMode === "points" ? "#f59e0b" : "rgba(255,255,255,0.05)", color: vaultMode === "points" ? "#000" : "var(--gray-400)" }}>
                              <Coins size={11} style={{ verticalAlign: "middle", marginRight: 3 }} />
                              {(activeExpedition.price_points * vaultQty).toLocaleString("pt-BR")} pts
                            </button>
                          )}
                          {activeExpedition.price_cash != null && (
                            <button type="button" onClick={() => setVaultMode("cash")} style={{ padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", border: "none", background: vaultMode === "cash" ? "#22c55e" : "rgba(255,255,255,0.05)", color: vaultMode === "cash" ? "#000" : "var(--gray-400)" }}>
                              <Banknote size={11} style={{ verticalAlign: "middle", marginRight: 3 }} />
                              R$ {(activeExpedition.price_cash * vaultQty).toFixed(2).replace(".", ",")}
                            </button>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <button type="button" onClick={() => setVaultQty(q => Math.max(1, q - 1))} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)", color: "var(--paper)", cursor: "pointer", fontSize: 14, display: "grid", placeItems: "center" }}>−</button>
                          <span style={{ width: 24, textAlign: "center", fontSize: 13, fontWeight: 700, color: "var(--paper)" }}>{vaultQty}</span>
                          <button type="button" onClick={() => setVaultQty(q => q + 1)} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)", color: "var(--paper)", cursor: "pointer", fontSize: 14, display: "grid", placeItems: "center" }}>+</button>
                        </div>
                        <button type="button" onClick={() => expeditionAsCatalogItem && catalog.setSelectedItem(expeditionAsCatalogItem)} style={{ padding: "7px 16px", borderRadius: 6, border: "none", background: "#f59e0b", color: "#000", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                          Comprar
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              <section aria-label="Itens do catálogo">
                <div className="store-section-head">
                  <h2>Itens</h2>
                  <span>Exibindo {catalog.filteredItems.length} de {catalog.catalogItems.length}</span>
                </div>
                <CatalogFilters catalog={catalog} />
                <CatalogGrid catalog={catalog} className="store-items-grid" />
              </section>
            </>

          ) : activeTab === "passes" ? (
            <>
              <div className="contratos-hero-row">
                <div className="hero-banner" style={{ backgroundImage: "url(/assets/bots/arc_rocketeer.png)" }}>
                  <div className="hero-banner-content">
                    <span className="hero-banner-tag"><ScrollText size={12} />Contratos ARC</span>
                    <h2>Sua Missão. Sua Recompensa.</h2>
                    <p>Aceite contratos de Raiders, facções e do próprio Sucatão. Complete objetivos e receba recompensas em Sucatas, Reputação e itens.</p>
                  </div>
                </div>
                <div className="contratos-summary">
                  <h2>Resumo Geral</h2>
                  <div className="contratos-summary-grid">
                    <div className="contratos-summary-stat"><span>Contratos Ativos</span><strong>{activeContracts.length}</strong></div>
                    <div className="contratos-summary-stat"><span>Concluídos</span><strong>{contractStats?.completed ?? "—"}</strong></div>
                    <div className="contratos-summary-stat"><span>Taxa de Sucesso</span><strong>{contractStats ? `${contractStats.success_rate}%` : "—"}</strong></div>
                    <div className="contratos-summary-stat"><span>Sucatas</span><strong>{points.toLocaleString("pt-BR")}</strong></div>
                  </div>
                </div>
              </div>

              {loadingContracts ? (
                <p style={{ color: "var(--gray-500)", fontSize: 13, padding: 24 }}>Carregando contratos...</p>
              ) : saleContracts.length === 0 ? (
                <div className="contratos-placeholder"><h2>Nenhum contrato disponível</h2><p>Novos contratos serão lançados em breve.</p></div>
              ) : (
                <div className="cv-cards-scroll" style={{ paddingBottom: 8 }}>
                  {saleContracts.map(raw => {
                    const mColor  = MISSION_COLORS[raw.mission_type] ?? "#5fa8ff"
                    const mLabel  = MISSION_LABELS[raw.mission_type] ?? raw.mission_type
                    const tierCol = TIER_COLORS[raw.tier] ?? "var(--gray-500)"
                    const pct     = raw.total > 0 ? Math.round(((raw.user_progress ?? 0) / raw.total) * 100) : 0
                    const isFree  = !raw.price_points && !raw.price_real
                    const isPending = raw.user_status === null

                    return (
                      <div key={raw.id} className={`cv-card${raw.variant ? ` cv-card--${raw.variant}` : ""}`}>
                        {raw.variant && <div className="cv-card-frame" />}
                        <div className="cv-card-bg">
                          <div className="cv-card-bg-img" style={{ backgroundImage: `url(${raw.image_url ?? "/assets/bots/arc_sentinel.png"})` }} />
                        </div>
                        <div className="cv-card-badges">
                          <span className="cv-card-type" style={{ color: mColor }}>{mLabel}</span>
                          <span className="cv-card-tier" style={{ color: tierCol, borderColor: `color-mix(in srgb, ${tierCol} 40%, transparent)` }}>{raw.tier}</span>
                          {raw.contract_type === "faccao" && (
                            <span style={{ fontSize: 9, fontWeight: 950, color: "#b477ff", textTransform: "uppercase" }}>Facção</span>
                          )}
                        </div>
                        <div className="cv-card-body">
                          <strong className="cv-card-name">{raw.title}</strong>
                          <p className="cv-card-desc">{raw.description}</p>
                          <div className="cv-card-section-label">Objetivo</div>
                          <div className="cv-card-objective"><Target size={11} />{raw.objective}</div>
                          <div className="cv-card-section-label">Recompensas</div>
                          <RewardBadge sucatas={raw.sucatas} xp={raw.xp} rep={raw.rep} />
                          <div className="cv-card-section-label">Progresso</div>
                          <div className="ca-progress-wrap">
                            <div className="ca-progress-bar"><span style={{ width: `${pct}%` }} /></div>
                            <span className="ca-progress-label">{raw.user_progress ?? 0}/{raw.total}</span>
                          </div>
                          <div className="cv-card-footer-meta">
                            <span className="cv-card-players"><Clock size={11} />{expiresInStr(raw.expires_at)}</span>
                            {!isFree && (
                              <span style={{ fontSize: 10, color: "#ffd400" }}>
                                {raw.price_points > 0 ? `${raw.price_points.toLocaleString("pt-BR")} pts` : `R$ ${Number(raw.price_real).toFixed(2).replace(".", ",")}`}
                              </span>
                            )}
                          </div>
                          <div className="cv-card-actions">
                            {raw.user_status === "completed" ? (
                              <span style={{ fontSize: 10, fontWeight: 950, color: "var(--green)", textTransform: "uppercase" }}>Concluído</span>
                            ) : isPending ? (
                              isFree ? (
                                <button type="button" className="btn-aceitar" disabled={acceptingId === raw.id} onClick={() => handleAcceptFree(raw.id)}>
                                  <Zap size={14} fill="currentColor" />
                                  {acceptingId === raw.id ? "Aceitando..." : "Aceitar"}
                                </button>
                              ) : (
                                <button type="button" className="btn-aceitar" onClick={() => openBuyModal(raw)}>
                                  <Zap size={14} fill="currentColor" />
                                  {raw.price_points > 0 ? `${raw.price_points.toLocaleString("pt-BR")} pts` : `R$ ${Number(raw.price_real).toFixed(2).replace(".", ",")}`}
                                </button>
                              )
                            ) : (
                              <span style={{ fontSize: 10, fontWeight: 950, color: "var(--yellow)", textTransform: "uppercase" }}>Em progresso</span>
                            )}
                          </div>
                        </div>
                        {raw.variant && (
                          <div className="cv-card-variant-footer">
                            ‹ {raw.variant === "dourada" ? "Versão Dourada" : raw.variant === "holografica" ? "Versão Holográfica" : "Versão Corrompida"} ›
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>

          ) : activeTab === "sorteios" ? (
            <SorteiosTab />

          ) : activeTab === "servicos" ? (
            <>
              <section aria-label="Leilões">
                <div className="hero-banner hero-banner-compact" style={{ backgroundImage: "url(/assets/maps/stella_montis_upper.png)" }}>
                  <div className="hero-banner-content">
                    <span className="hero-banner-tag">
                      <Gavel size={12} />
                      Leilões
                    </span>
                    <h2>Dispute itens raros com outros Raiders</h2>
                    <p>Faça seus lances antes do tempo acabar. Cada leilão é único — itens raros, lendários e exclusivos disponíveis por tempo limitado.</p>
                  </div>
                </div>
              </section>

              <section aria-label="Itens em leilão">
                <div className="store-section-head">
                  <h2>Leilões Ativos</h2>
                  <span>{auctionItems.length} itens</span>
                </div>
                <div className="store-auction-grid">
                  {auctionItems.map(item => {
                    const rar = auctionRarityColors[item.rarity] ?? auctionRarityColors["Raro"]
                    const isEnding = item.endsAt.startsWith("0h")
                    return (
                      <div key={item.id} className="store-auction-card">
                        <div className="store-auction-banner" style={{ backgroundImage: item.image ? `url(${item.image})` : undefined }}>
                          <span className="store-auction-rarity" style={{ background: rar.bg, color: rar.color, borderColor: rar.border }}>
                            {item.rarity}
                          </span>
                          <span className={`store-auction-timer${isEnding ? " store-auction-timer--ending" : ""}`}>
                            <Clock size={11} />
                            {item.endsAt}
                          </span>
                        </div>
                        <div className="store-auction-body">
                          <strong className="store-auction-name">{item.name}</strong>
                          <p className="store-auction-desc">{item.description}</p>
                          <div className="store-auction-bid-row">
                            <div>
                              <span className="store-auction-bid-label">Lance atual</span>
                              <span className="store-auction-bid-value">
                                <Coins size={13} />
                                {item.currentBid.toLocaleString("pt-BR")}
                              </span>
                            </div>
                            <span className="store-auction-bids-count">{item.bids} lances</span>
                          </div>
                          <div className="store-auction-increment">
                            Incremento mínimo: <strong>{item.minIncrement.toLocaleString("pt-BR")} Sucatas</strong>
                          </div>
                          <button type="button" className="store-auction-bid-btn">
                            <Gavel size={13} />
                            Fazer Lance
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            </>

          ) : (
            <div className="store-placeholder">
              <h2>Em breve</h2>
              <p>Esta seção está sendo preparada pelo Sucatão. Volte em breve para conferir as novidades.</p>
            </div>
          )}
        </div>

        <aside className={`store-side-panel${panelOpen ? "" : " store-side-panel--hidden"}`} aria-label="Painel do jogador">
          <SidePanelUserHeader onClose={() => setPanel(false)} />

          {activeTab === "itens" ? (
            <ArcIntelPanel catalog={catalog} />
          ) : (
            <div className="store-side-card">
              <div className="store-side-head">
                <h2>Destaques da semana</h2>
                {timer && (
                  <span className="store-side-timer">
                    <Clock size={11} />
                    {timer}
                  </span>
                )}
              </div>
              <div className="store-side-list">
                {weeklyItems.length === 0 ? (
                  <p style={{ margin: "8px 0", color: "var(--gray-500)", fontSize: 12 }}>
                    Nenhum destaque no momento.
                  </p>
                ) : weeklyItems.map(item => (
                  <div key={item.id} className="store-side-item">
                    <div className="store-side-thumb">
                      {item.image_url
                        ? <img src={item.image_url} alt={item.name} loading="lazy" />
                        : <span style={{ fontSize: 16 }}>🎁</span>}
                    </div>
                    <div className="store-side-info">
                      <strong>{item.name}</strong>
                      <span>Estoque: {item.stock}</span>
                    </div>
                    <div className="store-side-price">
                      <span>
                        <CircleDollarSign size={14} />
                        {formatNumber(item.price)}
                      </span>
                      <button type="button" className="store-side-cart" disabled aria-label="Em breve">
                        <ShoppingCart size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/loja" className="trades-footer-btn">
                Ver todos os itens
                <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </aside>
      </div>

      <CatalogItemModal catalog={catalog} />

      <button
        type="button"
        className="store-panel-reopen"
        onClick={() => setPanel(true)}
        aria-label="Abrir painel"
      >
        <ChevronLeft size={16} />
        <span>Painel</span>
      </button>

      {/* Modal de compra de contrato */}
      {buyModal && (
        <div className="cdm-overlay" onClick={() => setBuyModal(null)}>
          <div className="cdm-modal" style={{ maxWidth: 440, gridTemplateColumns: "1fr" }} onClick={e => e.stopPropagation()}>
            <button className="cdm-close" type="button" onClick={() => setBuyModal(null)}>✕</button>
            <div className="cdm-left" style={{ padding: 24 }}>
              {buyModal.contract.image_url && (
                <div className="cdm-hero" style={{ backgroundImage: `url(${buyModal.contract.image_url})`, borderRadius: 8, marginBottom: 16 }}>
                  <div className="cdm-hero-overlay" />
                  <div className="cdm-hero-content">
                    <span className="cdm-op-badge">{MISSION_LABELS[buyModal.contract.mission_type]}</span>
                    <h2 className="cdm-title">{buyModal.contract.title}</h2>
                  </div>
                </div>
              )}
              {!buyModal.contract.image_url && <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 950 }}>{buyModal.contract.title}</h2>}

              {buyModal.step === "choose" && (
                <div style={{ display: "grid", gap: 10 }}>
                  <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Como deseja pagar?</p>
                  {buyModal.contract.price_points > 0 && (
                    <button type="button" onClick={() => setBuyModal(m => m ? { ...m, step: "points" } : null)}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(255,212,0,0.35)", background: "rgba(255,212,0,0.07)", color: "var(--paper)", padding: "14px 16px", fontSize: 13, fontWeight: 950, cursor: "pointer", borderRadius: 8, font: "inherit" }}>
                      <span>🪙 Comprar com Sucatas</span>
                      <span style={{ color: "#ffd400" }}>{buyModal.contract.price_points.toLocaleString("pt-BR")} pts</span>
                    </button>
                  )}
                  {buyModal.contract.price_real > 0 && (
                    <button type="button" onClick={() => setBuyModal(m => m ? { ...m, step: "cash" } : null)}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(61,242,139,0.35)", background: "rgba(61,242,139,0.07)", color: "var(--paper)", padding: "14px 16px", fontSize: 13, fontWeight: 950, cursor: "pointer", borderRadius: 8, font: "inherit" }}>
                      <span>🏦 Pagar com PIX</span>
                      <span style={{ color: "#3df28b" }}>R$ {Number(buyModal.contract.price_real).toFixed(2).replace(".", ",")}</span>
                    </button>
                  )}
                </div>
              )}

              {buyModal.step === "points" && (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 16 }}>
                    <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Resumo</p>
                    <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--paper-dim)" }}>Contrato</span><strong>{buyModal.contract.title}</strong></div>
                      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                        <span style={{ color: "var(--paper-dim)" }}>Valor</span>
                        <strong style={{ color: "#ffd400" }}>{buyModal.contract.price_points.toLocaleString("pt-BR")} pts</strong>
                      </div>
                      {userPoints !== null && (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                            <span style={{ color: "var(--gray-500)" }}>Saldo atual</span>
                            <span style={{ color: userPoints >= buyModal.contract.price_points ? "var(--paper)" : "var(--red)", fontWeight: 800 }}>{userPoints.toLocaleString("pt-BR")} pts</span>
                          </div>
                          {userPoints < buyModal.contract.price_points && (
                            <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--red)", fontWeight: 800 }}>⚠ Pontos insuficientes</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <button type="button" className="btn-aceitar"
                    disabled={buyingId === buyModal.contract.id || (userPoints !== null && userPoints < buyModal.contract.price_points)}
                    onClick={() => handleBuyPoints(buyModal.contract)}>
                    <Zap size={14} fill="currentColor" />
                    {buyingId === buyModal.contract.id ? "Confirmando..." : `Confirmar — ${buyModal.contract.price_points.toLocaleString("pt-BR")} pts`}
                  </button>
                  <button type="button" onClick={() => setBuyModal(m => m ? { ...m, step: "choose" } : null)}
                    style={{ border: "1px solid var(--stroke)", background: "rgba(255,255,255,0.03)", color: "var(--paper-dim)", padding: "10px 0", fontSize: 11, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 8, font: "inherit" }}>
                    ← Voltar
                  </button>
                </div>
              )}

              {buyModal.step === "cash" && (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 16 }}>
                    <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Resumo</p>
                    <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--paper-dim)" }}>Contrato</span><strong>{buyModal.contract.title}</strong></div>
                      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                        <span style={{ color: "var(--paper-dim)" }}>Valor</span>
                        <strong style={{ color: "#3df28b" }}>R$ {Number(buyModal.contract.price_real).toFixed(2).replace(".", ",")}</strong>
                      </div>
                    </div>
                  </div>
                  <button type="button" className="btn-aceitar" disabled={buyingId === buyModal.contract.id} onClick={() => handleBuyCash(buyModal.contract)}>
                    <Zap size={14} fill="currentColor" />
                    {buyingId === buyModal.contract.id ? "Gerando PIX..." : `Pagar R$ ${Number(buyModal.contract.price_real).toFixed(2).replace(".", ",")}`}
                  </button>
                  <button type="button" onClick={() => setBuyModal(m => m ? { ...m, step: "choose" } : null)}
                    style={{ border: "1px solid var(--stroke)", background: "rgba(255,255,255,0.03)", color: "var(--paper-dim)", padding: "10px 0", fontSize: 11, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 8, font: "inherit" }}>
                    ← Voltar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

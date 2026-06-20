"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, Banknote, ChevronLeft, ChevronRight, CircleDollarSign, Clock, Coins, Gavel, Package, Plus, ScrollText, Shirt, ShoppingCart, Sparkles, Star, Target, Zap } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getItemTypeLabel, type CatalogItem } from "@/lib/catalog"
import { ArcIntelPanel } from "@/components/arc-intel-panel"
import { CatalogFilters } from "@/components/catalog-filters"
import { CatalogGrid } from "@/components/catalog-grid"
import { CatalogItemModal } from "@/components/catalog-item-modal"
import { useItemsCatalog } from "@/lib/use-items-catalog"
import SidePanelUserHeader from "@/components/side-panel-user-header"
import "../../../styles/loja.css"

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

const tabs: { key: string; label: string; href?: string }[] = [
  { key: "destaques", label: "Destaques" },
  { key: "itens", label: "Itens" },
  { key: "passes", label: "Contratos à Venda" },
  { key: "sorteios", label: "Sorteios" },
  { key: "servicos", label: "Leilões" },
  { key: "giftcards", label: "Gift Cards" },
]

const weeklyHighlights: { id: string; name: string; stock: number; price: number; image?: string; icon?: LucideIcon; bg?: string; fg?: string }[] = [
  { id: "gc-steam", name: "Gift Card Steam R$50", stock: 3, price: 5000, image: "/assets/brand/gift-card-steam.jpg" },
  { id: "gc-xbox", name: "Gift Card Xbox R$50", stock: 2, price: 5000, image: "/assets/brand/gift-card-xbox.jpg" },
  { id: "gc-psn", name: "Gift Card PlayStation R$50", stock: 2, price: 5000, image: "/assets/brand/gift-card-playstation.jpg" },
  { id: "sorteio-headset", name: "Sorteio - Headset Gamer", stock: 10, price: 2000, image: "/assets/brand/headset-gamer.jpg" },
  { id: "camiseta-arc", name: "Camiseta ARC Raiders", stock: 5, price: 3000, icon: Shirt, bg: "#20262e", fg: "#f3f5f8" },
]

const categories: { key: string; tag: string; tone: string; image: string; title: string; text: string; href?: string }[] = [
  { key: "itens", tag: "CATÁLOGO", tone: "yellow", image: "/assets/bots/arc_leaper.png", title: "Itens", text: "Catálogo completo para resgatar ou comprar com pontos.", href: "/itens" },
  { key: "passes", tag: "CONTRATOS", tone: "cyan", image: "/assets/maps/the_spaceport.png", title: "Contratos à Venda", text: "Compre contratos exclusivos e ganhe recompensas especiais." },
  { key: "sorteios", tag: "SORTEIOS", tone: "red", image: "/assets/bots/arc_pop.png", title: "Sorteios", text: "Participe de sorteios e concorra a itens raros." },
  { key: "servicos", tag: "LEILÕES", tone: "green", image: "/assets/maps/stella_montis_upper.png", title: "Leilões", text: "Dispute itens raros em leilões com tempo limitado." },
  { key: "giftcards", tag: "GIFT CARDS", tone: "yellow", image: "/assets/bots/arc_snitch.png", title: "Gift Cards", text: "Cartões de presente para usar dentro da loja." },
]

type ContractTier = "Básico" | "Avançado" | "Épico"
type ContractSaleType = "Diário" | "Semanal"

const contractsForSale: {
  id: string
  name: string
  description: string
  type: ContractSaleType
  tier: ContractTier
  price: number
  objective: string
  rewards: { icon: typeof Coins; label: string; color: string }[]
  image: string
}[] = [
  {
    id: "c1",
    name: "Coleta Rápida",
    description: "Colete recursos espalhados pelo mapa antes que outros Raiders cheguem.",
    type: "Diário",
    tier: "Básico",
    price: 500,
    objective: "Colete 10 recursos",
    rewards: [
      { icon: Coins, label: "+300 Sucatas", color: "#ffd400" },
      { icon: Zap, label: "+150 XP", color: "#5fa8ff" },
    ],
    image: "/assets/bots/arc_leaper.png",
  },
  {
    id: "c2",
    name: "Caçada Noturna",
    description: "Elimine unidades ARC patrulhando a zona de exclusão.",
    type: "Diário",
    tier: "Avançado",
    price: 900,
    objective: "Elimine 8 ARC",
    rewards: [
      { icon: Coins, label: "+600 Sucatas", color: "#ffd400" },
      { icon: Zap, label: "+300 XP", color: "#5fa8ff" },
    ],
    image: "/assets/bots/arc_shredder.png",
  },
  {
    id: "c3",
    name: "Operação Resgate",
    description: "Recupere equipamentos perdidos em zonas de alta periculosidade.",
    type: "Semanal",
    tier: "Avançado",
    price: 2000,
    objective: "Recupere 5 equipamentos",
    rewards: [
      { icon: Coins, label: "+2.000 Sucatas", color: "#ffd400" },
      { icon: Zap, label: "+800 XP", color: "#5fa8ff" },
      { icon: Star, label: "+50 REP", color: "#b477ff" },
    ],
    image: "/assets/bots/arc_spotter.png",
  },
  {
    id: "c4",
    name: "Titan Caído",
    description: "Confronte e elimine um ARC Titan nas ruínas da Cidade Alta.",
    type: "Semanal",
    tier: "Épico",
    price: 5000,
    objective: "Elimine 1 ARC Titan",
    rewards: [
      { icon: Coins, label: "+5.000 Sucatas", color: "#ffd400" },
      { icon: Zap, label: "+2.500 XP", color: "#5fa8ff" },
      { icon: Star, label: "+200 REP", color: "#b477ff" },
    ],
    image: "/assets/bots/arc_the_queen.png",
  },
  {
    id: "c5",
    name: "Entrega Expressa",
    description: "Transporte suprimentos críticos para os postos aliados sem ser detectado.",
    type: "Diário",
    tier: "Básico",
    price: 400,
    objective: "Entregue 3 suprimentos",
    rewards: [
      { icon: Coins, label: "+250 Sucatas", color: "#ffd400" },
      { icon: Zap, label: "+100 XP", color: "#5fa8ff" },
    ],
    image: "/assets/bots/arc_snitch.png",
  },
  {
    id: "c6",
    name: "Domínio Total",
    description: "Controle todos os pontos estratégicos do mapa durante uma sessão completa.",
    type: "Semanal",
    tier: "Épico",
    price: 4500,
    objective: "Domine 5 pontos",
    rewards: [
      { icon: Coins, label: "+4.000 Sucatas", color: "#ffd400" },
      { icon: Zap, label: "+2.000 XP", color: "#5fa8ff" },
      { icon: Star, label: "+150 REP", color: "#b477ff" },
    ],
    image: "/assets/bots/arc_matriarch.png",
  },
]

const tierColors: Record<ContractTier, { bg: string; color: string; border: string }> = {
  Básico:   { bg: "rgba(91,166,255,0.12)",  color: "#5fa8ff", border: "rgba(91,166,255,0.3)"  },
  Avançado: { bg: "rgba(255,196,0,0.12)",   color: "#ffd400", border: "rgba(255,196,0,0.3)"   },
  Épico:    { bg: "rgba(180,119,255,0.14)", color: "#b477ff", border: "rgba(180,119,255,0.32)" },
}

const typeColors: Record<ContractSaleType, { bg: string; color: string }> = {
  Diário:  { bg: "rgba(255,65,65,0.15)",  color: "#ff4141" },
  Semanal: { bg: "rgba(255,196,0,0.12)",  color: "#ffc400" },
}

const auctionItems: {
  id: string
  name: string
  description: string
  rarity: string
  currentBid: number
  minIncrement: number
  endsAt: string
  bids: number
  image?: string
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
  const [panelOpen, setPanelOpen] = useState(true)

  useEffect(() => {
    if (localStorage.getItem("store-panel-open") === "false") setPanelOpen(false)
  }, [])

  function setPanel(val: boolean) {
    setPanelOpen(val)
    localStorage.setItem("store-panel-open", String(val))
  }
  const [points, setPoints] = useState(0)
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])
  const [loadingHighlights, setLoadingHighlights] = useState(true)

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

  const highlightItems = useMemo(() => {
    const featured = catalogItems.filter(i => i.featured)
    const rest = catalogItems.filter(i => !i.featured).sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    return [...featured, ...rest].slice(0, 5)
  }, [catalogItems])

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
                    <Link href="/itens" className="hero-banner-cta">
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
                  <Link href="/itens" className="store-see-all">
                    Ver todos os itens
                    <ArrowRight size={14} />
                  </Link>
                </div>
                <div className="store-highlight-grid">
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
                                R$ {formatNumber(item.value)}
                              </span>
                              <span className="store-highlight-price-points">
                                <Coins size={14} />
                                {formatNumber(Math.round((item.value ?? 0) * 24))}
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
              <section aria-label="Contratos à Venda">
                <div className="hero-banner hero-banner-compact" style={{ backgroundImage: "url(/assets/maps/the_spaceport.png)" }}>
                  <div className="hero-banner-content">
                    <span className="hero-banner-tag">
                      <ScrollText size={12} />
                      Contratos à Venda
                    </span>
                    <h2>Compre contratos e maximize suas recompensas</h2>
                    <p>Escolha entre contratos diários e semanais de diferentes níveis de dificuldade. Cada contrato oferece recompensas exclusivas em Sucatas, XP e Reputação.</p>
                  </div>
                </div>
              </section>

              <section aria-label="Lista de contratos">
                <div className="store-section-head">
                  <h2>Contratos Disponíveis</h2>
                  <span>{contractsForSale.length} contratos</span>
                </div>
                <div className="store-contracts-grid">
                  {contractsForSale.map(contract => {
                    const tier = tierColors[contract.tier]
                    const type = typeColors[contract.type]
                    return (
                      <div key={contract.id} className="store-contract-card">
                        <div className="store-contract-banner" style={{ backgroundImage: `url(${contract.image})` }}>
                          <span className="store-contract-type-badge" style={{ background: type.bg, color: type.color }}>
                            {contract.type}
                          </span>
                          <span className="store-contract-tier-badge" style={{ background: tier.bg, color: tier.color, borderColor: tier.border }}>
                            {contract.tier}
                          </span>
                        </div>
                        <div className="store-contract-body">
                          <strong className="store-contract-name">{contract.name}</strong>
                          <p className="store-contract-desc">{contract.description}</p>
                          <div className="store-contract-objective">
                            <Target size={12} />
                            {contract.objective}
                          </div>
                          <div className="store-contract-rewards">
                            {contract.rewards.map((r, i) => {
                              const Icon = r.icon
                              return (
                                <span key={i} className="store-contract-reward" style={{ color: r.color }}>
                                  <Icon size={11} />
                                  {r.label}
                                </span>
                              )
                            })}
                          </div>
                          <div className="store-contract-footer">
                            <span className="store-contract-price">
                              <Coins size={13} />
                              {contract.price.toLocaleString("pt-BR")}
                            </span>
                            <button type="button" className="store-contract-buy">
                              <ShoppingCart size={13} />
                              Comprar
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            </>
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
                <span className="store-side-timer">
                  <Clock size={11} />
                  5d 12h 34m
                </span>
              </div>
              <div className="store-side-list">
                {weeklyHighlights.map(item => (
                  <div key={item.id} className="store-side-item">
                    <div className="store-side-thumb" style={{ background: item.bg }}>
                      {item.image
                        ? <img src={item.image} alt={item.name} loading="lazy" />
                        : item.icon && <item.icon size={18} color={item.fg} />}
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
              <Link href="/itens" className="trades-footer-btn">
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
    </div>
  )
}

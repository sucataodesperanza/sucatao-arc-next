"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, Banknote, CircleDollarSign, Clock, Coins, Medal, Package, Plus, Shirt, ShoppingCart, Sparkles } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getItemTypeLabel, type CatalogItem } from "@/lib/catalog"
import { ArcIntelPanel } from "@/components/arc-intel-panel"
import { CatalogFilters } from "@/components/catalog-filters"
import { CatalogGrid } from "@/components/catalog-grid"
import { CatalogItemModal } from "@/components/catalog-item-modal"
import { useItemsCatalog } from "@/lib/use-items-catalog"
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
  { key: "passes", label: "Passes" },
  { key: "sorteios", label: "Sorteios" },
  { key: "servicos", label: "Serviços" },
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
  { key: "passes", tag: "PASSES", tone: "cyan", image: "/assets/maps/the_spaceport.png", title: "Passes", text: "Passes de temporada com recompensas exclusivas." },
  { key: "sorteios", tag: "SORTEIOS", tone: "red", image: "/assets/bots/arc_pop.png", title: "Sorteios", text: "Participe de sorteios e concorra a itens raros." },
  { key: "servicos", tag: "SERVIÇOS", tone: "green", image: "/assets/maps/stella_montis_upper.png", title: "Serviços", text: "Serviços especiais para acelerar sua jornada." },
  { key: "giftcards", tag: "GIFT CARDS", tone: "yellow", image: "/assets/bots/arc_snitch.png", title: "Gift Cards", text: "Cartões de presente para usar dentro da loja." },
]

export default function LojaPage() {
  const catalog = useItemsCatalog()
  const [activeTab, setActiveTab] = useState("destaques")
  const [userId, setUserId] = useState<string | null>(null)
  const [points, setPoints] = useState(0)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState("Visitante")
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])
  const [loadingHighlights, setLoadingHighlights] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      setDisplayName(user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Visitante")
      supabase.from("profiles").select("points, avatar_url").eq("id", user.id).single().then(({ data }) => {
        if (data) {
          setPoints(data.points ?? 0)
          setAvatarUrl(data.avatar_url ?? null)
        }
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

  const initial = displayName[0]?.toUpperCase() ?? "S"

  return (
    <div className="store-page">
      <div className="store-layout">
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
                    <Link key={cat.key} href={cat.href} className="category-card" style={{ backgroundImage: `url(${cat.image})` }}>
                      <span className={`category-card-tag tone-${cat.tone}`}>{cat.tag}</span>
                      <strong>{cat.title}</strong>
                      <span>{cat.text}</span>
                    </Link>
                  ) : (
                    <button
                      key={cat.key}
                      type="button"
                      className="category-card category-card-button"
                      style={{ backgroundImage: `url(${cat.image})` }}
                      onClick={() => setActiveTab(cat.key)}
                    >
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
          ) : (
            <div className="store-placeholder">
              <h2>Em breve</h2>
              <p>Esta seção está sendo preparada pelo Sucatão. Volte em breve para conferir as novidades.</p>
            </div>
          )}
        </div>

        <aside className="store-side-panel" aria-label="Painel do jogador">
          <div className="store-user-card">
            <div className="store-user-avatar">
              {avatarUrl ? <img src={avatarUrl} alt={displayName} /> : initial}
              <span className="store-user-level">1</span>
            </div>
            <div className="store-user-info">
              <strong>{displayName}</strong>
              <span className="store-user-online">
                {userId && <span className="store-user-online-dot" />}
                {userId ? "Online" : "Visitante"}
              </span>
            </div>
          </div>

          <div className="store-user-stats">
            <div className="store-stats-row">
              <div className="store-reputation">
                <span>Reputação</span>
                <strong>5.250</strong>
              </div>
              <div className="store-merchant-badge">
                <span>Mercador</span>
                <Medal size={28} />
              </div>
            </div>
            <div className="store-reputation-bar">
              <span style={{ width: "90%" }} />
            </div>
          </div>

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
    </div>
  )
}

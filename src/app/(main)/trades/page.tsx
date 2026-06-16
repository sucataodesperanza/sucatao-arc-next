"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { ArrowLeftRight, ArrowRight, ChevronLeft, ChevronRight, Handshake, History, Plus, RefreshCw, Search, ShieldCheck, SlidersHorizontal, X } from "lucide-react"
import "../../../styles/trades.css"

type Rarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary"

const rarityColors: Record<Rarity, string> = {
  Common: "#8b99aa",
  Uncommon: "#3df28b",
  Rare: "#5fa8ff",
  Epic: "#b477ff",
  Legendary: "#ffd400",
}

const rarityLabels: Record<Rarity, string> = {
  Common: "Comum",
  Uncommon: "Incomum",
  Rare: "Raro",
  Epic: "Épico",
  Legendary: "Lendário",
}

type TradeItem = { name: string; rarity: Rarity; qty?: number }

type TradeOffer = {
  id: string
  offering: TradeItem[]
  seeking: TradeItem[]
}

const initialTradeOffers: TradeOffer[] = [
  {
    id: "1",
    offering: [
      { name: "Rifle Ferrox", rarity: "Epic" },
      { name: "Munição Explosiva", rarity: "Rare", qty: 120 },
    ],
    seeking: [{ name: "Núcleo ARC", rarity: "Epic", qty: 1 }],
  },
  {
    id: "2",
    offering: [
      { name: "Bateria ARC", rarity: "Rare", qty: 2 },
      { name: "Circuito Avançado", rarity: "Common", qty: 5 },
    ],
    seeking: [{ name: "Capacete Militar", rarity: "Rare", qty: 1 }],
  },
  {
    id: "3",
    offering: [{ name: "Drone ARC", rarity: "Epic" }],
    seeking: [
      { name: "Rifle Ferrox", rarity: "Epic" },
      { name: "Mira Holográfica", rarity: "Rare", qty: 1 },
    ],
  },
  {
    id: "4",
    offering: [{ name: "Capacete Avançado", rarity: "Rare", qty: 1 }],
    seeking: [
      { name: "Bateria ARC", rarity: "Rare", qty: 1 },
      { name: "Kit Médico Militar", rarity: "Rare", qty: 3 },
    ],
  },
  {
    id: "5",
    offering: [{ name: "Núcleo ARC", rarity: "Epic", qty: 1 }],
    seeking: [
      { name: "Drone ARC", rarity: "Epic", qty: 1 },
      { name: "Circuito Avançado", rarity: "Common", qty: 10 },
    ],
  },
]

type TradeActivity = {
  id: string
  user: string
  timeAgo: string
  action: "completed" | "created" | "cancelled"
  give: TradeItem
  get?: TradeItem
}

const activityLabels: Record<TradeActivity["action"], string> = {
  completed: "completou um trade",
  created: "criou um novo trade",
  cancelled: "cancelou um trade",
}

const tradeActivity: TradeActivity[] = [
  { id: "1", user: "IronWolfBR", timeAgo: "3 min atrás", action: "completed", give: { name: "Mira Holográfica", rarity: "Rare", qty: 1 }, get: { name: "Capacete Militar", rarity: "Rare", qty: 1 } },
  { id: "2", user: "Myst", timeAgo: "5 min atrás", action: "created", give: { name: "Rifle Ferrox", rarity: "Epic", qty: 1 }, get: { name: "Núcleo ARC", rarity: "Epic", qty: 2 } },
  { id: "3", user: "NightCrawler", timeAgo: "8 min atrás", action: "cancelled", give: { name: "Circuito Avançado", rarity: "Common", qty: 5 } },
  { id: "4", user: "Arthur", timeAgo: "12 min atrás", action: "completed", give: { name: "Capacete Avançado", rarity: "Rare", qty: 1 }, get: { name: "Núcleo ARC", rarity: "Epic", qty: 1 } },
  { id: "5", user: "TacticalGod", timeAgo: "15 min atrás", action: "created", give: { name: "Drone ARC", rarity: "Epic", qty: 2 }, get: { name: "Rifle Ferrox", rarity: "Epic", qty: 1 } },
]

type CompletedTrade = {
  id: string
  gave: TradeItem
  received: TradeItem
  partner: string
  completedAt: string
}

const myTrades: CompletedTrade[] = [
  { id: "1", gave: { name: "Mira Holográfica", rarity: "Rare", qty: 1 }, received: { name: "Capacete Militar", rarity: "Rare", qty: 1 }, partner: "IronWolfBR", completedAt: "15/05/2026 14:32" },
  { id: "2", gave: { name: "Circuito Avançado", rarity: "Common", qty: 10 }, received: { name: "Bateria ARC", rarity: "Rare", qty: 2 }, partner: "Myst", completedAt: "14/05/2026 09:18" },
  { id: "3", gave: { name: "Rifle Ferrox", rarity: "Epic", qty: 1 }, received: { name: "Núcleo ARC", rarity: "Epic", qty: 1 }, partner: "NightCrawler", completedAt: "13/05/2026 18:42" },
  { id: "4", gave: { name: "Kit Médico Militar", rarity: "Rare", qty: 3 }, received: { name: "Drone ARC", rarity: "Epic", qty: 1 }, partner: "Arthur", completedAt: "12/05/2026 11:05" },
  { id: "5", gave: { name: "Capacete Avançado", rarity: "Rare", qty: 1 }, received: { name: "Munição Explosiva", rarity: "Rare", qty: 80 }, partner: "TacticalGod", completedAt: "10/05/2026 16:27" },
]

const tabs = ["Todos", "Meus Trades"]

function ItemThumb({ item, className }: { item: TradeItem; className: string }) {
  return (
    <div className={className} style={{ "--rarity-color": rarityColors[item.rarity] } as React.CSSProperties}>
      {item.name[0]}
      {item.qty && item.qty > 1 && <span className={`${className}-qty`}>x{item.qty}</span>}
    </div>
  )
}

export default function TradesPage() {
  const [activeTab, setActiveTab] = useState(tabs[0])
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const [confirmOffer, setConfirmOffer] = useState<TradeOffer | null>(null)
  const [tradeOffers, setTradeOffers] = useState<TradeOffer[]>(initialTradeOffers)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [offerName, setOfferName] = useState("")
  const [offerRarity, setOfferRarity] = useState<Rarity>("Common")
  const [offerQty, setOfferQty] = useState(1)
  const [wantName, setWantName] = useState("")
  const [wantRarity, setWantRarity] = useState<Rarity>("Common")
  const [wantQty, setWantQty] = useState(1)

  function handleCreateTrade() {
    if (!offerName.trim() || !wantName.trim()) return
    const newOffer: TradeOffer = {
      id: `new-${Date.now()}`,
      offering: [{ name: offerName.trim(), rarity: offerRarity, qty: offerQty > 1 ? offerQty : undefined }],
      seeking: [{ name: wantName.trim(), rarity: wantRarity, qty: wantQty > 1 ? wantQty : undefined }],
    }
    setTradeOffers(prev => [newOffer, ...prev])
    setOfferName("")
    setOfferRarity("Common")
    setOfferQty(1)
    setWantName("")
    setWantRarity("Common")
    setWantQty(1)
    setActiveTab("Todos")
    setShowCreateModal(false)
  }

  useLayoutEffect(() => {
    function updateIndicator() {
      const el = tabRefs.current[tabs.indexOf(activeTab)]
      if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth })
    }
    updateIndicator()
    window.addEventListener("resize", updateIndicator)
    return () => window.removeEventListener("resize", updateIndicator)
  }, [activeTab])

  return (
    <div className="trades-page">
      <div className="trades-layout">
        <div className="trades-main">
          <div className="trades-topbar">
            <h1 className="page-title">Trades</h1>
            <div className="trades-topbar-actions">
              <button type="button" className="trades-btn-primary" onClick={() => setShowCreateModal(true)}>
                <Plus size={16} />
                Novo Trade
              </button>
              <button type="button" className="trades-btn-outline">
                <SlidersHorizontal size={14} />
                Filtros
              </button>
              <button type="button" className="trades-btn-icon" aria-label="Atualizar">
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          <div className="store-tabs trades-tabs">
            {tabs.map((tab, i) => (
              <button
                key={tab}
                ref={el => { tabRefs.current[i] = el }}
                type="button"
                className={`store-tab${activeTab === tab ? " active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
            <span className="store-tab-indicator" style={{ left: indicator.left, width: indicator.width }} />
          </div>

          {activeTab === "Todos" && (
          <>
          <section aria-label="Comunidade de trades">
            <div className="hero-banner" style={{ backgroundImage: "url(/assets/bots/arc_sentinel.png)" }}>
              <div className="hero-banner-content">
                <span className="hero-banner-tag hero-banner-tag-yellow">
                  <Handshake size={12} />
                  Faça Trocas Justas
                </span>
                <h2>Comunidade de Trades ARC Raiders</h2>
                <p>Troque itens com outros Raiders de forma segura e construa relacionamentos de confiança.</p>
              </div>
              <div className="hero-banner-dots">
                <span className="active" />
                <span />
                <span />
                <span />
              </div>
            </div>
          </section>

          <div className="trades-filter-bar">
            <label className="trades-search">
              <Search size={16} />
              <input type="search" placeholder="Buscar por item, jogador ou código..." autoComplete="off" />
            </label>
            <div className="trades-filter-group">
              <span>Categoria</span>
              <select defaultValue="Todas"><option>Todas</option></select>
            </div>
            <div className="trades-filter-group">
              <span>Raridade</span>
              <select defaultValue="Todas"><option>Todas</option></select>
            </div>
            <div className="trades-filter-group">
              <span>Plataforma</span>
              <select defaultValue="Todas"><option>Todas</option></select>
            </div>
            <div className="trades-filter-group">
              <span>Ordenar por</span>
              <select defaultValue="Mais recentes"><option>Mais recentes</option></select>
            </div>
            <button type="button" className="trades-filter-clear">Limpar Filtros</button>
          </div>

          <div className="trade-offer-list">
            {tradeOffers.map(offer => (
              <article key={offer.id} className="trade-offer-card">
                <div className="trade-offer-body">
                  <div className="trade-offer-side">
                    <span className="trade-offer-label">Procura</span>
                    <div className="trade-offer-items">
                      {offer.seeking.map((item, i) => (
                        <div key={i} className="trade-offer-item">
                          <ItemThumb item={item} className="trade-offer-thumb" />
                          <div className="trade-offer-item-info">
                            <strong>{item.name}</strong>
                            <span style={{ color: rarityColors[item.rarity] }}>{rarityLabels[item.rarity]}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <ArrowLeftRight size={18} className="trade-offer-swap" />
                  <div className="trade-offer-side">
                    <span className="trade-offer-label">Oferece</span>
                    <div className="trade-offer-items">
                      {offer.offering.map((item, i) => (
                        <div key={i} className="trade-offer-item">
                          <ItemThumb item={item} className="trade-offer-thumb" />
                          <div className="trade-offer-item-info">
                            <strong>{item.name}</strong>
                            <span style={{ color: rarityColors[item.rarity] }}>{rarityLabels[item.rarity]}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="trade-offer-actions">
                    <button type="button" className="trade-offer-view" onClick={() => setConfirmOffer(offer)}>Fazer Trade</button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="trades-pagination">
            <span className="trades-pagination-info">Mostrando 1-10 de 420 trades</span>
            <div className="trades-pagination-controls">
              <button type="button" className="trades-page-btn" disabled aria-label="Página anterior">
                <ChevronLeft size={14} />
              </button>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" className={`trades-page-btn${n === 1 ? " active" : ""}`}>{n}</button>
              ))}
              <span className="trades-page-ellipsis">...</span>
              <button type="button" className="trades-page-btn">42</button>
              <button type="button" className="trades-page-btn" aria-label="Próxima página">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
          </>
          )}

          {activeTab === "Meus Trades" && (
            <>
            <section aria-label="Meus trades concluídos">
              <div className="hero-banner hero-banner-sm" style={{ backgroundImage: "url(/assets/bots/arc_bastion.png)" }}>
                <div className="hero-banner-content">
                  <span className="hero-banner-tag hero-banner-tag-yellow">
                    <History size={12} />
                    Histórico de Trocas
                  </span>
                  <h2>Seus Trades Concluídos</h2>
                  <p>Acompanhe todos os trades que você já concluiu e veja com quem fechou cada negociação.</p>
                </div>
                <div className="hero-banner-dots">
                  <span className="active" />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </section>

            <div className="trade-offer-list">
              {myTrades.map(trade => (
                <article key={trade.id} className="trade-offer-card">
                  <div className="trade-offer-body">
                    <div className="trade-offer-side">
                      <span className="trade-offer-label">Você Deu</span>
                      <div className="trade-offer-items">
                        <div className="trade-offer-item">
                          <ItemThumb item={trade.gave} className="trade-offer-thumb" />
                          <div className="trade-offer-item-info">
                            <strong>{trade.gave.name}</strong>
                            <span style={{ color: rarityColors[trade.gave.rarity] }}>{rarityLabels[trade.gave.rarity]}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <ArrowLeftRight size={18} className="trade-offer-swap" />
                    <div className="trade-offer-side">
                      <span className="trade-offer-label">Você Recebeu</span>
                      <div className="trade-offer-items">
                        <div className="trade-offer-item">
                          <ItemThumb item={trade.received} className="trade-offer-thumb" />
                          <div className="trade-offer-item-info">
                            <strong>{trade.received.name}</strong>
                            <span style={{ color: rarityColors[trade.received.rarity] }}>{rarityLabels[trade.received.rarity]}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="trade-offer-actions my-trades-actions">
                      <span className="my-trades-status">Concluído</span>
                      <div className="my-trades-meta">
                        <strong>{trade.partner}</strong>
                        <span>{trade.completedAt}</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            </>
          )}
        </div>

        <aside className="store-side-panel" aria-label="Painel de trades">
          <div className="store-user-card">
            <div className="store-user-avatar">
              D
              <span className="store-user-level">42</span>
            </div>
            <div className="store-user-info">
              <strong>Draakaarrysss</strong>
              <span className="store-user-online">
                <span className="store-user-online-dot" />
                Online
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
                <ShieldCheck size={28} />
              </div>
            </div>
            <div className="store-reputation-bar">
              <span style={{ width: "90%" }} />
            </div>
          </div>

          <div className="store-side-card trades-activity-card">
            <div className="trades-activity-head">
              <h2>Atividade de Trades</h2>
              <div className="trades-activity-tabs">
                <button type="button" className="trades-activity-tab active">Recentes</button>
              </div>
              <select className="trades-activity-filter" defaultValue="Todas">
                <option>Todas</option>
              </select>
            </div>
            <div className="trades-activity-list">
              {tradeActivity.map(activity => (
                <div key={activity.id} className="trade-activity-item">
                  <div className="trade-activity-avatar">{activity.user[0]?.toUpperCase()}</div>
                  <div className="trade-activity-body">
                    <div className="trade-activity-head-row">
                      <strong>{activity.user}</strong>
                      <span>{activity.timeAgo}</span>
                    </div>
                    <p className={`trade-activity-action${activity.action === "cancelled" ? " cancelled" : ""}`}>
                      {activityLabels[activity.action]}
                    </p>
                    <div className="trade-activity-exchange">
                      <ItemThumb item={activity.give} className="trade-activity-thumb" />
                      {activity.get ? (
                        <>
                          <ArrowLeftRight size={14} className="trade-offer-swap" />
                          <ItemThumb item={activity.get} className="trade-activity-thumb" />
                        </>
                      ) : (
                        <>
                          <ArrowLeftRight size={14} className="trade-offer-swap" />
                          <X size={14} className="trade-activity-cancel-icon" />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="trades-footer-btn">
              Ver Toda Atividade
              <ArrowRight size={16} />
            </button>
          </div>
        </aside>
      </div>

      {confirmOffer && (
        <div className="trade-confirm-overlay" onClick={() => setConfirmOffer(null)}>
          <div className="trade-confirm-modal" onClick={e => e.stopPropagation()}>
            <button type="button" className="trade-confirm-close" aria-label="Fechar" onClick={() => setConfirmOffer(null)}>
              <X size={16} strokeWidth={4} />
            </button>
            <div className="trade-confirm-icon">
              <Handshake size={24} />
            </div>
            <h2>Confirmar Trade</h2>
            <p>Revise os itens antes de continuar. Esta ação enviará uma solicitação de troca para o anunciante.</p>
            <div className="trade-confirm-body">
              <div className="trade-offer-side">
                <span className="trade-offer-label">Procura</span>
                <div className="trade-offer-items">
                  {confirmOffer.seeking.map((item, i) => (
                    <div key={i} className="trade-offer-item">
                      <ItemThumb item={item} className="trade-offer-thumb" />
                      <div className="trade-offer-item-info">
                        <strong>{item.name}</strong>
                        <span style={{ color: rarityColors[item.rarity] }}>{rarityLabels[item.rarity]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <ArrowLeftRight size={18} className="trade-offer-swap" />
              <div className="trade-offer-side">
                <span className="trade-offer-label">Oferece</span>
                <div className="trade-offer-items">
                  {confirmOffer.offering.map((item, i) => (
                    <div key={i} className="trade-offer-item">
                      <ItemThumb item={item} className="trade-offer-thumb" />
                      <div className="trade-offer-item-info">
                        <strong>{item.name}</strong>
                        <span style={{ color: rarityColors[item.rarity] }}>{rarityLabels[item.rarity]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="trade-confirm-actions">
              <button type="button" className="trade-confirm-cancel" onClick={() => setConfirmOffer(null)}>Cancelar</button>
              <button type="button" className="trade-confirm-accept" onClick={() => setConfirmOffer(null)}>Confirmar Troca</button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="trade-confirm-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="trade-confirm-modal trade-create-modal" onClick={e => e.stopPropagation()}>
            <button type="button" className="trade-confirm-close" aria-label="Fechar" onClick={() => setShowCreateModal(false)}>
              <X size={16} strokeWidth={4} />
            </button>
            <div className="trade-confirm-icon">
              <Plus size={24} />
            </div>
            <h2>Criar Novo Trade</h2>
            <p>Informe o item que você oferece e o item que você procura para publicar uma nova oferta de troca.</p>
            <div className="trade-create-body">
              <div className="trade-create-side">
                <span className="trade-offer-label">Você Oferece</span>
                <label className="trade-create-field">
                  <span>Nome do item</span>
                  <input type="text" placeholder="Ex: Rifle Ferrox" autoComplete="off" value={offerName} onChange={e => setOfferName(e.target.value)} />
                </label>
                <label className="trade-create-field">
                  <span>Raridade</span>
                  <select value={offerRarity} onChange={e => setOfferRarity(e.target.value as Rarity)}>
                    {(Object.keys(rarityLabels) as Rarity[]).map(r => (
                      <option key={r} value={r}>{rarityLabels[r]}</option>
                    ))}
                  </select>
                </label>
                <label className="trade-create-field">
                  <span>Quantidade</span>
                  <input type="number" min={1} value={offerQty} onChange={e => setOfferQty(Math.max(1, Number(e.target.value) || 1))} />
                </label>
              </div>
              <ArrowLeftRight size={18} className="trade-offer-swap trade-create-swap" />
              <div className="trade-create-side">
                <span className="trade-offer-label">Você Procura</span>
                <label className="trade-create-field">
                  <span>Nome do item</span>
                  <input type="text" placeholder="Ex: Núcleo ARC" autoComplete="off" value={wantName} onChange={e => setWantName(e.target.value)} />
                </label>
                <label className="trade-create-field">
                  <span>Raridade</span>
                  <select value={wantRarity} onChange={e => setWantRarity(e.target.value as Rarity)}>
                    {(Object.keys(rarityLabels) as Rarity[]).map(r => (
                      <option key={r} value={r}>{rarityLabels[r]}</option>
                    ))}
                  </select>
                </label>
                <label className="trade-create-field">
                  <span>Quantidade</span>
                  <input type="number" min={1} value={wantQty} onChange={e => setWantQty(Math.max(1, Number(e.target.value) || 1))} />
                </label>
              </div>
            </div>
            <div className="trade-confirm-actions">
              <button type="button" className="trade-confirm-cancel" onClick={() => setShowCreateModal(false)}>Cancelar</button>
              <button type="button" className="trade-confirm-accept" onClick={handleCreateTrade} disabled={!offerName.trim() || !wantName.trim()}>Criar Trade</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

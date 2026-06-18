"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeftRight, ArrowRight, ChevronLeft, ChevronRight, Coins, Medal, Megaphone, Plus, Sparkles, TrendingUp } from "lucide-react"
import arcData from "@/data/arc-data"
import { createClient } from "@/lib/supabase/client"
import "../../styles/home.css"

const TRADES_OPEN_KEY = "trades-panel-open"

type Item = { id: string; name: string; rarity?: string; value?: number; image?: string }

const rawData = arcData as unknown as { items: Item[] }

const rarityColors: Record<string, string> = {
  Common: "#8b99aa", Uncommon: "#3df28b", Rare: "#5fa8ff", Epic: "#b477ff", Legendary: "#ffd400", Unknown: "#566171"
}

function resolveImage(image?: string) {
  if (!image) return undefined
  return image.startsWith("http") ? image : `/${image}`
}

const rarityLabelsPt: Record<string, string> = {
  Common: "Comum", Uncommon: "Incomum", Rare: "Raro", Epic: "Épico", Legendary: "Lendário", Unknown: "Desconhecido"
}

function pickItem(rarity: string, index = 0): Item {
  const pool = rawData.items.filter(item => item.rarity === rarity)
  return pool[index % pool.length] ?? rawData.items[0]
}

const tradeOffers = [
  { user: "Skylark_77", level: 42, online: true, timeAgo: "2m atrás", points: 320, want: { item: pickItem("Epic", 0), qty: 1 } },
  { user: "IronWolfBR", level: 35, online: true, timeAgo: "5m atrás", points: 540, want: { item: pickItem("Rare", 1), qty: 1 } },
  { user: "LostPhantom", level: 28, online: false, timeAgo: "12m atrás", points: 180, want: { item: pickItem("Common", 0), qty: 5 } },
  { user: "NovaStrike", level: 31, online: true, timeAgo: "18m atrás", points: 470, want: { item: pickItem("Epic", 3), qty: 1 } },
  { user: "DataRunner", level: 24, online: true, timeAgo: "22m atrás", points: 95, want: { item: pickItem("Rare", 3), qty: 1 } },
]

const newsItems = [
  {
    icon: Megaphone,
    image: "/assets/bots/arc_bastion.png",
    date: "11 DE JUNHO DE 2026",
    title: "Reposição de Estoque Concluída",
    text: "Novos itens raros chegaram ao catálogo. Confira os preços atualizados de troca e recompensas.",
  },
  {
    icon: TrendingUp,
    image: "/assets/bots/arc_rocketeer.png",
    date: "08 DE JUNHO DE 2026",
    title: "Ranking de Recicladores",
    text: "Veja quem mais reciclou componentes essa semana e dispute o topo do ranking da comunidade.",
  },
]

const categories = [
  { href: "/itens", tag: "EVENTO", tone: "yellow", image: "/assets/bots/arc_wasp.png", title: "Itens", text: "Catálogo completo com valores e raridades." },
  { href: "/trades", tag: "TROCAS", tone: "red", image: "/assets/bots/arc_hornet.png", title: "Trades", text: "Ofertas do marketplace e custo de troca." },
  { href: "/crafting", tag: "CRAFTING", tone: "green", image: "/assets/bots/arc_sentinel.png", title: "Crafting", text: "Receitas e materiais necessários." },
  { href: "/mapas", tag: "MAPAS", tone: "cyan", image: "/assets/maps/buried_city.png", title: "Mapas", text: "Rotas e pontos de interesse nos mapas." },
]

export default function HomePage() {
  const [tradesOpen, setTradesOpen] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState("Visitante")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(TRADES_OPEN_KEY)
    if (stored === "false") setTradesOpen(false)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      setDisplayName(user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Visitante")
      supabase.from("profiles").select("avatar_url").eq("id", user.id).single().then(({ data }) => {
        if (data?.avatar_url) setAvatarUrl(data.avatar_url)
      })
    })
  }, [])

  function setOpen(val: boolean) {
    setTradesOpen(val)
    localStorage.setItem(TRADES_OPEN_KEY, String(val))
  }

  const initial = displayName[0]?.toUpperCase() ?? "S"

  return (
    <div className={`home-page${tradesOpen ? "" : " home--trades-closed"}`}>
    <div className={`home-layout${tradesOpen ? "" : " home-layout--no-panel"}`}>
      <div className="home-main">
        <h1 className="page-title">Início</h1>

        <section aria-label="Notas de atualização">
          <p className="home-section-label">Notas de atualização mais recentes</p>
          <div className="news-grid">
            {newsItems.map((news, i) => (
              <article key={i} className="news-card">
                <div className="news-card-media" style={{ backgroundImage: `url(${news.image})` }}>
                  <span className="news-card-badge"><news.icon size={16} /></span>
                </div>
                <div className="news-card-body">
                  <h3>{news.title}</h3>
                  <p>{news.text}</p>
                  <span className="news-card-date">{news.date}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-label="Novidades">
          <p className="home-section-label">Novidades</p>
          <div className="hero-banner" style={{ backgroundImage: "url(/assets/bots/arc_matriarch.png)" }}>
            <div className="hero-banner-content">
              <span className="hero-banner-tag">
                <Sparkles size={12} />
                Atualizações da loja
              </span>
              <h2>O Sucatão Tem Tudo Que Você Precisa</h2>
              <p>Itens, componentes e equipamentos para sua jornada na Superfície. Compre, troque e recicle direto pelo catálogo.</p>
              <Link href="/itens" className="hero-banner-cta">
                Ver catálogo
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

        <section aria-label="Categorias">
          <div className="category-row">
            {categories.map(({ href, tag, tone, image, title, text }) => (
              <Link key={href} href={href} className="category-card" style={{ backgroundImage: `url(${image})` }}>
                <span className={`category-card-tag tone-${tone}`}>{tag}</span>
                <strong>{title}</strong>
                <span>{text}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <aside className={`trades-panel${tradesOpen ? "" : " trades-panel--hidden"}`} aria-label="Trades">
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
          <button
            type="button"
            className="store-panel-close"
            onClick={() => setOpen(false)}
            aria-label="Fechar painel de trades"
          >
            <ChevronRight size={16} />
          </button>
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

        <div className="trades-panel-head">
          <h2>Trades</h2>
        </div>
        <div className="trades-tabs">
          <span className="trades-tab active">Todos</span>
          <span className="trades-tab">Meus trades</span>
          <span className="trades-tab">Seguidos</span>
          <span className="trades-add-btn"><Plus size={16} /></span>
        </div>
        <div className="trades-list">
          {tradeOffers.map((trade, i) => (
            <div key={i} className="trade-card">
              <div className="trade-card-head">
                <div className="trade-avatar">
                  {trade.user[0]?.toUpperCase()}
                  {trade.online && <span className="trade-status-dot" />}
                </div>
                <div className="trade-user-info">
                  <strong>{trade.user}</strong>
                  <span>Nível {trade.level}</span>
                </div>
                <span className="trade-time">{trade.timeAgo}</span>
              </div>
              <div className="trade-exchange">
                <div className="trade-side">
                  <span className="trade-side-label">Oferece</span>
                  <div className="trade-thumb trade-thumb-points">
                    <Coins size={20} />
                  </div>
                  <span className="trade-side-rarity trade-points-value">{trade.points.toLocaleString("pt-BR")} pts</span>
                  <ArrowLeftRight size={16} className="trade-swap-icon" />
                </div>
                {(() => {
                  const color = rarityColors[trade.want.item.rarity ?? "Unknown"]
                  return (
                    <div className="trade-side">
                      <span className="trade-side-label">Procura</span>
                      <div className="trade-thumb" style={{ "--rarity-color": color } as React.CSSProperties}>
                        {trade.want.item.image
                          ? <img src={resolveImage(trade.want.item.image)} alt={trade.want.item.name} loading="lazy" />
                          : <div className="placeholder">{trade.want.item.name[0]?.toUpperCase()}</div>}
                        <span className="trade-thumb-qty">x{trade.want.qty}</span>
                      </div>
                      <span className="trade-side-rarity" style={{ color }}>{rarityLabelsPt[trade.want.item.rarity ?? "Unknown"]}</span>
                    </div>
                  )
                })()}
                <ChevronRight size={18} className="trade-chevron" />
              </div>
            </div>
          ))}
        </div>
        <Link href="/trades" className="trades-footer-btn">
          Ver todos os trades
          <ArrowRight size={16} />
        </Link>
      </aside>
    </div>

    <button
      type="button"
      className="trades-reopen-btn"
      onClick={() => setOpen(true)}
      aria-label="Abrir painel de trades"
    >
      <ChevronLeft size={16} />
      <span>Trades</span>
    </button>
    </div>
  )
}

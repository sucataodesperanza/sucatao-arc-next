"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { BarChart2, Check, CheckCircle, ChevronLeft, ChevronRight, Clock, Coins, Crosshair, DoorOpen, HelpCircle, Hexagon, Package, Play, RadioTower, Recycle, RefreshCw, Scale, ScrollText, Shield, Trophy, Truck, Wallet, XCircle, Zap } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import "../../../styles/contratos.css"

type ContractType = "Principal" | "Secundário" | "Diário" | "Facção"

const contractTypeStyles: Record<ContractType, string> = {
  Principal: "red",
  Secundário: "yellow",
  Diário: "blue",
  Facção: "purple",
}

type ContractReward =
  | { kind: "currency"; amount: number }
  | { kind: "xp"; amount: number }
  | { kind: "item"; name: string; image: string; qty: number }

type Contract = {
  id: string
  type: ContractType
  title: string
  description: string
  image: string
  progress: number
  total: number
  rewards: ContractReward[]
  expiresIn: string
}

const contracts: Contract[] = [
  {
    id: "1",
    type: "Principal",
    title: "Ameaça Mecânica",
    description: "Elimine 5 unidades ARC Sentinel na região de Speranza para reduzir a presença hostil.",
    image: "/assets/bots/arc_bastion.png",
    progress: 3,
    total: 5,
    rewards: [
      { kind: "currency", amount: 250 },
      { kind: "xp", amount: 500 },
      { kind: "item", name: "Componentes Mecânicos Avançados", image: "/assets/items/advanced_mechanical_components.png", qty: 3 },
    ],
    expiresIn: "2d 14h",
  },
  {
    id: "2",
    type: "Secundário",
    title: "Coleta de Recursos",
    description: "Colete 20 unidades de Peças de Metal espalhadas pelo mapa para reforçar o suprimento da base.",
    image: "/assets/bots/arc_spotter.png",
    progress: 12,
    total: 20,
    rewards: [
      { kind: "currency", amount: 120 },
      { kind: "xp", amount: 200 },
      { kind: "item", name: "Módulos Exodus", image: "/assets/items/exodus_modules.png", qty: 2 },
    ],
    expiresIn: "1d 6h",
  },
  {
    id: "3",
    type: "Diário",
    title: "Ajuda aos Raiders",
    description: "Conclua 3 trades ou ajude outros Raiders a sobreviver durante uma extração.",
    image: "/assets/bots/arc_hornet.png",
    progress: 1,
    total: 3,
    rewards: [
      { kind: "currency", amount: 80 },
      { kind: "xp", amount: 150 },
    ],
    expiresIn: "8h 22m",
  },
  {
    id: "4",
    type: "Facção",
    title: "Honra aos Vigilantes",
    description: "Complete uma missão de reconhecimento em nome dos Vigilantes e reporte os dados coletados.",
    image: "/assets/bots/arc_surveyor.png",
    progress: 0,
    total: 1,
    rewards: [
      { kind: "currency", amount: 400 },
      { kind: "xp", amount: 600 },
      { kind: "item", name: "Componentes Elétricos Avançados", image: "/assets/items/advanced_electrical_components.png", qty: 1 },
    ],
    expiresIn: "4d 2h",
  },
]

const tabs = ["Contratos Ativos", "Contratos Diários", "Contratos Semanais", "Histórico"]

type DailyContract = {
  title: string
  description: string
  image: string
  icon: LucideIcon
  color: string
  progress: number
  total: number
  done: boolean
  rewards: ContractReward[]
}

const dailyColors: Record<string, string> = {
  yellow: "var(--yellow)",
  red: "var(--red)",
  green: "var(--green)",
  blue: "var(--blue)",
  purple: "var(--purple)",
}

const dailyContracts: DailyContract[] = [
  {
    title: "Vasculhe 3 Containers",
    description: "Encontre e abra containers em qualquer mapa.",
    image: "/assets/items/painted_box.png",
    icon: Package,
    color: "yellow",
    progress: 0,
    total: 3,
    done: false,
    rewards: [
      { kind: "currency", amount: 500 },
      { kind: "xp", amount: 250 },
    ],
  },
  {
    title: "Desative 2 Torres ARC",
    description: "Encontre e desative Torres ARC para enfraquecer as defesas da ARC.",
    image: "/assets/bots/arc_turret.png",
    icon: RadioTower,
    color: "red",
    progress: 0,
    total: 2,
    done: false,
    rewards: [
      { kind: "currency", amount: 600 },
      { kind: "xp", amount: 250 },
    ],
  },
  {
    title: "Colete 10 Sucatas",
    description: "Colete sucatas em áreas de saque e extraia com sucesso.",
    image: "/assets/items/metal_parts.png",
    icon: Recycle,
    color: "green",
    progress: 10,
    total: 10,
    done: true,
    rewards: [
      { kind: "currency", amount: 400 },
      { kind: "xp", amount: 200 },
    ],
  },
  {
    title: "Entregue Suprimentos",
    description: "Leve suprimentos para os postos avançados aliados.",
    image: "/assets/items/exodus_modules.png",
    icon: Truck,
    color: "blue",
    progress: 0,
    total: 1,
    done: false,
    rewards: [
      { kind: "currency", amount: 800 },
      { kind: "item", name: "Componentes Mecânicos Avançados", image: "/assets/items/advanced_mechanical_components.png", qty: 2 },
    ],
  },
  {
    title: "Elimine 15 Inimigos ARC",
    description: "Elimine inimigos da ARC em qualquer mapa.",
    image: "/assets/bots/arc_sentinel.png",
    icon: Crosshair,
    color: "purple",
    progress: 5,
    total: 15,
    done: false,
    rewards: [
      { kind: "currency", amount: 1000 },
      { kind: "xp", amount: 500 },
    ],
  },
]

function getSecondsUntilMidnight() {
  const now = new Date()
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  return Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000))
}

function formatCountdown(totalSeconds: number, withSeconds: boolean) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return withSeconds ? `${h}h ${m}m ${s}s` : `${h}h ${m}m`
}

type WeeklyContract = {
  title: string
  description: string
  image: string
  icon: LucideIcon
  color: string
  progress: number
  total: number
  done: boolean
  statLabel: string
  showInSummary: boolean
  rewards: ContractReward[]
}

const weeklyContracts: WeeklyContract[] = [
  {
    title: "Elimine 50 Inimigos ARC",
    description: "Elimine inimigos da ARC em qualquer mapa durante a semana.",
    image: "/assets/bots/arc_shredder.png",
    icon: Crosshair,
    color: "red",
    progress: 18,
    total: 50,
    done: false,
    statLabel: "Inimigos eliminados",
    showInSummary: true,
    rewards: [
      { kind: "currency", amount: 2500 },
      { kind: "xp", amount: 1000 },
    ],
  },
  {
    title: "Colete 100 Sucatas",
    description: "Colete sucatas em áreas de saque e extraia com sucesso.",
    image: "/assets/items/metal_parts.png",
    icon: Recycle,
    color: "green",
    progress: 65,
    total: 100,
    done: false,
    statLabel: "Sucatas coletadas",
    showInSummary: true,
    rewards: [
      { kind: "currency", amount: 1800 },
      { kind: "xp", amount: 700 },
    ],
  },
  {
    title: "Realize 10 Extrações",
    description: "Complete extrações com sucesso em qualquer mapa da Speranza.",
    image: "/assets/bots/arc_leaper.png",
    icon: DoorOpen,
    color: "blue",
    progress: 4,
    total: 10,
    done: false,
    statLabel: "Extrações realizadas",
    showInSummary: true,
    rewards: [
      { kind: "currency", amount: 2000 },
      { kind: "item", name: "Módulos Exodus", image: "/assets/items/exodus_modules.png", qty: 2 },
    ],
  },
  {
    title: "Extraia 5 Itens Épicos",
    description: "Extraia itens de raridade épica ou superior durante a semana.",
    image: "/assets/items/aphelion_blueprint.png",
    icon: Trophy,
    color: "purple",
    progress: 1,
    total: 5,
    done: false,
    statLabel: "Itens épicos extraídos",
    showInSummary: true,
    rewards: [
      { kind: "currency", amount: 3000 },
      { kind: "xp", amount: 1200 },
    ],
  },
  {
    title: "Vença 8 Trades",
    description: "Conclua trocas vantajosas com outros Raiders na aba Trades.",
    image: "/assets/items/painted_box.png",
    icon: Scale,
    color: "yellow",
    progress: 3,
    total: 8,
    done: false,
    statLabel: "Trades vencidos",
    showInSummary: false,
    rewards: [
      { kind: "currency", amount: 1500 },
      { kind: "xp", amount: 500 },
    ],
  },
]

const weeklyBonusRewards: ContractReward[] = [
  { kind: "currency", amount: 5000 },
  { kind: "xp", amount: 2500 },
  { kind: "item", name: "Blueprint: Jupiter", image: "/assets/items/jupiter_blueprint.png", qty: 1 },
]

function getSecondsUntilNextWeek() {
  const now = new Date()
  const next = new Date(now)
  const daysUntilMonday = (8 - now.getDay()) % 7 || 7
  next.setDate(now.getDate() + daysUntilMonday)
  next.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000))
}

function formatWeekCountdown(totalSeconds: number) {
  const d = Math.floor(totalSeconds / 86400)
  const h = Math.floor((totalSeconds % 86400) / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  return `${d}d ${h}h ${m}m`
}

type HistoryResult = "CONCLUÍDO" | "FALHOU" | "EXPIRADO"
type HistoryType = "Diário" | "Semanal"

type HistoryEntry = {
  id: string
  title: string
  description: string
  image: string
  type: HistoryType
  objective: { current: number; total: number }
  result: HistoryResult
  rewards: ContractReward[]
  date: string
}

const historyEntries: HistoryEntry[] = [
  { id: "h1", title: "Elimine 15 Inimigos ARC", description: "Elimine inimigos da ARC em qualquer mapa.", image: "/assets/bots/arc_bastion.png", type: "Diário", objective: { current: 15, total: 15 }, result: "CONCLUÍDO", rewards: [{ kind: "currency", amount: 1000 }, { kind: "xp", amount: 500 }, { kind: "item", name: "Componentes Mecânicos", image: "/assets/items/advanced_mechanical_components.png", qty: 1 }], date: "18/05/2025 14:32" },
  { id: "h2", title: "Colete 10 Sucatas", description: "Colete sucatas em áreas de saque e extraia com sucesso.", image: "/assets/items/metal_parts.png", type: "Diário", objective: { current: 10, total: 10 }, result: "CONCLUÍDO", rewards: [{ kind: "currency", amount: 400 }, { kind: "xp", amount: 200 }], date: "18/05/2025 12:08" },
  { id: "h3", title: "Vasculhe 3 Containers", description: "Encontre e abra containers em qualquer mapa.", image: "/assets/items/painted_box.png", type: "Semanal", objective: { current: 3, total: 3 }, result: "CONCLUÍDO", rewards: [{ kind: "currency", amount: 500 }, { kind: "xp", amount: 250 }], date: "17/05/2025 21:47" },
  { id: "h4", title: "Desative 2 Torres ARC", description: "Encontre e desative Torres ARC para enfraquecer as defesas.", image: "/assets/bots/arc_turret.png", type: "Semanal", objective: { current: 1, total: 2 }, result: "FALHOU", rewards: [], date: "17/05/2025 19:23" },
  { id: "h5", title: "Extraia 10 Itens Épicos", description: "Extraia itens de raridade Épica ou superior.", image: "/assets/items/aphelion_blueprint.png", type: "Semanal", objective: { current: 10, total: 10 }, result: "CONCLUÍDO", rewards: [{ kind: "currency", amount: 2500 }, { kind: "xp", amount: 1250 }, { kind: "item", name: "Blueprint", image: "/assets/items/aphelion_blueprint.png", qty: 1 }], date: "15/05/2025 23:11" },
  { id: "h6", title: "Entregue Suprimentos", description: "Leve suprimentos para os postos avançados aliados.", image: "/assets/items/exodus_modules.png", type: "Diário", objective: { current: 0, total: 1 }, result: "EXPIRADO", rewards: [], date: "16/05/2025 00:00" },
  { id: "h7", title: "Elimine 50 Inimigos ARC", description: "Elimine inimigos da ARC em qualquer mapa.", image: "/assets/bots/arc_shredder.png", type: "Semanal", objective: { current: 50, total: 50 }, result: "CONCLUÍDO", rewards: [{ kind: "currency", amount: 2500 }, { kind: "xp", amount: 1000 }, { kind: "item", name: "Módulos Exodus", image: "/assets/items/exodus_modules.png", qty: 2 }], date: "15/05/2025 18:54" },
  { id: "h8", title: "Colete 500 Sucatas", description: "Colete sucatas em áreas de saque e extraia com sucesso.", image: "/assets/items/metal_parts.png", type: "Semanal", objective: { current: 328, total: 500 }, result: "FALHOU", rewards: [], date: "15/05/2025 17:02" },
]

const historyActivities = [
  { result: "CONCLUÍDO" as HistoryResult, text: 'Você concluiu "Elimine 15 inimigos ARC"', time: "há 18 min" },
  { result: "CONCLUÍDO" as HistoryResult, text: 'Você concluiu "Colete 10 sucatas"', time: "há 2 h" },
  { result: "FALHOU" as HistoryResult, text: 'Você falhou "Desative 2 torres ARC"', time: "há 22 h" },
  { result: "CONCLUÍDO" as HistoryResult, text: 'Você concluiu "Vasculhe 3 containers"', time: "há 1 dia" },
  { result: "CONCLUÍDO" as HistoryResult, text: 'Você concluiu "Extraia 10 itens épicos"', time: "há 2 dias" },
]

const nextRewards = [
  { title: "Caixa de Componentes Épicos", image: "/assets/items/painted_box.png", current: "8.250", threshold: "9.000", progress: "91.6%" },
  { title: "Drone ARC Avançado", image: "/assets/bots/arc_snitch.png", current: "8.250", threshold: "10.000", progress: "82.5%" },
  { title: "Componentes Elétricos Avançados", image: "/assets/items/advanced_electrical_components.png", current: "8.250", threshold: "12.000", progress: "68.7%" },
  { title: "Blueprint: Aphelion", image: "/assets/items/aphelion_blueprint.png", current: "8.250", threshold: "15.000", progress: "55.0%" },
  { title: "Blueprint: Jupiter", image: "/assets/items/jupiter_blueprint.png", current: "8.250", threshold: "18.000", progress: "45.8%" },
]

function RewardThumb({ reward }: { reward: ContractReward }) {
  if (reward.kind === "currency") {
    return (
      <div className="contratos-reward contratos-reward-currency" title={`+${reward.amount} Sucatas`}>
        <Coins size={16} />
        +{reward.amount}
      </div>
    )
  }
  if (reward.kind === "xp") {
    return (
      <div className="contratos-reward contratos-reward-xp" title={`+${reward.amount} Reputação`}>
        <Zap size={16} />
        +{reward.amount}
      </div>
    )
  }
  return (
    <div className="contratos-reward" style={{ backgroundImage: `url(${reward.image})` }} title={reward.name}>
      <span className="contratos-reward-qty">x{reward.qty}</span>
    </div>
  )
}

function DailyRewardBadge({ reward }: { reward: ContractReward }) {
  if (reward.kind === "currency") {
    return (
      <span className="contratos-daily-reward-sucatas">
        <Coins size={12} />
        {reward.amount}
      </span>
    )
  }
  if (reward.kind === "xp") {
    return (
      <span className="contratos-daily-reward-xp">
        <Hexagon size={12} fill="currentColor" />
        {reward.amount} Reputação
      </span>
    )
  }
  return (
    <span className="contratos-daily-reward-item">
      <Package size={12} />
      x{reward.qty}
    </span>
  )
}

export default function ContratosPage() {
  const [activeTab, setActiveTab] = useState(tabs[0])
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [weekSecondsLeft, setWeekSecondsLeft] = useState(0)
  const [acceptedContracts, setAcceptedContracts] = useState<Set<number>>(new Set())
  const [acceptedWeeklyContracts, setAcceptedWeeklyContracts] = useState<Set<number>>(new Set())

  useEffect(() => {
    setSecondsLeft(getSecondsUntilMidnight())
    setWeekSecondsLeft(getSecondsUntilNextWeek())
    const interval = setInterval(() => {
      setSecondsLeft(prev => (prev > 0 ? prev - 1 : getSecondsUntilMidnight()))
      setWeekSecondsLeft(prev => (prev > 0 ? prev - 1 : getSecondsUntilNextWeek()))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  function handleAccept(index: number) {
    setAcceptedContracts(prev => {
      const next = new Set(prev)
      next.add(index)
      return next
    })
  }

  function handleAcceptWeekly(index: number) {
    setAcceptedWeeklyContracts(prev => {
      const next = new Set(prev)
      next.add(index)
      return next
    })
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
    <div className="contratos-page">
      <div className="contratos-layout">
        <div className="contratos-main">
          <div className="contratos-topbar">
            <div>
              <div className="contratos-title-row">
                <h1 className="page-title">Contratos</h1>
                <HelpCircle size={18} className="contratos-help" />
              </div>
              <p className="contratos-subtitle">Complete contratos para ganhar Sucatas, Reputação e itens exclusivos.</p>
            </div>
            <div className="contratos-wallet">
              <span className="contratos-wallet-icon">
                <Wallet size={18} />
              </span>
              <div className="contratos-wallet-info">
                <span>Carteira</span>
                <strong>48.750</strong>
              </div>
            </div>
          </div>

          <div className="store-tabs contratos-tabs">
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

          {activeTab === "Contratos Ativos" && (
            <>
              <div className="contratos-hero-row">
                <div className="hero-banner" style={{ backgroundImage: "url(/assets/bots/arc_rocketeer.png)" }}>
                  <div className="hero-banner-content">
                    <span className="hero-banner-tag">
                      <ScrollText size={12} />
                      Contratos ARC
                    </span>
                    <h2>Sua Missão. Sua Recompensa.</h2>
                    <p>Aceite contratos de Raiders, facções e do próprio Sucatão. Complete objetivos e receba recompensas exclusivas em Sucatas, Reputação e itens.</p>
                    <button type="button" className="contratos-hero-actions">
                      <Play size={14} />
                      Como Funciona
                    </button>
                  </div>
                </div>

                <div className="contratos-summary">
                  <h2>Resumo Geral</h2>
                  <div className="contratos-summary-grid">
                    <div className="contratos-summary-stat">
                      <span>Contratos Ativos</span>
                      <strong>7</strong>
                    </div>
                    <div className="contratos-summary-stat">
                      <span>Concluídos</span>
                      <strong>128</strong>
                    </div>
                    <div className="contratos-summary-stat">
                      <span>Taxa de Sucesso</span>
                      <strong>82%</strong>
                    </div>
                    <div className="contratos-summary-stat">
                      <span>Recompensas Recebidas</span>
                      <strong>48.750</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="trades-filter-bar">
                <div className="trades-filter-group">
                  <span>Filtrar</span>
                  <select defaultValue="Todos os Tipos"><option>Todos os Tipos</option></select>
                </div>
                <div className="trades-filter-group">
                  <span>Ordenar por</span>
                  <select defaultValue="Mais Recentes"><option>Mais Recentes</option></select>
                </div>
                <label className="contratos-checkbox">
                  <input type="checkbox" />
                  Mostrar apenas disponíveis
                </label>
              </div>

              <div className="contratos-grid">
                {contracts.map(contract => (
                  <article key={contract.id} className="contratos-card">
                    <div className="contratos-card-banner" style={{ backgroundImage: `url(${contract.image})` }}>
                      <span className={`contratos-card-type contratos-card-type-${contractTypeStyles[contract.type]}`}>
                        {contract.type}
                      </span>
                    </div>
                    <div className="contratos-card-body">
                      <h3>{contract.title}</h3>
                      <p>{contract.description}</p>
                      <div className="contratos-progress">
                        <div className="contratos-progress-label">
                          <span>Progresso</span>
                          <span>{contract.progress}/{contract.total}</span>
                        </div>
                        <div className="store-reputation-bar">
                          <span style={{ width: `${(contract.progress / contract.total) * 100}%` }} />
                        </div>
                      </div>
                      <div className="contratos-rewards">
                        <span className="contratos-rewards-label">Recompensas</span>
                        <div className="contratos-rewards-list">
                          {contract.rewards.map((reward, i) => (
                            <RewardThumb key={i} reward={reward} />
                          ))}
                        </div>
                      </div>
                      <div className={`contratos-card-footer contratos-card-footer-${contractTypeStyles[contract.type]}`}>
                        <Clock size={12} />
                        Expira em: {contract.expiresIn}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="contratos-tip">
                <div className="contratos-tip-image" style={{ backgroundImage: "url(/assets/bots/arc_wasp.png)" }} />
                <div>
                  <h2>Dica do Contrato</h2>
                  <p>Contratos do tipo Facção rendem mais reputação para sua facção escolhida. Priorize-os se quiser subir de nível mais rápido entre os Raiders.</p>
                </div>
              </div>
            </>
          )}

          {activeTab === "Contratos Diários" && (
            <>
              <div className="daily-topbar">
                <div>
                  <h2 className="page-title">Contratos Diários</h2>
                  <p className="contratos-subtitle">Novos contratos disponíveis todos os dias às 00:00 (BRT).</p>
                </div>
                <div className="daily-topbar-actions">
                  <span className="daily-renew-timer">
                    Renova em: <strong>{formatCountdown(secondsLeft, true)}</strong>
                  </span>
                  <button type="button" className="daily-refresh-btn">
                    <RefreshCw size={14} />
                    Atualizar Agora
                  </button>
                </div>
              </div>

              <div className="daily-list">
                {dailyContracts.map((contract, i) => {
                  const accepted = acceptedContracts.has(i)
                  return (
                    <article key={i} className="daily-item" style={{ "--daily-color": dailyColors[contract.color] } as React.CSSProperties}>
                      <div className="daily-item-banner" style={{ backgroundImage: `url(${contract.image})` }}>
                        <span className="daily-item-icon">
                          <contract.icon size={16} />
                        </span>
                      </div>
                      <div className="daily-item-body">
                        <h3>{contract.title}</h3>
                        <p>{contract.description}</p>
                        <div className="contratos-progress">
                          <div className="store-reputation-bar">
                            <span style={{ width: `${(contract.progress / contract.total) * 100}%` }} />
                          </div>
                          <span className="daily-item-progress-label">{contract.progress} / {contract.total}</span>
                        </div>
                      </div>
                      <div className="daily-item-rewards">
                        <span className="contratos-rewards-label">Recompensas</span>
                        <div className="contratos-rewards-list">
                          {contract.rewards.map((reward, j) => (
                            <RewardThumb key={j} reward={reward} />
                          ))}
                        </div>
                      </div>
                      <div className="daily-item-action">
                        {contract.done ? (
                          <span className="daily-action daily-action-done">
                            <Check size={14} />
                            Concluído
                          </span>
                        ) : accepted ? (
                          <span className="daily-action daily-action-progress">Em Progresso</span>
                        ) : (
                          <button type="button" className="daily-action daily-action-accept" onClick={() => handleAccept(i)}>
                            Aceitar
                          </button>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>

              <div className="daily-about">
                <div className="daily-about-info">
                  <span className="daily-about-icon">
                    <ScrollText size={18} />
                  </span>
                  <div>
                    <h2>Sobre Contratos Diários</h2>
                    <p>Contratos diários são renovados todos os dias às 00:00 (BRT). Conclua-os para ganhar Sucatas, Reputação e outros recursos valiosos.</p>
                  </div>
                </div>
                <div className="daily-about-progress">
                  <span>Conclua todos os contratos diários para receber um bônus especial!</span>
                  <div className="daily-about-bar-row">
                    <span>Contratos Concluídos</span>
                    <span>{dailyContracts.filter(c => c.done).length} / {dailyContracts.length}</span>
                  </div>
                  <div className="store-reputation-bar">
                    <span style={{ width: `${(dailyContracts.filter(c => c.done).length / dailyContracts.length) * 100}%` }} />
                  </div>
                </div>
                <div className="daily-bonus-box">
                  <span>Bônus Diário</span>
                  <strong>
                    <Coins size={16} />
                    2.000
                  </strong>
                </div>
              </div>
            </>
          )}

          {activeTab === "Contratos Semanais" && (
            <>
              <div className="daily-topbar">
                <div>
                  <h2 className="page-title">Contratos Semanais</h2>
                  <p className="contratos-subtitle">Novos contratos disponíveis toda segunda-feira às 00:00 (BRT).</p>
                </div>
                <div className="daily-topbar-actions">
                  <span className="daily-renew-timer">
                    Renova em: <strong>{formatWeekCountdown(weekSecondsLeft)}</strong>
                  </span>
                  <button type="button" className="daily-refresh-btn">
                    <RefreshCw size={14} />
                    Atualizar Agora
                  </button>
                </div>
              </div>

              <div className="daily-list">
                {weeklyContracts.map((contract, i) => {
                  const accepted = acceptedWeeklyContracts.has(i)
                  return (
                    <article key={i} className="daily-item" style={{ "--daily-color": dailyColors[contract.color] } as React.CSSProperties}>
                      <div className="daily-item-banner" style={{ backgroundImage: `url(${contract.image})` }}>
                        <span className="daily-item-icon">
                          <contract.icon size={16} />
                        </span>
                      </div>
                      <div className="daily-item-body">
                        <h3>{contract.title}</h3>
                        <p>{contract.description}</p>
                        <div className="contratos-progress">
                          <div className="store-reputation-bar">
                            <span style={{ width: `${(contract.progress / contract.total) * 100}%` }} />
                          </div>
                          <span className="daily-item-progress-label">{contract.progress} / {contract.total}</span>
                        </div>
                      </div>
                      <div className="daily-item-rewards">
                        <span className="contratos-rewards-label">Recompensas</span>
                        <div className="contratos-rewards-list">
                          {contract.rewards.map((reward, j) => (
                            <RewardThumb key={j} reward={reward} />
                          ))}
                        </div>
                      </div>
                      <div className="daily-item-action">
                        {contract.done ? (
                          <span className="daily-action daily-action-done">
                            <Check size={14} />
                            Concluído
                          </span>
                        ) : accepted ? (
                          <span className="daily-action daily-action-progress">Em Progresso</span>
                        ) : (
                          <button type="button" className="daily-action daily-action-accept" onClick={() => handleAcceptWeekly(i)}>
                            Aceitar
                          </button>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>

              <div className="daily-about">
                <div className="daily-about-info">
                  <span className="daily-about-icon">
                    <ScrollText size={18} />
                  </span>
                  <div>
                    <h2>Sobre Contratos Semanais</h2>
                    <p>Contratos semanais são renovados toda segunda-feira às 00:00 (BRT). Conclua-os para ganhar grandes quantidades de Sucatas, Reputação e itens raros.</p>
                  </div>
                </div>
                <div className="daily-about-progress">
                  <span>Conclua todos os contratos semanais para receber um bônus especial!</span>
                  <div className="daily-about-bar-row">
                    <span>Contratos Concluídos</span>
                    <span>{weeklyContracts.filter(c => c.done).length} / {weeklyContracts.length}</span>
                  </div>
                  <div className="store-reputation-bar">
                    <span style={{ width: `${(weeklyContracts.filter(c => c.done).length / weeklyContracts.length) * 100}%` }} />
                  </div>
                </div>
                <div className="daily-bonus-box">
                  <span>Recompensa Semanal</span>
                  <div className="daily-bonus-rewards">
                    {weeklyBonusRewards.map((reward, i) => (
                      <RewardThumb key={i} reward={reward} />
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "Histórico" && (
            <div className="historico-section">
              <div className="historico-header">
                <div>
                  <h2 className="page-title">Histórico de Contratos</h2>
                  <p className="contratos-subtitle">Acompanhe todos os contratos que você concluiu ou falhou.</p>
                </div>
                <div className="historico-filters">
                  <select className="historico-filter-select">
                    <option>Todos os tipos</option>
                    <option>Diário</option>
                    <option>Semanal</option>
                  </select>
                  <select className="historico-filter-select">
                    <option>Todos os resultados</option>
                    <option>Concluído</option>
                    <option>Falhou</option>
                    <option>Expirado</option>
                  </select>
                  <select className="historico-filter-select">
                    <option>Mais recentes</option>
                    <option>Mais antigos</option>
                  </select>
                </div>
              </div>

              <table className="historico-table">
                <colgroup>
                  <col className="historico-col-contrato" />
                  <col className="historico-col-tipo" />
                  <col className="historico-col-objetivo" />
                  <col className="historico-col-resultado" />
                  <col className="historico-col-recompensas" />
                  <col className="historico-col-data" />
                </colgroup>
                <thead>
                  <tr className="historico-table-head">
                    <th>Contrato</th>
                    <th>Tipo</th>
                    <th>Objetivo</th>
                    <th>Resultado</th>
                    <th>Recompensas</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {historyEntries.map(entry => (
                    <tr key={entry.id} className="historico-row">
                      <td>
                        <div className="historico-title-cell">
                          <div className="historico-thumb" style={{ backgroundImage: `url(${entry.image})` }} />
                          <div className="historico-title-info">
                            <strong>{entry.title}</strong>
                            <span>{entry.description}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`historico-type-badge historico-type-${entry.type === "Diário" ? "diario" : "semanal"}`}>
                          {entry.type}
                        </span>
                      </td>
                      <td>
                        <div className="historico-objective-cell">
                          <span className="historico-objective-label">{entry.objective.current} / {entry.objective.total}</span>
                          <div className="historico-mini-bar">
                            <span style={{ width: `${Math.min(100, (entry.objective.current / entry.objective.total) * 100)}%`, background: entry.result === "CONCLUÍDO" ? "var(--green)" : entry.result === "FALHOU" ? "var(--red)" : "var(--gray-500)" }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        {entry.result === "CONCLUÍDO" && (
                          <span className="historico-result historico-result-concluido">
                            <CheckCircle size={13} />
                            Concluído
                          </span>
                        )}
                        {entry.result === "FALHOU" && (
                          <span className="historico-result historico-result-falhou">
                            <XCircle size={13} />
                            Falhou
                          </span>
                        )}
                        {entry.result === "EXPIRADO" && (
                          <span className="historico-result historico-result-expirado">
                            <Clock size={13} />
                            Expirado
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="historico-rewards-col">
                          {entry.rewards.length === 0 ? (
                            <span className="historico-no-reward">—</span>
                          ) : (
                            entry.rewards.map((reward, i) => <RewardThumb key={i} reward={reward} />)
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="historico-date-cell">
                          {entry.date.split(" ").map((line, i) => <span key={i}>{line}</span>)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="historico-pagination">
                <button type="button" className="historico-page-btn"><ChevronLeft size={14} /></button>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button" className={`historico-page-btn${n === 1 ? " active" : ""}`}>{n}</button>
                ))}
                <span className="historico-page-ellipsis">...</span>
                <button type="button" className="historico-page-btn">12</button>
                <button type="button" className="historico-page-btn"><ChevronRight size={14} /></button>
              </div>
            </div>
          )}

          {activeTab !== "Contratos Ativos" && activeTab !== "Contratos Diários" && activeTab !== "Contratos Semanais" && activeTab !== "Histórico" && (
            <div className="contratos-placeholder">
              <h2>Em breve</h2>
              <p>Esta seção está em construção. Novos contratos da categoria &quot;{activeTab}&quot; estarão disponíveis em breve.</p>
            </div>
          )}
        </div>

        <aside className="store-side-panel" aria-label="Painel de contratos">
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

          <div className="contratos-reputation">
            <div className="contratos-reputation-row">
              <div className="contratos-reputation-value">
                <span>Reputação</span>
                <strong>5.250 / 10.000 REP</strong>
              </div>
              <div className="contratos-reputation-badge">
                <span>Mercador</span>
                <span className="contratos-reputation-tier">
                  <Shield size={14} fill="currentColor" />
                  Lendário
                </span>
              </div>
            </div>
            <div className="store-reputation-bar">
              <span style={{ width: "82.5%" }} />
            </div>
          </div>

          {activeTab === "Histórico" && (
            <>
              <div className="store-side-card contratos-side-fill">
                <h2>Resumo do Histórico</h2>
                <div className="historico-summary-grid">
                  <div className="historico-summary-stat historico-stat-green">
                    <span className="historico-stat-icon"><Trophy size={18} /></span>
                    <div><span>Contratos Concluídos</span><strong>128</strong></div>
                  </div>
                  <div className="historico-summary-stat historico-stat-red">
                    <span className="historico-stat-icon"><XCircle size={18} /></span>
                    <div><span>Contratos Falhos</span><strong>32</strong></div>
                  </div>
                  <div className="historico-summary-stat historico-stat-blue">
                    <span className="historico-stat-icon"><BarChart2 size={18} /></span>
                    <div><span>Taxa de Sucesso</span><strong>80%</strong></div>
                  </div>
                  <div className="historico-summary-stat historico-stat-yellow">
                    <span className="historico-stat-icon"><Coins size={18} /></span>
                    <div><span>Recompensas Recebidas</span><strong>245.750</strong></div>
                  </div>
                </div>
              </div>

              <div className="store-side-card contratos-side-fill">
                <div className="contratos-side-head">
                  <h2>Recompensas Recebidas</h2>
                  <button type="button" className="contratos-see-all">
                    Últimos 7 dias <ChevronRight size={12} />
                  </button>
                </div>
                <div className="historico-rewards-received">
                  <div className="historico-reward-icon historico-reward-yellow"><Coins size={20} /><span>25.000</span></div>
                  <div className="historico-reward-icon historico-reward-blue"><Zap size={20} /><span>12.400</span></div>
                  <div className="historico-reward-icon"><Package size={20} /><span>8</span></div>
                  <div className="historico-reward-icon"><Package size={20} /><span>3</span></div>
                  <div className="historico-reward-icon"><Package size={20} /><span>5</span></div>
                </div>
              </div>

              <div className="store-side-card contratos-side-fill">
                <h2>Atividade Recente</h2>
                <div className="historico-activity-list">
                  {historyActivities.map((activity, i) => (
                    <div key={i} className="historico-activity-item">
                      <span className={`historico-activity-icon${activity.result === "CONCLUÍDO" ? " green" : " red"}`}>
                        {activity.result === "CONCLUÍDO" ? <CheckCircle size={14} /> : <XCircle size={14} />}
                      </span>
                      <span className="historico-activity-text">{activity.text}</span>
                      <span className="historico-activity-time">{activity.time}</span>
                    </div>
                  ))}
                </div>
                <button type="button" className="historico-see-all-btn">
                  Ver Todos os Contratos
                </button>
              </div>
            </>
          )}

          {activeTab !== "Histórico" && (
            <>
              <div className="store-side-card contratos-side-fill">
                <h2>Progresso de Reputação</h2>
                <div className="contratos-rep-level">
                  <div className="contratos-rep-icon">
                    <Shield size={22} fill="currentColor" />
                  </div>
                  <div className="contratos-rep-info">
                    <span>Nível Atual: <strong>Mercador Lendário</strong></span>
                    <div className="contratos-bar-row">
                      <div className="store-reputation-bar">
                        <span style={{ width: "82.5%" }} />
                      </div>
                      <span>8.250 / 10.000 REP</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="store-side-card contratos-side-fill">
                <div className="contratos-side-head">
                  <h2>Próximas Recompensas</h2>
                  <button type="button" className="contratos-see-all">
                    Ver Tudo
                    <ChevronRight size={14} />
                  </button>
                </div>
                <div className="contratos-next-rewards">
                  {nextRewards.map((reward, i) => (
                    <div key={i} className="contratos-next-reward">
                      <div className="contratos-next-reward-thumb" style={{ backgroundImage: `url(${reward.image})` }} />
                      <div className="contratos-next-reward-info">
                        <strong>{reward.title}</strong>
                        <span>Ao atingir {reward.threshold} REP</span>
                        <div className="contratos-bar-row">
                          <div className="store-reputation-bar">
                            <span style={{ width: reward.progress }} />
                          </div>
                          <span>{reward.current} / {reward.threshold}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {activeTab === "Contratos Semanais" && (
                <div className="store-side-card contratos-side-fill">
                  <div className="contratos-side-head">
                    <h2>Resumo Semanal</h2>
                    <span className="contratos-renew">Renova em: {formatWeekCountdown(weekSecondsLeft)}</span>
                  </div>
                  <div className="weekly-summary-list">
                    <div className="weekly-summary-item">
                      <span className="weekly-summary-icon">
                        <Trophy size={16} />
                      </span>
                      <div className="weekly-summary-info">
                        <strong>Contratos Concluídos</strong>
                        <span>{weeklyContracts.filter(c => c.done).length} / {weeklyContracts.length}</span>
                      </div>
                    </div>
                    {weeklyContracts.filter(c => c.showInSummary).map((contract, i) => (
                      <div key={i} className="weekly-summary-item">
                        <span className="weekly-summary-icon">
                          <contract.icon size={16} />
                        </span>
                        <div className="weekly-summary-info">
                          <strong>{contract.statLabel}</strong>
                          <span>{contract.progress} / {contract.total}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab !== "Contratos Semanais" && (
                <div className="store-side-card contratos-side-fill">
                  <div className="contratos-side-head">
                    <h2>Contratos Diários</h2>
                    <span className="contratos-renew">Renova em: {formatCountdown(secondsLeft, false)}</span>
                  </div>
                  <div className="contratos-daily-list">
                    {dailyContracts.slice(0, 3).map((contract, i) => (
                      <div key={i} className={`contratos-daily-item${contract.done ? " done" : ""}`}>
                        <div className="contratos-daily-info">
                          <strong>{contract.title}</strong>
                          {contract.done ? (
                            <div className="contratos-daily-progress-row">
                              <span className="contratos-daily-count done">{contract.progress} / {contract.total}</span>
                              <span className="contratos-daily-done">
                                <Check size={12} />
                                Concluído
                              </span>
                            </div>
                          ) : (
                            <span className="contratos-daily-count">{contract.progress} / {contract.total}</span>
                          )}
                        </div>
                        <div className="contratos-daily-rewards">
                          {contract.rewards.slice(0, 2).map((reward, j) => (
                            <DailyRewardBadge key={j} reward={reward} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  )
}

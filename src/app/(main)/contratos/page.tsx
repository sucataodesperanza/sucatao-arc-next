"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { BarChart2, Check, CheckCircle, ChevronLeft, ChevronRight, Clock, Coins, Crosshair, DoorOpen, HelpCircle, Hexagon, Package, Play, RadioTower, Recycle, RefreshCw, Scale, ScrollText, Shield, Skull, Star, Target, Trophy, Truck, Users, Wallet, XCircle, Zap } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import SidePanelUserHeader from "@/components/side-panel-user-header"
import "../../../styles/contratos.css"
import "../../../styles/contratos-venda.css"
import type { Contract as ApiContract } from "@/app/api/contratos/route"
import type { ContractPass } from "@/app/api/contratos/passes/route"
import type { Pass } from "@/app/api/faccoes/recompensas/route"

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

type ContractTierActive = "Básico" | "Avançado" | "Épico" | "Lendário"
type ContractVariantActive = "dourada" | "holografica" | "corrompida"

type ContractObjectiveActive = { text: string; desc: string; done?: boolean; progress?: number; total?: number }
type ContractEnemyActive = { name: string; type: string; dots: number; color: string; image: string }

type Contract = {
  id: string
  type: ContractType
  tier: ContractTierActive
  title: string
  description: string
  image: string
  progress: number
  total: number
  objective: string
  rewards: ContractReward[]
  sucatas: number
  xp: number
  rep?: number
  players: number
  successRate: number
  expiresIn: string
  variant?: ContractVariantActive
  location: string
  story: string
  estimatedTime: string
  bestTimeOfDay: string
  climate: string
  environmentalRisk: string
  objectives: ContractObjectiveActive[]
  bonus: { condition: string; reward: string }
  enemies: ContractEnemyActive[]
  playersCompleted: number
  bestRecord: { time: string; player: string }
}

const tierColorsActive: Record<ContractTierActive, { color: string; border: string }> = {
  Básico:   { color: "#5fa8ff", border: "rgba(91,166,255,0.4)"  },
  Avançado: { color: "#ffd400", border: "rgba(255,196,0,0.4)"   },
  Épico:    { color: "#b477ff", border: "rgba(180,119,255,0.4)" },
  Lendário: { color: "#ff8c42", border: "rgba(255,140,66,0.4)"  },
}

const typeColorsActive: Record<ContractType, string> = {
  Principal: "#F5090D",
  Secundário: "#ffd400",
  Diário: "#F5090D",
  Facção: "#b477ff",
}

const riskColorsActive: Record<string, string> = {
  Baixo: "#3df28b", Médio: "#ffd400", Alto: "#ff8c42", Extremo: "#F5090D",
}

const contracts_UNUSED: Contract[] = [
  {
    id: "1", type: "Principal", tier: "Épico",
    title: "Ameaça Mecânica",
    description: "Elimine 5 unidades ARC Sentinel na região de Speranza para reduzir a presença hostil.",
    image: "/assets/bots/arc_bastion.png",
    progress: 3, total: 5, objective: "Elimine 5 ARC Sentinel",
    rewards: [
      { kind: "currency", amount: 250 },
      { kind: "xp", amount: 500 },
      { kind: "item", name: "Componentes Mecânicos Avançados", image: "/assets/items/advanced_mechanical_components.png", qty: 3 },
    ],
    sucatas: 250, xp: 500, rep: 80, players: 847, successRate: 61, expiresIn: "2d 14h",
    location: "Cidade Alta", story: "Relatórios indicam alta concentração de ARC Sentinel patrulhando as ruínas da Cidade Alta. Neutralize as unidades antes que estabeleçam base permanente.",
    estimatedTime: "20 - 35 min", bestTimeOfDay: "Noite", climate: "Nublado", environmentalRisk: "Alto",
    objectives: [
      { text: "Infiltre-se na área", desc: "Entre na zona de patrulha sem acionar alarmes.", done: true },
      { text: "Elimine 5 ARC Sentinel", desc: "Neutralize todas as unidades patrulheiras.", progress: 3, total: 5 },
      { text: "Extraia com segurança", desc: "Saia da área antes do reforço chegar.", progress: 0, total: 1 },
    ],
    bonus: { condition: "Elimine todos sem morrer", reward: "+80 REP extra" },
    enemies: [
      { name: "ARC Sentinel", type: "Máquina Pesada", dots: 4, color: "#F5090D", image: "/assets/bots/arc_sentinel.png" },
      { name: "ARC Bastion",  type: "Máquina Pesada", dots: 4, color: "#F5090D", image: "/assets/bots/arc_bastion.png" },
      { name: "ARC Scout",    type: "Máquina Leve",   dots: 2, color: "#b477ff", image: "/assets/bots/arc_snitch.png"   },
    ],
    playersCompleted: 847, bestRecord: { time: "14m 12s", player: "Hayashii" },
  },
  {
    id: "2", type: "Secundário", tier: "Avançado",
    title: "Coleta de Recursos",
    description: "Colete 20 unidades de Peças de Metal espalhadas pelo mapa para reforçar o suprimento da base.",
    image: "/assets/bots/arc_spotter.png",
    progress: 12, total: 20, objective: "Colete 20 Peças de Metal",
    rewards: [
      { kind: "currency", amount: 120 },
      { kind: "xp", amount: 200 },
      { kind: "item", name: "Módulos Exodus", image: "/assets/items/exodus_modules.png", qty: 2 },
    ],
    sucatas: 120, xp: 200, players: 2340, successRate: 88, expiresIn: "1d 6h",
    location: "Estação de Trem", story: "Grandes depósitos de metal foram identificados na Estação de Trem. Colete o máximo de materiais antes que outras equipes ou patrulhas ARC cheguem.",
    estimatedTime: "15 - 25 min", bestTimeOfDay: "Manhã", climate: "Claro", environmentalRisk: "Baixo",
    objectives: [
      { text: "Localize os depósitos", desc: "Encontre os pontos de coleta no mapa.", done: true },
      { text: "Colete 20 Peças de Metal", desc: "Extraia todos os materiais disponíveis.", progress: 12, total: 20 },
      { text: "Extraia com os recursos", desc: "Saia da zona com tudo coletado.", progress: 0, total: 1 },
    ],
    bonus: { condition: "Colete tudo sem ser visto", reward: "+20% Sucatas" },
    enemies: [
      { name: "ARC Spotter", type: "Máquina Leve",   dots: 2, color: "#b477ff", image: "/assets/bots/arc_spotter.png" },
      { name: "ARC Leaper",  type: "Máquina Leve",   dots: 3, color: "#b477ff", image: "/assets/bots/arc_leaper.png"  },
    ],
    playersCompleted: 2340, bestRecord: { time: "9m 44s", player: "Myst" },
  },
  {
    id: "3", type: "Diário", tier: "Básico",
    title: "Ajuda aos Raiders",
    description: "Conclua 3 trades ou ajude outros Raiders a sobreviver durante uma extração.",
    image: "/assets/bots/arc_hornet.png",
    progress: 1, total: 3, objective: "Complete 3 trades ou resgates",
    rewards: [
      { kind: "currency", amount: 80 },
      { kind: "xp", amount: 150 },
    ],
    sucatas: 80, xp: 150, players: 4210, successRate: 92, expiresIn: "8h 22m",
    location: "Barragem", story: "A comunidade de Raiders precisa de ajuda. Complete trades ou auxilie outros jogadores em situações de perigo durante extrações.",
    estimatedTime: "5 - 15 min", bestTimeOfDay: "Qualquer", climate: "Variado", environmentalRisk: "Baixo",
    objectives: [
      { text: "Ajude 1 Raider", desc: "Complete um trade ou resgate.", done: true },
      { text: "Complete 3 trades/resgates", desc: "Ajude outros Raiders ao total.", progress: 1, total: 3 },
    ],
    bonus: { condition: "Complete tudo no mesmo dia", reward: "+10% XP bônus" },
    enemies: [
      { name: "Outros Raiders", type: "Jogadores", dots: 2, color: "#5fa8ff", image: "/assets/bots/arc_spotter.png" },
    ],
    playersCompleted: 4210, bestRecord: { time: "4m 30s", player: "Yoda" },
  },
  {
    id: "4", type: "Facção", tier: "Lendário", variant: "dourada" as ContractVariantActive,
    title: "Honra aos Vigilantes",
    description: "Complete uma missão de reconhecimento em nome dos Vigilantes e reporte os dados coletados.",
    image: "/assets/bots/arc_surveyor.png",
    progress: 0, total: 1, objective: "Complete a missão de reconhecimento",
    rewards: [
      { kind: "currency", amount: 400 },
      { kind: "xp", amount: 600 },
      { kind: "item", name: "Componentes Elétricos Avançados", image: "/assets/items/advanced_electrical_components.png", qty: 1 },
    ],
    sucatas: 400, xp: 600, rep: 150, players: 312, successRate: 45, expiresIn: "4d 2h",
    location: "Complexo ARC", story: "Os Vigilantes precisam de dados críticos do Complexo ARC. Esta missão especial é exclusiva para membros de alto escalão da facção. Apenas os mais habilidosos devem aceitar.",
    estimatedTime: "30 - 45 min", bestTimeOfDay: "Madrugada", climate: "Neblina densa", environmentalRisk: "Extremo",
    objectives: [
      { text: "Infiltre-se no Complexo ARC", desc: "Entre sem ser detectado pelos sistemas de segurança.", progress: 0, total: 1 },
      { text: "Colete dados de reconhecimento", desc: "Acesse os terminais de dados dos Vigilantes.", progress: 0, total: 3 },
      { text: "Reporte e extraia", desc: "Transmita os dados e saia com vida.", progress: 0, total: 1 },
    ],
    bonus: { condition: "Complete sem acionar alarmes", reward: "+150 REP Facção" },
    enemies: [
      { name: "ARC Guardian", type: "Máquina Pesada", dots: 4, color: "#F5090D", image: "/assets/bots/arc_sentinel.png"  },
      { name: "ARC Matriarch", type: "Máquina Lendária", dots: 4, color: "#F5090D", image: "/assets/bots/arc_matriarch.png" },
      { name: "ARC Scout",    type: "Máquina Leve",   dots: 3, color: "#b477ff", image: "/assets/bots/arc_snitch.png"   },
    ],
    playersCompleted: 312, bestRecord: { time: "28m 55s", player: "Bruninzor" },
  },
]

const tabs = ["Contratos à Venda", "Contratos Ativos", "Histórico"]

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

const PANEL_KEY = "contratos-panel-open"

// Adapta ApiContract → Contract local (para reuso do JSX existente)
function adapt(c: ApiContract): Contract {
  return {
    id:               c.id,
    type:             c.type as ContractType,
    tier:             c.tier as ContractTierActive,
    title:            c.title,
    description:      c.description,
    image:            c.image_url ?? "/assets/bots/arc_sentinel.png",
    progress:         c.user_progress ?? 0,
    total:            c.total,
    objective:        c.objective,
    rewards:          c.rewards as ContractReward[],
    sucatas:          c.sucatas,
    xp:               c.xp,
    rep:              c.rep ?? undefined,
    players:          c.players_completed,
    successRate:      c.success_rate,
    expiresIn:        c.expires_at ? (() => {
      const diff = new Date(c.expires_at!).getTime() - Date.now()
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      return diff > 0 ? `${d}d ${h}h` : "Expirado"
    })() : "—",
    variant:          (c.variant as ContractVariantActive | undefined) ?? undefined,
    location:         c.location,
    story:            c.story,
    estimatedTime:    c.estimated_time,
    bestTimeOfDay:    c.best_time_of_day,
    climate:          c.climate,
    environmentalRisk: c.environmental_risk,
    objectives:       (c.objectives as ContractObjectiveActive[]).map(o => ({ ...o, progress: undefined, done: false })),
    bonus:            { condition: c.bonus_condition, reward: c.bonus_reward },
    enemies:          c.enemies as ContractEnemyActive[],
    playersCompleted: c.players_completed,
    bestRecord:       { time: c.best_record_time, player: c.best_record_player },
  }
}

export default function ContratosPage() {
  const [panelOpen, setPanelOpen] = useState(true)
  const [activeTab, setActiveTab] = useState(tabs[0])
  const [selectedActiveContract, setSelectedActiveContract] = useState<Contract | null>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [weekSecondsLeft, setWeekSecondsLeft] = useState(0)
  const [acceptedContracts, setAcceptedContracts] = useState<Set<number>>(new Set())
  const [acceptedWeeklyContracts, setAcceptedWeeklyContracts] = useState<Set<number>>(new Set())

  // Contratos à venda (contratos ativos do banco)
  const [apiContracts, setApiContracts] = useState<ApiContract[]>([])
  const [loadingContracts, setLoadingContracts] = useState(true)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

  // Passes à venda
  const [passes, setPasses]       = useState<ContractPass[]>([])
  const [loadingPasses, setLoadingPasses] = useState(false)
  const [buyingId, setBuyingId]   = useState<string | null>(null)
  const [passModal, setPassModal]         = useState<ContractPass | null>(null)
  const [passConfirmStep, setPassConfirmStep] = useState<"points" | "cash" | null>(null)
  const [userPoints, setUserPoints]       = useState<number | null>(null)
  const trackRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Passes ativos do usuário (comprados)
  const [myPasses, setMyPasses]   = useState<Pass[]>([])
  const [loadingMyPasses, setLoadingMyPasses] = useState(false)

  const loadContracts = useCallback(async () => {
    setLoadingContracts(true)
    const res = await fetch("/api/contratos")
    const body = await res.json().catch(() => ({ contracts: [] }))
    setApiContracts(body.contracts ?? [])
    setLoadingContracts(false)
  }, [])

  const loadPasses = useCallback(async () => {
    setLoadingPasses(true)
    const res = await fetch("/api/contratos/passes")
    const body = await res.json().catch(() => ({ passes: [] }))
    setPasses(body.passes ?? [])
    setLoadingPasses(false)
  }, [])

  const loadMyPasses = useCallback(async () => {
    setLoadingMyPasses(true)
    const res = await fetch("/api/contratos/passes/meus")
    const body = await res.json().catch(() => ({ passes: [] }))
    setMyPasses(body.passes ?? [])
    setLoadingMyPasses(false)
  }, [])

  useEffect(() => { loadContracts() }, [loadContracts])

  useEffect(() => {
    if (activeTab === "Contratos à Venda" && passes.length === 0) loadPasses()
    if (activeTab === "Contratos Ativos" && myPasses.length === 0) loadMyPasses()
  }, [activeTab])

  useEffect(() => {
    const stored = localStorage.getItem(PANEL_KEY)
    if (stored !== null) setPanelOpen(stored === "true")
  }, [])

  function setPanel(val: boolean) {
    setPanelOpen(val)
    localStorage.setItem(PANEL_KEY, String(val))
  }

  useEffect(() => {
    setSecondsLeft(getSecondsUntilMidnight())
    setWeekSecondsLeft(getSecondsUntilNextWeek())
    const interval = setInterval(() => {
      setSecondsLeft(prev => (prev > 0 ? prev - 1 : getSecondsUntilMidnight()))
      setWeekSecondsLeft(prev => (prev > 0 ? prev - 1 : getSecondsUntilNextWeek()))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  async function handleAcceptActive(contractId: string) {
    setAcceptingId(contractId)
    const res = await fetch(`/api/contratos/${contractId}/accept`, { method: "POST" })
    setAcceptingId(null)
    if (res.ok || res.status === 409) await loadContracts()
  }

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
    <div className={`contratos-page${panelOpen ? "" : " contratos-page--panel-closed"}`}>
      <div className={`contratos-layout${panelOpen ? "" : " contratos-layout--no-panel"}`}>
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

          {activeTab === "Contratos à Venda" && (
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

              <div className="cv-cards-scroll" style={{ paddingBottom: 8 }}>
                {loadingContracts ? (
                  <p style={{ color: "var(--gray-500)", fontSize: 13, padding: 24 }}>Carregando contratos...</p>
                ) : apiContracts.length === 0 ? (
                  <p style={{ color: "var(--gray-500)", fontSize: 13, padding: 24 }}>Nenhum contrato ativo no momento.</p>
                ) : null}
                {apiContracts.map(raw => { const contract = adapt(raw);
                  const tier = tierColorsActive[contract.tier]
                  const typeColor = typeColorsActive[contract.type]
                  const pct = Math.round((contract.progress / contract.total) * 100)
                  return (
                    <div key={contract.id} className={`cv-card${contract.variant ? ` cv-card--${contract.variant}` : ""}`}>
                      {contract.variant && <div className="cv-card-frame" />}
                      <div className="cv-card-bg">
                        <div className="cv-card-bg-img" style={{ backgroundImage: `url(${contract.image})` }} />
                        {contract.variant && <div className="cv-skull-badge"><Skull size={14} /></div>}
                      </div>
                      <div className="cv-card-badges">
                        <span className="cv-card-type" style={{ color: typeColor }}>{contract.type}</span>
                        <span className="cv-card-tier" style={{ color: tier.color, borderColor: tier.border }}>{contract.tier}</span>
                      </div>
                      <div className="cv-card-body">
                        <strong className="cv-card-name">{contract.title}</strong>
                        <p className="cv-card-desc">{contract.description}</p>
                        <div className="cv-card-section-label">Objetivo</div>
                        <div className="cv-card-objective">
                          <Target size={11} />{contract.objective}
                        </div>
                        <div className="cv-card-section-label">Recompensas</div>
                        <div className="cv-card-rewards">
                          <span style={{ color: "#ffd400" }}><Coins size={11} />{contract.sucatas}</span>
                          <span style={{ color: "#5fa8ff" }}><Zap size={11} />{contract.xp}</span>
                          {contract.rep && <span style={{ color: "#b477ff" }}><Star size={11} />{contract.rep}</span>}
                        </div>
                        <div className="cv-card-section-label">Progresso</div>
                        <div className="ca-progress-wrap">
                          <div className="ca-progress-bar">
                            <span style={{ width: `${pct}%` }} />
                          </div>
                          <span className="ca-progress-label">{contract.progress}/{contract.total}</span>
                        </div>
                        <div className="cv-card-footer-meta">
                          <span className="cv-card-players"><Clock size={11} />{contract.expiresIn}</span>
                          <span className="cv-card-success" style={{ color: contract.successRate >= 70 ? "#3df28b" : contract.successRate >= 50 ? "#ffd400" : "#F5090D" }}>
                            {contract.successRate}%
                          </span>
                        </div>
                        <div className="cv-card-actions">
                          <button type="button" className="cv-card-details" onClick={() => setSelectedActiveContract(contract)}>
                            Ver Detalhes
                          </button>
                          {raw.user_status === "active" ? (
                            <span style={{ fontSize: 10, fontWeight: 950, color: "var(--yellow)", textTransform: "uppercase" }}>Em progresso</span>
                          ) : raw.user_status === "completed" ? (
                            <span style={{ fontSize: 10, fontWeight: 950, color: "var(--green)", textTransform: "uppercase" }}>Concluído</span>
                          ) : (
                            <button type="button" className="btn-aceitar"
                              disabled={acceptingId === raw.id}
                              onClick={() => handleAcceptActive(raw.id)}>
                              <Zap size={14} fill="currentColor" />
                              {acceptingId === raw.id ? "Aceitando..." : "Aceitar"}
                            </button>
                          )}
                        </div>
                      </div>
                      {contract.variant && (
                        <div className="cv-card-variant-footer">
                          ‹ {contract.variant === "dourada" ? "Versão Dourada" : contract.variant === "holografica" ? "Versão Holográfica" : "Versão Corrompida"} ›
                        </div>
                      )}
                    </div>
                  )})}
              </div>

              {/* Contract detail modal */}
              {selectedActiveContract && (
                <div className="cdm-overlay" onClick={() => setSelectedActiveContract(null)}>
                  <div className={`cdm-modal${selectedActiveContract.variant ? ` cdm-modal--${selectedActiveContract.variant}` : ""}`} onClick={e => e.stopPropagation()}>
                    <button className="cdm-close" type="button" onClick={() => setSelectedActiveContract(null)}>✕</button>
                    <div className="cdm-left">
                      <div className="cdm-hero" style={{ backgroundImage: `url(${selectedActiveContract.image})` }}>
                        <div className="cdm-hero-overlay" />
                        <div className="cdm-hero-content">
                          <span className="cdm-op-badge">{selectedActiveContract.type}</span>
                          <h2 className="cdm-title">{selectedActiveContract.title}</h2>
                          <span className="cdm-location"><span>📍</span>{selectedActiveContract.location}</span>
                        </div>
                      </div>
                      <p className="cdm-description">{selectedActiveContract.story}</p>
                      <div className="cdm-meta-row">
                        <div className="cdm-meta-item">
                          <span className="cdm-meta-label">Dificuldade</span>
                          <span className="cdm-meta-val" style={{ color: riskColorsActive[selectedActiveContract.environmentalRisk] }}>
                            <Skull size={12} /> {selectedActiveContract.environmentalRisk}
                          </span>
                        </div>
                        <div className="cdm-meta-item">
                          <span className="cdm-meta-label">Tier</span>
                          <span className="cdm-meta-val" style={{ color: tierColorsActive[selectedActiveContract.tier].color }}>
                            {selectedActiveContract.tier}
                          </span>
                        </div>
                        <div className="cdm-meta-item">
                          <span className="cdm-meta-label">Jogadores</span>
                          <span className="cdm-meta-val"><Users size={12} />{selectedActiveContract.players}</span>
                        </div>
                        <div className="cdm-meta-item">
                          <span className="cdm-meta-label">Expira em</span>
                          <span className="cdm-meta-val" style={{ color: "#ffd400" }}><Clock size={12} />{selectedActiveContract.expiresIn}</span>
                        </div>
                      </div>
                      <div className="cdm-about">
                        <span className="cdm-section-label">Sobre a Operação</span>
                        <p>{selectedActiveContract.story}</p>
                      </div>
                      <div className="cdm-conditions">
                        <div className="cdm-condition-chip"><span className="cdm-chip-label">⏱ Tempo Estimado</span><span>{selectedActiveContract.estimatedTime}</span></div>
                        <div className="cdm-condition-chip"><span className="cdm-chip-label">🌙 Melhor Horário</span><span>{selectedActiveContract.bestTimeOfDay}</span></div>
                        <div className="cdm-condition-chip"><span className="cdm-chip-label">🌤 Clima</span><span>{selectedActiveContract.climate}</span></div>
                        <div className="cdm-condition-chip cdm-chip-warn"><span className="cdm-chip-label">⚠ Risco Ambiental</span><span style={{ color: riskColorsActive[selectedActiveContract.environmentalRisk] }}>{selectedActiveContract.environmentalRisk}</span></div>
                      </div>
                      <div className="cdm-mini-map">
                        <span className="cdm-section-label">Local da Operação</span>
                        <div className="cdm-mini-map-body" style={{ backgroundImage: "url(/assets/maps/buried_city.png)" }} />
                        <div className="cdm-mini-map-info">
                          <strong>{selectedActiveContract.location}</strong>
                          <span>Setor Leste</span>
                          <button type="button" className="cdm-map-btn">▷ Ver no Mapa</button>
                        </div>
                      </div>
                    </div>
                    <div className="cdm-right">
                      <div className="cdm-section">
                        <span className="cdm-section-label">Objetivos</span>
                        <div className="cdm-objectives">
                          {selectedActiveContract.objectives.map((obj, i) => (
                            <div key={i} className={`cdm-objective${obj.done ? " cdm-objective--done" : ""}`}>
                              <div className="cdm-obj-num">{obj.done ? "✓" : `0${i + 1}`}</div>
                              <div className="cdm-obj-body"><strong>{obj.text}</strong><span>{obj.desc}</span></div>
                              <div className="cdm-obj-progress">{!obj.done && obj.total ? `${obj.progress ?? 0} / ${obj.total}` : ""}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="cdm-section">
                        <span className="cdm-section-label">Recompensas Estimadas</span>
                        <div className="cdm-rewards-grid">
                          <div className="cdm-reward-item" style={{ color: "#ffd400" }}><Coins size={16} /><strong>{selectedActiveContract.sucatas}</strong><span>Sucatas</span></div>
                          <div className="cdm-reward-item" style={{ color: "#5fa8ff" }}><Zap size={16} /><strong>{selectedActiveContract.xp}</strong><span>XP</span></div>
                          {selectedActiveContract.rep && <div className="cdm-reward-item" style={{ color: "#b477ff" }}><Star size={16} /><strong>{selectedActiveContract.rep}</strong><span>REP</span></div>}
                          <div className="cdm-reward-bonus">
                            <span className="cdm-bonus-label">Bônus de Sucesso</span>
                            <span className="cdm-bonus-condition">{selectedActiveContract.bonus.condition}</span>
                            <span className="cdm-bonus-reward" style={{ color: "#3df28b" }}>{selectedActiveContract.bonus.reward}</span>
                          </div>
                        </div>
                      </div>
                      <div className="cdm-section">
                        <span className="cdm-section-label">Inimigos Principais</span>
                        <div className="cdm-enemies">
                          {selectedActiveContract.enemies.map((enemy, i) => (
                            <div key={i} className="cdm-enemy">
                              <div className="cdm-enemy-avatar"><div className="cdm-enemy-bg" style={{ backgroundImage: `url(${enemy.image})` }} /></div>
                              <strong>{enemy.name}</strong><span>{enemy.type}</span>
                              <div className="cdm-enemy-dots">
                                {Array.from({ length: 4 }).map((_, d) => (
                                  <span key={d} className={`cdm-dot${d < enemy.dots ? " on" : ""}`} style={d < enemy.dots ? { background: enemy.color } : {}} />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="cdm-stats-row">
                        <div className="cdm-stat"><span>Jogadores que completaram</span><strong>{selectedActiveContract.playersCompleted.toLocaleString("pt-BR")}</strong></div>
                        <div className="cdm-stat"><span>Taxa de sucesso</span><strong style={{ color: selectedActiveContract.successRate >= 70 ? "#3df28b" : selectedActiveContract.successRate >= 50 ? "#ffd400" : "#F5090D" }}>{selectedActiveContract.successRate}%</strong></div>
                        <div className="cdm-stat"><span>Melhor tempo registrado</span><strong>{selectedActiveContract.bestRecord.time}</strong><span style={{ fontSize: 10, color: "var(--gray-500)" }}>por {selectedActiveContract.bestRecord.player}</span></div>
                      </div>
                      <div className="cdm-buy-row">
                        <div className="cdm-cost">
                          <span>Progresso Atual</span>
                          <strong style={{ color: "#3df28b", fontSize: 18 }}>{selectedActiveContract.progress} / {selectedActiveContract.total}</strong>
                        </div>
                        <button type="button" className="btn-aceitar" onClick={() => setSelectedActiveContract(null)}>
                          <Zap size={14} fill="currentColor" />
                          Acompanhar Contrato
                        </button>
                      </div>
                      <p className="cdm-disclaimer">Contrato ativo — progresso salvo automaticamente.</p>
                    </div>
                  </div>
                </div>
              )}

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

              <div className="hist-cards-grid">
                {historyEntries.map(entry => {
                  const stampColor = entry.result === "CONCLUÍDO" ? "#3df28b" : entry.result === "FALHOU" ? "#F5090D" : "#8b99aa"
                  const pct = Math.min(100, Math.round((entry.objective.current / entry.objective.total) * 100))
                  const typeColor = entry.type === "Diário" ? "#F5090D" : "#ffd400"
                  const sucatas = entry.rewards.find(r => r.kind === "currency")
                  const xp      = entry.rewards.find(r => r.kind === "xp")
                  return (
                    <div key={entry.id} className="hist-card">
                      <div className="hist-card-bg">
                        <div className="hist-card-bg-img" style={{ backgroundImage: `url(${entry.image})` }} />
                        {/* Diagonal stamp */}
                        <div className="hist-stamp" style={{ color: stampColor, borderColor: stampColor }}>
                          <span className="hist-stamp-text">{entry.result}</span>
                        </div>
                      </div>
                      <div className="cv-card-badges">
                        <span className="cv-card-type" style={{ color: typeColor }}>{entry.type}</span>
                        <span className="hist-card-date">{entry.date}</span>
                      </div>
                      <div className="cv-card-body">
                        <strong className="cv-card-name">{entry.title}</strong>
                        <p className="cv-card-desc">{entry.description}</p>
                        <div className="cv-card-section-label">Objetivo</div>
                        <div className="ca-progress-wrap">
                          <div className="ca-progress-bar">
                            <span style={{ width: `${pct}%`, background: entry.result === "CONCLUÍDO" ? "#3df28b" : entry.result === "FALHOU" ? "#F5090D" : "#8b99aa" }} />
                          </div>
                          <span className="ca-progress-label">{entry.objective.current}/{entry.objective.total}</span>
                        </div>
                        {entry.rewards.length > 0 && (
                          <>
                            <div className="cv-card-section-label">Recompensas</div>
                            <div className="cv-card-rewards">
                              {sucatas && <span style={{ color: "#ffd400" }}><Coins size={11} />{(sucatas as { kind: "currency"; amount: number }).amount}</span>}
                              {xp      && <span style={{ color: "#5fa8ff" }}><Zap size={11} />{(xp as { kind: "xp"; amount: number }).amount}</span>}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>


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

          {/* ── Aba: Contratos à Venda (passes disponíveis para compra) ── */}
          {activeTab === "Contratos à Venda" && (
            <div>
              {loadingPasses ? (
                <p style={{ color: "var(--gray-500)", padding: 24 }}>Carregando contratos...</p>
              ) : passes.length === 0 ? (
                <div className="contratos-placeholder">
                  <h2>Nenhum contrato disponível</h2>
                  <p>Novos contratos serão lançados em breve. Fique de olho!</p>
                </div>
              ) : (
                <div className="cv-cards-scroll" style={{ paddingBottom: 8 }}>
                  {passes.map(pass => {
                    const TYPE_LABEL: Record<string, string> = { daily: "Diário", weekly: "Semanal", monthly: "Mensal" }
                    const TYPE_COLOR: Record<string, string> = { daily: "#3df28b", weekly: "#ffd400", monthly: "#b477ff" }
                    const typeColor = TYPE_COLOR[pass.type] ?? "#5fa8ff"
                    const pct = pass.missions_count > 0 ? Math.round((pass.user_completed / pass.missions_count) * 100) : 0
                    const expiresIn = (() => {
                      const diff = new Date(pass.expires_at).getTime() - Date.now()
                      if (diff <= 0) return "Expirado"
                      const d = Math.floor(diff / 86400000)
                      const h = Math.floor((diff % 86400000) / 3600000)
                      return `${d}d ${h}h`
                    })()
                    return (
                      <div key={pass.id} className="cv-card">
                        <div className="cv-card-bg">
                          <div className="cv-card-bg-img" style={{ backgroundImage: `url(${pass.image_url ?? "/assets/bots/arc_sentinel.png"})` }} />
                        </div>
                        <div className="cv-card-badges">
                          <span className="cv-card-type" style={{ color: typeColor }}>{TYPE_LABEL[pass.type] ?? pass.type}</span>
                          <span className="cv-card-tier" style={{ color: typeColor, borderColor: `color-mix(in srgb, ${typeColor} 40%, transparent)` }}>
                            {pass.missions_count} MISSÃO{pass.missions_count !== 1 ? "ÕES" : ""}
                          </span>
                        </div>
                        <div className="cv-card-body">
                          <strong className="cv-card-name">{pass.title}</strong>
                          <p className="cv-card-desc">{pass.description}</p>
                          <div className="cv-card-section-label">Objetivo</div>
                          <div className="cv-card-objective">
                            <Target size={11} />Complete {pass.missions_count} missões sequenciais
                          </div>
                          <div className="cv-card-section-label">Recompensas</div>
                          <div className="cv-card-rewards">
                            {pass.total_points > 0 && <span style={{ color: "#ffd400" }}><Coins size={11} />{pass.total_points.toLocaleString("pt-BR")} pts</span>}
                            {pass.price_points > 0 && <span style={{ color: typeColor }}><Zap size={11} />{pass.price_points.toLocaleString("pt-BR")} pts</span>}
                            {pass.price_real > 0 && <span style={{ color: "#3df28b" }}>R$ {Number(pass.price_real).toFixed(2).replace(".", ",")}</span>}
                          </div>
                          <div className="cv-card-section-label">Progresso</div>
                          <div className="ca-progress-wrap">
                            <div className="ca-progress-bar">
                              <span style={{ width: `${pct}%` }} />
                            </div>
                            <span className="ca-progress-label">{pass.user_completed}/{pass.missions_count}</span>
                          </div>
                          <div className="cv-card-footer-meta">
                            <span className="cv-card-players"><Clock size={11} />{expiresIn}</span>
                            <span style={{ color: pct === 100 ? "#3df28b" : typeColor }}>{pct}%</span>
                          </div>
                          <div className="cv-card-actions">
                            <button type="button" className="cv-card-details" onClick={() => { setPassModal(pass); setPassConfirmStep(null); fetch("/api/profile/points").then(r => r.json()).then(d => setUserPoints(d.points ?? null)).catch(() => {}) }}>
                              Ver Detalhes
                            </button>
                          </div>
                          {pass.purchased ? (
                            <span style={{ display: "block", textAlign: "center", marginTop: 8, fontSize: 11, fontWeight: 950, color: "#3df28b", textTransform: "uppercase" }}>
                              {pct === 100 ? "✓ Concluído" : "Em Progresso"}
                            </span>
                          ) : (
                            <button type="button" className="btn-aceitar" style={{ marginTop: 8 }}
                              disabled={buyingId === pass.id}
                              onClick={() => { setPassModal(pass); setPassConfirmStep(null); fetch("/api/profile/points").then(r => r.json()).then(d => setUserPoints(d.points ?? null)).catch(() => {}) }}>
                              <Zap size={14} fill="currentColor" />
                              {buyingId === pass.id ? "Aceitando..." : "ACEITAR"}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Aba: Contratos Ativos (passes comprados com missões) ── */}
          {activeTab === "Contratos Ativos" && (
            <div>
              {loadingMyPasses ? (
                <p style={{ color: "var(--gray-500)", padding: 24 }}>Carregando seus contratos...</p>
              ) : myPasses.length === 0 ? (
                <div className="contratos-placeholder">
                  <h2>Nenhum contrato ativo</h2>
                  <p>Vá para a aba <button type="button" onClick={() => setActiveTab("Contratos à Venda")} style={{ background: "none", border: "none", color: "var(--cyan)", cursor: "pointer", font: "inherit", textDecoration: "underline" }}>Contratos à Venda</button> para adquirir um contrato.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 24 }}>
                  {myPasses.map(pass => {
                    const TYPE_COLOR: Record<string, string> = { daily: "#3df28b", weekly: "#ffd400", monthly: "#b477ff" }
                    const TYPE_LABEL: Record<string, string> = { daily: "Diário", weekly: "Semanal", monthly: "Mensal" }
                    const passColor = TYPE_COLOR[pass.type] ?? "#5fa8ff"
                    const expiresIn = (() => {
                      const diff = new Date(pass.expires_at).getTime() - Date.now()
                      if (diff <= 0) return "Expirado"
                      const d = Math.floor(diff / 86400000); const h = Math.floor((diff % 86400000) / 3600000)
                      return d > 0 ? `${d}d ${h}h` : `${h}h`
                    })()
                    const pct = pass.missions.length > 0 ? Math.round((pass.total_completed / pass.missions.length) * 100) : 0
                    const active = pass.missions.find(m => m.status === "active")

                    return (
                      <div key={pass.id} className="ca-pass-wrap">
                        {/* ── Header cinematográfico ── */}
                        <div className="ca-pass-header">
                          {(pass as any).image_url && <div className="ca-pass-header-bg" style={{ backgroundImage: `url(${(pass as any).image_url})` }} />}
                          <div className="ca-pass-header-overlay" />
                          <div className="ca-pass-header-content">
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", padding: "3px 10px", borderRadius: 4, background: `color-mix(in srgb, ${passColor} 20%, transparent)`, color: passColor, border: `1px solid color-mix(in srgb, ${passColor} 35%, transparent)`, alignSelf: "flex-start" }}>
                                {TYPE_LABEL[pass.type] ?? pass.type}
                              </span>
                              <h2 className="ca-pass-title">{pass.title}</h2>
                            </div>
                            <div className="ca-pass-meta">
                              <div style={{ textAlign: "right" }}>
                                <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Progresso</p>
                                <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 950, color: passColor }}>{pass.total_completed}<span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>/{pass.missions.length}</span></p>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Expira em</p>
                                <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 950, color: "var(--paper)" }}>{expiresIn}</p>
                              </div>
                            </div>
                          </div>
                          {/* Barra de progresso geral */}
                          <div style={{ position: "relative", zIndex: 1, marginTop: 12, height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: passColor, borderRadius: 2, transition: "width 0.5s ease" }} />
                          </div>
                        </div>

                        {/* ── Trilha de missões ── */}
                        <div
                          ref={el => { trackRefs.current[pass.id] = el }}
                          className="ca-track-wrap"
                          style={pass.type === "monthly"
                            ? { overflowX: "auto", cursor: "grab", userSelect: "none" }
                            : { overflowX: "visible" }}
                          onMouseDown={pass.type === "monthly" ? e => {
                            const el = trackRefs.current[pass.id]
                            if (!el) return
                            el.style.cursor = "grabbing"
                            const startX = e.pageX - el.offsetLeft
                            const startScroll = el.scrollLeft
                            const onMove = (ev: MouseEvent) => { el.scrollLeft = startScroll - (ev.pageX - el.offsetLeft - startX) }
                            const onUp = () => { el.style.cursor = "grab"; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
                            window.addEventListener("mousemove", onMove)
                            window.addEventListener("mouseup", onUp)
                          } : undefined}
                        >
                          <div className="ca-track" style={pass.type === "monthly" ? { minWidth: "max-content", width: "auto" } : { width: "100%" }}>
                            {pass.missions.map((m, i) => {
                              const isMilestone = m.position % 5 === 0
                              const nodeSize = 52
                              const nodeColor = m.status === "locked" ? "rgba(255,255,255,0.12)" : passColor
                              const nodeBg = m.status === "completed"
                                ? `color-mix(in srgb, ${passColor} 30%, transparent)`
                                : m.status === "active"
                                ? `color-mix(in srgb, ${passColor} 12%, #0a0e16)`
                                : "rgba(255,255,255,0.03)"
                              const isNext = i < pass.missions.length - 1
                              const nextDone = isNext && (pass.missions[i + 1].status === "completed" || pass.missions[i + 1].status === "active")
                              return (
                                <div key={m.id} className="ca-track-node-wrap">
                                  <div className="ca-track-node-col" style={pass.type === "monthly" ? { width: 72 } : { flex: 1, minWidth: 0 }}>
                                    {/* Nó — mostra recompensa dentro ou ✓ */}
                                    <div
                                      className={`ca-track-node${m.status === "active" ? " active" : ""}`}
                                      style={{
                                        width: nodeSize, height: nodeSize,
                                        background: nodeBg,
                                        borderColor: nodeColor,
                                        borderWidth: m.status === "active" ? 3 : 2,
                                        boxShadow: m.status === "active" ? `0 0 20px color-mix(in srgb, ${passColor} 50%, transparent)` : "none",
                                        ["--node-color-alpha" as string]: `color-mix(in srgb, ${passColor} 25%, transparent)`,
                                        ["--node-color-mid" as string]: `color-mix(in srgb, ${passColor} 45%, transparent)`,
                                        flexDirection: "column" as const,
                                        gap: 1,
                                      }}>
                                      {m.status === "completed" ? (
                                        <span style={{ fontSize: 20, color: passColor, fontWeight: 950 }}>✓</span>
                                      ) : isMilestone && m.item_reward ? (
                                        <span style={{ fontSize: 16 }}>🎁</span>
                                      ) : m.points_reward > 0 ? (
                                        <span style={{ fontSize: 11, fontWeight: 950, color: m.status === "locked" ? "rgba(255,255,255,0.25)" : passColor, lineHeight: 1, textAlign: "center" as const }}>
                                          +{m.points_reward}
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: 14, fontWeight: 950, color: m.status === "locked" ? "rgba(255,255,255,0.2)" : passColor }}>
                                          {m.position}
                                        </span>
                                      )}
                                    </div>
                                    {/* Label: Dia X */}
                                    <span className="ca-track-label" style={{ color: m.status === "locked" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.5)", fontSize: 10 }}>
                                      Dia {m.position}
                                    </span>
                                  </div>
                                  {/* Conector */}
                                  {isNext && (
                                    <div className="ca-track-connector" style={{
                                      ...(pass.type === "monthly" ? { width: 24 } : { flex: 1 }),
                                      background: nextDone
                                        ? `color-mix(in srgb, ${passColor} 55%, transparent)`
                                        : "rgba(255,255,255,0.07)",
                                    }} />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* ── Card missão atual ── */}
                        {pass.missions.length === 0 ? (
                          <div style={{ padding: "12px 24px 20px", fontSize: 12, color: "var(--gray-500)" }}>Nenhuma missão cadastrada ainda.</div>
                        ) : !active ? (
                          <div style={{ padding: "16px 24px 20px", display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 22 }}>🏆</span>
                            <span style={{ fontSize: 14, fontWeight: 950, color: "#3df28b" }}>Todas as missões concluídas!</span>
                          </div>
                        ) : active.unlocks_at ? (
                          <div style={{ margin: "0 20px 20px", padding: "14px 18px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, display: "flex", alignItems: "center", gap: 14 }}>
                            <span style={{ fontSize: 28, flexShrink: 0 }}>🔒</span>
                            <div>
                              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Próxima missão disponível em</p>
                              <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 950, color: passColor }}>
                                {Math.floor((new Date(active.unlocks_at).getTime() - Date.now()) / 3600000)}h{" "}
                                {Math.floor(((new Date(active.unlocks_at).getTime() - Date.now()) % 3600000) / 60000)}m
                              </p>
                              <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Renova à meia-noite (BRT) · {active.title}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="ca-mission-card" style={{ margin: "0 20px 20px" }}>
                            <div className="ca-mission-card-inner" style={{ background: `color-mix(in srgb, ${passColor} 7%, #0a0e16)`, border: `1px solid color-mix(in srgb, ${passColor} 22%, transparent)` }}>
                              {/* Badges */}
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 9, fontWeight: 950, textTransform: "uppercase", padding: "2px 8px", borderRadius: 3, background: `color-mix(in srgb, ${passColor} 20%, transparent)`, color: passColor, border: `1px solid color-mix(in srgb, ${passColor} 35%, transparent)`, letterSpacing: "0.07em" }}>
                                  {TYPE_LABEL[pass.type]} · Missão {active.position}/{pass.missions.length}
                                </span>
                                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginLeft: "auto" }}>Contrato expira em {expiresIn}</span>
                              </div>
                              {/* Título */}
                              <div>
                                <p style={{ margin: 0, fontSize: 9, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)" }}>Missão Atual</p>
                                <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 950, color: "var(--paper)" }}>{active.title}</p>
                                {active.description && <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--paper-dim)" }}>{active.description}</p>}
                              </div>
                              {/* Barra de progresso */}
                              <div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11 }}>
                                  <span style={{ color: "rgba(255,255,255,0.4)" }}>Progresso</span>
                                  <span style={{ color: passColor, fontWeight: 950 }}>0 / {active.total}</span>
                                </div>
                                <div className="ca-mission-progress-bar">
                                  <div className="ca-mission-progress-fill" style={{ width: "0%", background: passColor }} />
                                </div>
                              </div>
                              {/* Recompensa */}
                              {active.points_reward > 0 && (
                                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                                  <Coins size={13} style={{ color: "#ffd400" }} />
                                  <span style={{ color: "#ffd400", fontWeight: 950 }}>+{active.points_reward.toLocaleString("pt-BR")} pts</span>
                                  <span style={{ color: "rgba(255,255,255,0.3)" }}>ao completar</span>
                                  {active.item_reward && <><span style={{ color: "rgba(255,255,255,0.2)" }}>·</span><span style={{ color: "var(--cyan)" }}>🎁 Item especial</span></>}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab !== "Contratos à Venda" && activeTab !== "Contratos Ativos" && activeTab !== "Contratos Diários" && activeTab !== "Contratos Semanais" && activeTab !== "Histórico" && (
            <div className="contratos-placeholder">
              <h2>Em breve</h2>
              <p>Esta seção está em construção. Novos contratos da categoria &quot;{activeTab}&quot; estarão disponíveis em breve.</p>
            </div>
          )}

          {/* ── Dica do Contrato — rodapé fixo da área principal ── */}
          <div className="contratos-tip">
            <div className="contratos-tip-image" style={{ backgroundImage: "url(/assets/bots/arc_wasp.png)" }} />
            <div>
              <h2>Dica do Contrato</h2>
              <p>Contratos do tipo Facção rendem mais reputação para sua facção escolhida. Priorize-os se quiser subir de nível mais rápido entre os Raiders.</p>
            </div>
          </div>
        </div>

        <aside className={`store-side-panel${panelOpen ? "" : " store-side-panel--hidden"}`} aria-label="Painel de contratos">
          <SidePanelUserHeader onClose={() => setPanel(false)} showStats={false} />

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

        <button type="button" className="store-panel-reopen" aria-label="Abrir painel" onClick={() => setPanel(true)}>
          <ChevronLeft size={16} strokeWidth={2.5} />
          <span>Painel</span>
        </button>
      </div>

      {/* ── Modal de contrato (2 etapas) ── */}
      {passModal && (
        <div className="cdm-overlay" onClick={() => { setPassModal(null); setPassConfirmStep(null) }}>
          <div className="cdm-modal" style={{ maxWidth: 480, gridTemplateColumns: "1fr" }} onClick={e => e.stopPropagation()}>
            <button className="cdm-close" type="button" onClick={() => { setPassModal(null); setPassConfirmStep(null) }}>✕</button>
            <div className="cdm-left" style={{ padding: 24 }}>

              {/* Imagem / header */}
              {passModal.image_url && (
                <div className="cdm-hero" style={{ backgroundImage: `url(${passModal.image_url})`, borderRadius: 8, marginBottom: 16 }}>
                  <div className="cdm-hero-overlay" />
                  <div className="cdm-hero-content">
                    <span className="cdm-op-badge">{({ daily: "Diário", weekly: "Semanal", monthly: "Mensal" } as Record<string, string>)[passModal.type] ?? passModal.type}</span>
                    <h2 className="cdm-title">{passModal.title}</h2>
                  </div>
                </div>
              )}
              {!passModal.image_url && <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 950 }}>{passModal.title}</h2>}

              {/* Info do passe */}
              <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "var(--gray-500)" }}>
                  {({ daily: "Diário", weekly: "Semanal", monthly: "Mensal" } as Record<string, string>)[passModal.type]} · <strong style={{ color: "var(--paper)" }}>{passModal.missions_count} missões</strong>
                </span>
                {passModal.total_points > 0 && (
                  <span style={{ fontSize: 11, color: "var(--gray-500)" }}>
                    Recompensas: <strong style={{ color: "#ffd400" }}>{passModal.total_points.toLocaleString("pt-BR")} pts</strong>
                  </span>
                )}
              </div>

              {passModal.purchased ? (
                /* Já comprado */
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 950, color: "#3df28b" }}>✓ Você já possui este contrato</p>
                  <button type="button" onClick={() => { setPassModal(null); setPassConfirmStep(null); setActiveTab("Contratos Ativos") }}
                    style={{ marginTop: 12, border: "1px solid rgba(61,242,139,0.4)", background: "rgba(61,242,139,0.08)", color: "#3df28b", padding: "10px 24px", fontSize: 12, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 8, font: "inherit" }}>
                    Ver Meu Contrato →
                  </button>
                </div>

              ) : passConfirmStep === null ? (
                /* ── Etapa 1: escolha de pagamento ── */
                <div style={{ display: "grid", gap: 10 }}>
                  <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)", letterSpacing: "0.06em" }}>Como deseja pagar?</p>
                  {passModal.price_points > 0 && (
                    <button type="button"
                      onClick={() => setPassConfirmStep("points")}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(255,212,0,0.35)", background: "rgba(255,212,0,0.07)", color: "var(--paper)", padding: "14px 16px", fontSize: 13, fontWeight: 950, cursor: "pointer", borderRadius: 8, font: "inherit", transition: "background 0.15s" }}>
                      <span>🪙 Comprar com Sucatas</span>
                      <span style={{ color: "#ffd400", fontWeight: 950 }}>{passModal.price_points.toLocaleString("pt-BR")} pts</span>
                    </button>
                  )}
                  {passModal.price_real > 0 && (
                    <button type="button"
                      onClick={() => setPassConfirmStep("cash")}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(61,242,139,0.35)", background: "rgba(61,242,139,0.07)", color: "var(--paper)", padding: "14px 16px", fontSize: 13, fontWeight: 950, cursor: "pointer", borderRadius: 8, font: "inherit", transition: "background 0.15s" }}>
                      <span>🏦 Pagar com PIX</span>
                      <span style={{ color: "#3df28b", fontWeight: 950 }}>R$ {Number(passModal.price_real).toFixed(2).replace(".", ",")}</span>
                    </button>
                  )}
                </div>

              ) : (
                /* ── Etapa 2: confirmação ── */
                <div>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                    <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)", letterSpacing: "0.06em" }}>Resumo da compra</p>

                    <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--paper-dim)" }}>Contrato</span>
                        <strong style={{ color: "var(--paper)" }}>{passModal.title}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--paper-dim)" }}>Tipo</span>
                        <span style={{ color: "var(--paper)" }}>
                          {({ daily: "Diário", weekly: "Semanal", monthly: "Mensal" } as Record<string, string>)[passModal.type]} · {passModal.missions_count} missões
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                        <span style={{ color: "var(--paper-dim)" }}>Valor</span>
                        <strong style={{ color: passConfirmStep === "points" ? "#ffd400" : "#3df28b", fontSize: 15 }}>
                          {passConfirmStep === "points"
                            ? `${passModal.price_points.toLocaleString("pt-BR")} pts`
                            : `R$ ${Number(passModal.price_real).toFixed(2).replace(".", ",")}`}
                        </strong>
                      </div>
                      {passConfirmStep === "points" && userPoints !== null && (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                            <span style={{ color: "var(--gray-500)" }}>Saldo atual</span>
                            <span style={{ color: userPoints >= passModal.price_points ? "var(--paper)" : "var(--red)", fontWeight: 800 }}>
                              {userPoints.toLocaleString("pt-BR")} pts
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                            <span style={{ color: "var(--gray-500)" }}>Após a compra</span>
                            <span style={{ color: userPoints >= passModal.price_points ? "#3df28b" : "var(--red)", fontWeight: 950 }}>
                              {Math.max(0, userPoints - passModal.price_points).toLocaleString("pt-BR")} pts
                            </span>
                          </div>
                          {userPoints < passModal.price_points && (
                            <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--red)", fontWeight: 800 }}>
                              ⚠ Pontos insuficientes
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    {passConfirmStep === "points" ? (
                      <button type="button" className="btn-aceitar"
                        disabled={buyingId === passModal.id || (userPoints !== null && userPoints < passModal.price_points)}
                        onClick={async () => {
                          setBuyingId(passModal.id)
                          const res = await fetch(`/api/contratos/passes/${passModal.id}/buy`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "points" }) })
                          setBuyingId(null)
                          if (res.ok) { setPassModal(null); setPassConfirmStep(null); await loadPasses(); setActiveTab("Contratos Ativos"); await loadMyPasses() }
                          else { const b = await res.json().catch(() => ({})); alert(b.error ?? "Erro ao comprar.") }
                        }}>
                        <Zap size={14} fill="currentColor" />
                        {buyingId === passModal.id ? "Confirmando..." : `Confirmar — ${passModal.price_points.toLocaleString("pt-BR")} pts`}
                      </button>
                    ) : (
                      <button type="button" className="btn-aceitar"
                        disabled={buyingId === passModal.id}
                        onClick={async () => {
                          setBuyingId(passModal.id)
                          const res = await fetch(`/api/contratos/passes/${passModal.id}/buy`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "cash" }) })
                          const body = await res.json().catch(() => ({}))
                          setBuyingId(null)
                          if (res.ok && body.orderId) window.location.href = `/pagar/${body.orderId}`
                          else alert(body.error ?? "Erro ao iniciar pagamento.")
                        }}>
                        <Zap size={14} fill="currentColor" />
                        {buyingId === passModal.id ? "Gerando PIX..." : `Confirmar — R$ ${Number(passModal.price_real).toFixed(2).replace(".", ",")}`}
                      </button>
                    )}
                    <button type="button"
                      onClick={() => setPassConfirmStep(null)}
                      style={{ border: "1px solid var(--stroke)", background: "rgba(255,255,255,0.03)", color: "var(--paper-dim)", padding: "10px 0", fontSize: 12, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 8, font: "inherit", letterSpacing: "0.05em" }}>
                      ← Voltar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

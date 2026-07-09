"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, Banknote, ChevronDown, ChevronLeft, CircleDollarSign, Clock, Coins, Gavel, Package, Plus, Shirt, ShoppingCart, Skull, Sparkles, Star, SlidersHorizontal, Target, Users, Zap } from "lucide-react"
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
import "../../../styles/contratos-venda.css"

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

type RewardItem = { id: string; name: string; description: string | null; image_url: string | null; price: number; stock: number; expires_at: string | null }

const categories: { key: string; tag: string; tone: string; image: string; title: string; text: string; href?: string }[] = [
  { key: "itens", tag: "CATÁLOGO", tone: "yellow", image: "/assets/bots/arc_leaper.png", title: "Itens", text: "Catálogo completo para resgatar ou comprar com pontos.", href: "/loja" },
  { key: "passes", tag: "CONTRATOS", tone: "cyan", image: "/assets/maps/the_spaceport.png", title: "Contratos à Venda", text: "Compre contratos exclusivos e ganhe recompensas especiais." },
  { key: "sorteios", tag: "SORTEIOS", tone: "red", image: "/assets/bots/arc_pop.png", title: "Sorteios", text: "Participe de sorteios e concorra a itens raros." },
  { key: "servicos", tag: "LEILÕES", tone: "green", image: "/assets/maps/stella_montis_upper.png", title: "Leilões", text: "Dispute itens raros em leilões com tempo limitado." },
  { key: "giftcards", tag: "GIFT CARDS", tone: "yellow", image: "/assets/bots/arc_snitch.png", title: "Gift Cards", text: "Cartões de presente para usar dentro da loja." },
]

type ContractTier = "Básico" | "Avançado" | "Épico" | "Lendário"
type ContractSaleType = "Diário" | "Semanal"
type RiskLevel = "Baixo" | "Médio" | "Alto" | "Extremo"

type ContractVariant = "dourada" | "holografica" | "corrompida"
type ContractObjective = { text: string; desc: string; done?: boolean; progress?: number; total?: number }
type ContractEnemy = { name: string; type: string; dots: number; color: string; image: string }

const featuredContract = {
  name: "Titan Caído",
  description: "Um ARC Titan foi abatido na Cidade Alta. Recupere tecnologias críticas antes que outros Raiders cheguem.",
  risk: "Extremo" as RiskLevel,
  players: 87,
  expiresIn: "04h 12m",
  rewards: { sucatas: 5000, xp: 2500, rep: 200 },
  image: "/assets/bots/arc_the_queen.png",
}

const mapLocations = [
  { id: "barragem",      name: "Barragem",        contracts: 2, color: "#b477ff", top: "15%", left: "58%" },
  { id: "complexo-arc",  name: "Complexo ARC",    contracts: 3, color: "#5fa8ff", top: "12%", left: "78%" },
  { id: "cidade-alta",   name: "Cidade Alta",     contracts: 4, color: "#F5090D", top: "38%", left: "40%", active: true },
  { id: "estacao-trem",  name: "Estação de Trem", contracts: 1, color: "#ffd400", top: "58%", left: "30%" },
  { id: "zona-vermelha", name: "Zona Vermelha",   contracts: 2, color: "#ff8c42", top: "42%", left: "72%" },
]

const contractsForSale: {
  id: string
  name: string
  description: string
  type: ContractSaleType
  tier: ContractTier
  risk: RiskLevel
  price: number
  objective: string
  sucatas: number
  xp: number
  rep?: number
  players: number
  successRate: number
  image: string
  variant?: ContractVariant
  realPrice?: number
  location: string
  story: string
  estimatedTime: string
  bestTimeOfDay: string
  climate: string
  environmentalRisk: string
  objectives: ContractObjective[]
  bonus: { condition: string; reward: string }
  enemies: ContractEnemy[]
  playersCompleted: number
  bestRecord: { time: string; player: string }
}[] = [
  {
    id: "c1", name: "Coleta Rápida", description: "Colete recursos espalhados pelo mapa antes que outros Raiders cheguem.",
    type: "Diário", tier: "Básico", risk: "Baixo", price: 500, objective: "Colete 10 recursos",
    sucatas: 300, xp: 150, players: 642, successRate: 85, image: "/assets/bots/arc_leaper.png",
    location: "Estação de Trem", story: "Relatórios indicam grande concentração de materiais abandonados próximo à Estação de Trem. Colete o máximo antes que outros Raiders ou patrulhas ARC cheguem à área.",
    estimatedTime: "10 - 15 min", bestTimeOfDay: "Manhã", climate: "Claro", environmentalRisk: "Baixo",
    objectives: [
      { text: "Localize os pontos de coleta", desc: "Encontre as marcações no mapa.", done: true },
      { text: "Colete 10 recursos", desc: "Extraia materiais dos contêineres.", progress: 0, total: 10 },
      { text: "Extraia da zona", desc: "Saia da área com os recursos.", progress: 0, total: 1 },
    ],
    bonus: { condition: "Colete tudo em menos de 8 min", reward: "+20% Sucatas" },
    enemies: [
      { name: "ARC Scout", type: "Máquina Leve", dots: 2, color: "#b477ff", image: "/assets/bots/arc_snitch.png" },
      { name: "ARC Leaper", type: "Máquina Leve", dots: 3, color: "#b477ff", image: "/assets/bots/arc_leaper.png" },
      { name: "Outros Raiders", type: "Jogadores", dots: 2, color: "#5fa8ff", image: "/assets/bots/arc_spotter.png" },
    ],
    playersCompleted: 3840, bestRecord: { time: "6m 14s", player: "Patife" },
  },
  {
    id: "c2", name: "Caçada Noturna", description: "Elimine unidades ARC patrulhando a zona de exclusão.",
    type: "Diário", tier: "Avançado", risk: "Alto", price: 900, objective: "Elimine 8 ARC",
    sucatas: 600, xp: 300, players: 521, successRate: 67, image: "/assets/bots/arc_shredder.png",
    location: "Zona Vermelha", story: "Patrulhas ARC intensificaram presença na Zona Vermelha durante a noite. Elimine as unidades antes que elas fortifiquem a área permanentemente.",
    estimatedTime: "15 - 25 min", bestTimeOfDay: "Noite", climate: "Nublado", environmentalRisk: "Médio",
    objectives: [
      { text: "Entre na zona de patrulha", desc: "Infiltre-se sem ser detectado.", done: true },
      { text: "Elimine 8 ARC", desc: "Neutralize as unidades de patrulha.", progress: 0, total: 8 },
      { text: "Extraia com segurança", desc: "Saia antes do reforço chegar.", progress: 0, total: 1 },
    ],
    bonus: { condition: "Elimine sem ser detectado", reward: "+30% XP" },
    enemies: [
      { name: "ARC Shredder", type: "Máquina Pesada", dots: 4, color: "#F5090D", image: "/assets/bots/arc_shredder.png" },
      { name: "ARC Guardian", type: "Máquina Pesada", dots: 4, color: "#F5090D", image: "/assets/bots/arc_sentinel.png" },
      { name: "ARC Scout", type: "Máquina Leve", dots: 3, color: "#b477ff", image: "/assets/bots/arc_snitch.png" },
    ],
    playersCompleted: 2100, bestRecord: { time: "11m 48s", player: "Hayashii" },
  },
  {
    id: "c3", name: "Operação Resgate", description: "Recupere equipamentos perdidos em zonas de alta periculosidade.",
    type: "Semanal", tier: "Avançado", risk: "Alto", price: 2000, objective: "Recupere 5 equipamentos",
    sucatas: 2000, xp: 800, rep: 50, players: 1247, successRate: 68, image: "/assets/bots/arc_spotter.png",
    location: "Complexo ARC", story: "Equipamentos de alto valor foram perdidos durante uma extração mal-sucedida no Complexo ARC. Recupere os itens antes que a tecnologia caia em mãos erradas.",
    estimatedTime: "20 - 30 min", bestTimeOfDay: "Tarde", climate: "Parcialmente nublado", environmentalRisk: "Alto",
    objectives: [
      { text: "Localize os equipamentos", desc: "Use o scanner para detectar os sinais.", done: true },
      { text: "Recupere 5 equipamentos", desc: "Colete todos os itens marcados.", progress: 0, total: 5 },
      { text: "Extraia pelo ponto seguro", desc: "Leve tudo até a extração.", progress: 0, total: 1 },
    ],
    bonus: { condition: "Recupere todos sem perder nenhum", reward: "+50 REP extra" },
    enemies: [
      { name: "ARC Spotter", type: "Máquina Pesada", dots: 3, color: "#ffd400", image: "/assets/bots/arc_spotter.png" },
      { name: "ARC Guardian", type: "Máquina Pesada", dots: 4, color: "#F5090D", image: "/assets/bots/arc_sentinel.png" },
      { name: "Outros Raiders", type: "Jogadores", dots: 3, color: "#5fa8ff", image: "/assets/bots/arc_leaper.png" },
    ],
    playersCompleted: 1247, bestRecord: { time: "18m 22s", player: "Yoda" },
  },
  {
    id: "c4", variant: "dourada" as ContractVariant, realPrice: 9.99, name: "Entrega Expressa", description: "Transporte suprimentos críticos para os postos aliados sem ser detectado.",
    type: "Semanal", tier: "Básico", risk: "Médio", price: 400, objective: "Entregue 3 suprimentos",
    sucatas: 250, xp: 100, players: 312, successRate: 90, image: "/assets/bots/arc_snitch.png",
    location: "Barragem", story: "Os postos aliados na Barragem precisam urgentemente de suprimentos médicos. Transporte os pacotes cruzando território ARC sem ser detectado.",
    estimatedTime: "10 - 20 min", bestTimeOfDay: "Amanhecer", climate: "Neblina", environmentalRisk: "Baixo",
    objectives: [
      { text: "Pegue os suprimentos", desc: "Colete os pacotes no depósito.", done: true },
      { text: "Entregue 3 suprimentos", desc: "Leve os pacotes aos postos.", progress: 0, total: 3 },
      { text: "Não seja detectado", desc: "Complete sem acionar alarmes.", progress: 0, total: 1 },
    ],
    bonus: { condition: "Entregue todos intactos", reward: "+15% Sucatas" },
    enemies: [
      { name: "ARC Scout", type: "Máquina Leve", dots: 2, color: "#b477ff", image: "/assets/bots/arc_snitch.png" },
      { name: "Outros Raiders", type: "Jogadores", dots: 2, color: "#5fa8ff", image: "/assets/bots/arc_spotter.png" },
    ],
    playersCompleted: 2808, bestRecord: { time: "8m 05s", player: "Myst" },
  },
  {
    id: "c5", variant: "holografica" as ContractVariant, realPrice: 14.99, name: "Domínio Total", description: "Controle todos os pontos estratégicos do mapa durante uma sessão completa.",
    type: "Semanal", tier: "Épico", risk: "Extremo", price: 4500, objective: "Domine 5 pontos",
    sucatas: 4000, xp: 2000, rep: 150, players: 284, successRate: 55, image: "/assets/bots/arc_matriarch.png",
    location: "Cidade Alta", story: "Tome controle de todos os pontos estratégicos da Cidade Alta por tempo suficiente para estabelecer dominância. Resistência máxima garantida.",
    estimatedTime: "35 - 50 min", bestTimeOfDay: "Noite", climate: "Tempestade", environmentalRisk: "Extremo",
    objectives: [
      { text: "Capture o primeiro ponto", desc: "Tome controle do ponto Norte.", done: true },
      { text: "Domine 5 pontos estratégicos", desc: "Controle todos os pontos simultaneamente.", progress: 0, total: 5 },
      { text: "Mantenha o domínio por 5 minutos", desc: "Resista aos contra-ataques.", progress: 0, total: 1 },
    ],
    bonus: { condition: "Domine sem perder nenhum ponto", reward: "+200 REP extra" },
    enemies: [
      { name: "ARC Matriarch", type: "Máquina Lendária", dots: 4, color: "#F5090D", image: "/assets/bots/arc_matriarch.png" },
      { name: "ARC Shredder", type: "Máquina Pesada", dots: 4, color: "#F5090D", image: "/assets/bots/arc_shredder.png" },
      { name: "ARC Guardian", type: "Máquina Pesada", dots: 4, color: "#F5090D", image: "/assets/bots/arc_sentinel.png" },
      { name: "Outros Raiders", type: "Jogadores", dots: 4, color: "#5fa8ff", image: "/assets/bots/arc_leaper.png" },
    ],
    playersCompleted: 284, bestRecord: { time: "32m 18s", player: "Bruninzor" },
  },
  {
    id: "c6", variant: "corrompida" as ContractVariant, realPrice: 19.99, name: "Suprimentos Proibidos", description: "Recupere suprimentos valiosos da Black Market escondidos na Zona Vermelha.",
    type: "Diário", tier: "Lendário", risk: "Extremo", price: 7000, objective: "Extraia com o pacote",
    sucatas: 6000, xp: 3000, rep: 250, players: 93, successRate: 34, image: "/assets/bots/arc_bastion.png",
    location: "Zona Vermelha", story: "A Black Market escondeu suprimentos de alto valor profundamente na Zona Vermelha. Somente os Raiders mais experientes se aventuram nessa área — e poucos retornam.",
    estimatedTime: "40 - 60 min", bestTimeOfDay: "Noite", climate: "Tempestade Radioativa", environmentalRisk: "Extremo",
    objectives: [
      { text: "Penetre na Zona Vermelha", desc: "Entre na área sem ativar as defesas perimetrais.", done: true },
      { text: "Localize o esconderijo", desc: "Use pistas deixadas pela Black Market.", progress: 0, total: 1 },
      { text: "Extraia com o pacote completo", desc: "Leve todos os suprimentos até a extração.", progress: 0, total: 1 },
    ],
    bonus: { condition: "Extraia sem morrer", reward: "+25% Sucatas" },
    enemies: [
      { name: "ARC Bastion", type: "Máquina Pesada", dots: 4, color: "#F5090D", image: "/assets/bots/arc_bastion.png" },
      { name: "ARC Matriarch", type: "Máquina Lendária", dots: 4, color: "#F5090D", image: "/assets/bots/arc_matriarch.png" },
      { name: "ARC Guardian", type: "Máquina Pesada", dots: 4, color: "#F5090D", image: "/assets/bots/arc_sentinel.png" },
      { name: "Outros Raiders", type: "Jogadores", dots: 4, color: "#5fa8ff", image: "/assets/bots/arc_spotter.png" },
    ],
    playersCompleted: 93, bestRecord: { time: "44m 10s", player: "Marginal" },
  },
]

const tierColors: Record<ContractTier, { color: string; border: string }> = {
  Básico:   { color: "#5fa8ff", border: "rgba(91,166,255,0.4)"   },
  Avançado: { color: "#ffd400", border: "rgba(255,196,0,0.4)"    },
  Épico:    { color: "#b477ff", border: "rgba(180,119,255,0.4)"  },
  Lendário: { color: "#ff8c42", border: "rgba(255,140,66,0.4)"   },
}

const typeColors: Record<ContractSaleType, { color: string }> = {
  Diário:  { color: "#F5090D" },
  Semanal: { color: "#ffc400" },
}

const riskColors: Record<RiskLevel, string> = {
  Baixo: "#3df28b", Médio: "#ffd400", Alto: "#ff8c42", Extremo: "#F5090D",
}

const chainSteps = [
  { label: "Investigação", desc: "Colete informações na área."  },
  { label: "Recuperação",  desc: "Recupere os dados perdidos."  },
  { label: "Extração",     desc: "Extraia o núcleo ARC."        },
]

const factionBonuses = [
  { name: "Exodus",       bonus: "+50% XP em contratos",    color: "#3df28b", symbol: "✦" },
  { name: "Black Market", bonus: "+25% Sucatas em contratos", color: "#ffd400", symbol: "◆" },
  { name: "Arc Corp",     bonus: "Componentes Raros",        color: "#5fa8ff", symbol: "◈" },
]

const operatorRanking = [
  { rank: 1, name: "Myst",          contracts: 124, avgTime: "14m 32s" },
  { rank: 2, name: "Draakaarryss",  contracts: 98,  avgTime: "16m 48s" },
  { rank: 3, name: "GhostRecon",    contracts: 87,  avgTime: "18m 21s" },
]

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
  const [selectedContract, setSelectedContract] = useState<typeof contractsForSale[0] | null>(null)
  const [confirmContract, setConfirmContract] = useState<typeof contractsForSale[0] | null>(null)
  const [payMode, setPayMode] = useState<"real" | "pontos">("real")
  const [panelOpen, setPanelOpen] = useState(false)
  const [weeklyItems, setWeeklyItems] = useState<RewardItem[]>([])
  const [timer, setTimer] = useState("")

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
  const [points, setPoints] = useState(0)
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])
  const [loadingHighlights, setLoadingHighlights] = useState(true)

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

  // Timer do destaque da semana (countdown para a menor expires_at dos itens)
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
                  {/* Card da expedição ativa (se featured = true) */}
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

              {/* Card de Cofre de Expedição (aparece apenas quando há expedição ativa) */}
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
                    {/* Imagem */}
                    <div style={{ width: 80, height: 80, borderRadius: 10, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.20)", flexShrink: 0, overflow: "hidden", display: "grid", placeItems: "center" }}>
                      {activeExpedition.item_image_url
                        ? <img src={activeExpedition.item_image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <Package size={28} style={{ color: "#f59e0b" }} />
                      }
                    </div>

                    {/* Info */}
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

                      {/* Compra */}
                      <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: 10, flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>
                        {/* Modo de pagamento */}
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

                        {/* Quantidade */}
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
              <div style={{ position: "fixed", inset: 0, zIndex: 100, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", background: "rgba(2,7,11,0.55)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--cyan)", opacity: 0.7 }}>Em Breve</span>
                <h2 style={{ margin: 0, fontSize: 32, fontWeight: 950, textTransform: "uppercase", color: "var(--paper)" }}>Contratos à Venda</h2>
                <p style={{ margin: 0, fontSize: 14, color: "var(--paper-dim)", textAlign: "center", maxWidth: 340 }}>Em breve você poderá adquirir contratos exclusivos e garantir recompensas únicas no Sucatão.</p>
                <button type="button" onClick={() => history.back()} style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", color: "var(--paper)", padding: "10px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer", borderRadius: 6, font: "inherit" }}>← Voltar</button>
              </div>
              {/* Stats bar */}
              <div className="cv-stats-bar">
                <div className="cv-license">
                  <span className="cv-stats-label">Sua Licença de Operações</span>
                  <span className="cv-license-level">
                    <Zap size={13} style={{ color: "#ffd400" }} />
                    Nível 3 — Veterano
                  </span>
                  <div className="cv-license-bar">
                    <span style={{ width: "49%" }} />
                  </div>
                  <span className="cv-license-xp">2.450 / 5.000 XP</span>
                </div>
                <div className="cv-stat">
                  <span className="cv-stats-label">Contratos Concluídos</span>
                  <strong>48</strong>
                </div>
                <div className="cv-stat">
                  <span className="cv-stats-label">Taxa de Sucesso</span>
                  <strong style={{ color: "#3df28b" }}>72%</strong>
                </div>
                <div className="cv-stat">
                  <span className="cv-stats-label">Renovação Diária</span>
                  <strong style={{ color: "#ffd400" }}>
                    <Clock size={13} />
                    12h 34m 22s
                  </strong>
                </div>
              </div>

              {/* Featured + Map */}
              <div className="cv-top-grid">
                {/* Featured contract */}
                <div className="cv-featured" style={{ backgroundImage: `url(${featuredContract.image})` }}>
                  <div className="cv-featured-overlay" />
                  <div className="cv-featured-content">
                    <span className="cv-featured-badge">Operação Destaque</span>
                    <h2 className="cv-featured-title">{featuredContract.name}</h2>
                    <p className="cv-featured-desc">{featuredContract.description}</p>
                    <div className="cv-featured-meta">
                      <span className="cv-meta-item" style={{ color: riskColors[featuredContract.risk] }}>
                        <Skull size={12} />
                        Risco: {featuredContract.risk}
                      </span>
                      <span className="cv-meta-item">
                        <Users size={12} />
                        <span style={{ color: "var(--gray-500)" }}>Jogadores interessados</span>
                        <strong>{featuredContract.players}</strong>
                      </span>
                      <span className="cv-meta-item">
                        <Clock size={12} />
                        <span style={{ color: "var(--gray-500)" }}>Expira em</span>
                        <strong style={{ color: "#ffd400" }}>{featuredContract.expiresIn}</strong>
                      </span>
                    </div>
                    <div className="cv-featured-rewards">
                      <span className="cv-rewards-label">Recompensa Estimada</span>
                      <div className="cv-rewards-row">
                        <span className="cv-reward-item" style={{ color: "#ffd400" }}>
                          <Coins size={14} />
                          {featuredContract.rewards.sucatas.toLocaleString("pt-BR")}
                          <span style={{ color: "var(--gray-500)", fontSize: 10 }}>SUCATAS</span>
                        </span>
                        <span className="cv-reward-item" style={{ color: "#5fa8ff" }}>
                          <Zap size={14} />
                          {featuredContract.rewards.xp.toLocaleString("pt-BR")}
                          <span style={{ color: "var(--gray-500)", fontSize: 10 }}>XP</span>
                        </span>
                        <span className="cv-reward-item" style={{ color: "#b477ff" }}>
                          <Star size={14} />
                          {featuredContract.rewards.rep}
                          <span style={{ color: "var(--gray-500)", fontSize: 10 }}>REP</span>
                        </span>
                      </div>
                    </div>
                    <button type="button" className="cv-featured-btn" onClick={() => setSelectedContract(contractsForSale[4])}>Ver Detalhes</button>
                  </div>
                </div>

                {/* Operations map */}
                <div className="cv-map">
                  <div className="cv-map-header">
                    <span className="cv-map-title">Mapa de Operações</span>
                    <button type="button" className="cv-map-legend">Ver Legenda</button>
                  </div>
                  <div className="cv-map-body" style={{ backgroundImage: "url(/assets/maps/buried_city.png)" }}>
                    {mapLocations.map(loc => (
                      <div
                        key={loc.id}
                        className={`cv-map-pin${loc.active ? " cv-map-pin--active" : ""}`}
                        style={{ top: loc.top, left: loc.left, "--pin-color": loc.color } as React.CSSProperties}
                      >
                        <span className="cv-map-pin-dot" />
                        <div className="cv-map-pin-label">
                          <strong>{loc.name}</strong>
                          <span>{loc.contracts} {loc.contracts === 1 ? "contrato" : "contratos"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="cv-filters">
                <span className="cv-filters-label">
                  <SlidersHorizontal size={13} />
                  Filtros
                </span>
                {["Todos os Tipos", "Todas Facções", "Todas Dificuldades"].map(f => (
                  <button key={f} type="button" className="cv-filter-select">
                    {f}
                    <ChevronDown size={12} />
                  </button>
                ))}
                <label className="cv-filter-check">
                  <input type="checkbox" />
                  Mostrar Apenas Disponíveis
                </label>
                <div className="cv-filter-sort">
                  <span>Ordenar por:</span>
                  <button type="button" className="cv-filter-select">
                    Mais Recentes
                    <ChevronDown size={12} />
                  </button>
                </div>
              </div>

              {/* Contract cards */}
              <div className="cv-cards-scroll">
                {contractsForSale.map(c => {
                  const tier = tierColors[c.tier]
                  const type = typeColors[c.type]
                  const variantLabel = c.variant === "dourada" ? "Versão Dourada" : c.variant === "holografica" ? "Versão Holográfica" : c.variant === "corrompida" ? "Versão Corrompida" : null
                  return (
                    <div key={c.id} className={`cv-card${c.variant ? ` cv-card--${c.variant}` : ""}`}>
                      {c.variant && <div className="cv-card-frame" />}
                      <div className="cv-card-bg">
                        <div className="cv-card-bg-img" style={{ backgroundImage: `url(${c.image})` }} />
                        {c.variant && <div className="cv-skull-badge"><Skull size={14} /></div>}
                      </div>
                      <div className="cv-card-badges">
                        <span className="cv-card-type" style={{ color: type.color }}>{c.type}</span>
                        <span className="cv-card-tier" style={{ color: tier.color, borderColor: tier.border }}>{c.tier}</span>
                      </div>
                      <div className="cv-card-body">
                        <strong className="cv-card-name">{c.name}</strong>
                        <p className="cv-card-desc">{c.description}</p>
                        <div className="cv-card-section-label">Objetivo</div>
                        <div className="cv-card-objective">
                          <Target size={11} />
                          {c.objective}
                        </div>
                        <div className="cv-card-section-label">Recompensas</div>
                        <div className="cv-card-rewards">
                          <span style={{ color: "#ffd400" }}><Coins size={11} />{c.sucatas.toLocaleString("pt-BR")}</span>
                          <span style={{ color: "#5fa8ff" }}><Zap size={11} />{c.xp}</span>
                          {c.rep && <span style={{ color: "#b477ff" }}><Star size={11} />{c.rep}</span>}
                        </div>
                        <div className="cv-card-footer-meta">
                          <span className="cv-card-players"><Users size={11} />{c.players.toLocaleString("pt-BR")}</span>
                          <span className="cv-card-success" style={{ color: c.successRate >= 70 ? "#3df28b" : c.successRate >= 50 ? "#ffd400" : "#F5090D" }}>
                            {c.successRate}%
                          </span>
                        </div>
                        <div className="cv-card-actions">
                          <button type="button" className="cv-card-details" onClick={() => setSelectedContract(c)}>
                            Ver Detalhes
                          </button>
                          <button type="button" className="cv-card-buy" onClick={() => setConfirmContract(c)}>
                            <Coins size={13} />
                            {c.realPrice ? `R$ ${c.realPrice.toFixed(2).replace(".", ",")}` : c.price.toLocaleString("pt-BR")}
                          </button>
                        </div>
                      </div>
                      {variantLabel && (
                        <div className="cv-card-variant-footer">
                          ‹ {variantLabel} ›
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Bottom 3-col */}
              <div className="cv-bottom-grid">
                {/* Chain */}
                <div className="cv-chain-card">
                  <h3 className="cv-bottom-title">Cadeia de Operação</h3>
                  <div className="cv-chain-steps">
                    {chainSteps.map((step, i) => (
                      <div key={i} className="cv-chain-step">
                        <div className="cv-chain-icon">{i + 1}</div>
                        {i < chainSteps.length - 1 && <div className="cv-chain-arrow"><ArrowRight size={14} /></div>}
                        <div className="cv-chain-info">
                          <strong>{step.label}</strong>
                          <span>{step.desc}</span>
                        </div>
                      </div>
                    ))}
                    <div className="cv-chain-step">
                      <div className="cv-chain-icon cv-chain-icon--reward">★</div>
                      <div className="cv-chain-info">
                        <strong style={{ color: "#ffd400" }}>Recompensa Final</strong>
                        <span>Caixa Lendária Garantida</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Factions */}
                <div className="cv-factions-card">
                  <h3 className="cv-bottom-title">Facções</h3>
                  <div className="cv-factions-list">
                    {factionBonuses.map(f => (
                      <div key={f.name} className="cv-faction-item" style={{ "--faction-color": f.color } as React.CSSProperties}>
                        <div className="cv-faction-icon" style={{ color: f.color }}>{f.symbol}</div>
                        <div className="cv-faction-info">
                          <strong>{f.name}</strong>
                          <span>{f.bonus}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ranking */}
                <div className="cv-ranking-card">
                  <div className="cv-ranking-head">
                    <h3 className="cv-bottom-title">Ranking de Operadores</h3>
                    <button type="button" className="cv-ranking-link">Ver Ranking Completo</button>
                  </div>
                  <div className="cv-ranking-list">
                    {operatorRanking.map(op => (
                      <div key={op.rank} className="cv-ranking-row">
                        <div className={`cv-rank-badge cv-rank-${op.rank}`}>
                          <span>{op.rank}</span>
                        </div>
                        <div className="cv-ranking-avatar">{op.name[0]}</div>
                        <div className="cv-ranking-info">
                          <strong>{op.name}</strong>
                          <span>Contratos: {op.contracts}</span>
                        </div>
                        <span className="cv-ranking-time">Tempo Médio: {op.avgTime}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Contract detail modal */}
              {selectedContract && (
                <div className="cdm-overlay" onClick={() => setSelectedContract(null)}>
                  <div className={`cdm-modal${selectedContract.variant ? ` cdm-modal--${selectedContract.variant}` : ""}`} onClick={e => e.stopPropagation()}>
                    <button className="cdm-close" type="button" onClick={() => setSelectedContract(null)} aria-label="Fechar">✕</button>

                    {/* Left column */}
                    <div className="cdm-left">
                      <div className="cdm-hero" style={{ backgroundImage: `url(${selectedContract.image})` }}>
                        <div className="cdm-hero-overlay" />
                        <div className="cdm-hero-content">
                          <span className="cdm-op-badge">Operação {selectedContract.type}</span>
                          <h2 className="cdm-title">{selectedContract.name}</h2>
                          <span className="cdm-location">
                            <span style={{ fontSize: 12 }}>📍</span>
                            {selectedContract.location}
                          </span>
                        </div>
                      </div>
                      <p className="cdm-description">{selectedContract.story}</p>

                      <div className="cdm-meta-row">
                        <div className="cdm-meta-item">
                          <span className="cdm-meta-label">Dificuldade</span>
                          <span className="cdm-meta-val" style={{ color: riskColors[selectedContract.risk] }}>
                            <Skull size={12} /> {selectedContract.risk}
                          </span>
                        </div>
                        <div className="cdm-meta-item">
                          <span className="cdm-meta-label">Tipo</span>
                          <span className="cdm-meta-val" style={{ color: typeColors[selectedContract.type].color }}>
                            {selectedContract.type === "Diário" ? "⚡" : "📅"} {selectedContract.type === "Diário" ? "Extração" : "Operação"}
                          </span>
                        </div>
                        <div className="cdm-meta-item">
                          <span className="cdm-meta-label">Jogadores Interessados</span>
                          <span className="cdm-meta-val"><Users size={12} /> {selectedContract.players}</span>
                        </div>
                        <div className="cdm-meta-item">
                          <span className="cdm-meta-label">Expira em</span>
                          <span className="cdm-meta-val" style={{ color: "#ffd400" }}><Clock size={12} /> 04h 12m</span>
                        </div>
                      </div>

                      <div className="cdm-about">
                        <span className="cdm-section-label">Sobre a Operação</span>
                        <p>{selectedContract.story}</p>
                      </div>

                      <div className="cdm-conditions">
                        <div className="cdm-condition-chip">
                          <span className="cdm-chip-label">⏱ Tempo Estimado</span>
                          <span>{selectedContract.estimatedTime}</span>
                        </div>
                        <div className="cdm-condition-chip">
                          <span className="cdm-chip-label">🌙 Melhor Horário</span>
                          <span>{selectedContract.bestTimeOfDay}</span>
                        </div>
                        <div className="cdm-condition-chip">
                          <span className="cdm-chip-label">🌤 Clima</span>
                          <span>{selectedContract.climate}</span>
                        </div>
                        <div className="cdm-condition-chip cdm-chip-warn">
                          <span className="cdm-chip-label">⚠ Risco Ambiental</span>
                          <span style={{ color: riskColors[selectedContract.risk] }}>{selectedContract.environmentalRisk}</span>
                        </div>
                      </div>

                      <div className="cdm-mini-map">
                        <span className="cdm-section-label">Local da Operação</span>
                        <div className="cdm-mini-map-body" style={{ backgroundImage: "url(/assets/maps/buried_city.png)" }} />
                        <div className="cdm-mini-map-info">
                          <strong>{selectedContract.location}</strong>
                          <span>Setor Leste</span>
                          <button type="button" className="cdm-map-btn">▷ Ver no Mapa</button>
                        </div>
                      </div>
                    </div>

                    {/* Right column */}
                    <div className="cdm-right">
                      <div className="cdm-section">
                        <span className="cdm-section-label">Objetivos</span>
                        <div className="cdm-objectives">
                          {selectedContract.objectives.map((obj, i) => (
                            <div key={i} className={`cdm-objective${obj.done ? " cdm-objective--done" : ""}`}>
                              <div className="cdm-obj-num">
                                {obj.done ? "✓" : `0${i + 1}`}
                              </div>
                              <div className="cdm-obj-body">
                                <strong>{obj.text}</strong>
                                <span>{obj.desc}</span>
                              </div>
                              <div className="cdm-obj-progress">
                                {obj.done ? "" : obj.total ? `${obj.progress ?? 0} / ${obj.total}` : ""}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="cdm-section">
                        <span className="cdm-section-label">Recompensas Estimadas</span>
                        <div className="cdm-rewards-grid">
                          <div className="cdm-reward-item" style={{ color: "#ffd400" }}>
                            <Coins size={16} />
                            <strong>{selectedContract.sucatas.toLocaleString("pt-BR")}</strong>
                            <span>Sucatas</span>
                          </div>
                          <div className="cdm-reward-item" style={{ color: "#5fa8ff" }}>
                            <Zap size={16} />
                            <strong>{selectedContract.xp.toLocaleString("pt-BR")}</strong>
                            <span>XP</span>
                          </div>
                          {selectedContract.rep && (
                            <div className="cdm-reward-item" style={{ color: "#b477ff" }}>
                              <Star size={16} />
                              <strong>{selectedContract.rep}</strong>
                              <span>REP</span>
                            </div>
                          )}
                          <div className="cdm-reward-bonus">
                            <span className="cdm-bonus-label">Bônus de Sucesso</span>
                            <span className="cdm-bonus-condition">{selectedContract.bonus.condition}</span>
                            <span className="cdm-bonus-reward" style={{ color: "#3df28b" }}>{selectedContract.bonus.reward}</span>
                          </div>
                        </div>
                      </div>

                      <div className="cdm-section">
                        <span className="cdm-section-label">Inimigos Principais</span>
                        <div className="cdm-enemies">
                          {selectedContract.enemies.map((enemy, i) => (
                            <div key={i} className="cdm-enemy">
                              <div className="cdm-enemy-avatar">
                                <div className="cdm-enemy-bg" style={{ backgroundImage: `url(${enemy.image})` }} />
                              </div>
                              <strong>{enemy.name}</strong>
                              <span>{enemy.type}</span>
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
                        <div className="cdm-stat">
                          <span>Jogadores que completaram</span>
                          <strong>{selectedContract.playersCompleted.toLocaleString("pt-BR")}</strong>
                        </div>
                        <div className="cdm-stat">
                          <span>Taxa de sucesso</span>
                          <strong style={{ color: selectedContract.successRate >= 70 ? "#3df28b" : selectedContract.successRate >= 50 ? "#ffd400" : "#F5090D" }}>
                            {selectedContract.successRate}%
                          </strong>
                        </div>
                        <div className="cdm-stat">
                          <span>Melhor tempo registrado</span>
                          <strong>{selectedContract.bestRecord.time}</strong>
                          <span style={{ fontSize: 10, color: "var(--gray-500)" }}>por {selectedContract.bestRecord.player}</span>
                        </div>
                      </div>

                      <div className="cdm-buy-row">
                        <button type="button" className="cdm-video-btn">▷ Assistir ao Vídeo</button>
                        <div className="cdm-cost">
                          <span>Custo do Contrato</span>
                          <strong><Coins size={15} />{selectedContract.price.toLocaleString("pt-BR")}</strong>
                        </div>
                        <button type="button" className="cdm-buy-btn" onClick={() => { setSelectedContract(null); setConfirmContract(selectedContract) }}>Comprar Contrato</button>
                      </div>
                      <p className="cdm-disclaimer">Ao aceitar, o contrato será ativado imediatamente.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Purchase confirmation popup */}
              {confirmContract && (
                <div className="cpop-overlay" onClick={() => { setConfirmContract(null); setPayMode("real") }}>
                  <div className={`cpop-modal${confirmContract.variant ? ` cpop-modal--${confirmContract.variant}` : ""}`} onClick={e => e.stopPropagation()}>
                    <button type="button" className="cpop-close" onClick={() => { setConfirmContract(null); setPayMode("real") }}>✕</button>

                    <div className="cpop-header">
                      <div className="cpop-img" style={{ backgroundImage: `url(${confirmContract.image})` }} />
                      <div className="cpop-info">
                        <div className="cpop-badges">
                          <span className="cpop-type" style={{ color: typeColors[confirmContract.type].color }}>{confirmContract.type}</span>
                          <span className="cpop-tier" style={{ color: tierColors[confirmContract.tier].color }}>{confirmContract.tier}</span>
                          {confirmContract.variant && (
                            <span className="cpop-variant-badge">
                              {confirmContract.variant === "dourada" ? "✦ Dourada" : confirmContract.variant === "holografica" ? "◈ Holográfica" : "◆ Corrompida"}
                            </span>
                          )}
                        </div>
                        <strong className="cpop-name">{confirmContract.name}</strong>
                        <p className="cpop-desc">{confirmContract.description}</p>
                      </div>
                    </div>

                    <div className="cpop-divider" />

                    {confirmContract.realPrice ? (
                      <>
                        {/* Payment mode toggle */}
                        <div className="cpop-mode-toggle">
                          <button
                            type="button"
                            className={`cpop-mode-btn${payMode === "real" ? " active" : ""}`}
                            onClick={() => setPayMode("real")}
                          >
                            💳 Dinheiro Real
                          </button>
                          <button
                            type="button"
                            className={`cpop-mode-btn${payMode === "pontos" ? " active" : ""}`}
                            onClick={() => setPayMode("pontos")}
                          >
                            <Coins size={13} /> Pontos
                          </button>
                        </div>

                        {payMode === "real" ? (
                          <>
                            <div className="cpop-price-block cpop-price-real">
                              <span className="cpop-price-label">Valor</span>
                              <strong className="cpop-price-val">R$ {confirmContract.realPrice.toFixed(2).replace(".", ",")}</strong>
                            </div>
                            <div className="cpop-payment-methods">
                              <span className="cpop-payment-label">Formas de pagamento</span>
                              <div className="cpop-methods-row">
                                <button type="button" className="cpop-method active">
                                  <span className="cpop-method-icon">⚡</span>Pix
                                </button>
                                <button type="button" className="cpop-method">
                                  <span className="cpop-method-icon">💳</span>Cartão de Crédito
                                </button>
                                <button type="button" className="cpop-method">
                                  <span className="cpop-method-icon">🎫</span>Gift Card
                                </button>
                              </div>
                            </div>
                            <p className="cpop-note">Pagamento processado com segurança. Contrato ativado imediatamente após confirmação.</p>
                            <div className="cpop-actions">
                              <button type="button" className="cpop-cancel" onClick={() => { setConfirmContract(null); setPayMode("real") }}>Cancelar</button>
                              <button type="button" className={`cpop-confirm cpop-confirm--${confirmContract.variant ?? "real"}`}>
                                Comprar por R$ {confirmContract.realPrice.toFixed(2).replace(".", ",")}
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="cpop-price-block">
                              <span className="cpop-price-label">Custo em Pontos</span>
                              <strong className="cpop-price-val cpop-price-sucatas">
                                <Coins size={18} />
                                {confirmContract.price.toLocaleString("pt-BR")} Sucatas
                              </strong>
                            </div>
                            <p className="cpop-note">As Sucatas serão descontadas do seu saldo. Você também adquire a versão especial do contrato.</p>
                            <div className="cpop-actions">
                              <button type="button" className="cpop-cancel" onClick={() => { setConfirmContract(null); setPayMode("real") }}>Cancelar</button>
                              <button type="button" className="cpop-confirm" onClick={() => { setConfirmContract(null); setPayMode("real") }}>
                                Confirmar Compra
                              </button>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="cpop-price-block">
                          <span className="cpop-price-label">Custo</span>
                          <strong className="cpop-price-val cpop-price-sucatas">
                            <Coins size={18} />
                            {confirmContract.price.toLocaleString("pt-BR")} Sucatas
                          </strong>
                        </div>
                        <p className="cpop-note">As Sucatas serão descontadas do seu saldo. O contrato será ativado imediatamente.</p>
                        <div className="cpop-actions">
                          <button type="button" className="cpop-cancel" onClick={() => { setConfirmContract(null); setPayMode("real") }}>Cancelar</button>
                          <button type="button" className="cpop-confirm" onClick={() => { setConfirmContract(null); setPayMode("real") }}>
                            Confirmar Compra
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
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
    </div>
  )
}

import Link from "next/link"
import arcData from "@/data/arc-data"

type Item = { id: string; name: string; type?: string; rarity?: string; value?: number; weightKg?: number }
type Trade = { trader?: string; itemId?: string; quantity?: number; cost?: { itemId?: string; quantity?: number }; dailyLimit?: number; requiredLevel?: number }
type ArcMap = { id: string; name: string; label?: string; status?: string; description?: string }

const rawData = arcData as unknown as {
  items: Item[]
  bots: unknown[]
  maps: ArcMap[]
  trades: { value: Trade[]; Count: number }
}

function fmt(n: number) { return n.toLocaleString("pt-BR") }
function valuePerKg(item: Item) {
  const w = Number(item.weightKg ?? 0)
  const v = Number(item.value ?? 0)
  return w && v ? v / w : 0
}

const tradesRaw = rawData.trades
const trades: Trade[] = Array.isArray(tradesRaw) ? tradesRaw as Trade[] : (tradesRaw?.value ?? [])

const featuredTrades = trades.slice(0, 4)
const featuredItems = [...rawData.items].sort((a, b) => valuePerKg(b) - valuePerKg(a)).slice(0, 4)
const featuredMaps = rawData.maps.filter(m => m.status === "ready").slice(0, 4)

function itemNameById(id?: string) {
  if (!id) return "—"
  return rawData.items.find(i => i.id === id)?.name ?? id.replace(/_/g, " ")
}

const dailyTasks = [
  { id: "extract-route", title: "Marcar 1 rota de extracao", points: 80, hint: "Use a tela de mapas para salvar uma rota curta." },
  { id: "favorite-loot", title: "Favoritar 3 itens de loot", points: 50, hint: "Monte sua shortlist de farm no catalogo." },
  { id: "check-trades", title: "Revisar 5 ofertas do marketplace", points: 70, hint: "Passe na aba Trades e compare custo e retorno." },
  { id: "craft-plan", title: "Planejar 2 crafts", points: 60, hint: "Consulte materiais e saidas na aba Crafting." },
]

export default function HomePage() {
  return (
    <>
      <section className="hero-panel">
        <div>
          <p className="eyebrow">
            <span className="live-dot"></span>
            Field intel database
            <span>Trade values</span>
          </p>
          <h1>Banco de Itens ARC Raiders</h1>
          <p className="hero-copy">
            Preços, raridades, crafting e reciclagem em um painel brasileiro para consulta rápida.
          </p>
          <div className="home-actions">
            <Link href="/itens">Abrir catálogo</Link>
            <Link href="/arcs">Ver ARCs</Link>
          </div>
        </div>
        <div className="radar" aria-hidden="true">
          <span></span>
          <i></i>
        </div>
      </section>

      <section className="stats-grid" aria-label="Resumo">
        <article>
          <span>Itens</span>
          <strong>{fmt(rawData.items.length)}</strong>
        </article>
        <article>
          <span>ARCs</span>
          <strong>{fmt(rawData.bots.length)}</strong>
        </article>
        <article>
          <span>Mapas</span>
          <strong>{fmt(rawData.maps.length)}</strong>
        </article>
        <article>
          <span>Trades</span>
          <strong>{fmt(trades.length)}</strong>
        </article>
      </section>

      <section className="home-grid">
        <Link href="/itens">
          <strong>Itens catalogados</strong>
          <span>Busca, filtros, valores e detalhe por item.</span>
        </Link>
        <Link href="/trades">
          <strong>Marketplace</strong>
          <span>Ofertas, custo, trader e leitura rápida de troca.</span>
        </Link>
        <Link href="/arcs">
          <strong>ARC intel</strong>
          <span>Ameaças, fraquezas, XP e drops clicáveis.</span>
        </Link>
        <Link href="/mapas">
          <strong>Mapas</strong>
          <span>Base para rotas e marcadores no app final.</span>
        </Link>
      </section>

      <section className="dashboard-grid" aria-label="Painel principal">
        <section className="dashboard-band">
          <div className="dashboard-panel">
            <div className="dashboard-head">
              <div>
                <p>Loop diario</p>
                <h2>Tarefas e recompensas</h2>
              </div>
              <span>Reset em 24h</span>
            </div>
            <div className="reward-strip">
              <article><span>Concluidas</span><strong>0/{dailyTasks.length}</strong></article>
              <article><span>Pontos</span><strong>0</strong></article>
              <article><span>Bonus ativo</span><strong>Em preparo</strong></article>
            </div>
            <div className="task-list">
              {dailyTasks.map(task => (
                <div key={task.id} className="task-card">
                  <span>{task.points} pts</span>
                  <strong>{task.title}</strong>
                  <p>{task.hint}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-panel">
            <div className="dashboard-head">
              <div>
                <p>Melhores ofertas</p>
                <h2>Marketplace</h2>
              </div>
              <Link href="/trades">Abrir trades</Link>
            </div>
            <div className="dashboard-card-grid">
              {featuredTrades.length === 0 ? (
                <article className="dashboard-card">
                  <small>Sem ofertas</small>
                  <strong>Nenhum trade disponível</strong>
                  <p>Dados indisponíveis.</p>
                </article>
              ) : featuredTrades.map((entry, i) => (
                <article key={i} className="dashboard-card" tabIndex={0}>
                  <small>{entry.trader ?? "Trader"}</small>
                  <strong>{itemNameById(entry.itemId)}</strong>
                  <p>Custa {fmt(entry.cost?.quantity ?? 0)} {itemNameById(entry.cost?.itemId)}{entry.requiredLevel ? ` // nivel ${entry.requiredLevel}` : ""}</p>
                  <div className="utility-chip-row">
                    <span className="utility-chip">Saida {fmt(entry.quantity ?? 1)}</span>
                    {entry.dailyLimit ? <span className="utility-chip">Limite {entry.dailyLimit}/dia</span> : <span className="utility-chip">Sem limite</span>}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="dashboard-band">
          <div className="dashboard-panel">
            <div className="dashboard-head">
              <div>
                <p>Loot premium</p>
                <h2>Itens em destaque</h2>
              </div>
              <Link href="/itens">Ver catalogo</Link>
            </div>
            <div className="dashboard-card-grid">
              {featuredItems.length === 0 ? (
                <article className="dashboard-card">
                  <small>Sem itens</small>
                  <strong>Nenhum item disponível</strong>
                  <p>Dados indisponíveis.</p>
                </article>
              ) : featuredItems.map((item, i) => (
                <article key={i} className="dashboard-card" tabIndex={0}>
                  <small>{item.type ?? "Item"}</small>
                  <strong>{item.name}</strong>
                  <p>{item.rarity ?? "?"} // valor/kg {fmt(Math.round(valuePerKg(item)))}</p>
                  <div className="utility-chip-row">
                    <span className="utility-chip">Base {fmt(item.value ?? 0)}</span>
                    <span className="utility-chip">Peso {item.weightKg != null ? item.weightKg : "N/D"} kg</span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="dashboard-panel">
            <div className="dashboard-head">
              <div>
                <p>Reconhecimento</p>
                <h2>Intel recomendada</h2>
              </div>
              <Link href="/mapas">Abrir mapas</Link>
            </div>
            <div className="dashboard-card-grid">
              {featuredMaps.length === 0 ? (
                <article className="dashboard-card">
                  <small>Sem mapas</small>
                  <strong>Nenhum mapa disponível</strong>
                  <p>Nenhum mapa pronto ainda.</p>
                </article>
              ) : featuredMaps.map((map, i) => (
                <article key={i} className="dashboard-card" tabIndex={0}>
                  <small>{map.label ?? "ARC region"}</small>
                  <strong>{map.name}</strong>
                  <p>{map.description ?? ""}</p>
                  <div className="utility-chip-row">
                    <span className="utility-chip">Rotas e pings</span>
                    <span className="utility-chip">Intel tatico</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </section>
    </>
  )
}

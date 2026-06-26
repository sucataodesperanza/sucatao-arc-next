# Facções — Tela de Seleção

**Rota:** `/faccoes`  
**Requer autenticação:** Sim (middleware global)

## Comportamento de entrada

- Se o usuário **já tem facção** → redireciona imediatamente para `/faccoes/visao-geral`
- Se **não tem facção** → exibe a tela de seleção abaixo

## Descrição

Tela de escolha de facção. Decisão **permanente e irreversível** — cada usuário pode ingressar em apenas uma facção. Após confirmar, é redirecionado para `/faccoes/visao-geral`.

## Layout

- **Área principal** — hero banner + grid de 5 cards (um por facção)
- **Painel lateral** — comparativo rápido de atributos + feed de atividades global

## Facções Disponíveis

| # | Nome | Slug | Cor |
|---|---|---|---|
| 1 | Guardia | `guardia` | `#3df28b` |
| 2 | Mantikor | `mantikor` | `#ff6171` |
| 3 | Erma Cora | `erma-cora` | `#ffd400` |
| 4 | Kozma Ventures | `kozma-ventures` | `#5fa8ff` |
| 5 | Jiangsu Romagna | `jiangsu-romagna` | `#b477ff` |

## Cards de Facção

Cada card exibe:
- **Ícone 120×120px** com `drop-shadow` na cor da facção
- Nome + tagline + descrição
- Lista de bônus (`factions.bonuses`)
- Botão **"Escolher"** → abre modal de confirmação

### Hover
- Elevação: `translateY(-6px) scale(1.02)` com spring `cubic-bezier(0.34, 1.56, 0.64, 1)`
- Borda + glow externo na cor da facção
- Gradiente do banner: 35% → 60% opacity
- Ícone: zoom + `drop-shadow` mais forte

### Ícones
Arquivos estáticos em `public/assets/faccoes/{slug}.png`. O campo `factions.icon_url` aponta para esses caminhos. O admin pode sobrescrever com upload no Storage `faction-icons` via `/admin/faccoes`.

### Modal de confirmação
- Exibe ícone + nome da facção em destaque
- Aviso de permanência
- Botões: **Cancelar** | **Confirmar Escolha**
- Em caso de erro: exibe mensagem inline (ex: "Você já possui uma facção")
- Em caso de sucesso: redireciona para `/faccoes/visao-geral`

## Comparativo Rápido (painel lateral)

Tabela com 5 atributos × 5 facções. Todos os dados vêm do banco.

| Atributo | Guardia | Mantikor | Erma Cora | Kozma Ventures | Jiangsu Romagna |
|---|---|---|---|---|---|
| Combate | 2 | 3 | 1 | 2 | 1 |
| Recursos | 3 | 1 | 2 | 1 | 2 |
| Comércio | 1 | 1 | 3 | 2 | 1 |
| Tecnologia | 1 | 1 | 1 | 3 | 2 |
| Sobrevivência | 2 | 2 | 1 | 1 | 3 |

Os valores (1–3 dots) ficam em `factions.attributes` (JSONB) e são editáveis pelo admin. Os labels dos atributos são fixos no frontend.

## Feed de Atividades (painel lateral)

Últimas 10 entradas de `faction_activity`, ordenadas por `created_at` desc. Exibe cor + tempo relativo. Gerenciado pelo admin em `/admin/faccoes`.

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Endpoint |
|---|---|---|
| Lista de facções | `factions` | `GET /api/faccoes` |
| Ícones | `public/assets/faccoes/` ou Storage `faction-icons` | `factions.icon_url` |
| Comparativo (atributos) | `factions.attributes` (JSONB) | incluso em `GET /api/faccoes` |
| Facção atual do usuário | `user_factions` + `factions` | `GET /api/faccoes/my` |
| Ingressar na facção | `user_factions` + `user_faction_activity` | `POST /api/faccoes/:id/join` |
| Feed de atividades global | `faction_activity` + `factions` | `GET /api/faccoes/activity` |

## Regras de Negócio

- UNIQUE em `user_factions.user_id` → apenas uma facção por usuário
- A escolha é permanente — não há endpoint de troca
- Só facções com `active = true` aparecem
- Ordem dos cards: `factions.position`
- Ao ingressar: registra automaticamente evento `join` em `user_faction_activity`
- `POST /api/faccoes/:id/join` usa `createAdminClient()` para o INSERT (RLS não tem policy INSERT)

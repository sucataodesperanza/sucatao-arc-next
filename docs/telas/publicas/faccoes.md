# Facções

**Rota:** `/faccoes`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Tela de escolha de facção do Sucatão. Cada usuário escolhe **uma única facção**, decisão permanente e irreversível. Exibe cards das facções ativas, comparativo de atributos e feed de atividades ao vivo.

## Facções Disponíveis

| # | Nome | Slug | Cor |
|---|---|---|---|
| 1 | Guardia | `guardia` | `#3df28b` |
| 2 | Mantikor | `mantikor` | `#ff6171` |
| 3 | Erma Cora | `erma-cora` | `#ffd400` |
| 4 | Kozma Ventures | `kozma-ventures` | `#5fa8ff` |
| 5 | Jiangsu Romagna | `jiangsu-romagna` | `#b477ff` |

## Layout

- **Área principal** — hero banner + grid de cards das facções (5 colunas)
- **Painel lateral** — status da facção do usuário, comparativo rápido, feed de atividades

## Cards de Facção

Cada card exibe:
- **Ícone 120×120px** com `drop-shadow` na cor da facção (`/assets/faccoes/{slug}.png`)
- Nome + tagline
- Descrição
- Lista de bônus (array `bonuses` do banco)
- Botão **"Escolher"** → abre modal de confirmação

Após escolha: botão "Selecionada" (badge de check), demais ficam "Indisponível".

### Efeito Hover

Cards não selecionados recebem ao passar o mouse:
- Elevação: `translateY(-6px) scale(1.02)` com spring (`cubic-bezier(0.34, 1.56, 0.64, 1)`)
- Borda acende na cor da facção
- Glow externo (`box-shadow`) com a cor da facção
- Gradiente do banner intensifica (35% → 60% opacity)
- Ícone faz zoom com spring + `drop-shadow` mais forte

### Ícones

Ficam em `public/assets/faccoes/` como arquivos estáticos (`guardia.png`, `mantikor.png`, etc.). O campo `icon_url` na tabela aponta para esses caminhos. O admin pode sobrescrever o `icon_url` via upload no Storage (`faction-icons`) em `/admin/faccoes`.

## Comparativo Rápido (painel lateral)

Tabela com 5 atributos × 5 facções. Os **nomes e ícones** das facções vêm do banco (`factions`). Os **valores numéricos** (1–3 dots por atributo) são fixos no frontend em `COMPARISON`, indexados pelo `slug` da facção — não são editáveis pelo admin.

| Atributo | Guardia | Mantikor | Erma Cora | Kozma Ventures | Jiangsu Romagna |
|---|---|---|---|---|---|
| Combate | 2 | 3 | 1 | 2 | 1 |
| Recursos | 3 | 1 | 2 | 1 | 2 |
| Comércio | 1 | 1 | 3 | 2 | 1 |
| Tecnologia | 1 | 1 | 1 | 3 | 2 |
| Sobrevivência | 2 | 2 | 1 | 1 | 3 |

## Feed de Atividades

Últimas 10 entradas da tabela `faction_activity`, ordenadas por `created_at` desc. Exibe cor da facção correspondente + tempo relativo (ex: "há 8 min"). Gerenciado pelo admin em `/admin/faccoes`.

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Endpoint / Campo |
|---|---|---|
| Lista de facções | `factions` | `GET /api/faccoes` |
| Ícones das facções | `public/assets/faccoes/` (estático) ou Storage `faction-icons` | `factions.icon_url` |
| Facção do usuário | `user_factions` + `factions` | `GET /api/faccoes/my` |
| Ingressar na facção | `user_factions` | `POST /api/faccoes/:id/join` |
| Feed de atividades | `faction_activity` + `factions` | `GET /api/faccoes/activity` |

## Regras de Negócio

- Cada usuário pode ingressar em **apenas uma** facção (UNIQUE em `user_factions.user_id`)
- A escolha é permanente — não há endpoint de troca
- Só facções com `active = true` aparecem na listagem
- A ordem dos cards segue `factions.position`

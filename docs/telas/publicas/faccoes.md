# Facções

**Rota:** `/faccoes`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Tela de escolha de facção do Sucatão. Cada usuário escolhe **uma única facção**, decisão permanente e irreversível. Exibe cards das facções ativas, comparativo de atributos e feed de atividades ao vivo.

## Layout

- **Área principal** — hero banner + grid de cards das facções
- **Painel lateral** — status da facção do usuário, comparativo rápido, feed de atividades

## Cards de Facção

Cada card exibe:
- Ícone (imagem do Storage bucket `faction-icons`, campo `icon_url`)
- Nome + tagline
- Descrição
- Lista de bônus (array `bonuses` do banco)
- Botão **"Escolher"** → abre modal de confirmação

Após escolha: botão "Selecionada" (badge de check), demais ficam "Indisponível".

## Comparativo Rápido (painel lateral)

Tabela com 5 atributos (Combate, Recursos, Comércio, Tecnologia, Sobrevivência) × facções.  
Os valores (1–3 dots) estão **hardcoded no frontend**, mapeados pelo `slug` da facção. O ícone no cabeçalho usa `faction.icon_url`.

## Feed de Atividades

Últimas 10 entradas da tabela `faction_activity`, ordenadas por `created_at` desc. Exibe cor da facção correspondente + tempo relativo (ex: "há 8 min"). Gerenciado pelo admin em `/admin/faccoes`.

## Fontes de Dados

| Conteúdo | Tabela | Endpoint |
|---|---|---|
| Lista de facções | `factions` | `GET /api/faccoes` |
| Facção do usuário | `user_factions` + `factions` | `GET /api/faccoes/my` |
| Ingressar na facção | `user_factions` | `POST /api/faccoes/:id/join` |
| Feed de atividades | `faction_activity` + `factions` | `GET /api/faccoes/activity` |

## Regras de Negócio

- Cada usuário pode ingressar em **apenas uma** facção (UNIQUE em `user_factions.user_id`)
- A escolha é permanente — não há endpoint de troca
- Só facções com `active = true` aparecem na listagem
- A ordem dos cards segue `factions.position`

# Admin — Trades

**Rota:** `/admin/trades`  
**Requer autenticação:** Sim (admin)

## Descrição

Gerenciamento completo do sistema de trades do Sucatão. Três seções: trades (CRUD), horário de funcionamento e aceitações (com conclusão manual).

---

## Seção 1 — Trades do Sucatão

### Conteúdo
- **Botão "Novo trade"** — abre formulário inline
- **Formulário**: pontos oferecidos, item desejado (autocomplete de `catalog_items`), quantidade, raridade e ícone auto-preenchidos via lookup, status, expiração
- **Tabela**: item, qtd, raridade, pontos, seletor de status inline, expiração, botão remover

### Fontes de Dados

| Conteúdo | Tabela | Endpoint |
|---|---|---|
| Lista | `trades` | `GET /api/admin/trades` |
| Criar | `trades` | `POST /api/admin/trades` |
| Editar | `trades` | `PATCH /api/admin/trades/:id` |
| Remover | `trades` | `DELETE /api/admin/trades/:id` |
| Lookup item | `catalog_items` | `GET /api/admin/catalog?q=nome` (debounce 450ms) |

---

## Seção 2 — Horário de Funcionamento

Admin define o intervalo de horário em que os usuários podem agendar entregas in-game. Vale **todos os dias da semana**.

- Dois campos time picker: **Início** e **Fim** (ex: 09:00 às 00:00)
- Botão "Salvar" — persiste em `trade_settings`
- Slots gerados automaticamente de 5 em 5 minutos dentro deste intervalo
- 1 agendamento por slot (nenhuma concorrência)

### Fontes de Dados

| Conteúdo | Tabela | Endpoint |
|---|---|---|
| Ler configuração | `trade_settings` | `GET /api/admin/trades/settings` |
| Salvar configuração | `trade_settings` | `PATCH /api/admin/trades/settings` |

---

## Seção 3 — Aceitações de Trade

Lista todas as aceitações não canceladas com dados do usuário, trade, horário agendado e status.

- **Status "Agendado"** → botão **"Concluir"** disponível
- Clicar "Concluir" abre **modal customizada** com:
  - Usuário + Game ID
  - Item a receber + pontos a creditar
  - Horário agendado
  - Botões: Cancelar | **✓ Confirmar e Creditar**
- Ao confirmar: `trade_acceptances.status = completed` + `profiles.points += offer_points`

### Fontes de Dados

| Conteúdo | Tabela | Endpoint |
|---|---|---|
| Lista de aceitações | `trade_acceptances` + `trades` + `profiles` | `GET /api/admin/trades/acceptances` |
| Concluir trade | `trade_acceptances` + `profiles` | `POST /api/admin/trades/acceptances/:id/complete` |

---

## Fluxo Completo (Admin)

```
1. Admin cria trade  →  aparece em /trades (aba Todos)
2. Admin define horário de funcionamento  →  usuários podem agendar dentro deste intervalo
3. Usuário aceita  →  aceitação com status "pending"
4. Usuário agenda horário  →  status "scheduled", scheduled_at salvo
5. Admin vê aceitação agendada  →  clica Concluir  →  modal  →  confirma
6. Trade status = "completed"  →  pontos creditados automaticamente
```

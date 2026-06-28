# Admin — Mapas

**Rota:** `/admin/mapas`  
**Requer autenticação:** Sim (admin)

## Descrição

Gerenciamento dos mapas e marcadores exibidos em `/mapas`. Inclui botão de sync com a API do MetaForge quando disponível.

---

## Tabela de Mapas

Exibe todos os mapas ordenados por `index`. Cada campo é editável inline.

| Campo | Como editar |
|---|---|
| Nome | Clique inline → editar → ✓ salvar |
| Label | Clique inline → editar → ✓ salvar |
| Descrição | Clique inline → editar (multiline) → ✓ salvar |
| Status | Dropdown `ready` \| `pending` — salva imediatamente |

### Botão "Sync MetaForge"

- `POST /api/admin/mapas/sync` → tenta chamar `https://metaforge.app/api/game-map-data`
- Enquanto o endpoint retornar erro, mostra toast de erro informativo
- Quando funcionar: processará a resposta e fará upsert em `maps`

---

## Marcadores por Mapa

Botão **"Marcadores"** em cada linha abre um painel inline abaixo da tabela.

### Adicionar marcador
Formulário com: Tipo (dropdown), Título, Nota, X % e Y % → botão Add

### Editar marcador existente
- **Título** e **Nota**: clique inline → edita → ✓ salvar
- **X** e **Y**: input numérico, salva no blur
- **Ativo**: checkbox inline (false = oculto no mapa público)
- **Remover**: lixeira com confirmação

---

## Fontes de Dados

| Ação | Endpoint |
|---|---|
| Listar mapas | `GET /api/admin/mapas` |
| Editar mapa | `PATCH /api/admin/mapas/:id` |
| Remover mapa (+ marcadores) | `DELETE /api/admin/mapas/:id` |
| Listar marcadores do mapa | `GET /api/admin/mapas/:id/markers` |
| Criar marcador | `POST /api/admin/mapas/:id/markers` |
| Editar marcador | `PATCH /api/admin/mapas/markers/:markerId` |
| Remover marcador | `DELETE /api/admin/mapas/markers/:markerId` |
| Sync MetaForge | `POST /api/admin/mapas/sync` |

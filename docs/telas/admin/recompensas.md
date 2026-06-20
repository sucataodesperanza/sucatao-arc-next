# Admin — Recompensas

**Rota:** `/admin/recompensas`  
**Requer autenticação:** Sim (admin)

## Descrição

Gerenciamento dos itens de recompensa da loja: gift cards, merchandise, sorteios e outros produtos que **não são itens do jogo ARC Raiders**. Esses itens aparecem na seção "Destaques da semana" do painel lateral da loja.

> Itens ARC (armas, materiais, etc.) são gerenciados em `/admin/catalogo` via MetaForge.  
> Itens de recompensa são gerenciados aqui, manualmente pelo admin.

## Conteúdo Visível

- **Botão "Novo item"** — abre formulário inline
- **Formulário de criação/edição:**
  - Nome
  - Descrição (opcional)
  - **Imagem** — botão de upload (JPG/PNG/WEBP/GIF, máx 4MB) com preview + campo de URL manual como fallback
  - Preço em pontos
  - Estoque
  - Data de expiração do destaque (optional) — usada no timer da loja
  - Toggle "Destaque da semana" — se marcado, aparece no painel da loja
- **Tabela de itens** — imagem, nome, preço, estoque, toggle destaque (inline), toggle ativo (inline), data de expiração, remover

## Fontes de Dados

| Conteúdo | Tabela | Campo(s) | Endpoint |
|---|---|---|---|
| Lista de itens | `reward_items` | todos | `GET /api/admin/reward-items` |
| Criar | `reward_items` | `name`, `description`, `image_url`, `price`, `stock`, `featured`, `expires_at` | `POST /api/admin/reward-items` |
| Editar campos / toggles | `reward_items` | campos editados + `updated_at` | `PATCH /api/admin/reward-items/:id` |
| Remover | `reward_items` | — | `DELETE /api/admin/reward-items/:id` |
| Upload de imagem | Storage bucket `reward-images` | — | `POST /api/admin/upload` |

## Upload de Imagem

O upload segue este fluxo:
1. Admin clica "Importar imagem" e seleciona o arquivo
2. `POST /api/admin/upload` (FormData) — usa admin client server-side
3. Arquivo é salvo em `storage.reward-images/{timestamp}-{random}.{ext}`
4. URL pública retornada é salva em `form.image_url`
5. Preview aparece imediatamente no formulário

**Limitações:** JPG, PNG, WEBP ou GIF · máximo 4 MB · somente admins podem fazer upload (policy no bucket).

## Comportamento dos Toggles Inline

- **Destaque**: `PATCH /api/admin/reward-items/:id { featured: bool }` — toast "Marcado como destaque!" / "Removido do destaque."
- **Ativo**: `PATCH /api/admin/reward-items/:id { active: bool }` — toast "Item ativado!" / "Item desativado."
- Em caso de erro: reverte o toggle visualmente + mostra toast de erro.

## Como aparecem na loja

Os itens com `featured = true` e `active = true` aparecem em `GET /api/loja/weekly` e são exibidos no painel lateral de "Destaques da semana" em `/loja`. O timer countdown é calculado a partir do menor `expires_at` entre os itens em destaque.

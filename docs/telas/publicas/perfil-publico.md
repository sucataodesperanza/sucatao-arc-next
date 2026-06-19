# Perfil Público (Vendedor)

**Rota:** `/perfil/[id]`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Perfil público de um usuário/vendedor. Exibe informações do perfil e o inventário de itens disponíveis para compra daquele vendedor.

## Conteúdo Visível

- **Card do vendedor** — avatar, nome, nick, badge Admin (se aplicável), game_id, data de cadastro, quantidade de itens
- **Grid de itens** — imagem, nome, preço, raridade, categoria e dados do ARC (peso, valor, etc.)

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Dados do perfil | `profiles` | `id`, `name`, `nick`, `avatar_url`, `is_admin`, `game_id`, `created_at` | Server Component: `supabase.from("profiles").select(...).eq("id", id)` |
| Inventário do vendedor | `seller_inventory` + `products` + `rarities` + `categories` | `stock`, `price`, produto completo | `supabase.from("seller_inventory").select(...).eq("seller_id", id).gt("stock", 0)` |
| Dados ARC dos itens (peso/valor) | `arc-data.js` (local) | `items[].name`, `.value`, `.weightKg`, etc. | matched por nome |

## Notas

> Esta é uma **Server Component** — os dados são carregados no servidor antes de exibir a página, sem loading states visíveis.

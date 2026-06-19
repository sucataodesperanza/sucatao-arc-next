# Meu Perfil

**Rota:** `/perfil`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Tela do perfil do usuário logado. Permite visualizar e editar avatar, ver saldo de pontos e resumo da conta.

## Conteúdo Visível

- **Card de identidade** — avatar (com upload/crop/remover), nome, email, status de conexão (online/offline)
- **Carteira** — saldo real (R$ 0,00), pontos do site, número de resgates possíveis
- **Progresso diário** — 3 indicadores (hardcoded em 0)
- **Resumo da conta** — favoritos, itens no catálogo, trades, mapas prontos (valores parcialmente do arc-data)
- **Histórico** — vazio (placeholder)

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Email e nome | `auth` | `user.email`, `user.user_metadata.name` | `supabase.auth.getUser()` |
| Pontos | `profiles` | `points` | `supabase.from("profiles").select("points").eq("id", user.id)` |
| Avatar atual | `profiles` | `avatar_url` | `supabase.from("profiles").select("avatar_url").eq("id", user.id)` |
| Upload de avatar | Supabase Storage | bucket `avatars`, path `public/${user.id}` | `supabase.storage.from("avatars").upload(...)` |
| Contagem de itens | `arc-data.js` (local) | `items.length` | — |
| Contagem de mapas | `arc-data.js` (local) | `maps.length` | — |

## Ações Disponíveis

- **Upload de avatar** — aceita JPG/PNG/WEBP até 2MB, com recorte circular
- **Remover avatar** — deleta do Storage e limpa `profiles.avatar_url`

## Estados Especiais

- **Sem login**: redireciona para `/login`
- **Carregando avatar**: placeholder com inicial do nome

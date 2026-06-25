# Meu Perfil

**Rota:** `/perfil`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Tela do perfil do usuário logado. Permite visualizar e editar avatar, nick de jogo, CPF e ver saldo de pontos e resumo da conta.

## Conteúdo Visível

- **Card de identidade** — avatar (upload/crop/remover), nome, email, status online/offline
  - **Nick no ARC Raiders** — campo editável; salvo em `profiles.game_id`; necessário para receber itens comprados
  - **CPF** — campo editável com máscara `000.000.000-00` e validação; necessário para pagamentos via PIX
- **Carteira** — saldo real (R$ 0,00), pontos do site, número de resgates possíveis
- **Progresso diário** — 3 indicadores (hardcoded em 0)
- **Resumo da conta** — favoritos, itens no catálogo, trades, mapas prontos
- **Histórico** — vazio (placeholder)

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Email e nome | `auth` | `user.email`, `user.user_metadata.name` | `supabase.auth.getUser()` |
| Pontos | `profiles` | `points` | `supabase.from("profiles").select("points, avatar_url, game_id, cpf")` |
| Avatar atual | `profiles` | `avatar_url` | mesma query acima |
| Nick do jogo | `profiles` | `game_id` | leitura: mesma query; escrita: `supabase.from("profiles").update({ game_id })` |
| CPF | `profiles` | `cpf` | leitura: mesma query; escrita: `supabase.from("profiles").update({ cpf })` |
| Upload de avatar | Supabase Storage | bucket `avatars`, path `public/${user.id}` | `supabase.storage.from("avatars").upload(...)` |
| Contagem de itens/mapas | `arc-data.js` (local) | `items.length`, `maps.length` | — |

## Ações Disponíveis

- **Upload de avatar** — aceita JPG/PNG/WEBP até 2MB, com recorte circular
- **Remover avatar** — deleta do Storage e limpa `profiles.avatar_url`
- **Editar nick** — salva em `profiles.game_id` ao sair do campo (`onBlur`) ou Enter; toast de confirmação
- **Editar CPF** — máscara automática, validado com `isValidCpf()`, salvo em `profiles.cpf`; toast de confirmação

## Validações

- CPF: validado via algoritmo em `src/lib/cpf.ts` antes de salvar
- Se CPF inválido: toast de erro, valor revertido para o anterior
- Nick: sem validação de formato (qualquer string de até 60 caracteres)

## Requisitos para Compras

| Campo | Obrigatório para |
|---|---|
| `game_id` | Qualquer compra na loja (pontos ou PIX) |
| `cpf` | Pagamentos via PIX |

## Estados Especiais

- **Sem login**: redireciona para `/login` via middleware
- **Carregando avatar**: placeholder com inicial do nome
- **Feedback de salvamento**: toast verde/vermelho no canto inferior direito

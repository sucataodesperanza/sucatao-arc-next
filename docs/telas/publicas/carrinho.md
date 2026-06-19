# Carrinho

**Rota:** `/carrinho`  
**Requer autenticação:** Sim

## Descrição

Tela de revisão do carrinho antes do checkout. Mostra os itens separados por modo de pagamento (pontos ou saldo real) com totais e validação de pré-requisitos.

## Conteúdo Visível

- **Lista de itens** — agrupados por modo (pontos / saldo real) com imagem, nome, raridade, quantidade, preço unitário e controle de quantidade (+ / -)
- **Resumo** — subtotal por modo, total geral
- **Saldo de pontos** — pontos disponíveis vs. pontos necessários
- **Avisos** — alerta se falta `game_id` ou `cpf` no perfil para finalizar
- **Botão de checkout** — "Finalizar pedido" (chama API de checkout)

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Itens do carrinho | `CartContext` (estado local) | `itemId`, `name`, `type`, `rarity`, `value`, `weightKg`, `image`, `mode`, `qty` | — |
| Pontos do usuário | `profiles` | `points` | `supabase.from("profiles").select("points, cpf, game_id").eq("id", user.id)` |
| CPF e game_id | `profiles` | `cpf`, `game_id` | mesma query acima |
| Finalização | API | — | `POST /api/store/checkout` |

## Lógica de Checkout

O checkout envia todos os itens do carrinho para `POST /api/store/checkout`. Dependendo do método:
- **Pontos**: deduz da tabela `profiles.points`
- **Saldo real**: gera um pedido em `orders` e retorna link PIX → redireciona para `/pagar/[id]`

## Estados Especiais

- **Carrinho vazio**: mensagem e link de volta à loja
- **Sem game_id/CPF**: aviso com link para o perfil preencher antes de comprar

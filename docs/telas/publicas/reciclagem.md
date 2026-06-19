# Reciclagem

**Rota:** `/reciclagem`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Guia de reciclagem de itens do jogo. Exibe quais itens podem ser reciclados, o que geram ao reciclar e seus valores base.

## Conteúdo Visível

- **Busca** — filtra por nome de item ou material obtido
- **Contadores** — total de recicláveis, com saída definida, visíveis no momento
- **Grid de cards** — imagem, tipo, raridade, saída de reciclagem (itens gerados), valor base do item

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Itens recicláveis | `arc-data.js` (local) | `items[].id`, `.name`, `.type`, `.rarity`, `.value`, `.isRecyclable`, `.recyclingOutput` | filtro: `isRecyclable === true` |

## Notas

> Todos os dados são **locais**. A tela usa exclusivamente o arquivo `arc-data.js`, sem chamadas ao Supabase ou APIs externas.

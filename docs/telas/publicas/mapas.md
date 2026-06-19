# Mapas

**Rota:** `/mapas`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Visualizador interativo dos mapas do jogo com marcadores de pontos de interesse (loot, bots, exfil, etc.).

## Conteúdo Visível

- **Lista lateral de mapas** — nome, label, badge de status (pronto/pendente)
- **Visualizador de mapa** — imagem do mapa com marcadores clicáveis coloridos por categoria
- **Lista de marcadores** — por categoria com ícone e nome
- **Painel de detalhe do marcador** — título, nota e categoria ao clicar

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Lista de mapas | `arc-data.js` (local) | `maps[].id`, `.name`, `.label`, `.description`, `.image`, `.status` | — |
| Marcadores por mapa | `map-markers.js` (local) | `markers[].mapId`, `.type`, `.x`, `.y`, `.title`, `.note` | — |
| Categorias de marcadores | `map-markers.js` (local) | `markerCategories[].id`, `.label`, `.color`, `.icon` | — |

## Notas

> Todos os dados são **locais**. Os 7 mapas incluem: Campos de Batalha da Represa, Espaçoporto, Cidade Soterrada, O Portão Azul, Stella Montis Superior, Stella Montis Inferior e Marés Partidas (pendente, sem imagem).

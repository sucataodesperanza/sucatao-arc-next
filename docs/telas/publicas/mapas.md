# Mapas

**Rota:** `/mapas`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Visualizador interativo dos mapas do jogo com marcadores de pontos de interesse (loot, bots, exfil, etc.). Dados vindos do banco — estratégia MetaForge fallback: dados populados via seed do `arc-data.js`, com endpoint de sync preparado para quando a API do MetaForge (`/api/game-map-data`) estiver estável.

## Layout

- **Sidebar esquerda** — cards verticais de seleção de mapa (thumbnail + nome + label + status dot)
- **Visualizador central** — imagem do mapa com pinos interativos
- **Painel lateral direito** — descrição do mapa, marcador ativo e categorias

## Funcionalidades

### Seleção de mapa (sidebar)
- Cards com miniatura 52×36px, nome em uppercase, label em cinza, status dot verde/amarelo
- Mapas com `status = "pending"` aparecem desabilitados ("Em breve")
- Clique seleciona o mapa e limpa o marcador ativo

### Pinos/marcadores
- Formato de gota com emoji da categoria (💰 loot, 🚀 extract, 🔑 key, ⚠️ danger, 🗺️ route)
- Cor do pino = cor da categoria (`markerCategories` em `map-markers.js`)
- **Hover**: tooltip flutuante com categoria + título + nota
- **Click**: fixa o tooltip + destaque no pino + painel lateral atualiza

### Legenda
- Barra na base do visualizador com chips coloridos por categoria + contagem
- Painel lateral: lista de categorias com contagem de marcadores ativos

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Endpoint |
|---|---|---|
| Lista de mapas (nome, label, descrição, imagem, status) | `maps` | `GET /api/mapas` |
| Marcadores por mapa (tipo, x/y, título, nota) | `map_markers` | incluso em `GET /api/mapas` |
| Categorias e cores dos marcadores | `map-markers.js` (local, custom) | — |

> **Nota:** `markerCategories` permanece em `map-markers.js` pois são dados custom (labels em PT, cores da paleta do site). Os dados dos mapas e marcadores migraram para o banco.

## `GET /api/mapas`

```json
{
  "maps": [
    {
      "id": "dam_battlegrounds",
      "name": "Campos de Batalha da Represa",
      "label": "Zona industrial",
      "description": "...",
      "image_url": "/assets/maps/dam_battlegrounds.png",
      "status": "ready",
      "index": 1
    }
  ],
  "markers": [
    {
      "id": "uuid",
      "map_id": "dam_battlegrounds",
      "type": "loot",
      "x": 52.0,
      "y": 54.0,
      "title": "Hydroponic Dome",
      "note": "Area boa para materiais..."
    }
  ]
}
```

## Tabelas do banco

### `maps`
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | text PK | Ex: `dam_battlegrounds` — slug do mapa |
| `name` | text | Nome em PT-BR |
| `label` | text | Subtítulo (ex: "Zona industrial") |
| `description` | text | Descrição completa |
| `image_url` | text nullable | Caminho da imagem (ex: `/assets/maps/...`) |
| `status` | text | `ready` \| `pending` |
| `index` | integer | Ordem de exibição |
| `metaforge_id` | text nullable | ID externo para sync futuro com MetaForge |

### `map_markers`
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | — |
| `map_id` | text FK → maps | Mapa pai |
| `type` | text | `loot` \| `extract` \| `key` \| `danger` \| `route` |
| `x` | numeric(5,2) | Posição horizontal em % |
| `y` | numeric(5,2) | Posição vertical em % |
| `title` | text | Nome do ponto |
| `note` | text | Descrição/dica |
| `active` | boolean | `false` = oculto no mapa público |

## Mapas disponíveis (seed inicial)

| # | ID | Nome | Status |
|---|---|---|---|
| 1 | `dam_battlegrounds` | Campos de Batalha da Represa | ready |
| 2 | `the_spaceport` | Espaçoporto | ready |
| 3 | `buried_city` | Cidade Soterrada | ready |
| 4 | `the_blue_gate` | O Portão Azul | ready |
| 5 | `stella_montis_upper` | Stella Montis Superior | ready |
| 6 | `stella_montis_lower` | Stella Montis Inferior | ready |
| 7 | `riven_tides` | Marés Partidas | pending |

## Estratégia MetaForge

O endpoint `https://metaforge.app/api/game-map-data` existe mas retorna 500 atualmente. Quando estabilizar:
1. Admin clica **"Sync MetaForge"** em `/admin/mapas`
2. `POST /api/admin/mapas/sync` chama o endpoint e processa a resposta
3. Dados são atualizados via upsert na tabela `maps`

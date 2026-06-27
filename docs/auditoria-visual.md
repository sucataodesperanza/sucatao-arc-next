# Auditoria de Identidade Visual

Mapeamento do estado de cada tela em relação à nova identidade visual do site (design system com `store-layout`, `page-title`, `store-side-panel`, `SidePanelUserHeader`, etc.).

**Última atualização:** 2026-06-28  
**Status:** ✅ Todas as telas na nova identidade visual

---

## Telas Públicas

| Status | Tela | Rota |
|---|---|---|
| ✅ Atualizada | Início | `/` |
| ✅ Atualizada | Loja | `/loja` |
| ✅ Atualizada | Inventário | `/inventario` |
| ✅ Atualizada | Trades | `/trades` |
| ✅ Atualizada | Facções — Seleção | `/faccoes` |
| ✅ Atualizada | Facções — Visão Geral | `/faccoes/visao-geral` |
| ✅ Atualizada | Contratos | `/contratos` |
| ✅ Atualizada | Crafting | `/crafting` |
| ✅ Atualizada | Mapas | `/mapas` |
| ✅ Atualizada | Arcpedia | `/arcpedia` |
| ✅ Atualizada | Perfil | `/perfil` |
| ✅ Atualizada | Perfil Público | `/perfil/[id]` |
| ✅ Atualizada | Carrinho | `/carrinho` |
| ✅ Atualizada | Pagamento PIX | `/pagar/[id]` |
| ✅ Atualizada | Pedido Confirmado | `/pedido-confirmado` |

## Páginas de Autenticação

| Status | Tela | Rota |
|---|---|---|
| ✅ Atualizada | Login | `/login` |
| ✅ Atualizada | Registro | `/registro` |
| ✅ Atualizada | Recuperar Senha | `/recuperar-senha` |
| ✅ Atualizada | Completar Cadastro | `/completar-cadastro` |
| ✅ Atualizada | Atualizar Senha | `/atualizar-senha` |
| ✅ Atualizada | Confirmar Email | `/confirmar-email` |

---

## Critérios de "Atualizada"

Uma tela é considerada **atualizada** quando usa:
- Classes de layout: `store-layout`, `page-title`, `store-side-panel`
- Componente: `SidePanelUserHeader`
- CSS de escopo dedicado (ex: `loja.css`, `inventario.css`)
- Sem `utility-page` genérico como wrapper principal
- Sem estilos inline extensivos

## Telas Removidas

| Tela | Rota | Motivo |
|---|---|---|
| ARC Intel | `/arcs` | Sem link de navegação, inacessível |
| Reciclagem | `/reciclagem` | Removida em 2026-06-27 |

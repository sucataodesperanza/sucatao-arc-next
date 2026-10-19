# Sucatão de Speranza

Loja e companion de ARC Raiders, com catálogo, kits livres, configurador de armas, loadouts e painel administrativo.

A documentação funcional e técnica está em [docs/README.md](docs/README.md). Consulte o [resumo das atualizações](docs/atualizacoes-2026-10-19.md), a [loja](docs/telas/publicas/loja.md), os [kits](docs/telas/admin/kits.md) e a [edição de preços](docs/admin-precos.md).

## Desenvolvimento

Projeto Next.js 16 e React 19. Instale as dependências com npm install e configure as variáveis do ambiente do projeto. Não publique credenciais.

- npm run dev: servidor de desenvolvimento.
- npm run build: build de produção com Webpack; requer o ambiente configurado, incluindo RESEND_API_KEY.
- npm start: executa o build de produção.
- node --test tests/*.test.cjs: testes das regras de negócio.

Antes de modificar código, leia AGENTS.md e o guia relevante em node_modules/next/dist/docs/, conforme as instruções do repositório.

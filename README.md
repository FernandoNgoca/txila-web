# txila-web

Painel administrativo da plataforma Txila, em Angular 20 (standalone, SCSS, Angular Material).
Funciona com a `txila-api`.

Inclui:
- Página de entrada para administradores.
- Recuperação de senha por email (`/reset-password`).
- Sessão com renovação automática do token e opção "lembrar-me".
- `adminGuard`: só contas de administrador abrem o painel.

## Executar

```bash
npm ci
npm start
```

Abrir http://localhost:4200. A API é esperada em http://localhost:8080
(configurável em `src/environments/environment.ts`) e a origem
http://localhost:4200 deve estar autorizada no CORS da API.

## Build e testes

```bash
npm run build
npm test
```

Produção: `dist/txila-web/browser`. O ambiente de produção usa a mesma origem;
o `nginx.conf` encaminha `/api` para a API e as restantes rotas para `index.html`.

## Render

No Render, a web é publicada como site estático com `npm run build:render`.
O script `scripts/set-api-url.mjs` grava o endereço da API (variável `API_URL`)
em `environment.production.ts` antes do build. Sem `API_URL`, a web usa a mesma
origem e o `nginx.conf` encaminha `/api` para a API. A configuração está no
`render.yaml` do repositório `txila-api`.

## Painel

Só contas com perfil `ROLE_ADMIN` ou `ROLE_SUPER_ADMIN` entram (`adminGuard`); as outras voltam ao login.

| Rota | Página |
|---|---|
| `/login` | Entrada e pedido de recuperação da palavra-passe |
| `/dashboard` | Indicadores, novos registos por período e actividade recente |
| `/produtos` | Catálogo oficial: criar, editar, desactivar |
| `/categorias` | Categorias do catálogo e ordem na aplicação |
| `/estabelecimentos` | Locais oficiais, com tipo, bairro, cidade e coordenadas |
| `/utilizadores` | Pesquisa, perfis, suspensão e novos administradores |
| `/auditoria` | Registo de todas as operações do painel |

O layout (`src/app/layout`) tem menu lateral no computador, só ícones no tablet e menu sobreposto no telemóvel.

## Novas páginas

Criar a página em `src/app/features/`, registá-la como filha da rota do layout
em `src/app/app.routes.ts` e acrescentar a entrada do menu em
`src/app/layout/admin-layout.ts`. Os pedidos à API usam o serviço `Api`
(`src/app/core/services/api.service.ts`), que junta o token e trata a sessão expirada.

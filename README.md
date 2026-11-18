# txila-web

Frontend da plataforma Txila, em Angular 20 (standalone, SCSS, Angular Material).
Funciona com a `txila-api`.

Inclui:
- Janela de login e registo.
- Recuperação de senha por email (`/reset-password`).
- Sessão com renovação automática do token e opção "lembrar-me".
- `authGuard` para proteger rotas.

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

## Novas páginas

Criar a página em `src/app/features/`, registá-la em `src/app/app.routes.ts`
e, se precisar de conta, adicionar `canActivate: [authGuard]`. Os pedidos
autenticados usam `AuthService.headers()`.

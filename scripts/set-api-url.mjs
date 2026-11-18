// Define o endereço da API no build de produção a partir de API_URL (site estático no Render).
// Sem API_URL, a web usa a mesma origem e o servidor encaminha /api para a API (nginx.conf).
import { writeFileSync } from 'node:fs';

const url = (process.env.API_URL ?? '').trim().replace(/\/+$/, '');
if (url && !/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(url)) {
  console.error('API_URL deve ser uma origem HTTPS sem caminho, por exemplo https://txila-api.onrender.com');
  process.exit(1);
}
writeFileSync(new URL('../src/environments/environment.production.ts', import.meta.url), `export const environment = {
  production: true,
  // Gerado por scripts/set-api-url.mjs; vazio quando o servidor encaminha /api para o Spring Boot.
  apiUrl: ${JSON.stringify(url)}
};
`);
console.log(url ? `API em ${url}` : 'API na mesma origem (/api)');

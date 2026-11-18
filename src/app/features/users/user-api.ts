/** Utilizador como devolvido por /api/v1/admin/users (UserDTO). */
export interface User {
  id: number; userName: string; fullName: string; email: string | null; roles: string[];
  enabled: boolean; createdDate: string | null; updatedDate: string | null;
}
/** Lista paginada no formato HAL usado pela rota de utilizadores. */
export interface UserPage { _embedded?: { user: User[] }; page: { size: number; totalElements: number; totalPages: number; number: number; }; }

export const ROLES = [
  { value: 'ROLE_CLIENT', label: 'Cliente', hint: 'Usa a aplicação; não entra no painel.' },
  { value: 'ROLE_ADMIN', label: 'Administrador', hint: 'Gere catálogo, locais e contas de clientes.' },
  { value: 'ROLE_SUPER_ADMIN', label: 'Super administrador', hint: 'Também gere outros administradores.' },
];

/** O perfil mais alto da conta, que é o que se mostra e edita no painel. */
export function mainRole(roles: string[]): string {
  return ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_CLIENT'].find(r => roles.includes(r)) ?? 'ROLE_CLIENT';
}
export function roleLabel(role: string): string {
  return ROLES.find(r => r.value === role)?.label ?? role;
}

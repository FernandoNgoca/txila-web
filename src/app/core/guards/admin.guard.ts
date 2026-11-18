import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ADMIN_ROLES, AuthService } from '../services/auth.service';

/** O painel só abre com uma sessão válida de administrador; as outras contas voltam ao login. */
export const adminGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const login = (params: Record<string, string>) => router.createUrlTree(['/login'], { queryParams: params });
  await auth.restore();
  try { auth.headers(); } catch { return login(state.url === '/' ? {} : { next: state.url }); }
  try {
    const profile = await auth.loadProfile();
    if (profile.roles.some(role => ADMIN_ROLES.includes(role))) return true;
    await auth.logout();
    return login({ denied: '1' });
  } catch {
    return login({});
  }
};

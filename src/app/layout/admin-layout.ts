import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { Icon, IconName } from '../shared/icon';

interface NavItem { path: string; label: string; icon: IconName; }

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
  host: { '(document:keydown.escape)': 'menuOpen.set(false)' }
})
export class AdminLayout {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly menuOpen = signal(false);
  readonly nav: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/produtos', label: 'Produtos', icon: 'product' },
    { path: '/categorias', label: 'Categorias', icon: 'category' },
    { path: '/estabelecimentos', label: 'Estabelecimentos', icon: 'store' },
    { path: '/utilizadores', label: 'Utilizadores', icon: 'users' },
    { path: '/auditoria', label: 'Auditoria', icon: 'audit' },
  ];
  readonly role = computed(() => this.auth.profile()?.roles.includes('ROLE_SUPER_ADMIN') ? 'Super administrador' : 'Administrador');
  readonly initial = computed(() => (this.auth.profile()?.fullName.trim()[0] ?? '?').toUpperCase());

  constructor() {
    // No telemóvel, o menu fecha-se depois de escolher uma página.
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => this.menuOpen.set(false));
  }

  async signOut(): Promise<void> {
    await this.auth.logout();
    void this.router.navigate(['/login']);
  }
}

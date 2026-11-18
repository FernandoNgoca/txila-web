import { Component, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { Api, apiErrorMessage } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { confirmAction } from '../../shared/confirm-dialog';
import { formatDay, formatNumber } from '../../shared/format';
import { Icon } from '../../shared/icon';
import { ListState } from '../../shared/list-state';
import { User, UserPage, mainRole, roleLabel } from './user-api';
import { UserForm, UserFormData } from './user-form';

interface Counts { users: { total: number; admins: number; suspended: number; } }

@Component({
  selector: 'app-users',
  imports: [Icon],
  templateUrl: './users.html'
})
export class Users {
  private readonly api = inject(Api);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  readonly list = new ListState(() => void this.load());
  readonly page = signal<UserPage | null>(null);
  readonly counts = signal<Counts['users'] | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly fmt = formatNumber;
  readonly day = formatDay;
  readonly mainRole = mainRole;
  readonly roleLabel = roleLabel;
  readonly me = computed(() => this.auth.profile()?.id);
  readonly superAdmin = computed(() => this.auth.profile()?.roles.includes('ROLE_SUPER_ADMIN') ?? false);
  readonly users = computed(() => this.page()?._embedded?.user ?? []);
  readonly total = computed(() => this.page()?.page.totalElements ?? 0);

  constructor() { void Promise.all([this.load(), this.loadCounts()]); }

  async load(): Promise<void> {
    this.loading.set(true); this.error.set('');
    try {
      this.page.set(await this.api.get<UserPage>('/api/v1/admin/users', { page: this.list.page(), size: this.list.size, search: this.list.search(), sortField: 'fullName' }));
    } catch (error) { this.error.set(apiErrorMessage(error)); }
    finally { this.loading.set(false); }
  }

  private async loadCounts(): Promise<void> {
    try { this.counts.set((await this.api.get<Counts>('/api/v1/admin/dashboard', { days: 7 })).users); } catch { /* opcional */ }
  }

  /** Só um super administrador mexe em contas de super administrador. */
  canManage(user: User): boolean {
    return this.superAdmin() || !user.roles.includes('ROLE_SUPER_ADMIN');
  }

  async edit(user: User | null): Promise<void> {
    const ref = this.dialog.open<UserForm, UserFormData, boolean>(UserForm, { data: { user, superAdmin: this.superAdmin() }, panelClass: 'dialog-panel', autoFocus: 'first-tabbable' });
    if (!await firstValueFrom(ref.afterClosed())) return;
    this.snack.open(user ? 'Utilizador actualizado.' : 'Administrador criado.', undefined, { duration: 3000 });
    await Promise.all([this.load(), this.loadCounts()]);
  }

  async toggle(user: User): Promise<void> {
    if (user.enabled && !await confirmAction(this.dialog, {
      title: 'Suspender conta?', confirm: 'Suspender', danger: true,
      message: `${user.fullName} deixa de conseguir entrar e as sessões abertas terminam já. Os dados da conta mantêm-se e podes reactivá-la depois.`
    })) return;
    try {
      await this.api.patch(`/api/v1/admin/users/${user.id}/enabled`, { enabled: !user.enabled });
      this.snack.open(user.enabled ? 'Conta suspensa.' : 'Conta reactivada.', undefined, { duration: 3000 });
      await Promise.all([this.load(), this.loadCounts()]);
    } catch (error) { this.snack.open(apiErrorMessage(error), 'OK', { duration: 6000 }); }
  }
}

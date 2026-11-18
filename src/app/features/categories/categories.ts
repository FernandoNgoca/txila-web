import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { Api, apiErrorMessage } from '../../core/services/api.service';
import { confirmAction } from '../../shared/confirm-dialog';
import { formatDay, formatNumber } from '../../shared/format';
import { Icon } from '../../shared/icon';
import { StatusFilter } from '../../shared/list-state';
import { Category } from './category-api';
import { CategoryForm } from './category-form';

@Component({
  selector: 'app-categories',
  imports: [RouterLink, Icon],
  templateUrl: './categories.html'
})
export class Categories {
  private readonly api = inject(Api);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  readonly all = signal<Category[]>([]);
  readonly search = signal('');
  readonly status = signal<StatusFilter>('all');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly fmt = formatNumber;
  readonly day = formatDay;
  /** As categorias são poucas: a pesquisa e os filtros correm no browser. */
  readonly shown = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.all().filter(c => (this.status() === 'all' || c.active === (this.status() === 'active')) && (!q || c.name.toLowerCase().includes(q)));
  });
  readonly active = computed(() => this.all().filter(c => c.active).length);
  readonly products = computed(() => this.all().reduce((sum, c) => sum + c.products, 0));

  constructor() { void this.load(); }

  async load(): Promise<void> {
    this.loading.set(true); this.error.set('');
    try { this.all.set(await this.api.get<Category[]>('/api/v1/admin/categories')); }
    catch (error) { this.error.set(apiErrorMessage(error)); }
    finally { this.loading.set(false); }
  }

  async edit(category: Category | null): Promise<void> {
    const ref = this.dialog.open<CategoryForm, Category | null, Category>(CategoryForm, { data: category, panelClass: 'dialog-panel', autoFocus: 'first-tabbable' });
    if (!await firstValueFrom(ref.afterClosed())) return;
    this.snack.open(category ? 'Categoria actualizada.' : 'Categoria criada.', undefined, { duration: 3000 });
    await this.load();
  }

  async toggle(category: Category): Promise<void> {
    if (category.active && !await confirmAction(this.dialog, {
      title: 'Desactivar categoria?', confirm: 'Desactivar', danger: true,
      message: `"${category.name}" deixa de aparecer na aplicação${category.products === 0 ? '' : category.products === 1 ? ', tal como o seu produto' : `, tal como os seus ${category.products} produtos`}. Nada é apagado e podes reactivá-la a qualquer momento.`
    })) return;
    try {
      await this.api.patch(`/api/v1/admin/categories/${category.id}/active`, { active: !category.active });
      this.snack.open(category.active ? 'Categoria desactivada.' : 'Categoria reactivada.', undefined, { duration: 3000 });
      await this.load();
    } catch (error) { this.snack.open(apiErrorMessage(error), 'OK', { duration: 6000 }); }
  }
}

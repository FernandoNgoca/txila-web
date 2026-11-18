import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { Api, Page, apiErrorMessage } from '../../core/services/api.service';
import { Category, Product } from '../categories/category-api';
import { ProductForm, ProductFormData } from './product-form';
import { confirmAction } from '../../shared/confirm-dialog';
import { formatDay, formatMt, formatNumber } from '../../shared/format';
import { Icon } from '../../shared/icon';
import { ListState } from '../../shared/list-state';

interface CatalogCounts { catalog: { products: number; activeProducts: number; categories: number; } }

@Component({
  selector: 'app-products',
  imports: [Icon],
  templateUrl: './products.html'
})
export class Products {
  private readonly api = inject(Api);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly list = new ListState(() => void this.load());
  readonly categoryId = signal<number | null>(null);
  readonly categories = signal<Category[]>([]);
  readonly page = signal<Page<Product> | null>(null);
  readonly counts = signal<CatalogCounts['catalog'] | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly mt = formatMt;
  readonly day = formatDay;
  readonly fmt = formatNumber;

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    const category = Number(params.get('categoria'));
    if (category) this.categoryId.set(category);
    void this.init(params.get('novo') === '1');
  }

  private async init(openForm: boolean): Promise<void> {
    await Promise.all([this.load(), this.loadCategories(), this.loadCounts()]);
    if (openForm) { void this.router.navigate([], { queryParams: { novo: null }, queryParamsHandling: 'merge', replaceUrl: true }); void this.edit(null); }
  }

  async load(): Promise<void> {
    this.loading.set(true); this.error.set('');
    try {
      this.page.set(await this.api.get<Page<Product>>('/api/v1/admin/products', {
        page: this.list.page(), size: this.list.size, search: this.list.search(), categoryId: this.categoryId(), active: this.list.active()
      }));
    } catch (error) { this.error.set(apiErrorMessage(error)); }
    finally { this.loading.set(false); }
  }

  private async loadCategories(): Promise<void> {
    try { this.categories.set(await this.api.get<Category[]>('/api/v1/admin/categories')); } catch { /* o filtro fica vazio */ }
  }

  private async loadCounts(): Promise<void> {
    try { this.counts.set((await this.api.get<CatalogCounts>('/api/v1/admin/dashboard', { days: 7 })).catalog); } catch { /* os contadores são opcionais */ }
  }

  filterCategory(value: string): void {
    this.categoryId.set(value ? Number(value) : null); this.list.page.set(0);
    void this.router.navigate([], { queryParams: { categoria: value || null }, replaceUrl: true });
    void this.load();
  }

  async edit(product: Product | null): Promise<void> {
    if (!this.categories().length) await this.loadCategories();
    const ref = this.dialog.open<ProductForm, ProductFormData, Product>(ProductForm, { data: { product, categories: this.categories() }, panelClass: 'dialog-panel', autoFocus: 'first-tabbable' });
    const saved = await firstValueFrom(ref.afterClosed());
    if (!saved) return;
    this.snack.open(product ? 'Produto actualizado.' : 'Produto criado.', undefined, { duration: 3000 });
    await Promise.all([this.load(), this.loadCounts(), this.loadCategories()]);
  }

  async toggle(product: Product): Promise<void> {
    if (product.active && !await confirmAction(this.dialog, {
      title: 'Desactivar produto?', confirm: 'Desactivar', danger: true,
      message: `"${product.name}" deixa de aparecer no catálogo da aplicação. Os consumos já registados não mudam e podes reactivá-lo a qualquer momento.`
    })) return;
    try {
      await this.api.patch(`/api/v1/admin/products/${product.id}/active`, { active: !product.active });
      this.snack.open(product.active ? 'Produto desactivado.' : 'Produto reactivado.', undefined, { duration: 3000 });
      await Promise.all([this.load(), this.loadCounts()]);
    } catch (error) { this.snack.open(apiErrorMessage(error), 'OK', { duration: 6000 }); }
  }
}

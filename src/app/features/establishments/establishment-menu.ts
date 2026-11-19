import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Api, Page, apiErrorMessage } from '../../core/services/api.service';
import { Product } from '../categories/category-api';
import { formatMt, formatNumber, parseMt } from '../../shared/format';
import { Icon } from '../../shared/icon';
import { Establishment } from './establishment-api';

/** Produto vendido num estabelecimento e o preço praticado ali (centavos). */
interface MenuItem { productId: number; name: string; size: string; categoryName: string; price: number; referencePrice: number | null; active: boolean; }

/** Menu de um estabelecimento: que produtos vende e a que preço. A aplicação mostra-os primeiro neste local. */
@Component({
  selector: 'app-establishment-menu',
  imports: [Icon],
  templateUrl: './establishment-menu.html',
  styleUrl: './establishment-menu.scss'
})
export class EstablishmentMenu {
  readonly place = inject<Establishment>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<EstablishmentMenu>);
  private readonly api = inject(Api);
  private readonly path = `/api/v1/admin/establishments/${this.place.id}/products`;
  readonly items = signal<MenuItem[]>([]);
  readonly query = signal('');
  readonly results = signal<Product[]>([]);
  readonly chosen = signal<Product | null>(null);
  readonly editing = signal<number | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly mt = formatMt;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() { void this.load(); }

  async load(): Promise<void> {
    try { this.items.set(await this.api.get<MenuItem[]>(this.path)); }
    catch (error) { this.error.set(apiErrorMessage(error)); }
    finally { this.loading.set(false); }
  }

  label(p: { name: string; size: string }): string { return p.size ? `${p.name} ${p.size}` : p.name; }
  priceText(cents: number | null): string { return cents === null ? '' : formatNumber(cents / 100, cents % 100 === 0 ? 0 : 2); }

  /** Pesquisa no catálogo os produtos que ainda não estão no menu. */
  search(text: string): void {
    this.query.set(text);
    if (this.timer) clearTimeout(this.timer);
    this.chosen.set(null);
    if (!text.trim()) { this.results.set([]); return; }
    this.timer = setTimeout(async () => {
      try {
        const page = await this.api.get<Page<Product>>('/api/v1/admin/products', { search: text, active: true, size: 8 });
        const inMenu = new Set(this.items().map(i => i.productId));
        this.results.set(page.content.filter(p => !inMenu.has(p.id)));
      } catch (error) { this.error.set(apiErrorMessage(error)); }
    }, 250);
  }

  async save(productId: number, text: string): Promise<void> {
    const price = parseMt(text);
    if (price === null || Number.isNaN(price) || price <= 0) { this.error.set('Escreve o preço, por exemplo 100 ou 1.250,50.'); return; }
    this.busy.set(true); this.error.set('');
    try {
      this.items.set(await this.api.put<MenuItem[]>(`${this.path}/${productId}`, { price }));
      this.chosen.set(null); this.results.set([]); this.editing.set(null); this.query.set('');
    } catch (error) { this.error.set(apiErrorMessage(error)); }
    finally { this.busy.set(false); }
  }

  async remove(item: MenuItem): Promise<void> {
    this.busy.set(true); this.error.set('');
    try {
      this.items.set(await this.api.delete<MenuItem[]>(`${this.path}/${item.productId}`));
    } catch (error) { this.error.set(apiErrorMessage(error)); }
    finally { this.busy.set(false); }
  }

  count(): string { const n = this.items().length; return n === 1 ? '1 produto' : `${formatNumber(n)} produtos`; }
}

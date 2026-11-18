import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Api, apiErrorMessage } from '../../core/services/api.service';
import { Category, Product } from '../categories/category-api';
import { formatNumber, parseMt } from '../../shared/format';
import { Icon } from '../../shared/icon';

export interface ProductFormData { product: Product | null; categories: Category[]; }

@Component({
  selector: 'app-product-form',
  imports: [ReactiveFormsModule, Icon],
  template: `
<form class="dialog form" [formGroup]="form" (ngSubmit)="save()" novalidate>
  <div class="dialog-head"><h2>{{ data.product ? 'Editar produto' : 'Novo produto' }}</h2>
    <button class="icon-btn small" type="button" aria-label="Fechar" (click)="ref.close()"><app-icon name="close" /></button></div>
  <label class="field">Nome<input formControlName="name" maxlength="120" placeholder="Ex.: Laurentina Preta" cdkFocusInitial></label>
  <div class="form-row">
    <label class="field">Tamanho ou formato<input formControlName="size" maxlength="40" placeholder="Ex.: 330 ml, Garrafa, Dose"><small>Opcional</small></label>
    <label class="field">Categoria
      <select formControlName="categoryId">
        <option [ngValue]="null" disabled>Escolher…</option>
        @for (c of categories; track c.id) { <option [ngValue]="c.id">{{ c.name }}{{ c.active ? '' : ' (desactivada)' }}</option> }
      </select>
    </label>
  </div>
  <label class="field">Preço de referência (MT)<input formControlName="price" inputmode="decimal" placeholder="Ex.: 80 ou 1.250,50"><small>Opcional. Serve só de sugestão: cada pessoa regista o preço que pagou.</small></label>
  @if (error()) { <p class="alert" role="alert">{{ error() }}</p> }
  <div class="dialog-actions">
    <button class="btn" type="button" (click)="ref.close()">Cancelar</button>
    <button class="btn btn-primary" type="submit" [disabled]="busy()">{{ busy() ? 'A guardar…' : 'Guardar' }}</button>
  </div>
</form>`
})
export class ProductForm {
  readonly data = inject<ProductFormData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<ProductForm, Product>);
  private readonly api = inject(Api);
  readonly busy = signal(false);
  readonly error = signal('');
  /** Na edição mostra-se também a categoria actual, mesmo desactivada. */
  readonly categories = this.data.categories.filter(c => c.active || c.id === this.data.product?.categoryId);
  readonly form = new FormGroup({
    name: new FormControl(this.data.product?.name ?? '', { nonNullable: true }),
    size: new FormControl(this.data.product?.size ?? '', { nonNullable: true }),
    categoryId: new FormControl<number | null>(this.data.product?.categoryId ?? null),
    price: new FormControl(this.priceText(this.data.product?.referencePrice ?? null), { nonNullable: true }),
  });

  async save(): Promise<void> {
    const { name, size, categoryId, price } = this.form.getRawValue();
    const referencePrice = parseMt(price);
    if (!name.trim()) return this.error.set('Indica o nome do produto.');
    if (categoryId === null) return this.error.set('Escolhe a categoria.');
    if (referencePrice !== null && (Number.isNaN(referencePrice) || referencePrice <= 0)) return this.error.set('O preço deve ser um valor como 80 ou 1.250,50.');
    this.busy.set(true); this.error.set('');
    const body = { name: name.trim(), size: size.trim(), categoryId, referencePrice };
    try {
      const saved = this.data.product
        ? await this.api.put<Product>(`/api/v1/admin/products/${this.data.product.id}`, body)
        : await this.api.post<Product>('/api/v1/admin/products', body);
      this.ref.close(saved);
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  private priceText(cents: number | null): string {
    return cents === null ? '' : formatNumber(cents / 100, cents % 100 === 0 ? 0 : 2);
  }
}

import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Api, apiErrorMessage } from '../../core/services/api.service';
import { Icon } from '../../shared/icon';
import { Category } from './category-api';

@Component({
  selector: 'app-category-form',
  imports: [ReactiveFormsModule, Icon],
  template: `
<form class="dialog form" [formGroup]="form" (ngSubmit)="save()" novalidate>
  <div class="dialog-head"><h2>{{ category ? 'Editar categoria' : 'Nova categoria' }}</h2>
    <button class="icon-btn small" type="button" aria-label="Fechar" (click)="ref.close()"><app-icon name="close" /></button></div>
  <label class="field">Nome<input formControlName="name" maxlength="80" placeholder="Ex.: Cervejas"></label>
  <label class="field">Ordem na aplicação<input formControlName="sortOrder" type="number" min="0" max="999"><small>As categorias com número mais baixo aparecem primeiro na grelha de produtos.</small></label>
  @if (error()) { <p class="alert" role="alert">{{ error() }}</p> }
  <div class="dialog-actions">
    <button class="btn" type="button" (click)="ref.close()">Cancelar</button>
    <button class="btn btn-primary" type="submit" [disabled]="busy()">{{ busy() ? 'A guardar…' : 'Guardar' }}</button>
  </div>
</form>`
})
export class CategoryForm {
  readonly category = inject<Category | null>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<CategoryForm, Category>);
  private readonly api = inject(Api);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly form = new FormGroup({
    name: new FormControl(this.category?.name ?? '', { nonNullable: true }),
    sortOrder: new FormControl<number | null>(this.category?.sortOrder ?? 0),
  });

  async save(): Promise<void> {
    const { name, sortOrder } = this.form.getRawValue();
    if (!name.trim()) return this.error.set('Indica o nome da categoria.');
    if (sortOrder === null || sortOrder < 0 || sortOrder > 999 || !Number.isInteger(sortOrder)) return this.error.set('A ordem deve ser um número entre 0 e 999.');
    this.busy.set(true); this.error.set('');
    const body = { name: name.trim(), sortOrder };
    try {
      this.ref.close(this.category
        ? await this.api.put<Category>(`/api/v1/admin/categories/${this.category.id}`, body)
        : await this.api.post<Category>('/api/v1/admin/categories', body));
    } catch (error) { this.error.set(apiErrorMessage(error)); }
    finally { this.busy.set(false); }
  }
}

import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Api, apiErrorMessage } from '../../core/services/api.service';
import { Icon } from '../../shared/icon';
import { ESTABLISHMENT_TYPES, Establishment } from './establishment-api';

export interface EstablishmentFormData { establishment: Establishment | null; cities: string[]; }

@Component({
  selector: 'app-establishment-form',
  imports: [ReactiveFormsModule, Icon],
  template: `
<form class="dialog form" [formGroup]="form" (ngSubmit)="save()" novalidate>
  <div class="dialog-head"><h2>{{ data.establishment ? 'Editar estabelecimento' : 'Novo estabelecimento' }}</h2>
    <button class="icon-btn small" type="button" aria-label="Fechar" (click)="ref.close()"><app-icon name="close" /></button></div>
  <label class="field">Nome<input formControlName="name" maxlength="120" placeholder="Ex.: Bar da Marginal"></label>
  <div class="form-row">
    <label class="field">Tipo
      <select formControlName="type">@for (t of types; track t.value) { <option [value]="t.value">{{ t.label }}</option> }</select>
    </label>
    <label class="field">Cidade<input formControlName="city" maxlength="80" list="known-cities"></label>
    <datalist id="known-cities">@for (c of cities; track c) { <option [value]="c"></option> }</datalist>
  </div>
  <label class="field">Bairro<input formControlName="neighbourhood" maxlength="80" placeholder="Ex.: Polana Cimento"><small>Opcional</small></label>
  <div class="form-row">
    <label class="field">Latitude<input formControlName="latitude" inputmode="decimal" placeholder="-25.9653"></label>
    <label class="field">Longitude<input formControlName="longitude" inputmode="decimal" placeholder="32.5892"></label>
  </div>
  <small class="hint">Opcional. Com coordenadas, a aplicação sugere o local a quem está perto. Copia-as do Google Maps (clique direito no local).</small>
  @if (error()) { <p class="alert" role="alert">{{ error() }}</p> }
  <div class="dialog-actions">
    <button class="btn" type="button" (click)="ref.close()">Cancelar</button>
    <button class="btn btn-primary" type="submit" [disabled]="busy()">{{ busy() ? 'A guardar…' : 'Guardar' }}</button>
  </div>
</form>`,
  styles: ['.hint{margin-top:-8px;font-size:12px;color:var(--muted);line-height:1.5}']
})
export class EstablishmentForm {
  readonly data = inject<EstablishmentFormData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<EstablishmentForm, Establishment>);
  private readonly api = inject(Api);
  readonly types = ESTABLISHMENT_TYPES;
  readonly cities = [...new Set(['Maputo', 'Matola', ...this.data.cities])];
  readonly busy = signal(false);
  readonly error = signal('');
  readonly form = new FormGroup({
    name: new FormControl(this.data.establishment?.name ?? '', { nonNullable: true }),
    type: new FormControl(this.data.establishment?.type ?? 'BAR', { nonNullable: true }),
    city: new FormControl(this.data.establishment?.city ?? 'Maputo', { nonNullable: true }),
    neighbourhood: new FormControl(this.data.establishment?.neighbourhood ?? '', { nonNullable: true }),
    latitude: new FormControl(this.data.establishment?.latitude?.toString() ?? '', { nonNullable: true }),
    longitude: new FormControl(this.data.establishment?.longitude?.toString() ?? '', { nonNullable: true }),
  });

  async save(): Promise<void> {
    const v = this.form.getRawValue();
    if (!v.name.trim()) return this.error.set('Indica o nome do estabelecimento.');
    if (!v.city.trim()) return this.error.set('Indica a cidade.');
    // Aceita "-25,9653" e "-25.9653, 32.5892" colado de uma só vez no campo da latitude.
    let [lat, lng] = [v.latitude.trim(), v.longitude.trim()];
    if (lat.includes(',') && lat.includes('.') && !lng) [lat, lng] = lat.split(',').map(s => s.trim());
    const latitude = lat ? Number(lat.replace(',', '.')) : null;
    const longitude = lng ? Number(lng.replace(',', '.')) : null;
    if ((latitude === null) !== (longitude === null)) return this.error.set('Indica a latitude e a longitude, ou deixa as duas vazias.');
    if (latitude !== null && (!Number.isFinite(latitude) || Math.abs(latitude) > 90)) return this.error.set('Latitude inválida.');
    if (longitude !== null && (!Number.isFinite(longitude) || Math.abs(longitude) > 180)) return this.error.set('Longitude inválida.');
    this.busy.set(true); this.error.set('');
    const round = (n: number | null) => n === null ? null : Math.round(n * 1e6) / 1e6;
    const body = { name: v.name.trim(), type: v.type, city: v.city.trim(), neighbourhood: v.neighbourhood.trim() || null, latitude: round(latitude), longitude: round(longitude) };
    try {
      const id = this.data.establishment?.id;
      this.ref.close(id ? await this.api.put<Establishment>(`/api/v1/admin/establishments/${id}`, body) : await this.api.post<Establishment>('/api/v1/admin/establishments', body));
    } catch (error) { this.error.set(apiErrorMessage(error)); }
    finally { this.busy.set(false); }
  }
}

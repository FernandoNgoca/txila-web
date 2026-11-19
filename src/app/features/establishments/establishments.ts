import { Component, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { Api, Page, apiErrorMessage } from '../../core/services/api.service';
import { confirmAction } from '../../shared/confirm-dialog';
import { formatDay, formatNumber } from '../../shared/format';
import { Icon } from '../../shared/icon';
import { ListState } from '../../shared/list-state';
import { ESTABLISHMENT_TYPES, Establishment, typeLabel } from './establishment-api';
import { EstablishmentForm, EstablishmentFormData } from './establishment-form';
import { EstablishmentMenu } from './establishment-menu';
import { AppPreview } from '../../shared/app-preview';

interface Counts { catalog: { establishments: number; activeEstablishments: number; } }

@Component({
  selector: 'app-establishments',
  imports: [Icon],
  templateUrl: './establishments.html'
})
export class Establishments {
  private readonly api = inject(Api);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  readonly list = new ListState(() => void this.load());
  readonly types = ESTABLISHMENT_TYPES;
  readonly typeLabel = typeLabel;
  readonly type = signal('');
  readonly city = signal('');
  readonly cities = signal<string[]>([]);
  readonly page = signal<Page<Establishment> | null>(null);
  readonly counts = signal<Counts['catalog'] | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly fmt = formatNumber;
  readonly day = formatDay;

  constructor() { void Promise.all([this.load(), this.loadExtras()]); }

  async load(): Promise<void> {
    this.loading.set(true); this.error.set('');
    try {
      this.page.set(await this.api.get<Page<Establishment>>('/api/v1/admin/establishments', {
        page: this.list.page(), size: this.list.size, search: this.list.search(), type: this.type(), city: this.city(), active: this.list.active()
      }));
    } catch (error) { this.error.set(apiErrorMessage(error)); }
    finally { this.loading.set(false); }
  }

  private async loadExtras(): Promise<void> {
    try {
      const [cities, overview] = await Promise.all([
        this.api.get<string[]>('/api/v1/admin/establishments/cities'),
        this.api.get<Counts>('/api/v1/admin/dashboard', { days: 7 }),
      ]);
      this.cities.set(cities); this.counts.set(overview.catalog);
    } catch { /* filtros e contadores são opcionais */ }
  }

  filter(kind: 'type' | 'city', value: string): void {
    (kind === 'type' ? this.type : this.city).set(value);
    this.list.page.set(0);
    void this.load();
  }

  async edit(establishment: Establishment | null): Promise<void> {
    const ref = this.dialog.open<EstablishmentForm, EstablishmentFormData, Establishment>(EstablishmentForm, { data: { establishment, cities: this.cities() }, panelClass: 'dialog-panel', autoFocus: 'first-tabbable' });
    if (!await firstValueFrom(ref.afterClosed())) return;
    this.snack.open(establishment ? 'Estabelecimento actualizado.' : 'Estabelecimento criado.', undefined, { duration: 3000 });
    await Promise.all([this.load(), this.loadExtras()]);
  }

  async toggle(e: Establishment): Promise<void> {
    if (e.active && !await confirmAction(this.dialog, {
      title: 'Desactivar estabelecimento?', confirm: 'Desactivar', danger: true,
      message: `"${e.name}" deixa de ser sugerido na aplicação. As saídas já registadas neste local não mudam.`
    })) return;
    try {
      await this.api.patch(`/api/v1/admin/establishments/${e.id}/active`, { active: !e.active });
      this.snack.open(e.active ? 'Estabelecimento desactivado.' : 'Estabelecimento reactivado.', undefined, { duration: 3000 });
      await Promise.all([this.load(), this.loadExtras()]);
    } catch (error) { this.snack.open(apiErrorMessage(error), 'OK', { duration: 6000 }); }
  }

  preview(e: Establishment): void {
    this.dialog.open(AppPreview, { data: { place: e }, panelClass: 'dialog-panel', maxWidth: 'calc(100vw - 32px)' });
  }

  menu(e: Establishment): void {
    this.dialog.open(EstablishmentMenu, { data: e, panelClass: 'dialog-panel', autoFocus: 'first-tabbable', maxWidth: 'calc(100vw - 32px)' });
  }

  mapUrl(e: Establishment): string {
    return `https://www.google.com/maps?q=${e.latitude},${e.longitude}`;
  }
}

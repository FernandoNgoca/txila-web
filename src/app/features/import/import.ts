import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api, apiErrorMessage } from '../../core/services/api.service';
import { formatNumber } from '../../shared/format';
import { Icon } from '../../shared/icon';

type Kind = 'products' | 'establishments' | 'menus';
type Status = 'NEW' | 'UPDATE' | 'SAME' | 'ERROR';
export interface Change { field: string; before: string | null; after: string | null; }
interface Row { line: number; status: Status; label: string; message: string | null; changes: Change[]; }
interface Result { kind: Kind; applied: boolean; created: number; updated: number; unchanged: number; errors: number; rows: Row[]; }

const KINDS: { value: Kind; label: string; file: string; columns: string; help: string }[] = [
  { value: 'products', label: 'Produtos', file: 'produtos',
    columns: 'Nome · Tamanho · Categoria · Preço de referência',
    help: 'A categoria tem de existir. Um produto com o mesmo nome e tamanho é actualizado; o preço vazio mantém o actual.' },
  { value: 'establishments', label: 'Estabelecimentos', file: 'estabelecimentos',
    columns: 'Nome · Tipo · Bairro · Cidade · Latitude · Longitude (ou Link do Google Maps)',
    help: 'Tipo: Bar, Discoteca, Restaurante, Lounge, Barraca ou Outro. O mesmo nome na mesma cidade é actualizado.' },
  { value: 'menus', label: 'Produtos e preços por local', file: 'menus',
    columns: 'Estabelecimento · Cidade · Produto · Tamanho · Preço',
    help: 'O estabelecimento e o produto têm de existir. Importa primeiro os estabelecimentos e os produtos.' },
];
const STATUS: Record<Status, { label: string; tone: string }> = {
  NEW: { label: 'Novo', tone: 'on' }, UPDATE: { label: 'Alterado', tone: 'dark' }, SAME: { label: 'Igual', tone: '' }, ERROR: { label: 'Erro', tone: 'off' },
};

/** Importação em massa de Excel ou CSV: escolher o ficheiro, ver o que acontece a cada linha e confirmar. */
@Component({
  selector: 'app-import',
  imports: [Icon, RouterLink],
  templateUrl: './import.html',
  styleUrl: './import.scss'
})
export class Import {
  private readonly api = inject(Api);
  readonly kinds = KINDS;
  readonly kind = signal<Kind>('products');
  readonly info = computed(() => KINDS.find(k => k.value === this.kind())!);
  readonly file = signal<File | null>(null);
  readonly result = signal<Result | null>(null);
  readonly show = signal<Status | 'ALL'>('ALL');
  readonly busy = signal(false);
  readonly dragging = signal(false);
  readonly error = signal('');
  readonly fmt = formatNumber;
  readonly rows = computed(() => {
    const all = this.result()?.rows ?? [];
    return this.show() === 'ALL' ? all : all.filter(r => r.status === this.show());
  });
  readonly pending = computed(() => { const r = this.result(); return r && !r.applied ? r.created + r.updated : 0; });

  status(s: Status) { return STATUS[s]; }

  choose(kind: Kind): void { this.kind.set(kind); this.reset(); }

  reset(): void { this.file.set(null); this.result.set(null); this.error.set(''); this.show.set('ALL'); }

  picked(input: HTMLInputElement): void {
    const file = input.files?.[0]; input.value = '';
    if (file) void this.preview(file);
  }

  dropped(event: DragEvent): void {
    event.preventDefault(); this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) void this.preview(file);
  }

  async preview(file: File): Promise<void> {
    if (!/\.(xlsx|csv|txt)$/i.test(file.name)) { this.error.set('Escolhe um ficheiro Excel (.xlsx) ou CSV.'); return; }
    if (file.size > 2 * 1024 * 1024) { this.error.set('O ficheiro tem mais de 2 MB. Divide-o em partes.'); return; }
    this.file.set(file); await this.send(false);
  }

  async apply(): Promise<void> { await this.send(true); }

  private async send(apply: boolean): Promise<void> {
    const file = this.file(); if (!file) return;
    this.busy.set(true); this.error.set('');
    try {
      const result = await this.api.upload<Result>(`/api/v1/admin/import/${this.kind()}`, file, { apply });
      this.result.set(result);
      this.show.set(!apply && result.errors ? 'ERROR' : 'ALL');
    } catch (error) { this.error.set(apiErrorMessage(error)); if (!apply) this.file.set(null); }
    finally { this.busy.set(false); }
  }

  async download(what: 'template' | 'export'): Promise<void> {
    const info = this.info();
    try { await this.api.download(`/api/v1/admin/import/${info.value}/${what}`, `${what === 'template' ? 'modelo' : 'txila'}-${info.file}.csv`); }
    catch (error) { this.error.set(apiErrorMessage(error)); }
  }

  changeText(c: Change): string {
    if (c.before === null) return `${c.field}: ${c.after}`;
    return `${c.field}: ${c.before} → ${c.after ?? '—'}`;
  }
}

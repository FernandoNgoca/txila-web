import { Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Api, apiErrorMessage } from '../core/services/api.service';
import { Product } from '../features/categories/category-api';
import { Establishment } from '../features/establishments/establishment-api';
import { formatMt } from './format';
import { Icon } from './icon';

export type AppPreviewData = { product: Product } | { place: Establishment };

interface Seller { establishmentId: number; name: string; neighbourhood: string | null; city: string; price: number; active: boolean; }
interface MenuItem { productId: number; name: string; size: string; categoryName: string; price: number; active: boolean; }
interface Tile { name: string; size: string; price: number | null; highlight: boolean; example?: boolean; }

/**
 * Pré-visualização: como um produto ou estabelecimento aparece na aplicação Txila (ecrã escuro,
 * mosaicos de produtos e lista de locais), com os avisos do que falta para aparecer bem.
 */
@Component({
  selector: 'app-preview',
  imports: [Icon],
  template: `
    <div class="dialog preview">
      <div class="dialog-head">
        <div><h2>Ver na aplicação</h2><p class="sub">{{ title() }}</p></div>
        <button class="icon-btn small" type="button" aria-label="Fechar" (click)="ref.close()"><app-icon name="close" /></button>
      </div>

      <div class="layout">
        <div class="phone" aria-label="Pré-visualização no telemóvel">
          @if (screen() === 'place') {
            <div class="screen">
              <p class="app-title">Começar saída</p>
              <p class="app-section">Onde estás?</p>
              <div class="app-search"><app-icon name="search" /><span>{{ place()?.name }}</span></div>
              <div class="app-choice selected">
                <app-icon name="store" class="lime" />
                <div><strong>{{ place()?.name }}</strong><small>{{ area() }}</small></div>
                <app-icon name="check" class="lime" />
              </div>
              <div class="app-choice ghost"><app-icon name="store" /><div><strong>Outro local</strong><small>Maputo</small></div></div>
            </div>
          } @else {
            <div class="screen">
              <p class="app-title">Adicionar consumo</p>
              <div class="app-chips">
                @if (sellerPrice() !== null || place()) { <span class="on">Neste local</span> }
                <span [class.on]="sellerPrice() === null && !place()">{{ product()?.categoryName ?? 'Cervejas' }}</span>
                <span>Os meus</span>
              </div>
              <div class="app-grid">
                @for (t of tiles(); track $index) {
                  <div class="app-tile" [class.highlight]="t.highlight" [class.example]="t.example">
                    <strong>{{ t.name }}</strong>
                    <small>{{ t.size || ' ' }}</small>
                    <b [class.none]="t.price === null">{{ t.price === null ? 'Sem preço' : mt(t.price) }}</b>
                  </div>
                } @empty {
                  <p class="app-empty">Este local ainda não tem produtos. A pessoa vê o catálogo geral.</p>
                }
              </div>
            </div>
          }
        </div>

        <div class="side">
          @if (place()) {
            <div class="switch" role="tablist">
              <button type="button" role="tab" [class.on]="screen() === 'place'" (click)="screen.set('place')">Escolha do local</button>
              <button type="button" role="tab" [class.on]="screen() === 'menu'" (click)="screen.set('menu')">Produtos neste local</button>
            </div>
          }
          @if (product() && sellers().length) {
            <label class="field">Ver com o preço de
              <select [value]="seller() ?? ''" (change)="seller.set($any($event.target).value ? +$any($event.target).value : null)">
                <option value="">Preço de referência (qualquer local)</option>
                @for (s of sellers(); track s.establishmentId) { <option [value]="s.establishmentId">{{ s.name }} · {{ mt(s.price) }}</option> }
              </select>
            </label>
          }

          <h3>Avisos</h3>
          @if (loading()) { <div class="loading-bar"></div> }
          @if (error()) { <p class="alert" role="alert">{{ error() }}</p> }
          <ul class="notes">
            @for (n of notes(); track n.text) {
              <li [class.warn]="n.warn"><app-icon [name]="n.warn ? 'alert' : 'check'" />{{ n.text }}</li>
            }
          </ul>

          @if (product() && sellers().length) {
            <h3>Locais com preço próprio</h3>
            <ul class="sellers">
              @for (s of sellers(); track s.establishmentId) {
                <li><span>{{ s.name }}<small>{{ s.neighbourhood ? s.neighbourhood + ', ' : '' }}{{ s.city }}{{ s.active ? '' : ' · desactivado' }}</small></span><b>{{ mt(s.price) }}</b></li>
              }
            </ul>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    .preview { width: min(820px, calc(100vw - 32px)); }
    .sub { margin: 2px 0 0 !important; font-size: 13px; }
    .layout { display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap; }
    .phone { flex: none; width: 300px; max-width: 100%; height: 560px; padding: 12px; border-radius: 36px; background: #0b120e; box-shadow: 0 0 0 1px #2c4235, 0 18px 40px rgb(0 0 0 / 25%); }
    .screen { height: 100%; overflow: hidden; padding: 22px 16px; border-radius: 26px; background: #0f1913; color: #eef3ee; font-size: 13px; }
    .app-title { margin: 0 0 14px !important; color: #eef3ee !important; font-size: 20px; font-weight: 700; letter-spacing: -.02em; }
    .app-section { margin: 0 0 8px !important; color: #9fb0a5 !important; font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; }
    .app-search { display: flex; align-items: center; gap: 8px; height: 42px; padding: 0 12px; border-radius: 14px; background: #18261e; color: #9fb0a5; }
    .app-search app-icon { width: 16px; height: 16px; }
    .app-choice { display: flex; align-items: center; gap: 12px; margin-top: 8px; padding: 12px; border: 2px solid transparent; border-radius: 16px; background: #18261e; }
    .app-choice.selected { border-color: #c8ee6c; }
    .app-choice.ghost { opacity: .45; }
    .app-choice div { flex: 1; min-width: 0; }
    .app-choice strong { display: block; font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .app-choice small { display: block; color: #9fb0a5; font-size: 11px; }
    .app-choice app-icon { width: 20px; height: 20px; color: #9fb0a5; }
    .app-choice app-icon.lime { color: #c8ee6c; }
    .app-chips { display: flex; gap: 6px; margin-bottom: 12px; overflow: hidden; }
    .app-chips span { flex: none; padding: 6px 12px; border-radius: 999px; background: #18261e; color: #9fb0a5; font-size: 12px; }
    .app-chips span.on { background: #c8ee6c; color: #18261e; font-weight: 600; }
    .app-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .app-tile { display: grid; gap: 2px; padding: 12px; border: 2px solid transparent; border-radius: 18px; background: #18261e; }
    .app-tile.highlight { border-color: #c8ee6c; }
    .app-tile.example { opacity: .35; }
    .app-tile strong { overflow: hidden; font-size: 14px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
    .app-tile small { color: #9fb0a5; font-size: 11px; }
    .app-tile b { margin-top: 6px; font-size: 13px; }
    .app-tile b.none { color: #9fb0a5; font-weight: 500; }
    .app-empty { grid-column: 1 / -1; color: #9fb0a5 !important; }
    .side { flex: 1; min-width: 240px; }
    .side h3 { margin: 18px 0 8px; font-size: 14px; font-weight: 500; }
    .switch { display: inline-flex; padding: 3px; border-radius: 999px; background: var(--canvas); }
    .switch button { height: 30px; padding: 0 12px; border: 0; border-radius: 999px; background: none; font: inherit; font-size: 13px; color: var(--muted); cursor: pointer; }
    .switch button.on { background: #fff; color: var(--ink); box-shadow: 0 1px 2px rgb(0 0 0 / 10%); }
    .field { margin-top: 4px; }
    .notes, .sellers { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; font-size: 13px; line-height: 1.45; }
    .notes li { display: flex; gap: 8px; }
    .notes app-icon { width: 16px; height: 16px; flex: none; margin-top: 1px; color: var(--ok); }
    .notes li.warn app-icon { color: #b45309; }
    .sellers li { display: flex; justify-content: space-between; gap: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--line); }
    .sellers small { display: block; color: var(--muted); font-size: 12px; }
    @media (max-width: 640px) { .phone { width: 100%; height: 480px; } }
  `
})
export class AppPreview {
  private readonly data = inject<AppPreviewData>(MAT_DIALOG_DATA);
  private readonly api = inject(Api);
  readonly ref = inject(MatDialogRef<AppPreview>);
  readonly product = signal<Product | null>('product' in this.data ? this.data.product : null);
  readonly place = signal<Establishment | null>('place' in this.data ? this.data.place : null);
  readonly sellers = signal<Seller[]>([]);
  readonly menu = signal<MenuItem[]>([]);
  readonly seller = signal<number | null>(null);
  readonly screen = signal<'place' | 'menu'>(this.place() ? 'place' : 'menu');
  readonly loading = signal(true);
  readonly error = signal('');
  readonly mt = formatMt;

  readonly title = computed(() => {
    const p = this.product(); if (p) return p.size ? `${p.name} ${p.size}` : p.name;
    return this.place()?.name ?? '';
  });
  readonly area = computed(() => { const e = this.place(); return !e ? '' : e.neighbourhood ? `${e.neighbourhood}, ${e.city}` : e.city; });
  readonly sellerPrice = computed(() => this.sellers().find(s => s.establishmentId === this.seller())?.price ?? null);

  /** Os mosaicos do ecrã "Adicionar consumo": o produto em destaque, ou o menu do local. */
  readonly tiles = computed<Tile[]>(() => {
    const p = this.product();
    if (p) {
      const own: Tile = { name: p.name, size: p.size, price: this.sellerPrice() ?? p.referencePrice, highlight: true };
      // Mosaicos de exemplo, esbatidos, só para mostrar o produto no meio dos outros.
      const examples: Tile[] = [['2M', '550 ml', 10000], ['Laurentina Preta', '330 ml', 9000], ['Manica', '330 ml', null], ['Coca-Cola', '330 ml', 6000]]
        .filter(([name, size]) => `${name} ${size}`.toLowerCase() !== `${p.name} ${p.size}`.toLowerCase())
        .slice(0, 3).map(([name, size, price]) => ({ name: name as string, size: size as string, price: price as number | null, highlight: false, example: true }));
      return [own, ...examples];
    }
    return this.menu().filter(i => i.active).slice(0, 8).map(i => ({ name: i.name, size: i.size, price: i.price, highlight: false }));
  });

  readonly notes = computed<{ text: string; warn: boolean }[]>(() => {
    const notes: { text: string; warn: boolean }[] = [];
    const p = this.product();
    if (p) {
      notes.push(p.active ? { text: 'Activo: aparece no catálogo da aplicação.', warn: false } : { text: 'Desactivado: não aparece na aplicação.', warn: true });
      notes.push(p.referencePrice ? { text: `Preço sugerido: ${formatMt(p.referencePrice)}, onde o local não tiver preço próprio.`, warn: false }
        : { text: 'Sem preço de referência: fora dos locais com preço próprio, a pessoa escreve o preço ao registar.', warn: true });
      if (!this.loading()) notes.push(this.sellers().length ? { text: `Tem preço próprio em ${this.sellers().length === 1 ? '1 local' : this.sellers().length + ' locais'}: aí aparece primeiro, em "Neste local".`, warn: false }
        : { text: 'Ainda não está no menu de nenhum local.', warn: true });
    }
    const e = this.place();
    if (e) {
      notes.push(e.active ? { text: 'Activo: aparece na lista de locais ao começar uma saída.', warn: false } : { text: 'Desactivado: não aparece na aplicação.', warn: true });
      if (!e.neighbourhood) notes.push({ text: 'Sem bairro: na aplicação aparece só a cidade.', warn: true });
      if (!this.loading()) {
        const active = this.menu().filter(i => i.active).length;
        notes.push(active ? { text: `${active === 1 ? '1 produto' : active + ' produtos'} com preço deste local em "Neste local".`, warn: false }
          : { text: 'Sem produtos no menu: a pessoa vê só o catálogo geral, com os preços de referência.', warn: true });
        const hidden = this.menu().length - active;
        if (hidden) notes.push({ text: `${hidden === 1 ? '1 produto do menu está desactivado' : hidden + ' produtos do menu estão desactivados'} e não aparece${hidden === 1 ? '' : 'm'}.`, warn: true });
      }
    }
    return notes;
  });

  constructor() { void this.load(); }

  private async load(): Promise<void> {
    try {
      const p = this.product(), e = this.place();
      if (p) this.sellers.set(await this.api.get<Seller[]>(`/api/v1/admin/products/${p.id}/establishments`));
      if (e) this.menu.set(await this.api.get<MenuItem[]>(`/api/v1/admin/establishments/${e.id}/products`));
    } catch (error) { this.error.set(apiErrorMessage(error)); }
    finally { this.loading.set(false); }
  }
}

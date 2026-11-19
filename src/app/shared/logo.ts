import { Component, computed, input } from '@angular/core';

/**
 * Símbolo "Tx" da Txila, com o nome opcional ao lado.
 * tone="dark" para o menu verde-escuro (T branco); tone="light" para o fundo da página (T na cor do texto do modo claro ou escuro).
 */
@Component({
  selector: 'app-logo',
  host: { class: 'logo', role: 'img', 'aria-label': 'Txila' },
  template: `
<svg viewBox="5 12 85 81" aria-hidden="true">
  <g [style.fill]="ink()">
    <path d="M17 15 H72 a5 5 0 0 1 4.4 2.6 l6 10.8 a5 5 0 0 1 -4.4 7.4 H17 a10.3 10.3 0 0 1 0 -20.6 Z" />
    <path d="M20 26 H37 V67 L24.3 79.7 a6 6 0 0 1 -4.3 -5.7 Z" />
  </g>
  <path d="M20.5 46 C22 31 36 25.5 70 24.5 C40 28 27.5 33 24.5 48 Z" fill="#c8ee6c" />
  <path d="M40 84 L80 44 M55 49 L81 78" fill="none" stroke="#c8ee6c" stroke-width="13" stroke-linecap="round" />
</svg>
@if (wordmark()) { <span [style.color]="ink()">TXILA</span> }`,
  styles: [`
:host{display:inline-flex;align-items:center;gap:.45em;font-size:22px;line-height:1}
svg{height:1.45em;width:auto;flex:none}
span{font-weight:700;letter-spacing:.02em}`]
})
export class Logo {
  readonly tone = input<'dark' | 'light'>('light');
  readonly wordmark = input(true);
  readonly ink = computed(() => this.tone() === 'dark' ? '#ffffff' : 'var(--ink)');
}

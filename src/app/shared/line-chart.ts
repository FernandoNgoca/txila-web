import { Component, computed, input, signal } from '@angular/core';
import { formatNumber } from './format';

export interface ChartPoint { label: string; tick: string; value: number; }

const W = 600, H = 220, PAD = 12;

/** Gráfico de linha com grelha vertical e etiqueta verde-lima no ponto em foco. */
@Component({
  selector: 'app-line-chart',
  template: `
<div class="chart" (mouseleave)="active.set(null)">
  <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" preserveAspectRatio="none" role="img" [attr.aria-label]="ariaLabel()">
    @for (x of grid(); track $index) { <line [attr.x1]="x" [attr.x2]="x" y1="0" [attr.y2]="H" class="grid" /> }
    <polyline [attr.points]="line()" class="line" />
    @if (focus(); as f) {
      <line [attr.x1]="f.x" [attr.x2]="f.x" y1="0" [attr.y2]="H" class="focus-line" />
      <circle [attr.cx]="f.x" [attr.cy]="f.y" r="4" class="focus-dot" />
    }
    @for (p of hit(); track $index) {
      <rect [attr.x]="p.x" y="0" [attr.width]="p.w" [attr.height]="H" fill="transparent" (mouseenter)="active.set($index)" (focus)="active.set($index)" />
    }
  </svg>
  @if (focus(); as f) {
    <div class="tip" [class.flip]="f.x > W * .7" [style.left.%]="f.x / W * 100" [style.top.%]="f.y / H * 100">
      <small>{{ f.label }}</small><strong>{{ f.value }}</strong>
    </div>
  }
  <div class="ticks">@for (t of ticks(); track $index) { <span>{{ t }}</span> }</div>
</div>`,
  styles: [`
.chart{position:relative;padding:8px 0 0}
svg{display:block;width:100%;height:220px;overflow:visible}
.grid{stroke:var(--line);stroke-width:1;vector-effect:non-scaling-stroke}
.line{fill:none;stroke:#8b928d;stroke-width:1.6;vector-effect:non-scaling-stroke;stroke-linejoin:round}
.focus-line{stroke:var(--ink);stroke-width:1;stroke-dasharray:3 3;vector-effect:non-scaling-stroke}
.focus-dot{fill:var(--sidebar);stroke:#fff;stroke-width:2;vector-effect:non-scaling-stroke}
.tip{position:absolute;transform:translate(8px,-110%);padding:6px 10px;background:var(--lime);color:var(--lime-ink);border-left:2px solid var(--sidebar);pointer-events:none;white-space:nowrap}
.tip.flip{transform:translate(calc(-100% - 8px),-110%);border-left:0;border-right:2px solid var(--sidebar)}
.tip small{display:block;font-size:11px}.tip strong{font-size:15px;font-weight:600}
.ticks{display:flex;justify-content:space-between;margin-top:8px;font-size:12px;color:var(--muted)}`]
})
export class LineChart {
  readonly W = W; readonly H = H;
  readonly points = input.required<ChartPoint[]>();
  readonly unit = input('');
  readonly active = signal<number | null>(null);

  private readonly coords = computed(() => {
    const pts = this.points();
    const max = Math.max(1, ...pts.map(p => p.value));
    const step = pts.length > 1 ? W / (pts.length - 1) : 0;
    return pts.map((p, i) => ({ x: pts.length > 1 ? i * step : W / 2, y: H - PAD - (p.value / max) * (H - PAD * 2), p }));
  });
  readonly line = computed(() => this.coords().map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' '));
  readonly hit = computed(() => {
    const c = this.coords(); const w = c.length > 1 ? W / (c.length - 1) : W;
    return c.map(p => ({ x: Math.max(0, p.x - w / 2), w }));
  });
  /** Linhas verticais e etiquetas: no máximo 12, distribuídas pelo período. */
  private readonly tickIndexes = computed(() => {
    const n = this.points().length; const count = Math.min(n, 12);
    if (n === 0) return [];
    if (count === 1) return [0];
    return Array.from({ length: count }, (_, i) => Math.round(i * (n - 1) / (count - 1)));
  });
  readonly grid = computed(() => this.tickIndexes().map(i => this.coords()[i].x));
  readonly ticks = computed(() => this.tickIndexes().map(i => this.points()[i].tick));
  readonly focus = computed(() => {
    const i = this.active(); const c = i === null ? null : this.coords()[i];
    return c ? { x: c.x, y: c.y, label: c.p.label, value: formatNumber(c.p.value) + this.unit() } : null;
  });
  readonly ariaLabel = computed(() => `Gráfico com ${this.points().length} pontos; total ${formatNumber(this.points().reduce((s, p) => s + p.value, 0))}`);
}

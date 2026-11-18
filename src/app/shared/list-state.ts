import { signal } from '@angular/core';

export type StatusFilter = 'all' | 'active' | 'inactive';

/** Estado comum das listagens: pesquisa com atraso, filtro de estado e página. */
export class ListState {
  readonly search = signal('');
  readonly status = signal<StatusFilter>('all');
  readonly page = signal(0);
  readonly size = 20;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly reload: () => void) {}

  typed(value: string): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.search.set(value); this.page.set(0); this.reload(); }, 300);
  }
  setStatus(status: StatusFilter): void { this.status.set(status); this.page.set(0); this.reload(); }
  go(page: number): void { this.page.set(page); this.reload(); }
  active(): boolean | null { return this.status() === 'all' ? null : this.status() === 'active'; }
  /** "21–40 de 57" */
  range(total: number): string {
    if (total === 0) return '0 resultados';
    const from = this.page() * this.size + 1;
    return `${from}–${Math.min(total, from + this.size - 1)} de ${total}`;
  }
  hasNext(total: number): boolean { return (this.page() + 1) * this.size < total; }
}

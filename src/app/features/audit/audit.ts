import { Component, computed, inject, signal } from '@angular/core';
import { Api, Page, apiErrorMessage } from '../../core/services/api.service';
import { formatDayTime, formatNumber, groupByRecency } from '../../shared/format';
import { Icon } from '../../shared/icon';
import { AuditEntry, actionStyle } from '../dashboard/dashboard';

const ENTITIES = [
  { value: '', label: 'Tudo' },
  { value: 'PRODUCT', label: 'Produtos' },
  { value: 'CATEGORY', label: 'Categorias' },
  { value: 'ESTABLISHMENT', label: 'Estabelecimentos' },
  { value: 'USER', label: 'Utilizadores' },
];
const ACTIONS: Record<string, string> = { CREATE: 'Criação', UPDATE: 'Alteração', ACTIVATE: 'Activação', DEACTIVATE: 'Desactivação' };

/** Registo de todas as operações feitas no painel, do mais recente para o mais antigo. */
@Component({
  selector: 'app-audit',
  imports: [Icon],
  templateUrl: './audit.html',
  styleUrl: './audit.scss'
})
export class Audit {
  private readonly api = inject(Api);
  readonly entities = ENTITIES;
  readonly entity = signal('');
  readonly search = signal('');
  readonly entries = signal<AuditEntry[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly when = formatDayTime;
  readonly fmt = formatNumber;
  readonly style = actionStyle;
  readonly groups = computed(() => groupByRecency(this.entries(), e => e.date));
  private page = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() { void this.load(true); }

  actionLabel(action: string): string { return ACTIONS[action] ?? action; }

  typed(value: string): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.search.set(value); void this.load(true); }, 300);
  }

  filter(entity: string): void { this.entity.set(entity); void this.load(true); }

  async load(reset: boolean): Promise<void> {
    this.page = reset ? 0 : this.page + 1;
    this.loading.set(true); this.error.set('');
    try {
      const result = await this.api.get<Page<AuditEntry>>('/api/v1/admin/audit', { page: this.page, size: 30, entity: this.entity(), search: this.search() });
      this.entries.set(reset ? result.content : [...this.entries(), ...result.content]);
      this.total.set(result.totalElements);
    } catch (error) { this.error.set(apiErrorMessage(error)); }
    finally { this.loading.set(false); }
  }
}

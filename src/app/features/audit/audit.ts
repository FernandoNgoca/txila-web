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
const ACTIONS: Record<string, string> = {
  CREATE: 'Criação', UPDATE: 'Alteração', ACTIVATE: 'Activação', DEACTIVATE: 'Desactivação', DELETE: 'Remoção',
  IMPORT: 'Importação', LOGIN: 'Entrada', LOGIN_FAILED: 'Entrada falhada', LOCKED: 'Conta bloqueada',
};
const ENTITY_NAMES: Record<string, string> = { PRODUCT: 'produto', CATEGORY: 'categoria', ESTABLISHMENT: 'estabelecimento', USER: 'utilizador' };
const SOURCES: Record<string, string> = { PAINEL: 'Painel', IMPORTACAO: 'Importação de ficheiro' };

/** Registo de todas as operações feitas no painel: quem, quando, o quê e o que mudou. */
@Component({
  selector: 'app-audit',
  imports: [Icon],
  templateUrl: './audit.html',
  styleUrl: './audit.scss'
})
export class Audit {
  private readonly api = inject(Api);
  readonly entities = ENTITIES;
  readonly actionList = Object.entries(ACTIONS).map(([value, label]) => ({ value, label }));
  readonly entity = signal('');
  readonly action = signal('');
  readonly actor = signal('');
  readonly from = signal('');
  readonly to = signal('');
  readonly entityId = signal<number | null>(null);
  readonly search = signal('');
  readonly actors = signal<string[]>([]);
  readonly entries = signal<AuditEntry[]>([]);
  readonly expanded = signal<number | null>(null);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly when = formatDayTime;
  readonly fmt = formatNumber;
  readonly style = actionStyle;
  readonly groups = computed(() => groupByRecency(this.entries(), e => e.date));
  readonly filtered = computed(() => !!(this.entity() || this.action() || this.actor() || this.from() || this.to() || this.entityId() || this.search()));
  private page = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    void this.load(true);
    void this.api.get<string[]>('/api/v1/admin/audit/actors').then(a => this.actors.set(a)).catch(() => undefined);
  }

  actionLabel(action: string): string { return ACTIONS[action] ?? action; }
  sourceLabel(source: string | undefined): string { return SOURCES[source ?? ''] ?? source ?? 'Painel'; }
  entityName(entity: string): string { return ENTITY_NAMES[entity] ?? 'registo'; }

  typed(value: string): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.search.set(value); void this.load(true); }, 300);
  }

  set(field: 'entity' | 'action' | 'actor' | 'from' | 'to', value: string): void {
    this[field].set(value);
    if (field === 'entity') this.entityId.set(null);
    void this.load(true);
  }

  /** Mostra só o histórico deste registo. */
  history(e: AuditEntry): void {
    this.entity.set(e.entity); this.entityId.set(e.entityId); this.expanded.set(null); void this.load(true);
  }

  clear(): void {
    for (const s of [this.entity, this.action, this.actor, this.from, this.to, this.search]) s.set('');
    this.entityId.set(null); void this.load(true);
  }

  toggle(id: number): void { this.expanded.set(this.expanded() === id ? null : id); }

  private params() {
    return { entity: this.entity(), action: this.action(), actor: this.actor(), from: this.from(), to: this.to(), entityId: this.entityId(), search: this.search() };
  }

  async load(reset: boolean): Promise<void> {
    this.page = reset ? 0 : this.page + 1;
    this.loading.set(true); this.error.set('');
    try {
      const result = await this.api.get<Page<AuditEntry>>('/api/v1/admin/audit', { page: this.page, size: 30, ...this.params() });
      this.entries.set(reset ? result.content : [...this.entries(), ...result.content]);
      this.total.set(result.totalElements);
    } catch (error) { this.error.set(apiErrorMessage(error)); }
    finally { this.loading.set(false); }
  }

  async export(): Promise<void> {
    try { await this.api.download('/api/v1/admin/audit/export', 'auditoria-txila.csv', this.params()); }
    catch (error) { this.error.set(apiErrorMessage(error)); }
  }
}

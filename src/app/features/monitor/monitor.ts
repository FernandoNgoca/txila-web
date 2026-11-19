import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { Api, Page, apiErrorMessage } from '../../core/services/api.service';
import { formatDayTime, formatNumber, parseDate } from '../../shared/format';
import { Icon, IconName } from '../../shared/icon';

interface Status {
  startedAt: string; uptimeSeconds: number; version: string | null; database: boolean; databaseMs: number | null;
  mailEnabled: boolean; mailPending: number; oldestMailPending: string | null;
  errors24h: number; warnings24h: number; syncRefused24h: number; unresolved: number;
}
interface SystemEvent {
  id: number; firstSeen: string; lastSeen: string; occurrences: number; level: 'ERROR' | 'WARN' | 'INFO'; source: string;
  message: string; details: string | null; username: string | null; resolved: boolean;
}

const SOURCES = [
  { value: '', label: 'Tudo' },
  { value: 'API', label: 'API' },
  { value: 'APP', label: 'Aplicação' },
  { value: 'SINCRONIZACAO', label: 'Sincronização' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'DISPONIBILIDADE', label: 'Disponibilidade' },
  { value: 'SEGURANCA', label: 'Segurança' },
];
const LEVELS: Record<SystemEvent['level'], { label: string; icon: IconName; tone: string }> = {
  ERROR: { label: 'Erro', icon: 'alert', tone: 'danger' },
  WARN: { label: 'Aviso', icon: 'alert', tone: 'warn' },
  INFO: { label: 'Informação', icon: 'pulse', tone: '' },
};

/** Estado da API e registo de erros, falhas de sincronização e paragens do serviço. */
@Component({
  selector: 'app-monitor',
  imports: [Icon],
  templateUrl: './monitor.html',
  styleUrl: './monitor.scss'
})
export class Monitor implements OnDestroy {
  private readonly api = inject(Api);
  readonly sources = SOURCES;
  readonly status = signal<Status | null>(null);
  readonly events = signal<SystemEvent[]>([]);
  readonly total = signal(0);
  readonly source = signal('');
  readonly open = signal<'open' | 'resolved' | 'all'>('open');
  readonly expanded = signal<number | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly when = formatDayTime;
  readonly fmt = formatNumber;
  readonly mailLate = computed(() => {
    const s = this.status(); if (!s?.oldestMailPending) return false;
    return Date.now() - (parseDate(s.oldestMailPending)?.getTime() ?? Date.now()) > 10 * 60_000;
  });
  private page = 0;
  private readonly timer = setInterval(() => void this.loadStatus(), 60_000);

  constructor() { void this.loadStatus(); void this.load(true); }
  ngOnDestroy(): void { clearInterval(this.timer); }

  level(l: SystemEvent['level']) { return LEVELS[l]; }

  uptime(seconds: number): string {
    if (seconds < 3600) return `${Math.max(1, Math.floor(seconds / 60))} min`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ${Math.floor((seconds % 3600) / 60)} min`;
    return `${Math.floor(seconds / 86400)} dias`;
  }

  filter(source: string): void { this.source.set(source); void this.load(true); }
  setOpen(value: 'open' | 'resolved' | 'all'): void { this.open.set(value); void this.load(true); }
  toggle(id: number): void { this.expanded.set(this.expanded() === id ? null : id); }

  async loadStatus(): Promise<void> {
    try { this.status.set(await this.api.get<Status>('/api/v1/admin/monitor/status')); }
    catch (error) { this.error.set(apiErrorMessage(error)); }
  }

  async load(reset: boolean): Promise<void> {
    this.page = reset ? 0 : this.page + 1;
    this.loading.set(true); this.error.set('');
    const resolved = this.open() === 'all' ? null : this.open() === 'resolved';
    try {
      const result = await this.api.get<Page<SystemEvent>>('/api/v1/admin/monitor/events', { page: this.page, size: 30, source: this.source(), resolved });
      this.events.set(reset ? result.content : [...this.events(), ...result.content]);
      this.total.set(result.totalElements);
    } catch (error) { this.error.set(apiErrorMessage(error)); }
    finally { this.loading.set(false); }
  }

  async resolve(event: SystemEvent): Promise<void> {
    try {
      await this.api.patch(`/api/v1/admin/monitor/events/${event.id}/resolved`, { resolved: !event.resolved });
      await Promise.all([this.load(true), this.loadStatus()]);
    } catch (error) { this.error.set(apiErrorMessage(error)); }
  }
}

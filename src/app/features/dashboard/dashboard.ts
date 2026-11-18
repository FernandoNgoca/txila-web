import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api, apiErrorMessage } from '../../core/services/api.service';
import { Icon, IconName } from '../../shared/icon';
import { ChartPoint, LineChart } from '../../shared/line-chart';
import { count, formatDayTime, formatNumber, formatTime, groupByRecency } from '../../shared/format';

export interface AuditEntry { id: number; date: string; actor: string; action: string; entity: string; entityId: number | null; summary: string; }
interface Overview {
  days: number;
  users: { total: number; admins: number; suspended: number; newInPeriod: number; newInPreviousPeriod: number; };
  catalog: { products: number; activeProducts: number; categories: number; establishments: number; activeEstablishments: number; };
  signups: { date: string; count: number }[];
  activity: AuditEntry[];
}

const PERIODS = [
  { days: 7, label: '7D', name: 'nos últimos 7 dias' },
  { days: 30, label: '30D', name: 'nos últimos 30 dias' },
  { days: 90, label: '90D', name: 'nos últimos 90 dias' },
  { days: 365, label: '12M', name: 'nos últimos 12 meses' },
];
const short = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short' });
const month = new Intl.DateTimeFormat('pt-PT', { month: 'short' });
const monthYear = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' });

/** Ícone e cor do círculo de cada tipo de operação no registo de auditoria. */
export function actionStyle(action: string): { icon: IconName; tone: string } {
  switch (action) {
    case 'CREATE': return { icon: 'plus', tone: 'lime' };
    case 'DEACTIVATE': return { icon: 'power', tone: 'dark' };
    case 'ACTIVATE': return { icon: 'check', tone: 'lime' };
    default: return { icon: 'swap', tone: '' };
  }
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, Icon, LineChart],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard {
  private readonly api = inject(Api);
  readonly periods = PERIODS;
  readonly days = signal(30);
  readonly data = signal<Overview | null>(null);
  readonly error = signal('');
  readonly loading = signal(false);
  readonly fmt = formatNumber;
  readonly count = count;
  readonly when = formatDayTime;
  readonly time = formatTime;
  readonly style = actionStyle;

  readonly period = computed(() => PERIODS.find(p => p.days === this.days())!);
  readonly growth = computed(() => {
    const u = this.data()?.users; if (!u) return null;
    if (u.newInPreviousPeriod === 0) return u.newInPeriod > 0 ? 'novo' : null;
    const pct = Math.round((u.newInPeriod - u.newInPreviousPeriod) / u.newInPreviousPeriod * 100);
    return (pct > 0 ? '+' : '') + pct + '%';
  });
  /** 7 e 30 dias por dia, 90 dias por semana e 12 meses por mês. */
  readonly chart = computed<ChartPoint[]>(() => {
    const signups = this.data()?.signups ?? [];
    const days = this.days();
    const at = (s: string) => new Date(s + 'T00:00:00');
    if (days <= 30) return signups.map(s => ({ label: short.format(at(s.date)), tick: days === 7 ? short.format(at(s.date)) : String(at(s.date).getDate()), value: s.count }));
    const buckets = new Map<string, ChartPoint>();
    signups.forEach((s, i) => {
      const d = at(s.date);
      const key = days === 90 ? String(Math.floor(i / 7)) : `${d.getFullYear()}-${d.getMonth()}`;
      const label = days === 90 ? 'Semana de ' + short.format(d) : monthYear.format(d);
      const tick = days === 90 ? short.format(d) : month.format(d).replace('.', '');
      const b = buckets.get(key);
      if (b) b.value += s.count; else buckets.set(key, { label, tick, value: s.count });
    });
    return [...buckets.values()];
  });
  readonly activity = computed(() => groupByRecency(this.data()?.activity ?? [], a => a.date));

  constructor() { void this.load(); }

  async select(days: number): Promise<void> {
    if (days === this.days()) return;
    this.days.set(days);
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true); this.error.set('');
    try { this.data.set(await this.api.get<Overview>('/api/v1/admin/dashboard', { days: this.days() })); }
    catch (error) { this.error.set(apiErrorMessage(error)); }
    finally { this.loading.set(false); }
  }
}

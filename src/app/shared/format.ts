/** Formatação moçambicana: 1.200 e 1.200,50 MT. Os valores monetários chegam em centavos. */
export function formatNumber(value: number, decimals = 0): string {
  const fixed = Math.abs(value).toFixed(decimals);
  const [whole, fraction] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (value < 0 ? '-' : '') + grouped + (fraction ? ',' + fraction : '');
}

export function formatMt(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '—';
  return formatNumber(cents / 100, cents % 100 === 0 ? 0 : 2) + ' MT';
}

/** Converte "1.200,50" ou "80" em centavos; null quando vazio, NaN quando inválido. */
export function parseMt(text: string): number | null {
  const clean = text.trim().replace(/\s|MT/gi, '');
  if (!clean) return null;
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(clean)) return NaN;
  const [whole, fraction = ''] = clean.replace(/\./g, '').split(',');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

/** Datas da API: LocalDateTime sem fuso (hora do servidor) ou instantes com Z. */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const day = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
const dayTime = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const time = new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' });

export function formatDay(value: string | null | undefined): string {
  const date = parseDate(value);
  return date ? day.format(date) : '—';
}
export function formatDayTime(value: string | null | undefined): string {
  const date = parseDate(value);
  return date ? dayTime.format(date) : '—';
}
export function formatTime(value: string | null | undefined): string {
  const date = parseDate(value);
  return date ? time.format(date) : '';
}

/** Agrupa por "Hoje", "Ontem", "Últimos 7 dias" e "Anteriores", como nas listas de movimentos. */
export function groupByRecency<T>(items: T[], date: (item: T) => string): { label: string; items: T[] }[] {
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const daysAgo = (value: string) => Math.floor((startOfToday.getTime() - (parseDate(value)?.getTime() ?? 0)) / 86_400_000) + 1;
  const label = (value: string) => { const d = daysAgo(value); return d <= 0 ? 'Hoje' : d === 1 ? 'Ontem' : d < 7 ? 'Últimos 7 dias' : 'Anteriores'; };
  const groups: { label: string; items: T[] }[] = [];
  for (const item of items) {
    const name = label(date(item));
    const last = groups.at(-1);
    if (last?.label === name) last.items.push(item); else groups.push({ label: name, items: [item] });
  }
  return groups;
}

/** "1 produto", "3 produtos". */
export function count(value: number, singular: string, plural: string): string {
  return `${formatNumber(value)} ${value === 1 ? singular : plural}`;
}

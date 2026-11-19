import { Injectable, signal } from '@angular/core';

/** Automático segue o sistema; Claro e Escuro ficam fixos. */
export type ThemeMode = 'system' | 'light' | 'dark';

const KEY = 'txila.theme';
const LABELS: Record<ThemeMode, string> = { system: 'Automático', light: 'Claro', dark: 'Escuro' };

/** Lê a escolha guardada e aplica-a ao <html> (data-theme), antes de o painel aparecer. */
export function applyStoredTheme(): ThemeMode {
  let mode: ThemeMode = 'system';
  try { const saved = localStorage.getItem(KEY); if (saved === 'light' || saved === 'dark') mode = saved; } catch { /* armazenamento bloqueado */ }
  setAttribute(mode);
  return mode;
}

function setAttribute(mode: ThemeMode): void {
  if (mode === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', mode);
}

/** Modo claro/escuro do painel, guardado neste navegador. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(applyStoredTheme());

  label(mode = this.mode()): string { return LABELS[mode]; }

  set(mode: ThemeMode): void {
    this.mode.set(mode);
    try { if (mode === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, mode); } catch { /* fica só nesta página */ }
    setAttribute(mode);
  }

  /** Automático → Claro → Escuro → Automático. */
  next(): void {
    const order: ThemeMode[] = ['system', 'light', 'dark'];
    this.set(order[(order.indexOf(this.mode()) + 1) % order.length]);
  }
}

import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { TimeoutError, firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';

interface LoginResponse { accessToken: string; refreshToken?: string; username: string; expiration: string; authenticated: boolean; }
interface StoredSession { username: string; refreshToken: string; }

/** Só o token de renovação é guardado, e apenas no separador (sessionStorage) ou, se pedido, neste dispositivo. */
export const SESSION_KEY = 'txila.session';
/** Renova o acesso um minuto antes de expirar, para a sessão não cair a meio do trabalho. */
const RENEW_BEFORE_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private session: LoginResponse | null = null;
  private remember = false;
  private renewTimer: ReturnType<typeof setTimeout> | null = null;
  readonly username = signal('');
  readonly sessionRevision = signal(0);
  /** Verdadeiro enquanto a sessão guardada é recuperada ao abrir o site. */
  readonly restoring = signal(false);

  async login(identifier: string, password: string, remember = false): Promise<void> {
    const response = await firstValueFrom(this.http.post<LoginResponse>(`${environment.apiUrl}/api/v1/auth/login`, { email: identifier, password }).pipe(timeout(30000)));
    this.remember = remember; this.accept(response);
  }
  async register(fullName: string, email: string, password: string, remember = false): Promise<void> {
    await firstValueFrom(this.http.post(`${environment.apiUrl}/api/v1/auth/register`, { fullName, email, password }).pipe(timeout(30000)));
    await this.login(email, password, remember);
  }
  /** Recupera a sessão guardada; sem armazenamento ou com o token recusado, fica sem sessão. */
  async restore(): Promise<void> {
    const stored = readStored();
    if (!stored || this.session) return;
    this.restoring.set(true);
    try {
      this.remember = stored.remembered;
      await this.renew(stored.value);
    } catch { this.clear(); } finally { this.restoring.set(false); }
  }
  async logout(): Promise<void> {
    const headers = this.session ? this.headersOrNull() : null;
    this.clear();
    if (headers) await firstValueFrom(this.http.post(`${environment.apiUrl}/api/v1/auth/logout`, {}, { headers }).pipe(timeout(15000))).catch(() => undefined);
  }
  async requestReset(email: string): Promise<void> {
    await firstValueFrom(this.http.post(`${environment.apiUrl}/api/v1/auth/password-reset`, { email }).pipe(timeout(30000)));
  }
  async confirmReset(token: string, password: string): Promise<void> {
    await firstValueFrom(this.http.post(`${environment.apiUrl}/api/v1/auth/password-reset/confirm`, { token, password }).pipe(timeout(30000)));
  }
  headers(): HttpHeaders {
    if (!this.session || Date.parse(this.session.expiration) <= Date.now()) {
      throw new Error('Inicia sessão para continuar. Se a sessão expirou, volta a entrar.');
    }
    return new HttpHeaders({ Authorization: `Bearer ${this.session.accessToken}` });
  }
  ngOnDestroy(): void { this.stopRenewal(); }

  private headersOrNull(): HttpHeaders | null { try { return this.headers(); } catch { return null; } }
  private async renew(stored: StoredSession): Promise<void> {
    const response = await firstValueFrom(this.http.post<LoginResponse>(`${environment.apiUrl}/api/v1/auth/refresh`, stored).pipe(timeout(30000)));
    this.accept(response);
  }
  private accept(response: LoginResponse): void {
    // A API usa yyyy-MM-dd HH:mm:ss em UTC, sem sufixo de fuso horário.
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(response.expiration)) response.expiration = response.expiration.replace(' ', 'T') + 'Z';
    if (!response.authenticated || !response.accessToken || !response.username || !Number.isFinite(Date.parse(response.expiration))) throw new Error('Resposta de autenticação inválida.');
    this.session = response; this.username.set(response.username); this.sessionRevision.update(value => value + 1);
    if (response.refreshToken) { writeStored({ username: response.username, refreshToken: response.refreshToken }, this.remember); this.scheduleRenewal(response); }
  }
  private scheduleRenewal(response: LoginResponse): void {
    this.stopRenewal();
    const refreshToken = response.refreshToken; if (!refreshToken) return;
    const delay = Math.max(5_000, Date.parse(response.expiration) - Date.now() - RENEW_BEFORE_MS);
    this.renewTimer = setTimeout(() => { this.renew({ username: response.username, refreshToken }).catch(() => this.clear()); }, delay);
  }
  private stopRenewal(): void { if (this.renewTimer !== null) clearTimeout(this.renewTimer); this.renewTimer = null; }
  private clear(): void {
    this.stopRenewal(); removeStored();
    const had = this.session !== null; this.session = null; this.username.set('');
    if (had) this.sessionRevision.update(value => value + 1);
  }
}

/** Mensagem para o cliente a partir do erro de autenticação, sem detalhes técnicos. */
export function authErrorMessage(error: unknown, action: 'login' | 'register' | 'reset' = 'login'): string {
  if (error instanceof TimeoutError) return 'O servidor está a demorar. Tenta outra vez dentro de momentos.';
  if (!(error instanceof HttpErrorResponse)) return 'Algo correu mal. Tenta outra vez.';
  if (error.status === 0) return 'Sem ligação ao servidor. Verifica a internet e tenta outra vez.';
  if (error.status === 429) return 'Demasiadas tentativas. Espera um minuto e tenta outra vez.';
  if (action === 'register' && error.status === 409) return 'Já existe uma conta com este email. Entra ou recupera a palavra-passe.';
  if (action === 'login' && (error.status === 400 || error.status === 401 || error.status === 403)) return 'Email ou palavra-passe incorretos.';
  if (action === 'reset' && error.status === 400) return 'Este link já não é válido. Pede um novo email de recuperação.';
  if (error.status === 400 && typeof error.error?.message === 'string' && error.error.message.length < 200) return error.error.message;
  return 'O servidor não respondeu como esperado. Tenta outra vez.';
}

function storages(): Storage[] { try { return [globalThis.sessionStorage, globalThis.localStorage].filter(Boolean); } catch { return []; } }
function readStored(): { value: StoredSession; remembered: boolean } | null {
  for (const storage of storages()) {
    try {
      const raw = storage.getItem(SESSION_KEY); if (!raw) continue;
      const value = JSON.parse(raw) as StoredSession;
      if (typeof value?.username === 'string' && typeof value?.refreshToken === 'string') return { value, remembered: storage === globalThis.localStorage };
    } catch { /* armazenamento bloqueado ou corrompido: ignora */ }
  }
  return null;
}
function writeStored(value: StoredSession, remember: boolean): void {
  removeStored();
  try { (remember ? globalThis.localStorage : globalThis.sessionStorage)?.setItem(SESSION_KEY, JSON.stringify(value)); } catch { /* modo privado: a sessão dura só enquanto a página estiver aberta */ }
}
function removeStored(): void { for (const storage of storages()) { try { storage.removeItem(SESSION_KEY); } catch { /* ignora */ } } }

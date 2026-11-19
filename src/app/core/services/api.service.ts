import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TimeoutError, firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/** Página de resultados devolvida pela API (PageResponseDTO). */
export interface Page<T> { content: T[]; page: number; size: number; totalElements: number; }

type Params = Record<string, string | number | boolean | null | undefined>;

/** Pedidos autenticados à API; uma sessão expirada leva de volta ao login. */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  get<T>(path: string, params?: Params): Promise<T> { return this.request<T>('GET', path, undefined, params); }
  post<T>(path: string, body: unknown): Promise<T> { return this.request<T>('POST', path, body); }
  put<T>(path: string, body: unknown): Promise<T> { return this.request<T>('PUT', path, body); }
  patch<T>(path: string, body: unknown): Promise<T> { return this.request<T>('PATCH', path, body); }
  delete<T>(path: string): Promise<T> { return this.request<T>('DELETE', path); }
  /** Envia um ficheiro (multipart, campo "file"). */
  upload<T>(path: string, file: File, params?: Params): Promise<T> {
    const form = new FormData(); form.append('file', file, file.name);
    return this.request<T>('POST', path, form, params, 120000);
  }
  /** Descarrega um ficheiro da API e oferece-o para guardar com este nome. */
  async download(path: string, filename: string, params?: Params): Promise<void> {
    const blob = await this.request<Blob>('GET', path, undefined, params, 60000, 'blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private async request<T>(method: string, path: string, body?: unknown, params?: Params, wait = 30000, responseType: 'json' | 'blob' = 'json'): Promise<T> {
    let headers;
    try { headers = this.auth.headers(); } catch (error) { await this.expired(); throw error; }
    let query = new HttpParams();
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== null && value !== undefined && value !== '') query = query.set(key, String(value));
    }
    try {
      const url = `${environment.apiUrl}${path}`;
      if (responseType === 'blob') return await firstValueFrom(this.http.request(method, url, { body, params: query, headers, responseType: 'blob' }).pipe(timeout(wait))) as T;
      return await firstValueFrom(this.http.request<T>(method, url, { body, params: query, headers }).pipe(timeout(wait)));
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) await this.expired();
      throw error;
    }
  }

  private async expired(): Promise<void> {
    await this.auth.logout();
    void this.router.navigate(['/login'], { queryParams: { next: this.router.url } });
  }
}

/** Mensagem para mostrar ao administrador, sem detalhes técnicos. */
export function apiErrorMessage(error: unknown): string {
  if (error instanceof TimeoutError) return 'O servidor está a demorar. Tenta outra vez dentro de momentos.';
  if (!(error instanceof HttpErrorResponse)) return error instanceof Error ? error.message : 'Algo correu mal. Tenta outra vez.';
  if (error.status === 0) return 'Sem ligação ao servidor. Verifica a internet e tenta outra vez.';
  if (error.status === 429) return 'Demasiados pedidos. Espera um minuto e tenta outra vez.';
  const message = error.error?.message;
  if ([400, 403, 404, 409].includes(error.status) && typeof message === 'string' && message.length < 200) return message;
  if (error.status === 403) return 'Não tens permissão para esta operação.';
  if (error.status === 404) return 'O registo já não existe. Actualiza a página.';
  return 'O servidor não respondeu como esperado. Tenta outra vez.';
}

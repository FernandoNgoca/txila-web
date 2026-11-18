import { Injectable, Injector, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';

export type AuthMode = 'login' | 'register' | 'reset';
export interface AuthDialogData { mode?: AuthMode; reason?: string; }

/** Abre a janela de conta; resolve verdadeiro quando o cliente fica com sessão iniciada. */
@Injectable({ providedIn: 'root' })
export class AuthDialogService {
  private readonly injector = inject(Injector);
  private readonly auth = inject(AuthService);
  async open(data: AuthDialogData = {}): Promise<boolean> {
    if (this.auth.username()) return true;
    // A janela e o MatDialog só são carregados quando alguém precisa de entrar.
    const [{ MatDialog }, { AuthDialog }] = await Promise.all([import('@angular/material/dialog'), import('./auth-dialog-view')]);
    const ref = this.injector.get(MatDialog).open<InstanceType<typeof AuthDialog>, AuthDialogData, boolean>(AuthDialog, { data, width: '440px', maxWidth: 'calc(100vw - 24px)', autoFocus: 'first-tabbable', panelClass: 'auth-dialog-panel' });
    return (await firstValueFrom(ref.afterClosed())) === true;
  }
}

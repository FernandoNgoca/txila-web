import { Component, Input, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';
import { AuthDialogService } from '../auth-dialog/auth-dialog';

/** Convite para entrar onde a conta é necessária; com sessão iniciada não ocupa espaço. */
@Component({ selector: 'app-session-panel', imports: [MatButtonModule], template: `
@if (!auth.username() && !auth.restoring()) {<div class="invite"><p>{{ reason }}</p><div class="actions"><button mat-flat-button type="button" [disabled]="disabled" (click)="open('login')">Entrar</button><button mat-button type="button" [disabled]="disabled" (click)="open('register')">Criar conta</button></div></div>}`,
styles: [`:host{display:block;margin:16px 0}.invite{display:flex;align-items:center;justify-content:space-between;gap:12px 16px;flex-wrap:wrap;padding:14px 16px;border-radius:16px;background:var(--accent-soft);border:1px solid var(--accent-line)}p{margin:0;font-size:14px;line-height:1.5;flex:1 1 220px}.actions{display:flex;gap:6px}`] })
export class SessionPanel {
  @Input() disabled = false;
  @Input() reason = 'Entra ou cria conta para continuares.';
  readonly auth = inject(AuthService);
  private readonly dialog = inject(AuthDialogService);
  open(mode: 'login' | 'register'): void { void this.dialog.open({ mode }); }
}

import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AuthService, authErrorMessage } from '../../core/services/auth.service';
import { AuthDialogService } from '../../core/components/auth-dialog/auth-dialog';

/** Destino do link de recuperação enviado por email (…/reset-password?token=…). */
@Component({ selector: 'app-reset-password', imports: [ReactiveFormsModule, RouterLink, MatButtonModule], template: `
<section class="reset"><span class="mark" aria-hidden="true">AV</span>
@if (done()) {<h1>Palavra-passe alterada</h1><p>Já podes entrar com a nova palavra-passe.</p><button mat-flat-button type="button" (click)="signIn()">Entrar</button>}
@else if (!token) {<h1>Link incompleto</h1><p>Abre o link exatamente como chegou no email, ou pede um novo.</p><button mat-flat-button type="button" (click)="recover()">Pedir novo link</button>}
@else {<h1>Escolhe uma nova palavra-passe</h1><p>Pelo menos 12 caracteres. Uma frase curta é fácil de lembrar.</p>
<form [formGroup]="form" (ngSubmit)="submit()" novalidate><label>Nova palavra-passe<input type="password" formControlName="password" autocomplete="new-password" maxlength="128"></label><label>Repete a palavra-passe<input type="password" formControlName="repeat" autocomplete="new-password" maxlength="128"></label>
@if (error()) {<p class="error" role="alert">{{ error() }}</p>}<button mat-flat-button type="submit" [disabled]="busy()">{{ busy() ? 'Um momento…' : 'Guardar palavra-passe' }}</button></form>}
<a routerLink="/home">Voltar ao início</a></section>`,
styles: [`.reset{max-width:420px;margin:24px auto;padding:32px;border-radius:24px;background:var(--surface);box-shadow:var(--shadow-md);display:grid;gap:14px}.mark{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#eaff8f,var(--accent));color:#fff;font-weight:800}h1{margin:4px 0 0;font-size:26px}p{margin:0;color:var(--muted);line-height:1.55}form{display:grid;gap:14px}label{display:grid;gap:6px;font-size:13px;font-weight:600}input{padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2);font:inherit}.error{padding:10px 12px;border-radius:10px;background:var(--accent-soft);color:var(--danger);font-size:13px}a{justify-self:center;color:var(--accent);font-size:13px}`] })
export class ResetPassword {
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(AuthDialogService);
  readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token') ?? '';
  readonly busy = signal(false);
  readonly error = signal('');
  readonly done = signal(false);
  readonly form = new FormGroup({ password: new FormControl('', { nonNullable: true }), repeat: new FormControl('', { nonNullable: true }) });
  async submit(): Promise<void> {
    const { password, repeat } = this.form.getRawValue();
    if (password.length < 12) { this.error.set('A palavra-passe precisa de pelo menos 12 caracteres.'); return; }
    if (password !== repeat) { this.error.set('As duas palavras-passe não coincidem.'); return; }
    this.busy.set(true); this.error.set('');
    try { await this.auth.confirmReset(this.token, password); this.done.set(true); }
    catch (error) { this.error.set(authErrorMessage(error, 'reset')); }
    finally { this.form.reset(); this.busy.set(false); }
  }
  signIn(): void { void this.dialog.open({ mode: 'login' }); }
  recover(): void { void this.dialog.open({ mode: 'reset' }); }
}

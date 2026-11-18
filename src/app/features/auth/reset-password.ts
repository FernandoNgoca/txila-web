import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService, authErrorMessage } from '../../core/services/auth.service';

/** Destino do link de recuperação enviado por email (…/reset-password?token=…). */
@Component({ selector: 'app-reset-password', imports: [ReactiveFormsModule, RouterLink], template: `
<section class="reset"><span class="logo" aria-hidden="true">T</span>
@if (done()) {<h1>Palavra-passe alterada</h1><p>Já podes entrar com a nova palavra-passe.</p><a class="btn btn-primary" routerLink="/login">Entrar</a>}
@else if (!token) {<h1>Link incompleto</h1><p>Abre o link exactamente como chegou no email, ou pede um novo na página de entrada.</p><a class="btn btn-primary" routerLink="/login">Ir para a entrada</a>}
@else {<h1>Escolhe uma nova palavra-passe</h1><p>Pelo menos 12 caracteres. Uma frase curta é fácil de lembrar.</p>
<form class="form" [formGroup]="form" (ngSubmit)="submit()" novalidate><label class="field">Nova palavra-passe<input type="password" formControlName="password" autocomplete="new-password" maxlength="128"></label><label class="field">Repete a palavra-passe<input type="password" formControlName="repeat" autocomplete="new-password" maxlength="128"></label>
@if (error()) {<p class="alert" role="alert">{{ error() }}</p>}<button class="btn btn-primary" type="submit" [disabled]="busy()">{{ busy() ? 'Um momento…' : 'Guardar palavra-passe' }}</button></form>
<a class="back" routerLink="/login">Voltar à entrada</a>}
</section>`,
styles: [`.reset{max-width:420px;margin:64px auto;padding:32px;border:1px solid var(--line);border-radius:var(--radius);display:grid;gap:14px}.logo{display:grid;place-items:center;width:36px;height:36px;border-radius:8px;background:var(--lime);color:var(--lime-ink);font-weight:700}h1{margin:4px 0 0;font-size:26px;font-weight:400}p{margin:0;color:var(--muted);line-height:1.55}.back{justify-self:center;font-size:13px}`] })
export class ResetPassword {
  private readonly auth = inject(AuthService);
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
}

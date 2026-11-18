import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, authErrorMessage } from '../../core/services/auth.service';
import { Logo } from '../../shared/logo';

/** Entrada no painel. Só contas de administrador passam pela guarda das rotas. */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, Logo],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly params = inject(ActivatedRoute).snapshot.queryParamMap;
  readonly mode = signal<'login' | 'reset'>('login');
  readonly busy = signal(false);
  readonly error = signal(this.params.get('denied') ? 'Esta conta não tem acesso ao painel.' : '');
  readonly notice = signal('');
  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(254)] }),
    password: new FormControl('', { nonNullable: true }),
    remember: new FormControl(false, { nonNullable: true }),
  });

  async submit(): Promise<void> {
    const { email, password, remember } = this.form.getRawValue();
    if (!email.trim()) { this.error.set('Indica o email ou o nome de utilizador.'); return; }
    if (this.mode() === 'reset') return this.reset(email.trim());
    if (!password) { this.error.set('Indica a palavra-passe.'); return; }
    this.busy.set(true); this.error.set(''); this.notice.set('');
    try {
      await this.auth.login(email.trim(), password, remember);
      const next = this.params.get('next');
      await this.router.navigateByUrl(next?.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
    } catch (error) {
      this.error.set(authErrorMessage(error, 'login'));
    } finally {
      this.form.controls.password.reset();
      this.busy.set(false);
    }
  }

  switchMode(mode: 'login' | 'reset'): void {
    this.mode.set(mode); this.error.set(''); this.notice.set('');
  }

  private async reset(email: string): Promise<void> {
    this.busy.set(true); this.error.set('');
    try {
      await this.auth.requestReset(email);
      this.notice.set('Se existir uma conta com este email, vais receber um link para escolher uma nova palavra-passe.');
      this.mode.set('login');
    } catch (error) {
      this.error.set(authErrorMessage(error, 'reset'));
    } finally {
      this.busy.set(false);
    }
  }
}

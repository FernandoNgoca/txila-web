import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { AuthService, authErrorMessage } from '../../services/auth.service';
import type { AuthDialogData, AuthMode } from './auth-dialog';

const PASSWORD_MIN = 12;

@Component({
  selector: 'app-auth-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule],
  templateUrl: './auth-dialog.html',
  styleUrl: './auth-dialog.scss'
})
export class AuthDialog {
  private readonly auth = inject(AuthService);
  private readonly ref = inject<MatDialogRef<AuthDialog, boolean>>(MatDialogRef);
  readonly data = inject<AuthDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};
  readonly mode = signal<AuthMode>(this.data.mode ?? 'login');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly sent = signal(false);
  readonly showPassword = signal(false);
  readonly passwordMin = PASSWORD_MIN;
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(255)] }),
    // Aceita email ou nome de utilizador (a conta de administrador não usa email).
    identifier: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(254)] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(128)] }),
    remember: new FormControl(false, { nonNullable: true })
  });

  setMode(mode: AuthMode): void { this.mode.set(mode); this.error.set(''); this.sent.set(false); this.form.controls.password.reset(); }
  /** Validação local com mensagens simples; a API confirma o resto. */
  problem(): string {
    const { name, identifier, password } = this.form.getRawValue(); const mode = this.mode();
    if (mode === 'register' && !name.trim()) return 'Escreve o teu nome.';
    if (!identifier.trim()) return mode === 'login' ? 'Escreve o teu email.' : 'Escreve o teu email.';
    if (mode !== 'login' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(identifier.trim())) return 'Este email não parece válido.';
    if (mode === 'login' && !password) return 'Escreve a palavra-passe.';
    if (mode === 'register' && password.length < PASSWORD_MIN) return `A palavra-passe precisa de pelo menos ${PASSWORD_MIN} caracteres.`;
    return '';
  }
  async submit(): Promise<void> {
    if (this.busy()) return;
    const problem = this.problem(); if (problem) { this.error.set(problem); return; }
    const { name, identifier, password, remember } = this.form.getRawValue();
    this.busy.set(true); this.error.set('');
    try {
      if (this.mode() === 'login') await this.auth.login(identifier.trim(), password, remember);
      else if (this.mode() === 'register') await this.auth.register(name.trim(), identifier.trim(), password, remember);
      else { await this.auth.requestReset(identifier.trim()); this.sent.set(true); return; }
      this.ref.close(true);
    } catch (error) { this.error.set(authErrorMessage(error, this.mode())); }
    finally { this.form.controls.password.reset(); this.busy.set(false); }
  }
}

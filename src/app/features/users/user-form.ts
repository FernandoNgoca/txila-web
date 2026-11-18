import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Api, apiErrorMessage } from '../../core/services/api.service';
import { Icon } from '../../shared/icon';
import { ROLES, User, mainRole } from './user-api';

export interface UserFormData { user: User | null; superAdmin: boolean; }

/** Editar o nome e o perfil de uma conta, ou criar uma conta de administrador. */
@Component({
  selector: 'app-user-form',
  imports: [ReactiveFormsModule, Icon],
  template: `
<form class="dialog form" [formGroup]="form" (ngSubmit)="save()" novalidate>
  <div class="dialog-head"><h2>{{ data.user ? 'Editar utilizador' : 'Novo administrador' }}</h2>
    <button class="icon-btn small" type="button" aria-label="Fechar" (click)="ref.close()"><app-icon name="close" /></button></div>
  @if (data.user) { <p class="who">{{ data.user.userName }}</p> }
  <label class="field">Nome completo<input formControlName="fullName" maxlength="255"></label>
  @if (!data.user) {
    <label class="field">Email<input formControlName="email" type="email" maxlength="254" autocomplete="off"><small>É com este email que a pessoa entra no painel.</small></label>
    <label class="field">Palavra-passe inicial<input formControlName="password" type="password" maxlength="128" autocomplete="new-password"><small>Pelo menos 12 caracteres. Pede à pessoa para a alterar no primeiro acesso.</small></label>
  }
  <fieldset class="roles">
    <legend>Perfil</legend>
    @for (r of roles; track r.value) {
      <label class="role" [class.disabled]="r.value === 'ROLE_SUPER_ADMIN' && !data.superAdmin">
        <input type="radio" formControlName="role" [value]="r.value" [attr.disabled]="r.value === 'ROLE_SUPER_ADMIN' && !data.superAdmin ? true : null">
        <span><strong>{{ r.label }}</strong><small>{{ r.hint }}</small></span>
      </label>
    }
  </fieldset>
  @if (data.user && changedRole()) { <p class="note">Mudar o perfil termina as sessões abertas desta conta.</p> }
  @if (error()) { <p class="alert" role="alert">{{ error() }}</p> }
  <div class="dialog-actions">
    <button class="btn" type="button" (click)="ref.close()">Cancelar</button>
    <button class="btn btn-primary" type="submit" [disabled]="busy()">{{ busy() ? 'A guardar…' : 'Guardar' }}</button>
  </div>
</form>`,
  styles: [`.who{margin:-12px 0 0!important;font-size:13px}.roles{display:grid;gap:8px;margin:0;padding:0;border:0}legend{margin-bottom:8px;font-size:13px;font-weight:500}
.role{display:flex;gap:12px;align-items:flex-start;padding:10px 12px;border:1px solid var(--line);border-radius:var(--radius);cursor:pointer}
.role:has(input:checked){border-color:var(--sidebar);background:var(--lime-soft)}.role.disabled{opacity:.5;cursor:default}
.role input{margin-top:3px;accent-color:var(--sidebar)}.role strong{display:block;font-weight:500}.role small{color:var(--muted);font-size:12px}
.note{font-size:13px}`]
})
export class UserForm {
  readonly data = inject<UserFormData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<UserForm, boolean>);
  private readonly api = inject(Api);
  readonly roles = ROLES;
  readonly busy = signal(false);
  readonly error = signal('');
  private readonly initialRole = this.data.user ? mainRole(this.data.user.roles) : 'ROLE_ADMIN';
  readonly form = new FormGroup({
    fullName: new FormControl(this.data.user?.fullName ?? '', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true }),
    password: new FormControl('', { nonNullable: true }),
    role: new FormControl(this.initialRole, { nonNullable: true }),
  });
  readonly changedRole = signal(false);

  constructor() {
    this.form.controls.role.valueChanges.subscribe(role => this.changedRole.set(role !== this.initialRole));
  }

  async save(): Promise<void> {
    const v = this.form.getRawValue();
    if (!v.fullName.trim()) return this.error.set('Indica o nome completo.');
    if (!this.data.user) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) return this.error.set('Indica um email válido.');
      if (v.password.length < 12) return this.error.set('A palavra-passe precisa de pelo menos 12 caracteres.');
    }
    this.busy.set(true); this.error.set('');
    try {
      if (this.data.user) {
        await this.api.put(`/api/v1/admin/users/${this.data.user.id}`, { fullName: v.fullName.trim(), roles: [v.role] });
      } else {
        await this.api.post('/api/v1/admin/users', { username: v.email.trim().toLowerCase(), password: v.password, fullname: v.fullName.trim(), roles: [v.role] });
      }
      this.ref.close(true);
    } catch (error) { this.error.set(apiErrorMessage(error)); }
    finally { this.busy.set(false); }
  }
}

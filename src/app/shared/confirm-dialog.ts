import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

export interface ConfirmData { title: string; message: string; confirm: string; danger?: boolean; }

@Component({
  selector: 'app-confirm-dialog',
  template: `
<div class="dialog">
  <div class="dialog-head"><h2>{{ data.title }}</h2></div>
  <p>{{ data.message }}</p>
  <div class="dialog-actions">
    <button class="btn" type="button" (click)="ref.close(false)">Cancelar</button>
    <button class="btn" type="button" [class.btn-primary]="!data.danger" [class.btn-danger]="data.danger" [class.solid]="data.danger" (click)="ref.close(true)">{{ data.confirm }}</button>
  </div>
</div>`
})
export class ConfirmDialog {
  readonly data = inject<ConfirmData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<ConfirmDialog, boolean>);
}

export async function confirmAction(dialog: MatDialog, data: ConfirmData): Promise<boolean> {
  const ref = dialog.open(ConfirmDialog, { data, panelClass: 'dialog-panel', autoFocus: 'dialog' });
  return (await firstValueFrom(ref.afterClosed())) === true;
}

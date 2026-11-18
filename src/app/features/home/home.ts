import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/services/auth.service';
import { SessionPanel } from '../../core/components/session-panel/session-panel';

@Component({ selector: 'app-home', imports: [MatButtonModule, SessionPanel], templateUrl: './home.html', styleUrl: './home.scss' })
export class Home {
  readonly auth = inject(AuthService);
}

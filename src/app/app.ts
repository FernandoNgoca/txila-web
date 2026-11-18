import { Component, ElementRef, OnInit, ViewChild, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from './core/services/auth.service';
import { AuthDialogService } from './core/components/auth-dialog/auth-dialog';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, MatButtonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: { '(document:click)': 'closeMenu($event)', '(document:keydown.escape)': 'closeMenu()' }
})
export class App implements OnInit {
  readonly auth = inject(AuthService);
  private readonly dialog = inject(AuthDialogService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  /** Inicial mostrada no botão de conta; nomes de utilizador sem email usam a primeira letra. */
  readonly initial = computed(() => (this.auth.username().trim()[0] ?? '?').toUpperCase());

  ngOnInit(): void {
    void this.auth.restore();
    // As páginas protegidas redirecionam com ?login=required: abre a janela em vez de um formulário na página.
    this.route.queryParamMap.subscribe(params => {
      if (params.get('login') !== 'required') return;
      void this.router.navigate([], { queryParams: { login: null }, queryParamsHandling: 'merge', replaceUrl: true });
      if (!this.auth.username()) void this.dialog.open({ reason: 'Entra para continuares.' });
    });
  }
  @ViewChild('menu') private menu?: ElementRef<HTMLDetailsElement>;
  closeMenu(event?: Event): void { const menu = this.menu?.nativeElement; if (menu?.open && !(event && menu.contains(event.target as Node))) menu.open = false; }
  signIn(): void { void this.dialog.open(); }
  async signOut(): Promise<void> { await this.auth.logout(); void this.router.navigate(['/home']); }
}

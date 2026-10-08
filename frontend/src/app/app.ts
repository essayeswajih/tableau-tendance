import { Component, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { CartService } from './shared/cart.service';
import { SettingsService } from './shared/settings.service';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly isMenuOpen = signal(false);
  protected readonly isAdminRoute = signal(false);

  constructor(
    protected readonly cart: CartService,
    protected readonly settingsService: SettingsService,
    private readonly router: Router,
  ) {
    this.settingsService.loadSettings();
    this.updateLayoutVisibility(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.updateLayoutVisibility(event.urlAfterRedirects);
      });
  }

  protected closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  protected toggleMenu(): void {
    this.isMenuOpen.update((isOpen) => !isOpen);
  }

  private updateLayoutVisibility(url: string): void {
    this.isAdminRoute.set(url.startsWith('/login') || url.startsWith('/dashboard'));
  }
}

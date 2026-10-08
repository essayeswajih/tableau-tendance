import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { AdminProfile, AuthService } from '../shared/auth.service';
import { adminSections } from './dashboard/dashboard-options';
import { DashboardClientsPage } from './dashboard/clients/clients.page';
import { DashboardSectionKey } from './dashboard/dashboard.models';
import { DashboardGalleryPage } from './dashboard/gallery/gallery.page';
import { DashboardMessagesPage } from './dashboard/messages/messages.page';
import { DashboardOrdersPage } from './dashboard/orders/orders.page';
import { DashboardPlaceholderPage } from './dashboard/placeholder/placeholder.page';
import { DashboardProductsPage } from './dashboard/products/products.page';
import { DashboardServicesPage } from './dashboard/services/services.page';
import { DashboardSettingsPage } from './dashboard/settings/settings.page';
import { DashboardStatsPage } from './dashboard/stats/stats.page';
import { DashboardUploadsPage } from './dashboard/uploads/uploads.page';

@Component({
  imports: [
    DashboardOrdersPage,
    DashboardClientsPage,
    DashboardGalleryPage,
    DashboardMessagesPage,
    DashboardPlaceholderPage,
    DashboardProductsPage,
    DashboardServicesPage,
    DashboardSettingsPage,
    DashboardStatsPage,
    DashboardUploadsPage,
  ],
  selector: 'app-dashboard-page',
  styleUrl: './dashboard.page.scss',
  templateUrl: './dashboard.page.html',
})
export class DashboardPage implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly adminSections = adminSections;
  protected readonly profile = signal<AdminProfile | null>(null);
  protected readonly activeSection = signal<DashboardSectionKey>('overview');

  constructor(protected readonly auth: AuthService) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.auth.loadProfile().subscribe({
      next: (profile) => this.profile.set(profile),
      error: () => this.auth.logout(),
    });
  }

  protected selectSection(section: DashboardSectionKey): void {
    this.activeSection.set(section);
  }
}

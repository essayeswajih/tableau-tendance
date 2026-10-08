import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { services as fallbackServices, type Service } from './catalog-data';

@Injectable({ providedIn: 'root' })
export class ServiceService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly servicesSignal = signal<Service[]>(fallbackServices);

  readonly services = this.servicesSignal.asReadonly();

  constructor(private readonly http: HttpClient) {}

  loadServices(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.http.get<Service[]>('/api/services').subscribe({
      next: (services) => this.servicesSignal.set(services.length > 0 ? services : fallbackServices),
      error: () => this.servicesSignal.set(fallbackServices),
    });
  }
}

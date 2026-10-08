import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { services as fallbackCollections, type Service } from './catalog-data';

@Injectable({ providedIn: 'root' })
export class CollectionService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly collectionsSignal = signal<Service[]>(fallbackCollections);

  readonly collections = this.collectionsSignal.asReadonly();

  constructor(private readonly http: HttpClient) {}

  loadCollections(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.http.get<Service[]>('/api/services').subscribe({
      next: (collections) =>
        this.collectionsSignal.set(collections.length > 0 ? collections : fallbackCollections),
      error: () => this.collectionsSignal.set(fallbackCollections),
    });
  }
}


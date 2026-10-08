import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Service } from '../../../shared/catalog-data';
import { MediaUpload } from '../dashboard.models';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-dashboard-services-page',
  styleUrl: './services.page.scss',
  templateUrl: './services.page.html',
})
export class DashboardServicesPage implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly fb = inject(FormBuilder);
  protected readonly services = signal<Service[]>([]);
  protected readonly uploads = signal<MediaUpload[]>([]);
  protected readonly servicesError = signal('');
  protected readonly editingServiceId = signal<number | null>(null);
  protected readonly isSavingService = signal(false);
  protected readonly serviceSearchTerm = signal('');
  protected readonly serviceCategoryFilter = signal('all');
  protected readonly serviceStatusFilter = signal<'all' | 'active' | 'hidden'>('all');
  protected readonly serviceCurrentPage = signal(1);
  protected readonly servicePageSize = 10;
  protected readonly serviceForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    description: ['', [Validators.required, Validators.minLength(5)]],
    duration: ['', [Validators.required]],
    price: ['', [Validators.required]],
    image: ['', [Validators.required]],
    category: ['', [Validators.required]],
    is_active: [true],
  });
  protected readonly serviceCategories = computed(() => [
    'all',
    ...new Set(this.services().map((service) => service.category)),
  ]);
  protected readonly filteredServices = computed(() => {
    const query = this.serviceSearchTerm().trim().toLowerCase();
    const category = this.serviceCategoryFilter();
    const status = this.serviceStatusFilter();

    return this.services().filter((service) => {
      const matchesQuery =
        !query ||
        [service.title, service.description, service.category, service.duration, service.price, service.image]
          .join(' ')
          .toLowerCase()
          .includes(query);
      const matchesCategory = category === 'all' || service.category === category;
      const matchesStatus =
        status === 'all' ||
        (status === 'active' && service.is_active) ||
        (status === 'hidden' && !service.is_active);
      return matchesQuery && matchesCategory && matchesStatus;
    });
  });
  protected readonly serviceTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredServices().length / this.servicePageSize)),
  );
  protected readonly paginatedServices = computed(() => {
    const page = Math.min(this.serviceCurrentPage(), this.serviceTotalPages());
    const start = (page - 1) * this.servicePageSize;
    return this.filteredServices().slice(start, start + this.servicePageSize);
  });

  constructor(
    private readonly http: HttpClient,
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.loadServices();
    this.loadUploads();
  }

  protected loadServices(): void {
    this.servicesError.set('');
    this.http.get<Service[]>('/api/services/admin').subscribe({
      next: (services) => this.services.set(services),
      error: () => this.servicesError.set('Impossible de charger les services.'),
    });
  }

  protected loadUploads(): void {
    this.http.get<MediaUpload[]>('/api/uploads').subscribe({
      next: (uploads) => this.uploads.set(uploads),
      error: () => this.uploads.set([]),
    });
  }

  protected startCreateService(): void {
    this.editingServiceId.set(null);
    this.serviceForm.reset({
      title: '',
      description: '',
      duration: '',
      price: '',
      image: '',
      category: '',
      is_active: true,
    });
  }

  protected startEditService(service: Service): void {
    this.editingServiceId.set(service.id ?? null);
    this.serviceForm.reset({
      title: service.title,
      description: service.description,
      duration: service.duration,
      price: service.price,
      image: service.image,
      category: service.category,
      is_active: service.is_active ?? true,
    });
  }

  protected useImageForService(upload: MediaUpload): void {
    if (upload.kind === 'image') {
      this.serviceForm.controls.image.setValue(upload.url);
    }
  }

  protected saveService(): void {
    if (this.serviceForm.invalid || this.isSavingService()) {
      this.serviceForm.markAllAsTouched();
      return;
    }

    this.isSavingService.set(true);
    this.servicesError.set('');
    const payload = this.serviceForm.getRawValue();
    const serviceId = this.editingServiceId();
    const request = serviceId
      ? this.http.patch<Service>(`/api/services/${serviceId}`, payload)
      : this.http.post<Service>('/api/services', payload);

    request.subscribe({
      next: () => {
        this.isSavingService.set(false);
        this.startCreateService();
        this.loadServices();
      },
      error: () => {
        this.isSavingService.set(false);
        this.servicesError.set('Impossible de sauvegarder ce service.');
      },
    });
  }

  protected deleteService(service: Service): void {
    if (!service.id) {
      return;
    }
    this.http.delete(`/api/services/${service.id}`).subscribe({
      next: () => this.loadServices(),
      error: () => this.servicesError.set('Impossible de supprimer ce service.'),
    });
  }

  protected updateServiceSearch(event: Event): void {
    this.serviceSearchTerm.set((event.target as HTMLInputElement).value);
    this.serviceCurrentPage.set(1);
  }

  protected updateServiceCategoryFilter(event: Event): void {
    this.serviceCategoryFilter.set((event.target as HTMLSelectElement).value);
    this.serviceCurrentPage.set(1);
  }

  protected updateServiceStatusFilter(event: Event): void {
    this.serviceStatusFilter.set(
      (event.target as HTMLSelectElement).value as 'all' | 'active' | 'hidden',
    );
    this.serviceCurrentPage.set(1);
  }

  protected goToPreviousServicePage(): void {
    this.serviceCurrentPage.update((page) => Math.max(1, page - 1));
  }

  protected goToNextServicePage(): void {
    this.serviceCurrentPage.update((page) => Math.min(this.serviceTotalPages(), page + 1));
  }
}

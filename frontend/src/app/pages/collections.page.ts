import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CollectionService } from '../shared/collection.service';

@Component({
  imports: [RouterLink],
  selector: 'app-collections-page',
  styleUrl: './collections.page.scss',
  templateUrl: './collections.page.html',
})
export class CollectionsPage implements OnInit {
  private readonly collectionService = inject(CollectionService);

  protected readonly selectedCategory = signal('Tous');
  protected readonly collections = this.collectionService.collections;
  protected readonly categories = computed(() => [
    'Tous',
    ...new Set(this.collections().map((collection) => collection.category)),
  ]);
  protected readonly filteredCollections = computed(() => {
    const category = this.selectedCategory();
    return category === 'Tous'
      ? this.collections()
      : this.collections().filter((collection) => collection.category === category);
  });

  ngOnInit(): void {
    this.collectionService.loadCollections();
  }

  protected selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }
}


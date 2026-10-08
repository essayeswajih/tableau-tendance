import { Component, input } from '@angular/core';

@Component({
  selector: 'app-dashboard-placeholder-page',
  styleUrl: './placeholder.page.scss',
  templateUrl: './placeholder.page.html',
})
export class DashboardPlaceholderPage {
  readonly section = input.required<string>();
}

import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SettingsService } from '../shared/settings.service';

@Component({
  imports: [RouterLink],
  selector: 'app-a-propos-page',
  styleUrl: './a-propos.page.scss',
  templateUrl: './a-propos.page.html',
})
export class AProposPage {
  protected readonly settingsService = inject(SettingsService);
}

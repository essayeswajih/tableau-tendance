import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SettingsService } from '../shared/settings.service';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-contact-page',
  styleUrl: './contact.page.scss',
  templateUrl: './contact.page.html',
})
export class ContactPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  protected readonly settingsService = inject(SettingsService);
  protected readonly isSubmitting = signal(false);
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');
  protected readonly contactForm = this.fb.nonNullable.group({
    customer_name: ['', [Validators.required, Validators.minLength(2)]],
    customer_phone: ['', [Validators.required, Validators.minLength(6)]],
    customer_email: ['', [Validators.email]],
    subject: ['Question tableau', [Validators.required]],
    message: ['', [Validators.required, Validators.minLength(5)]],
  });

  ngOnInit(): void {
    this.settingsService.loadSettings();
  }

  protected submitMessage(): void {
    if (this.contactForm.invalid || this.isSubmitting()) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    this.http.post('/api/messages', this.contactForm.getRawValue()).subscribe({
      next: () => {
        this.contactForm.reset({
          customer_name: '',
          customer_phone: '',
          customer_email: '',
          subject: 'Question tableau',
          message: '',
        });
        this.successMessage.set('Votre message a ete envoye. Nous vous repondrons rapidement.');
        this.isSubmitting.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible d envoyer le message pour le moment.');
        this.isSubmitting.set(false);
      },
    });
  }
}

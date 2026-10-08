import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface AdminProfile {
  id: number;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = '/api';
  private readonly tokenKey = 'tableau_tendance_admin_token';
  private readonly token = signal<string | null>(this.readToken());

  readonly isAuthenticated = computed(() => Boolean(this.token()));

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  getAccessToken(): string | null {
    return this.token();
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap((response) => {
        this.setToken(response.access_token);
      }),
    );
  }

  loadProfile(): Observable<AdminProfile> {
    return this.http.get<AdminProfile>(`${this.apiUrl}/auth/me`);
  }

  logout(): void {
    this.setToken(null);
    void this.router.navigate(['/login']);
  }

  private setToken(token: string | null): void {
    this.token.set(token);
    if (typeof localStorage === 'undefined') {
      return;
    }
    if (token) {
      localStorage.setItem(this.tokenKey, token);
    } else {
      localStorage.removeItem(this.tokenKey);
    }
  }

  private readToken(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem(this.tokenKey);
  }
}


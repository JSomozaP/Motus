import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

interface LoginResponse {
  token: string;
  user: {
    id: number;
    pseudo: string;
    email: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3001/api/auth';
  private tokenKey = 'token';
  private isLoggedInSubject = new BehaviorSubject<boolean>(this.hasToken());

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  private hasToken(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    return !!(localStorage.getItem(this.tokenKey) || sessionStorage.getItem(this.tokenKey));
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { email, password })
      .pipe(tap(response => {
        if (response.token && isPlatformBrowser(this.platformId)) {
          localStorage.setItem(this.tokenKey, response.token);
          this.isLoggedInSubject.next(true);
        }
      }));
  }

  register(pseudo: string, email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, { pseudo, email, password });
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.tokenKey);
      sessionStorage.removeItem(this.tokenKey);
      this.isLoggedInSubject.next(false);
      this.router.navigate(['/login']);
    }
  }

  isAuthenticated(): Observable<boolean> {
    return this.isLoggedInSubject.asObservable();
  }

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return localStorage.getItem(this.tokenKey) || sessionStorage.getItem(this.tokenKey);
  }
}
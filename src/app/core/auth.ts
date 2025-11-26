import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

export interface User {
  id: number;
  username: string;
  group: string;
  permissions: { key: string; enabled: boolean }[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly currentUser = signal<User | null>(null);

  login(username: string, password: string) {
    return this.http.post<User>('/api/auth/login', { username, password }).pipe(
      tap(user => {
        this.currentUser.set(user);
        this.router.navigate(['/']);
      })
    );
  }

  me() {
    return this.http.get<User>('/api/auth/me').pipe(
      tap(user => {
        this.currentUser.set(user);
      })
    );
  }

  logout() {
    return this.http.post('/api/auth/logout', {}).pipe(
      tap(() => {
        this.currentUser.set(null);
        this.router.navigate(['/login']);
      })
    );
  }
}

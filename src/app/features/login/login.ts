import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  private authService = inject(AuthService);
  
  protected username = signal('');
  protected password = signal('');
  protected error = signal('');

  login() {
    this.authService.login(this.username(), this.password()).subscribe({
      error: () => this.error.set('Invalid credentials')
    });
  }
}

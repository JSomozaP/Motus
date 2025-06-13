import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class LoginComponent {
  email = '';
  password = '';
  errorMessage = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

    // ✅ Méthode pour le bouton de test
useTestAccount() {
  this.email = 'jeremy@test.com';
  this.password = 'Test123';
}

  onSubmit() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Veuillez remplir tous les champs';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        console.log('Connexion réussie:', response);
        this.router.navigate(['/game']); // Redirection vers le jeu
      },
      error: (error) => {
        console.error('Erreur de connexion:', error);
        this.errorMessage = error.error?.message || 'Erreur de connexion';
        this.isLoading = false;
      }
    });
  }
}
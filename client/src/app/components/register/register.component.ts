import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
export class RegisterComponent {
  registerForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      pseudo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      numero_secu: ['', [Validators.required, Validators.pattern(/^\d{15}$/)]]
    });
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.errorMessage = "";
      
      const formData = this.registerForm.value;
      
      this.authService.register(
        formData.pseudo,
        "", 
        formData.password
      ).subscribe(
        (response: any) => {
          console.log("✅ Inscription réussie", response);
          this.successMessage = "Inscription réussie ! Redirection vers la connexion...";
          this.isLoading = false;
          setTimeout(() => {
            this.router.navigate(["/login"]);
          }, 2000);
        },
        (error: any) => {
          console.error("❌ Erreur inscription", error);
          this.errorMessage = error.error?.message || "Erreur lors de l'inscription";
          this.isLoading = false;
        }
      );
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.registerForm.controls).forEach(field => {
      const control = this.registerForm.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  get pseudo() { return this.registerForm.get('pseudo'); }
  get password() { return this.registerForm.get('password'); }
  get numero_secu() { return this.registerForm.get('numero_secu'); }
}
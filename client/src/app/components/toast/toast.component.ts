import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../services/toast.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-toast',
  template: `
    <div class="toast-container">
      <div 
        *ngFor="let toast of toasts$ | async" 
        class="toast"
        [class]="'toast-' + toast.type"
        (click)="remove(toast.id)"
      >
        <div class="toast-icon">
          <span *ngIf="toast.type === 'success'">🎉</span>
          <span *ngIf="toast.type === 'error'">❌</span>
          <span *ngIf="toast.type === 'info'">ℹ️</span>
          <span *ngIf="toast.type === 'warning'">⚠️</span>
        </div>
        <div class="toast-message">{{ toast.message }}</div>
        <button class="toast-close" (click)="remove(toast.id); $event.stopPropagation()">×</button>
      </div>
    </div>
  `,
  styleUrls: ['./toast.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class ToastComponent {
  // ✅ Correction : initialisation via getter pour éviter le problème d'initialisation
  toasts$: Observable<Toast[]>;

  constructor(private toastService: ToastService) {
    this.toasts$ = this.toastService.toasts$; // ✅ Initialisation dans le constructeur
  }

  remove(id: number) {
    this.toastService.remove(id);
  }
}
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="onOverlayClick($event)">
      <div class="modal-container" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button class="close-btn" (click)="onCancel()" aria-label="Fermer">×</button>
        </div>
        
        <div class="modal-body">
          <!-- Modal de confirmation -->
          <div *ngIf="type === 'confirm'" class="confirm-modal">
            <p>{{ message }}</p>
            <div class="button-group">
              <button class="btn btn-secondary" (click)="onCancel()">Annuler</button>
              <button class="btn btn-primary" (click)="onConfirm()">{{ confirmText }}</button>
            </div>
          </div>
          
          <!-- Modal de saisie -->
          <div *ngIf="type === 'input'" class="input-modal">
            <p>{{ message }}</p>
            <input 
              type="text" 
              [(ngModel)]="inputValue" 
              [placeholder]="placeholder"
              class="modal-input"
              (keyup.enter)="onConfirm()"
              #inputField>
            <div class="button-group">
              <button class="btn btn-secondary" (click)="onCancel()">Annuler</button>
              <button class="btn btn-primary" (click)="onConfirm()" [disabled]="!inputValue.trim()">
                {{ confirmText }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease-out;
    }

    .modal-container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      max-width: 90%;
      width: 400px;
      animation: slideIn 0.2s ease-out;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px 16px;
      border-bottom: 1px solid #e0e0e0;
    }

    .modal-header h3 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #333;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      color: #666;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: #f0f0f0;
      color: #333;
    }

    .modal-body {
      padding: 20px 24px 24px;
    }

    .modal-body p {
      margin: 0 0 20px;
      color: #555;
      line-height: 1.5;
    }

    .modal-input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 16px;
      margin-bottom: 20px;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }

    .modal-input:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
    }

    .button-group {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      min-width: 80px;
    }

    .btn-secondary {
      background: #f8f9fa;
      color: #6c757d;
      border: 1px solid #dee2e6;
    }

    .btn-secondary:hover {
      background: #e9ecef;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #0056b3;
    }

    .btn-primary:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideIn {
      from { 
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
      }
      to { 
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `]
})
export class ModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() type: 'confirm' | 'input' = 'confirm';
  @Input() title = '';
  @Input() message = '';
  @Input() confirmText = 'Confirmer';
  @Input() placeholder = '';
  @Input() initialValue = '';

  @Output() confirmed = new EventEmitter<string | boolean>();
  @Output() cancelled = new EventEmitter<void>();

  inputValue = '';

  ngOnInit() {
    this.inputValue = this.initialValue;
  }

  onOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }

  onConfirm() {
    if (this.type === 'input') {
      this.confirmed.emit(this.inputValue.trim());
    } else {
      this.confirmed.emit(true);
    }
    this.close();
  }

  onCancel() {
    this.cancelled.emit();
    this.close();
  }

  private close() {
    this.isOpen = false;
    this.inputValue = '';
  }
}
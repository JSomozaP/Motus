import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ModalConfig {
  type: 'confirm' | 'input';
  title: string;
  message: string;
  confirmText?: string;
  placeholder?: string;
  initialValue?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private modalSubject = new BehaviorSubject<ModalConfig | null>(null);
  private resultSubject = new BehaviorSubject<string | boolean | null>(null);

  modal$ = this.modalSubject.asObservable();
  result$ = this.resultSubject.asObservable();

  showConfirm(title: string, message: string, confirmText = 'Confirmer'): Promise<boolean> {
    return new Promise((resolve) => {
      this.modalSubject.next({
        type: 'confirm',
        title,
        message,
        confirmText
      });

      const subscription = this.result$.subscribe(result => {
        if (result !== null) {
          subscription.unsubscribe();
          resolve(result as boolean);
          this.resultSubject.next(null);
        }
      });
    });
  }

  showInput(title: string, message: string, placeholder = '', initialValue = '', confirmText = 'Valider'): Promise<string | null> {
    return new Promise((resolve) => {
      this.modalSubject.next({
        type: 'input',
        title,
        message,
        placeholder,
        initialValue,
        confirmText
      });

      const subscription = this.result$.subscribe(result => {
        if (result !== null) {
          subscription.unsubscribe();
          resolve(result as string);
          this.resultSubject.next(null);
        }
      });
    });
  }

  confirm(result: string | boolean) {
    this.resultSubject.next(result);
    this.modalSubject.next(null);
  }

  cancel() {
    this.resultSubject.next(null);
    this.modalSubject.next(null);
  }
}
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-keyboard',
  templateUrl: './keyboard.component.html',
  styleUrls: ['./keyboard.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class KeyboardComponent {
  // Émetteur d'événements
  @Output() keyPressed = new EventEmitter<string>();
  
  // Propriétés d'entrée
  @Input() disabled = false;  // Nouvelle propriété pour désactiver le clavier
  @Input() keyStates: { [key: string]: string } = {};  // États des touches (correct, present, incorrect)

  // Disposition du clavier AZERTY
  row1: string[] = ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
  row2: string[] = ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'];
  row3: string[] = ['ENTER', 'W', 'X', 'C', 'V', 'B', 'N', 'DEL'];

  // Gestion des clics sur les touches
  onKeyClick(key: string) {
    if (!this.disabled) {
      this.keyPressed.emit(key);
    }
  }
}
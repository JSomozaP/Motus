import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KeyboardComponent } from '../keyboard/keyboard.component';
import { GameService } from '../../services/game.service';

interface Cell {
  letter: string;
  state: 'correct' | 'present' | 'absent' | 'invalid' | 'empty' | 'hint'; 
}

@Component({
  selector: 'app-game-grid',
  templateUrl: './game-grid.component.html',
  styleUrls: ['./game-grid.component.scss'],
  standalone: true,
  imports: [CommonModule, KeyboardComponent]
})
export class GameGridComponent implements OnInit {
  // Propriétés de la grille de jeu
  grid: Cell[][] = [];
  currentRow = 0;
  currentCol = 0;
  targetWord = '';
  wordLength = 5; // Longueur dynamique du mot
  
  // États du jeu
  isLoading = true;
  gameOver = false;
  errorMessage = '';
  
  // Propriétés API
  gameId?: number;
  remainingAttempts = 6;
  hint = '';

  // États du clavier
  keyStates: { [key: string]: string } = {};

  constructor(private gameService: GameService) {}

  ngOnInit() {
    this.loadNewWord();
  }

  private initializeGrid() {
    this.grid = [];
    for (let i = 0; i < 6; i++) { // 6 tentatives
      const row: Cell[] = [];
      for (let j = 0; j < this.wordLength; j++) { // Longueur dynamique
        row.push({
          letter: i === 0 && j === 0 ? this.hint : '', // Premier indice
          state: i === 0 && j === 0 ? 'hint' : 'empty'
        });
      }
      this.grid.push(row);
    }
  }

  private loadNewWord() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.gameService.getRandomWord('facile').subscribe({
      next: (response) => {
        console.log('Response from server:', response);
        if (response && response.gameId) {
          this.gameId = response.gameId;
          this.remainingAttempts = response.remainingAttempts;
          this.hint = response.hint;
          this.wordLength = response.length; // Mise à jour de la longueur
          this.targetWord = 'X'.repeat(response.length);
          
          // Initialiser la grille avec la bonne longueur
          this.initializeGrid();
          this.isLoading = false;
        } else {
          console.error('Invalid response format:', response);
          this.errorMessage = 'Format de réponse invalide';
        }
      },
      error: (error) => {
        console.error('Error details:', error);
        this.errorMessage = `Erreur de chargement du mot: ${error.message || 'Erreur inconnue'}`;
        this.isLoading = false;
      }
    });
  }

  handleKeyPress(key: string) {
    if (this.isLoading || this.gameOver) return;
    
    if (key === 'ENTER') {
      this.checkWord();
    } else if (key === 'DEL') {
      this.deleteLetter();
    } else if (this.currentCol < this.wordLength) { // Utilise wordLength au lieu de 5
      this.grid[this.currentRow][this.currentCol].letter = key;
      this.currentCol++;
    }
  }

  private updateKeyStates(guess: string, result: string[]) {
    for (let i = 0; i < guess.length; i++) {
      const key = guess[i];
      const state = result[i];
      // Ne pas dégrader l'état d'une touche déjà correcte
      if (this.keyStates[key] !== 'correct') {
        this.keyStates[key] = state;
      }
    }
  }

  private checkWord() {
  if (this.currentCol !== this.wordLength || !this.gameId) return;

  const guess = this.grid[this.currentRow].map(cell => cell.letter).join('');
  
  this.gameService.submitGuess(
    guess, 
    this.gameId,
    6 - this.remainingAttempts + 1
  ).subscribe({
    next: (response) => {
      // Met à jour les états des cellules
      for (let i = 0; i < guess.length; i++) {
        this.grid[this.currentRow][i].state = response.result[i].status;
      }
      
      // Met à jour les états du clavier
      this.updateKeyStates(guess, response.result.map(r => 
        r.status === 'absent' ? 'incorrect' : r.status
      ));

      if (response.won) {
        this.gameOver = true;
        this.targetWord = response.targetWord || guess;
        console.log('🎉 Gagné !');
      } else if (response.gameOver || this.currentRow >= 5) {
        this.gameOver = true;
        this.targetWord = response.targetWord || 'MAISON'; // Afficher le vrai mot
        console.log('😔 Perdu ! Le mot était :', this.targetWord);
      } else {
        this.currentRow++;
        this.currentCol = 0;
        this.remainingAttempts = response.remainingAttempts || this.remainingAttempts - 1;
      }
    },
    error: (error) => {
      console.error('Error checking word:', error);
      this.errorMessage = 'Erreur lors de la vérification du mot';
    }
  });
}

  private deleteLetter() {
    if (this.currentCol > 0) {
      this.currentCol--;
      this.grid[this.currentRow][this.currentCol].letter = '';
      this.grid[this.currentRow][this.currentCol].state = 'empty';
    }
  }

  restartGame() {
    this.gameOver = false;
    this.currentRow = 0;
    this.currentCol = 0;
    this.keyStates = {};
    this.loadNewWord(); // Recharge un nouveau mot avec sa longueur
  }
}
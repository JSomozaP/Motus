import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KeyboardComponent } from '../keyboard/keyboard.component';
import { ToastComponent } from '../toast/toast.component';
import { GameService } from '../../services/game.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { ModalComponent } from '../modal/modal.component';
import { ModalService } from '../../services/modal.service';

interface Cell {
  letter: string;
  state: 'correct' | 'present' | 'absent' | 'invalid' | 'empty' | 'hint'; 
}

interface SessionStats {
  totalScore: number;
  wordsFound: number;
  averageScore: number;
  currentStreak: number;
  bestStreak: number;
  perfectWords: number;
}

interface WordResult {
  wordScore: number;
  attempts: number;
  isPerfect: boolean;
  bonusPoints: number;
}

interface SavedSession {
  id: number;
  date: string;
  playerAlias: string;
  stats: SessionStats;
  wordsHistory: WordResult[];
  duration: number;
}

@Component({
  selector: 'app-game-grid',
  templateUrl: './game-grid.component.html',
  styleUrls: ['./game-grid.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, KeyboardComponent, ToastComponent, ModalComponent]
})
export class GameGridComponent implements OnInit {
  // Propriétés de la grille de jeu
  grid: Cell[][] = [];
  currentRow = 0;
  currentCol = 0;
  targetWord = '';
  wordLength = 5;
  
  // États du jeu
  isLoading = true;
  gameOver = false;
  errorMessage = '';
  wordFound = false;
  
  // Propriétés API
  gameId?: number;
  remainingAttempts = 6;
  hint = '';

  // États du clavier
  keyStates: { [key: string]: string } = {};

  // Authentification et modal
  isAuthenticated = false;
  showLoginModal = false;
  loginEmail = '';
  loginPassword = '';
  loginAlias = '';
  loginError = '';
  loginLoading = false;

  // Système de score avancé
  sessionStats: SessionStats = {
    totalScore: 0,
    wordsFound: 0,
    averageScore: 0,
    currentStreak: 0,
    bestStreak: 0,
    perfectWords: 0
  };

  // Historique et bonus
  private perfectWordStreak = 0;
  private sessionStartTime = Date.now();
  private wordStartTime = Date.now();
  wordsHistory: WordResult[] = [];

  // Scores
  activeScoreTab = 'session';
  topScores: Array<{
    playerAlias: string;
    totalScore: number;
    wordsFound: number;
    bestStreak: number;
    date: string;
  }> = [];

  // ✅ Nouvelles propriétés pour la difficulté
  currentDifficulty: 'facile' | 'moyen' | 'difficile' = 'facile';
  showDifficultySelector = false;

  constructor(
    private gameService: GameService,
    private authService: AuthService,
    private toastService: ToastService,
    public modalService: ModalService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.gameService.useLocalWordsOnly();
      this.checkAuthentication();
      
      // ✅ Charger la difficulté sauvegardée
      const savedDifficulty = localStorage.getItem('gameDifficulty') as 'facile' | 'moyen' | 'difficile';
      if (savedDifficulty) {
        this.currentDifficulty = savedDifficulty;
        if (savedDifficulty === 'difficile') {
          this.gameService.enableHardMode();
        }
      }
    }
  }

  // ✅ Méthode pour changer la difficulté
  changeDifficulty(difficulty: 'facile' | 'moyen' | 'difficile') {
    this.currentDifficulty = difficulty;
    
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('gameDifficulty', difficulty);
    }
    
    // Activer/désactiver le hard mode selon la difficulté
    if (difficulty === 'difficile') {
      this.gameService.enableHardMode();
      this.toastService.success('🔥 Mode DIFFICILE activé ! Préparez-vous à des mots complexes !', 4000);
    } else {
      this.gameService.disableHardMode();
      if (difficulty === 'moyen') {
        this.toastService.info('📚 Mode MOYEN sélectionné - Mots variés et intéressants', 3000);
      } else {
        this.toastService.info('🟢 Mode FACILE sélectionné - Mots courants et simples', 3000);
      }
    }
    
    this.showDifficultySelector = false;
    
    // Redémarrer le jeu avec la nouvelle difficulté
    if (!this.gameOver) {
      this.restartGame();
    }
  }

  // ✅ Nouvelle méthode pour tester les mots par difficulté
  previewDifficulty(difficulty: 'facile' | 'moyen' | 'difficile') {
    this.gameService.getWordsByDifficulty(difficulty, 3).subscribe({
      next: (samples) => {
        const difficultyLabels = {
          'facile': '🟢 FACILE',
          'moyen': '📚 MOYEN', 
          'difficile': '🔥 DIFFICILE'
        };
        
        this.toastService.info(
          `${difficultyLabels[difficulty]}\nExemples: ${samples.join(', ')}`,
          5000
        );
      },
      error: (err) => {
        this.toastService.error('Erreur lors du chargement des exemples', 3000);
      }
    });
  }

  // ✅ Obtenir le label de difficulté actuelle
  getDifficultyLabel(): string {
    const labels = {
      'facile': '🟢 Facile',
      'moyen': '📚 Moyen',
      'difficile': '🔥 Difficile'
    };
    return labels[this.currentDifficulty];
  }

  // ✅ Statistiques incluant le hard mode
  getGameStats() {
    const stats = this.gameService.getUsedWordsStats();
    return stats;
  }

  getCurrentPlayerAlias(): string {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('playerAlias') || 'Joueur Anonyme';
    }
    return 'Joueur Anonyme';
  }

  loadTopScores() {
    if (isPlatformBrowser(this.platformId)) {
      const history: SavedSession[] = JSON.parse(localStorage.getItem('gameHistory') || '[]');
      this.topScores = history
        .sort((a: SavedSession, b: SavedSession) => b.stats.totalScore - a.stats.totalScore)
        .slice(0, 10)
        .map((session: SavedSession) => ({
          playerAlias: session.playerAlias || 'Joueur Anonyme',
          totalScore: session.stats.totalScore,
          wordsFound: session.stats.wordsFound,
          bestStreak: session.stats.bestStreak,
          date: new Date(session.date).toLocaleDateString('fr-FR')
        }));
    }
  }

  private checkAuthentication() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      this.isAuthenticated = true;
      this.showLoginModal = false;
      this.loadSession();
      this.loadNewWord();
    } else {
      this.isAuthenticated = false;
      this.showLoginModal = false;
      this.isLoading = false;
    }
  }

  private loadSession() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const savedSession = localStorage.getItem('currentSession');
    if (savedSession) {
      try {
        const sessionData = JSON.parse(savedSession);
        this.sessionStats = sessionData.stats || this.sessionStats;
        this.wordsHistory = sessionData.history || [];
        console.log('Session restaurée:', this.sessionStats);
      } catch (e) {
        console.warn('Erreur lors du chargement de la session:', e);
      }
    }
  }

  showLogin() {
    this.showLoginModal = true;
  }

  onLogin() {
    if (!this.loginEmail || !this.loginPassword || !this.loginAlias) {
      this.loginError = 'Veuillez remplir tous les champs';
      return;
    }

    this.loginLoading = true;
    this.loginError = '';

    this.authService.login(this.loginEmail, this.loginPassword).subscribe({
      next: (response) => {
        console.log('Connexion réussie:', response);
        this.isAuthenticated = true;
        this.showLoginModal = false;
        this.loginLoading = false;
        
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('playerAlias', this.loginAlias);
        }
        
        this.resetSession();
        this.loadNewWord();
        
        this.toastService.success(`Bienvenue ${this.loginAlias} ! 🎯`, 4000);
      },
      error: (error) => {
        console.error('Erreur de connexion:', error);
        this.loginError = error.error?.message || 'Erreur de connexion';
        this.loginLoading = false;
        this.toastService.error('Erreur de connexion', 4000);
      }
    });
  }

  useTestAccount() {
    this.loginEmail = 'jeremy@test.com';
    this.loginPassword = 'Test123';
    this.loginAlias = 'Jeremy Test';
  }

  logout() {
    if (this.sessionStats.wordsFound > 0) {
      this.endGameSession(false);
    }
    
    this.authService.logout();
    this.isAuthenticated = false;
    this.showLoginModal = false;
    this.resetSession();
    this.toastService.info('Déconnecté avec succès', 3000);
  }

  private calculateWordScore(attempts: number): WordResult {
    const baseScore = 100;
    const penalty = (attempts - 1) * 15;
    let wordScore = Math.max(baseScore - penalty, 10);
    
    const isPerfect = attempts === 1;
    let bonusPoints = 0;

    if (isPerfect) {
      this.perfectWordStreak++;
      
      if (this.perfectWordStreak >= 3) {
        bonusPoints += 10;
      }
      
      const timeBonus = this.calculateTimeBonus();
      bonusPoints += timeBonus;
      
    } else {
      this.perfectWordStreak = 0;
    }

    return {
      wordScore: wordScore + bonusPoints,
      attempts,
      isPerfect,
      bonusPoints
    };
  }

  private calculateTimeBonus(): number {
    const elapsedTime = (Date.now() - this.wordStartTime) / 1000;
    if (elapsedTime < 15) return 20;
    if (elapsedTime < 30) return 10;
    return 0;
  }

  private updateSessionStats(wordResult: WordResult) {
    this.sessionStats.wordsFound++;
    this.sessionStats.totalScore += wordResult.wordScore;
    this.sessionStats.averageScore = Math.round(this.sessionStats.totalScore / this.sessionStats.wordsFound);
    
    if (wordResult.isPerfect) {
      this.sessionStats.perfectWords++;
      this.sessionStats.currentStreak++;
      if (this.sessionStats.currentStreak > this.sessionStats.bestStreak) {
        this.sessionStats.bestStreak = this.sessionStats.currentStreak;
      }
    } else {
      this.sessionStats.currentStreak = 0;
    }

    this.wordsHistory.push(wordResult);
    this.autoSaveProgress();
  }

  private autoSaveProgress() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const sessionData = {
      stats: this.sessionStats,
      history: this.wordsHistory,
      timestamp: Date.now(),
      playerAlias: localStorage.getItem('playerAlias')
    };
    
    localStorage.setItem('currentSession', JSON.stringify(sessionData));
  }

  private saveSessionToHistory() {
    if (!isPlatformBrowser(this.platformId) || this.sessionStats.wordsFound === 0) return;
    
    const historyKey = 'gameHistory';
    const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
    
    const sessionRecord = {
      id: Date.now(),
      date: new Date().toISOString(),
      playerAlias: localStorage.getItem('playerAlias') || 'Joueur Anonyme',
      stats: { ...this.sessionStats },
      wordsHistory: [...this.wordsHistory],
      duration: Date.now() - this.sessionStartTime
    };
    
    existingHistory.push(sessionRecord);
    existingHistory.sort((a: SavedSession, b: SavedSession) => b.stats.totalScore - a.stats.totalScore);
    
    if (existingHistory.length > 50) {
      existingHistory.splice(50);
    }
    
    localStorage.setItem(historyKey, JSON.stringify(existingHistory));
    
    this.toastService.success(
      `Session sauvegardée ! ${this.sessionStats.totalScore} points avec ${this.sessionStats.wordsFound} mots trouvés.`,
      5000
    );
  }

  private resetSession() {
    this.sessionStats = {
      totalScore: 0,
      wordsFound: 0,
      averageScore: 0,
      currentStreak: 0,
      bestStreak: 0,
      perfectWords: 0
    };
    this.wordsHistory = [];
    this.perfectWordStreak = 0;
    this.sessionStartTime = Date.now();
    
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('currentSession');
    }
  }

  private initializeGrid() {
    this.grid = [];
    for (let i = 0; i < 6; i++) {
      const row: Cell[] = [];
      for (let j = 0; j < this.wordLength; j++) {
        row.push({
          letter: i === 0 && j === 0 ? this.hint : '',
          state: i === 0 && j === 0 ? 'hint' : 'empty'
        });
      }
      this.grid.push(row);
    }
  }

  // ✅ Modifier loadNewWord pour utiliser la difficulté
  private loadNewWord() {
    this.isLoading = true;
    this.errorMessage = '';
    this.wordStartTime = Date.now();
    
    // ✅ Utiliser la difficulté sélectionnée
    this.gameService.getRandomWord(this.currentDifficulty).subscribe({
      next: (response) => {
        console.log('Response from server:', response);
        if (response && response.gameId) {
          this.gameId = response.gameId;
          this.remainingAttempts = response.remainingAttempts;
          this.hint = response.hint;
          this.wordLength = response.length;
          this.targetWord = 'X'.repeat(response.length);
          
          this.initializeGrid();
          this.isLoading = false;
          
          // ✅ Message informatif selon la difficulté
          if (this.currentDifficulty === 'difficile') {
            this.toastService.info(`🔥 Nouveau mot DIFFICILE de ${this.wordLength} lettres !`, 3000);
          }
        } else {
          console.error('Invalid response format:', response);
          this.errorMessage = 'Format de réponse invalide';
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error details:', error);
        this.errorMessage = `Erreur de chargement du mot: ${error.message || 'Erreur inconnue'}`;
        this.isLoading = false;
        
        if (error.message === 'Non authentifié') {
          this.isAuthenticated = false;
          this.showLoginModal = true;
        }
        
        this.toastService.error(`Erreur: ${error.message || 'Erreur inconnue'}`, 4000);
      }
    });
  }

  handleKeyPress(key: string) {
    if (this.isLoading || this.gameOver) return;
    
    if (key === 'ENTER') {
      this.checkWord();
    } else if (key === 'DEL') {
      this.deleteLetter();
    } else if (this.currentCol < this.wordLength) {
      this.grid[this.currentRow][this.currentCol].letter = key;
      this.currentCol++;
    }
  }

  private updateKeyStates(guess: string, result: string[]) {
    for (let i = 0; i < guess.length; i++) {
      const key = guess[i];
      const state = result[i];
      if (this.keyStates[key] !== 'correct') {
        this.keyStates[key] = state;
      }
    }
  }

  private checkWord() {
    if (this.currentCol !== this.wordLength || !this.gameId) return;

    const guess = this.grid[this.currentRow].map(cell => cell.letter).join('');
    const attemptNumber = this.currentRow + 1;
    
    this.gameService.submitGuess(guess, this.gameId, attemptNumber).subscribe({
      next: (response) => {
        for (let i = 0; i < guess.length; i++) {
          this.grid[this.currentRow][i].state = response.result[i].status;
        }
        
        this.updateKeyStates(guess, response.result.map(r => 
          r.status === 'absent' ? 'incorrect' : r.status
        ));

        if (response.won) {

          this.wordFound = true;

          const wordResult = this.calculateWordScore(attemptNumber);
          this.updateSessionStats(wordResult);
          
          this.gameOver = true;
          this.targetWord = response.targetWord || guess;
          
          setTimeout(() => {
            let message = `🎉 Mot trouvé en ${attemptNumber} essai${attemptNumber > 1 ? 's' : ''} !`;
            message += `\nScore: ${wordResult.wordScore} points`;
            if (wordResult.bonusPoints > 0) {
              message += ` (bonus: +${wordResult.bonusPoints})`;
            }
            message += `\nScore total: ${this.sessionStats.totalScore} points`;
            
            this.toastService.success(message, 6000);
          }, 1000);
          
        } else if (response.gameOver || this.currentRow >= 5) {

          this.wordFound = false;

          this.gameOver = true;
          this.targetWord = response.targetWord || 'MAISON';
          
          this.sessionStats.currentStreak = 0;
          this.perfectWordStreak = 0;

          // ✅ Messages d'échec variés et dynamiques
          setTimeout(() => {
            const failureMessages = [
              `😞 Pas cette fois ! Le mot était : ${this.targetWord}`,
              `🤔 Presque ! La réponse était : ${this.targetWord}`,
              `💪 Continuez ! Le mot mystère était : ${this.targetWord}`,
              `🎯 Raté ! Mais le mot était : ${this.targetWord}`
            ];
            
            const randomMessage = failureMessages[Math.floor(Math.random() * failureMessages.length)];
            
            let failureMessage = randomMessage;
            failureMessage += `\n📊 Score actuel : ${this.sessionStats.totalScore} points`;
            failureMessage += `\n🏆 Mots trouvés : ${this.sessionStats.wordsFound}`;
            
            // ✅ Message spécial selon la difficulté
            if (this.currentDifficulty === 'difficile') {
              failureMessage += `\n🔥 Mot niveau DIFFICILE - Bien tenté !`;
            }
            
            this.toastService.error(failureMessage, 6000);
          }, 1000);
          
        } else {
          this.currentRow++;
          this.currentCol = 0;
          this.remainingAttempts = response.remainingAttempts || this.remainingAttempts - 1;
        }
      },
      error: (error) => {
        console.error('Error checking word:', error);
        this.errorMessage = 'Erreur lors de la vérification du mot';
        
        if (error.message === 'Non authentifié') {
          this.isAuthenticated = false;
          this.showLoginModal = true;
        }

        this.toastService.error('Erreur lors de la vérification du mot', 4000);
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
    this.wordFound = false;
    this.currentRow = 0;
    this.currentCol = 0;
    this.keyStates = {};
    this.loadNewWord();
  }

  // ✅ Méthode changer alias avec modal
  async changeAlias() {
    const newAlias = await this.modalService.showInput(
      'Changer de pseudo',
      'Entrez votre nouveau pseudo de jeu :',
      'Nouveau pseudo...',
      this.getCurrentPlayerAlias(),
      'Modifier'
    );
    
    if (newAlias && newAlias.trim() !== this.getCurrentPlayerAlias()) {
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('playerAlias', newAlias.trim());
      }
      this.toastService.success(`🎯 Pseudo mis à jour: ${newAlias.trim()} !`, 3000);
    }
  }

  // ✅ Méthode terminer session avec modal
  async endGameSession(showConfirm: boolean = true) {
    if (showConfirm) {
      const confirmed = await this.modalService.showConfirm(
        'Terminer la session',
        `Êtes-vous sûr de vouloir terminer la session avec ${this.sessionStats.wordsFound} mots trouvés et ${this.sessionStats.totalScore} points ?`,
        'Terminer'
      );
      
      if (!confirmed) {
        return;
      }
    }

    this.saveSessionToHistory();
    
    console.log(`🎉 Session terminée !\n\nScore final: ${this.sessionStats.totalScore} points\nMots trouvés: ${this.sessionStats.wordsFound}\nMeilleure série: ${this.sessionStats.bestStreak}`);
    
    this.toastService.success(`🎉 Session terminée ! Score: ${this.sessionStats.totalScore} points`, 4000);
    
    this.resetSession();
    this.loadNewWord();
  }
}
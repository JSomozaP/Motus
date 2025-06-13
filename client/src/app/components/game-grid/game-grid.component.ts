import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KeyboardComponent } from '../keyboard/keyboard.component';
import { ToastComponent } from '../toast/toast.component'; // ✅ Import ajouté
import { GameService } from '../../services/game.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

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
  perfectWords: number; // Mots trouvés au 1er essai
}

interface WordResult {
  wordScore: number;
  attempts: number;
  isPerfect: boolean;
  bonusPoints: number;
}

// ✅ Interface pour les sessions sauvegardées
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
  imports: [CommonModule, FormsModule, KeyboardComponent, ToastComponent]
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
  
  // Propriétés API
  gameId?: number;
  remainingAttempts = 6;
  hint = '';

  // États du clavier
  keyStates: { [key: string]: string } = {};

  // ✅ Authentification et modal
  isAuthenticated = false;
  showLoginModal = false;
  loginEmail = '';
  loginPassword = '';
  loginAlias = '';
  loginError = '';
  loginLoading = false;

  // ✅ Système de score avancé
  sessionStats: SessionStats = {
    totalScore: 0,
    wordsFound: 0,
    averageScore: 0,
    currentStreak: 0,
    bestStreak: 0,
    perfectWords: 0
  };

  // ✅ Historique et bonus
  private perfectWordStreak = 0; // Série de mots parfaits consécutifs
  private sessionStartTime = Date.now();
  private wordStartTime = Date.now();
  wordsHistory: WordResult[] = []; 

  // ✅ Nouvelles propriétés pour les scores
  activeScoreTab = 'session';
  topScores: Array<{
    playerAlias: string;
    totalScore: number;
    wordsFound: number;
    bestStreak: number;
    date: string;
  }> = [];

  constructor(
    private gameService: GameService,
    private authService: AuthService,
    private toastService: ToastService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // ✅ Activer l'API trouve-mot.fr pour les mots français
      this.gameService.useLocalWordsOnly();
      this.checkAuthentication();
    }
  }

  // ✅ Nouvelles méthodes pour l'interface
  getCurrentPlayerAlias(): string {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('playerAlias') || 'Joueur Anonyme';
    }
    return 'Joueur Anonyme';
  }

  loadTopScores() {
    // Charger depuis localStorage
    if (isPlatformBrowser(this.platformId)) {
      const history: SavedSession[] = JSON.parse(localStorage.getItem('gameHistory') || '[]');
      this.topScores = history
        .sort((a: SavedSession, b: SavedSession) => b.stats.totalScore - a.stats.totalScore) // ✅ Types explicites
        .slice(0, 10) // Top 10
        .map((session: SavedSession) => ({ // ✅ Type explicite
          playerAlias: session.playerAlias || 'Joueur Anonyme',
          totalScore: session.stats.totalScore,
          wordsFound: session.stats.wordsFound,
          bestStreak: session.stats.bestStreak,
          date: new Date(session.date).toLocaleDateString('fr-FR')
        }));
    }
  }

  // ✅ Vérifier l'authentification
  private checkAuthentication() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      this.isAuthenticated = true;
      this.showLoginModal = false;
      this.loadSession(); // Charger session sauvegardée
      this.loadNewWord();
    } else {
      this.isAuthenticated = false;
      this.showLoginModal = false;
      this.isLoading = false;
    }
  }

  // ✅ Charger une session existante
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

  // ✅ Afficher le modal de connexion
  showLogin() {
    this.showLoginModal = true;
  }

  // ✅ Gérer la connexion avec alias
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
        
        // ✅ Sauvegarder l'alias
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('playerAlias', this.loginAlias);
        }
        
        this.resetSession();
        this.loadNewWord();
        
        // ✅ Message de bienvenue avec toast
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

  // ✅ Utiliser le compte de test
  useTestAccount() {
    this.loginEmail = 'jeremy@test.com';
    this.loginPassword = 'Test123';
    this.loginAlias = 'Jeremy Test';
  }

  // ✅ Déconnexion
  logout() {
    if (this.sessionStats.wordsFound > 0) {
      // Sauvegarder automatiquement avant de se déconnecter
      this.endGameSession(false);
    }
    
    this.authService.logout();
    this.isAuthenticated = false;
    this.showLoginModal = false;
    this.resetSession();
    this.toastService.info('Déconnecté avec succès', 3000);
  }

  // ✅ Système de calcul de score
  private calculateWordScore(attempts: number): WordResult {
    const baseScore = 100;
    const penalty = (attempts - 1) * 15;
    let wordScore = Math.max(baseScore - penalty, 10);
    
    const isPerfect = attempts === 1;
    let bonusPoints = 0;

    // ✅ Bonus pour mot parfait
    if (isPerfect) {
      this.perfectWordStreak++;
      
      // ✅ Combo bonus : +10 points si 3 mots parfaits consécutifs
      if (this.perfectWordStreak >= 3) {
        bonusPoints += 10;
      }
      
      // ✅ Bonus de rapidité (si trouvé en moins de 30 secondes)
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
    if (elapsedTime < 15) return 20; // Super rapide : 20 bonus
    if (elapsedTime < 30) return 10; // Rapide : 10 bonus
    return 0; // Pas de bonus
  }

  // ✅ Mettre à jour les statistiques
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

    // Ajouter à l'historique
    this.wordsHistory.push(wordResult);

    // ✅ Auto-save à chaque mot
    this.autoSaveProgress();
  }

  // ✅ Sauvegarde automatique
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

  // ✅ Fin de session manuelle
  endGameSession(showConfirm: boolean = true) {
    if (showConfirm && !confirm(`Terminer la session avec ${this.sessionStats.wordsFound} mots trouvés et ${this.sessionStats.totalScore} points ?`)) {
      return;
    }

    // ✅ Sauvegarder le score final
    this.saveSessionToHistory();
    
    // ✅ Message de fin avec toast (à remplacer)
    console.log(`🎉 Session terminée !\n\nScore final: ${this.sessionStats.totalScore} points\nMots trouvés: ${this.sessionStats.wordsFound}\nMeilleure série: ${this.sessionStats.bestStreak}`);
    
    // ✅ Réinitialiser pour une nouvelle session
    this.resetSession();
    
    // Recharger un nouveau mot
    this.loadNewWord();
  }

  // ✅ Sauvegarder dans l'historique
  private saveSessionToHistory() {
    if (!isPlatformBrowser(this.platformId) || this.sessionStats.wordsFound === 0) return;
    
    const historyKey = 'gameHistory';
    const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
    
    const sessionRecord = {
      id: Date.now(), // ID unique
      date: new Date().toISOString(),
      playerAlias: localStorage.getItem('playerAlias') || 'Joueur Anonyme',
      stats: { ...this.sessionStats },
      wordsHistory: [...this.wordsHistory],
      duration: Date.now() - this.sessionStartTime
    };
    
    existingHistory.push(sessionRecord);
    
    // Trier par score décroissant
    existingHistory.sort((a: SavedSession, b: SavedSession) => b.stats.totalScore - a.stats.totalScore);
    
    // Garder les 50 meilleurs
    if (existingHistory.length > 50) {
      existingHistory.splice(50);
    }
    
    localStorage.setItem(historyKey, JSON.stringify(existingHistory));
    
     // ✅ Message de sauvegarde avec toast
    this.toastService.success(
      `Session sauvegardée ! ${this.sessionStats.totalScore} points avec ${this.sessionStats.wordsFound} mots trouvés.`,
      5000
    );
  }

  // ✅ Réinitialiser la session
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

  private loadNewWord() {
    this.isLoading = true;
    this.errorMessage = '';
    this.wordStartTime = Date.now(); // ✅ Démarrer le chrono pour ce mot
    
    this.gameService.getRandomWord('facile').subscribe({
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
          // ✅ Mot trouvé : calculer et appliquer le score
          const wordResult = this.calculateWordScore(attemptNumber);
          this.updateSessionStats(wordResult);
          
          this.gameOver = true;
          this.targetWord = response.targetWord || guess;
          
          // ✅ Message avec détails du score via toast
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
          this.gameOver = true;
          this.targetWord = response.targetWord || 'MAISON';
          
          // ✅ Mot raté : casser la série
          this.sessionStats.currentStreak = 0;
          this.perfectWordStreak = 0;
          
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
    this.currentRow = 0;
    this.currentCol = 0;
    this.keyStates = {};
    this.loadNewWord();
  }

  // ✅ Changer l'alias en cours de partie
  changeAlias() {
    const currentAlias = this.getCurrentPlayerAlias();
    const newAlias = prompt('Nouveau pseudo de jeu:', currentAlias);
    if (newAlias && newAlias.trim() && newAlias.trim() !== currentAlias) {
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('playerAlias', newAlias.trim());
      }
      console.log(`Pseudo mis à jour: ${newAlias.trim()} ! 🎯`); // À remplacer par toast
    }
  }
}
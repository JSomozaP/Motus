import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService } from '../../services/game.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { ModalService } from '../../services/modal.service';
import { TrouveMotService } from '../../services/trouve-mot.service';
import { KeyboardComponent } from '../keyboard/keyboard.component';
import { ToastComponent } from '../toast/toast.component';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'app-game-grid',
  templateUrl: './game-grid.component.html',
  styleUrls: ['./game-grid.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, KeyboardComponent, ToastComponent, ModalComponent]
})
export class GameGridComponent implements OnInit {
  // ✅ Propriétés de base du jeu
  grid: Array<Array<{letter: string, state: string}>> = [];
  currentRow = 0;
  currentCol = 0;
  wordLength = 5;
  gameId: number | null = null;
  hint = '';
  targetWord = '';
  remainingAttempts = 6;
  isLoading = false;
  gameOver = false;
  wordFound = false;
  errorMessage = '';
  
  // ✅ Authentification
  isAuthenticated = false;
  showLoginModal = false;
  loginAlias = '';
  loginEmail = '';
  loginPassword = '';
  loginError = '';
  loginLoading = false;

  // ✅ États du clavier
  keyStates: { [key: string]: string } = {};

  // ✅ Statistiques de session (UNE SEULE DÉCLARATION)
  sessionStats = {
    totalScore: 0,
    wordsFound: 0,
    averageScore: 0,
    currentStreak: 0,
    bestStreak: 0,
    perfectWords: 0
  };

  // ✅ Historique (UNE SEULE DÉCLARATION)
  wordsHistory: Array<{
    attempts: number;
    wordScore: number;
    bonusPoints: number;
    isPerfect: boolean;
  }> = [];

  // ✅ Variables de timing (UNE SEULE DÉCLARATION)
  perfectWordStreak = 0;
  wordStartTime = Date.now();

  // ✅ Scores
  activeScoreTab = 'session';
  topScores: Array<{
    playerAlias: string;
    totalScore: number;
    wordsFound: number;
    bestStreak: number;
    date: string;
  }> = [];

  // ✅ Difficulté avec Cauchemar
  currentDifficulty: 'facile' | 'moyen' | 'difficile' | 'cauchemar' = 'facile';
  showDifficultySelector = false;

  constructor(
    private gameService: GameService,
    private authService: AuthService,
    private toastService: ToastService,
    public modalService: ModalService,
    private trouveMotService: TrouveMotService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.gameService.useLocalWordsOnly();
      this.checkAuthentication();
      
      // Charger la difficulté sauvegardée
      const savedDifficulty = localStorage.getItem('gameDifficulty') as 'facile' | 'moyen' | 'difficile' | 'cauchemar';
      if (savedDifficulty) {
        this.currentDifficulty = savedDifficulty;
        this.setupDifficultySources();
      }

      // Charger les stats sauvegardées
      this.loadSavedStats();
    }
  }

  // ✅ MÉTHODES D'AUTHENTIFICATION
  checkAuthentication() {
    this.gameService.setDevelopmentMode(true); // ✅ Ne pas assigner le retour (void)
    this.isAuthenticated = true; // ✅ Définir manuellement l'authentification
    if (this.isAuthenticated) {
      this.loadNewWord();
    }
  }

  showLogin() {
    this.showLoginModal = true;
    this.loginError = '';
  }

  onLogin() {
    if (!this.loginAlias || !this.loginEmail) {
      this.loginError = 'Veuillez remplir tous les champs';
      return;
    }

    this.loginLoading = true;
    this.loginError = '';

    // Simulation de connexion réussie
    setTimeout(() => {
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('playerAlias', this.loginAlias);
        localStorage.setItem('gameAlias', this.loginAlias);
        localStorage.setItem('token', 'dev-token-' + Date.now());
      }
      
      this.isAuthenticated = true;
      this.showLoginModal = false;
      this.loginLoading = false;
      
      this.toastService.success(`Bienvenue ${this.loginAlias} ! 🎮`, 3000);
      this.loadNewWord();
    }, 1000);
  }

  useTestAccount() {
    this.loginAlias = 'Testeur';
    this.loginEmail = 'test@motus.com';
    this.loginPassword = 'password';
    this.onLogin();
  }

  // ✅ MÉTHODES DE DIFFICULTÉ
  private setupDifficultySources() {
    if (this.currentDifficulty === 'cauchemar') {
      this.gameService.enableHardMode();
    } else {
      this.gameService.disableHardMode();
    }
  }

  getDifficultyLabel(): string {
    const labels = {
      'facile': '🟢 Facile',
      'moyen': '📚 Moyen',
      'difficile': '🔥 Difficile',
      'cauchemar': '💀 Cauchemar'
    };
    return labels[this.currentDifficulty];
  }

  changeDifficulty(difficulty: 'facile' | 'moyen' | 'difficile' | 'cauchemar') {
    this.currentDifficulty = difficulty;
    
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('gameDifficulty', difficulty);
    }
    
    // Messages par difficulté
    const messages = {
      'facile': '🟢 Mode FACILE - Mots courants',
      'moyen': '📚 Mode MOYEN - Mots variés',
      'difficile': '🔥 Mode DIFFICILE - Mots via API',
      'cauchemar': '💀 Mode CAUCHEMAR - Mots ultra-complexes !'
    };
    
    this.toastService.info(messages[difficulty], 3000);
    this.setupDifficultySources();
    this.showDifficultySelector = false;
    
    if (!this.gameOver) {
      this.restartGame();
    }
  }

  previewDifficulty(difficulty: 'facile' | 'moyen' | 'difficile' | 'cauchemar') {
    if (difficulty === 'difficile') {
      this.trouveMotService.testConnection().subscribe({
        next: (isAvailable) => {
          if (isAvailable) {
            this.trouveMotService.getSampleWords('difficile', 3).subscribe({
              next: (samples) => {
                this.toastService.info(`🔥 DIFFICILE\nExemples: ${samples.join(', ')}`, 4000);
              },
              error: () => {
                this.toastService.warning('🔥 DIFFICILE - API indisponible', 3000);
              }
            });
          } else {
            this.toastService.warning('🔥 DIFFICILE - Mode hors ligne', 3000);
          }
        }
      });
    } else {
      this.gameService.getWordsByDifficulty(difficulty, 3).subscribe({
        next: (samples) => {
          const labels = {
            'facile': '🟢 FACILE',
            'moyen': '📚 MOYEN',
            'cauchemar': '💀 CAUCHEMAR'
          };
          this.toastService.info(`${labels[difficulty]}\nExemples: ${samples.join(', ')}`, 4000);
        }
      });
    }
  }

  // ✅ MÉTHODES DE JEU
  private loadNewWord() {
    this.isLoading = true;
    this.errorMessage = '';
    this.wordStartTime = Date.now();
    
    if (this.currentDifficulty === 'difficile') {
      this.loadWordFromDatamuse();
      return;
    }
    
    this.gameService.getRandomWord(this.currentDifficulty).subscribe({
      next: (response) => {
        if (response && response.gameId) {
          this.gameId = response.gameId;
          this.remainingAttempts = response.remainingAttempts;
          this.hint = response.hint;
          this.wordLength = response.length;
          this.targetWord = 'X'.repeat(response.length);
          
          this.initializeGrid();
          this.isLoading = false;
        }
      },
      error: (error) => {
        this.errorMessage = `Erreur: ${error.message}`;
        this.isLoading = false;
        this.toastService.error(this.errorMessage, 4000);
      }
    });
  }

  private loadWordFromDatamuse() {
    this.loadWordFromTrouveMot();
  }

  private loadWordFromTrouveMot() {
    console.log('🔥 Tentative de chargement via API trouve-mot.fr...');
    
    // Tester directement l'API
    this.trouveMotService.getRandomWord().subscribe({
      next: (word) => {
        if (word && word.length >= 3) {
          const randomWord = word.toUpperCase();
          
          this.gameId = Date.now();
          this.remainingAttempts = 6;
          this.hint = randomWord.charAt(0);
          this.wordLength = randomWord.length;
          this.targetWord = randomWord;
          
          this.initializeGrid();
          this.isLoading = false;
          
          this.toastService.success(`🔥 Mot DIFFICILE chargé via API ! (${randomWord.length} lettres)`, 3000);
          console.log('✅ Mot difficile chargé via API trouve-mot.fr:', randomWord);
        } else {
          console.warn('⚠️ Mot invalide reçu de l\'API, fallback vers alternative');
          this.tryAlternativeAPI();
        }
      },
      error: (error) => {
        console.error('❌ Erreur API trouve-mot.fr:', error);
        console.log('🔄 Fallback vers mots locaux...');
        this.tryAlternativeAPI();
      }
    });
  }

  private tryAlternativeAPI() {
    // Essayer la méthode alternative avec mots locaux difficiles
    this.trouveMotService.getWordsByLengthAlternative(5).subscribe({
      next: (words) => {
        if (words.length > 0) {
          const randomWord = words[Math.floor(Math.random() * words.length)].toUpperCase();
          
          this.gameId = Date.now();
          this.remainingAttempts = 6;
          this.hint = randomWord.charAt(0);
          this.wordLength = randomWord.length;
          this.targetWord = randomWord;
          
          this.initializeGrid();
          this.isLoading = false;
          
          this.toastService.success(`🔥 Mot DIFFICILE (local) chargé ! (${randomWord.length} lettres)`, 3000);
          console.log('🔥 Mot difficile chargé via liste locale:', randomWord);
        } else {
          this.fallbackToLocalWords();
        }
      },
      error: () => {
        this.fallbackToLocalWords();
      }
    });
  }

  private fallbackToLocalWords() {
    this.toastService.warning('🔄 Fallback vers mots locaux normaux', 3000);
    this.currentDifficulty = 'moyen';
    this.loadNewWord();
  }

  private initializeGrid() {
    console.log('🏗️ Initialisation grille:', { wordLength: this.wordLength, hint: this.hint });
    
    this.grid = [];
    this.currentRow = 0;
    this.currentCol = 0;
    this.gameOver = false;
    this.wordFound = false;
    this.keyStates = {}; // ✅ Reset du clavier
    
    // Créer la grille 6x[wordLength]
    for (let i = 0; i < 6; i++) {
      const row = [];
      for (let j = 0; j < this.wordLength; j++) {
        row.push({
          letter: (i === 0 && j === 0 && this.hint) ? this.hint : '',
          state: (i === 0 && j === 0 && this.hint) ? 'hint' : 'empty'
        });
      }
      this.grid.push(row);
    }
    
    // ✅ Démarrer à la bonne position
    if (this.hint) {
      this.currentCol = 1; // Commencer après le hint
      this.keyStates[this.hint] = 'hint'; // Marquer la lettre hint
    } else {
      this.currentCol = 0;
    }
    
    console.log('✅ Grille initialisée:', this.grid);
  }

  // ✅ GESTION DU CLAVIER
  handleKeyPress(key: string) {
    if (this.isLoading || this.gameOver) return;

    console.log('🎹 Touche pressée:', key); // ✅ Debug pour voir quelle valeur arrive

    if (key === 'ENTER') {
      this.checkWord();
    } else if (key === 'BACKSPACE' || key === 'DEL' || key === 'DELETE' || key === '⌫') {
      // ✅ Gérer toutes les variantes possibles du bouton supprimer
      this.deleteLetter();
    } else if (key.length === 1 && /[A-Z]/.test(key)) {
      this.addLetter(key);
    } else {
      console.warn('⚠️ Touche non reconnue:', key);
    }
  }

  // ✅ CORRECTION DE L'AJOUT DE LETTRES
  private addLetter(letter: string) {
    if (this.currentCol < this.wordLength && this.currentRow < 6) {
      console.log('📝 Ajout lettre:', { letter, row: this.currentRow, col: this.currentCol });
      
      this.grid[this.currentRow][this.currentCol].letter = letter;
      this.grid[this.currentRow][this.currentCol].state = 'filled'; // ✅ État pour lettre saisie
      this.currentCol++;
    }
  }

  // ✅ CORRECTION DE LA SUPPRESSION DE LETTRES
  private deleteLetter() {
    if (this.currentCol > 0) {
      // ✅ Ne pas effacer la lettre hint sur la première ligne
      if (this.currentRow === 0 && this.currentCol === 1 && this.hint) {
        return;
      }
      
      this.currentCol--;
      this.grid[this.currentRow][this.currentCol].letter = '';
      this.grid[this.currentRow][this.currentCol].state = 'empty';
      
      console.log('🗑️ Lettre supprimée:', { row: this.currentRow, col: this.currentCol });
    }
  }

  private checkWord() {
    if (this.currentCol !== this.wordLength || !this.gameId) {
      console.warn('⚠️ Mot incomplet ou pas de gameId', { currentCol: this.currentCol, wordLength: this.wordLength, gameId: this.gameId });
      return;
    }

    const guess = this.grid[this.currentRow].map(cell => cell.letter).join('');
    const attemptNumber = this.currentRow + 1;
    
    console.log('✅ Vérification mot:', { guess, attemptNumber, difficulty: this.currentDifficulty });
    
    if (this.currentDifficulty === 'difficile') {
      this.checkWordLocally(guess, attemptNumber);
    } else {
      // ✅ Vérification via GameService pour les autres difficultés
      this.gameService.submitGuess(guess, this.gameId, attemptNumber).subscribe({
        next: (response) => {
          console.log('📡 Réponse serveur:', response);
          this.handleServerResponse(response, guess, attemptNumber);
        },
        error: (error) => {
          console.error('❌ Erreur vérification serveur:', error);
          this.errorMessage = 'Erreur lors de la vérification';
          this.toastService.error(this.errorMessage, 3000);
        }
      });
    }
  }

  // ✅ NOUVELLE MÉTHODE POUR GÉRER LES RÉPONSES SERVEUR
  private handleServerResponse(response: any, guess: string, attemptNumber: number) {
    console.log('📡 Traitement réponse serveur:', response);
    
    if (response.result && Array.isArray(response.result)) {
      // ✅ Mise à jour de la grille avec la réponse serveur
      for (let i = 0; i < guess.length; i++) {
        const cell = this.grid[this.currentRow][i];
        const serverState = response.result[i].status;
        
        // Conversion des états serveur vers états CSS
        switch (serverState) {
          case 'correct':
            cell.state = 'correct';
            break;
          case 'present':
            cell.state = 'present';
            break;
          case 'absent':
            cell.state = 'incorrect';
            break;
          default:
            cell.state = 'incorrect';
        }
      }
      
      // ✅ Mise à jour du clavier
      const keyStates = response.result.map((r: any) => 
        r.status === 'absent' ? 'incorrect' : r.status
      );
      this.updateKeyStates(guess, keyStates);
    }
    
    // ✅ Traiter la réponse comme d'habitude
    this.handleWordCheckResponse(response, guess, attemptNumber);
  }

  // ✅ MÉTHODE MANQUANTE - À ajouter dans votre GameGridComponent
  private handleWordCheckResponse(response: any, guess: string, attemptNumber: number) {
    console.log('🎯 Traitement réponse:', { response, guess, attemptNumber });
    
    if (response.won) {
      // ✅ Mot trouvé !
      this.wordFound = true;
      this.gameOver = true;
      this.targetWord = response.targetWord || guess;
      
      // Calculer le score
      const wordResult = this.calculateWordScore(attemptNumber);
      this.updateSessionStats(wordResult);
      
      // Message de félicitations avec délai pour voir l'animation
      setTimeout(() => {
        const messages = [
          `🎉 Excellent ! Mot trouvé en ${attemptNumber} essai(s) !`,
          `🌟 Bravo ! ${attemptNumber === 1 ? 'Du premier coup !' : `En ${attemptNumber} tentatives !`}`,
          `🎯 Parfait ! Score: ${wordResult.wordScore} points !`
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        this.toastService.success(randomMessage, 4000);
        
        // Bonus pour les mots parfaits
        if (attemptNumber === 1) {
          setTimeout(() => {
            this.toastService.success('💎 PARFAIT ! Bonus de 100 points !', 3000);
          }, 1500);
        }
      }, 1000);
      
    } else if (response.gameOver || this.currentRow >= 5) {
      // ✅ Jeu terminé - mot non trouvé
      this.wordFound = false;
      this.gameOver = true;
      this.targetWord = response.targetWord || this.targetWord;
      
      // Réinitialiser les streaks
      this.sessionStats.currentStreak = 0;
      this.perfectWordStreak = 0;
      
      // Message d'échec avec le mot correct
      setTimeout(() => {
        const failureMessages = [
          `😞 Dommage ! Le mot était : ${this.targetWord}`,
          `🤔 Pas cette fois ! La réponse était : ${this.targetWord}`,
          `💪 Presque ! Le mot recherché était : ${this.targetWord}`
        ];
        
        const randomMessage = failureMessages[Math.floor(Math.random() * failureMessages.length)];
        this.toastService.error(randomMessage, 5000);
      }, 1000);
      
    } else {
      // ✅ Continuer le jeu - passer à la ligne suivante
      this.currentRow++;
      this.currentCol = 0;
      this.remainingAttempts = response.remainingAttempts || (this.remainingAttempts - 1);
      
      // Si on a un hint sur la ligne suivante, commencer à la colonne 1
      if (this.hint && this.currentRow < 6) {
        this.grid[this.currentRow][0].letter = this.hint;
        this.grid[this.currentRow][0].state = 'hint';
        this.currentCol = 1;
      }
      
      // Message d'encouragement selon le nombre de tentatives restantes
      const remainingAttempts = 6 - this.currentRow;
      if (remainingAttempts === 2) {
        this.toastService.warning('⚠️ Plus que 2 tentatives !', 2000);
      } else if (remainingAttempts === 1) {
        this.toastService.warning('🚨 Dernière chance !', 2000);
      }
    }
    
    console.log('✅ État du jeu mis à jour:', {
      gameOver: this.gameOver,
      wordFound: this.wordFound,
      currentRow: this.currentRow,
      remainingAttempts: this.remainingAttempts
    });
  }

  // ✅ MÉTHODE POUR CALCULER LE SCORE (si elle n'existe pas déjà)
  private calculateWordScore(attempts: number): {
    wordScore: number;
    bonusPoints: number;
    totalScore: number;
    isPerfect: boolean;
  } {
    // Score de base décroissant selon le nombre de tentatives
    const baseScore = Math.max(100 - (attempts - 1) * 15, 10);
    let bonusPoints = 0;
    let isPerfect = false;

    // ✅ Bonus selon le nombre de tentatives
    if (attempts === 1) {
      bonusPoints += 100; // Parfait !
      isPerfect = true;
    } else if (attempts === 2) {
      bonusPoints += 50;  // Excellent
    } else if (attempts === 3) {
      bonusPoints += 25;  // Très bien
    }

    // ✅ Bonus de streak (série de victoires)
    if (this.sessionStats.currentStreak >= 3) {
      bonusPoints += this.sessionStats.currentStreak * 10;
    }

    // ✅ Multiplicateur de difficulté
    const difficultyMultipliers = {
      'facile': 1,
      'moyen': 1.2,
      'difficile': 1.5,
      'cauchemar': 2
    };
    
    const multiplier = difficultyMultipliers[this.currentDifficulty];
    const finalWordScore = Math.round((baseScore + bonusPoints) * multiplier);

    console.log('💰 Calcul score:', {
      baseScore,
      bonusPoints,
      multiplier,
      finalWordScore,
      attempts,
      difficulty: this.currentDifficulty
    });

    return {
      wordScore: finalWordScore,
      bonusPoints,
      totalScore: this.sessionStats.totalScore + finalWordScore,
      isPerfect
    };
  }

  // ✅ MISE À JOUR DES STATISTIQUES DE SESSION
  private updateSessionStats(wordResult: {
    wordScore: number;
    bonusPoints: number;
    isPerfect: boolean;
  }) {
    this.sessionStats.totalScore += wordResult.wordScore;
    this.sessionStats.wordsFound++;
    this.sessionStats.currentStreak++;
    
    // Mettre à jour le meilleur streak
    if (this.sessionStats.currentStreak > this.sessionStats.bestStreak) {
      this.sessionStats.bestStreak = this.sessionStats.currentStreak;
    }
    
    // Compter les mots parfaits
    if (wordResult.isPerfect) {
      this.sessionStats.perfectWords++;
      this.perfectWordStreak++;
    }
    
    // Calculer la moyenne
    this.sessionStats.averageScore = Math.round(
      this.sessionStats.totalScore / this.sessionStats.wordsFound
    );

    // Ajouter à l'historique
    this.wordsHistory.push({
      attempts: 6 - this.remainingAttempts + 1,
      wordScore: wordResult.wordScore,
      bonusPoints: wordResult.bonusPoints,
      isPerfect: wordResult.isPerfect
    });

    // Sauvegarder les stats
    this.saveStats();
    
    console.log('📊 Stats mises à jour:', this.sessionStats);
  }

  // ✅ MÉTHODES UTILITAIRES
  getCurrentPlayerAlias(): string {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('playerAlias') || localStorage.getItem('gameAlias') || 'Joueur';
    }
    return 'Joueur';
  }

  changeAlias() {
    this.modalService.showConfirm(
      '✏️ Changer de pseudo',
      'Quel est votre nouveau pseudo ?',
      'Confirmer'
    ).then((confirmed: boolean) => { // ✅ Utiliser .then() au lieu de .subscribe()
      if (confirmed && isPlatformBrowser(this.platformId)) {
        const newAlias = prompt('Nouveau pseudo:') || this.getCurrentPlayerAlias();
        localStorage.setItem('playerAlias', newAlias);
        this.toastService.success(`✅ Pseudo: ${newAlias}`, 2000);
      }
    }).catch((error: any) => {
      console.error('Erreur changement pseudo:', error);
    });
  }

  restartGame() {
    this.loadNewWord();
  }

  endGameSession() {
    if (this.sessionStats.wordsFound === 0) {
      this.toastService.info('Aucun mot trouvé !', 2000);
      return;
    }

    this.saveScoreToTopScores();
    this.toastService.success(`🏁 Session terminée ! Score: ${this.sessionStats.totalScore}`, 4000);
    this.resetSession();
    this.restartGame();
  }

  logout() {
    this.modalService.showConfirm(
      '🚪 Déconnexion',
      'Êtes-vous sûr ?',
      'Déconnexion'
    ).then((confirmed: boolean) => { // ✅ Utiliser .then() au lieu de .subscribe()
      if (confirmed) {
        this.isAuthenticated = false;
        this.showLoginModal = false;
        
        if (isPlatformBrowser(this.platformId)) {
          localStorage.removeItem('token');
        }
        
        this.toastService.info('👋 À bientôt !', 2000);
      }
    }).catch((error: any) => {
      console.error('Erreur déconnexion:', error);
    });
  }

  loadTopScores() {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('topScores');
      if (saved) {
        try {
          this.topScores = JSON.parse(saved);
        } catch (e) {
          this.topScores = [];
        }
      }
    }
  }

  private saveScoreToTopScores() {
    const newScore = {
      playerAlias: this.getCurrentPlayerAlias(),
      totalScore: this.sessionStats.totalScore,
      wordsFound: this.sessionStats.wordsFound,
      bestStreak: this.sessionStats.bestStreak,
      date: new Date().toLocaleDateString('fr-FR')
    };

    this.topScores.push(newScore);
    this.topScores.sort((a, b) => b.totalScore - a.totalScore);
    this.topScores = this.topScores.slice(0, 10);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('topScores', JSON.stringify(this.topScores));
    }
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
    this.saveStats();
  }

  private loadSavedStats() {
    if (isPlatformBrowser(this.platformId)) {
      const savedStats = localStorage.getItem('sessionStats');
      const savedHistory = localStorage.getItem('wordsHistory');
      
      if (savedStats) {
        try {
          this.sessionStats = JSON.parse(savedStats);
        } catch (e) {
          console.warn('Erreur chargement stats:', e);
        }
      }
      
      if (savedHistory) {
        try {
          this.wordsHistory = JSON.parse(savedHistory);
        } catch (e) {
          console.warn('Erreur chargement historique:', e);
        }
      }
    }
  }

  private saveStats() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('sessionStats', JSON.stringify(this.sessionStats));
      localStorage.setItem('wordsHistory', JSON.stringify(this.wordsHistory));
    }
  }

  // ✅ MÉTHODE MANQUANTE : checkWordLocally
  private checkWordLocally(guess: string, attemptNumber: number) {
    const target = this.targetWord;
    console.log('🔍 Vérification locale:', { guess, target, attemptNumber });
    
    // ✅ États CSS corrects pour Angular
    const result: Array<{status: 'correct' | 'present' | 'absent'}> = [];
    
    // Algorithme Motus standard
    const targetLetters = target.split('');
    const guessLetters = guess.split('');
    const targetLetterCount: {[key: string]: number} = {};
    
    // Compter les lettres du mot cible
    for (const letter of targetLetters) {
      targetLetterCount[letter] = (targetLetterCount[letter] || 0) + 1;
    }
    
    // Première passe : lettres correctes (position exacte)
    for (let i = 0; i < guessLetters.length; i++) {
      if (guessLetters[i] === targetLetters[i]) {
        result[i] = { status: 'correct' };
        targetLetterCount[guessLetters[i]]--;
      } else {
        result[i] = { status: 'absent' }; // Temporaire
      }
    }
    
    // Deuxième passe : lettres présentes (mauvaise position)
    for (let i = 0; i < guessLetters.length; i++) {
      if (result[i].status === 'absent') {
        if (targetLetterCount[guessLetters[i]] > 0) {
          result[i] = { status: 'present' };
          targetLetterCount[guessLetters[i]]--;
        }
      }
    }
    
    // ✅ MISE À JOUR DE LA GRILLE AVEC LES BONS ÉTATS CSS
    for (let i = 0; i < guess.length; i++) {
      const cell = this.grid[this.currentRow][i];
      cell.letter = guessLetters[i];
      
      // ✅ États qui correspondent au CSS
      switch (result[i].status) {
        case 'correct':
          cell.state = 'correct';  // Vert
          break;
        case 'present':
          cell.state = 'present';  // Orange/Jaune
          break;
        case 'absent':
          cell.state = 'incorrect'; // Gris
          break;
    }
  }
  
  // ✅ MISE À JOUR DU CLAVIER
  this.updateKeyStates(guess, result.map(r => {
    switch (r.status) {
      case 'correct': return 'correct';
      case 'present': return 'present';
      case 'absent': return 'incorrect';
      default: return 'incorrect';
    }
  }));

  // Vérifier si le mot est trouvé
  const won = guess === target;
  const gameOver = won || this.currentRow >= 5;
  
  console.log('🎯 Résultat validation:', { won, gameOver, result });
  
  const mockResponse = {
    won,
    gameOver,
    targetWord: gameOver ? target : undefined,
    result,
    remainingAttempts: this.remainingAttempts - 1
  };
  
  this.handleWordCheckResponse(mockResponse, guess, attemptNumber);
}

// ✅ MÉTHODE MANQUANTE : updateKeyStates
private updateKeyStates(guess: string, states: string[]) {
  for (let i = 0; i < guess.length; i++) {
    const letter = guess[i];
    const state = states[i];
    
    // ✅ Priorité des états : correct > present > incorrect
    if (state === 'correct') {
      this.keyStates[letter] = 'correct';
    } else if (state === 'present' && this.keyStates[letter] !== 'correct') {
      this.keyStates[letter] = 'present';
    } else if (state === 'incorrect' && !this.keyStates[letter]) {
      this.keyStates[letter] = 'incorrect';
    }
  }
  
  console.log('⌨️ États clavier mis à jour:', this.keyStates);
}
}
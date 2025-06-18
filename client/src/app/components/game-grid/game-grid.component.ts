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
import { LeaderboardService } from '../../services/leaderboard.service';

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

  // ✅ AJOUTER CETTE LIGNE ICI
  topScores: any[] = []; // Pour le podium TOP 3

  // ✅ Variables de timing (UNE SEULE DÉCLARATION)
  perfectWordStreak = 0;
  wordStartTime = Date.now();

  // ✅ Scores
  activeScoreTab = 'session';
  // topScores: Array<{
  //   playerAlias: string;
  //   totalScore: number;
  //   wordsFound: number;
  //   bestStreak: number;
  //   date: string;
  // }> = [];

  // ✅ Difficulté avec Cauchemar
  currentDifficulty: 'facile' | 'moyen' | 'difficile' | 'cauchemar' = 'facile';
  showDifficultySelector = false;

  constructor(
    private gameService: GameService,
    private authService: AuthService,
    private toastService: ToastService,
    public modalService: ModalService,
    private trouveMotService: TrouveMotService,
    private leaderboardService: LeaderboardService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // ✅ CORRECTION - Supprimer la méthode inexistante
      // this.gameService.useLocalWordsOnly(); // SUPPRIMER cette ligne
      this.checkAuthentication();
      
      // Charger la difficulté sauvegardée
      const savedDifficulty = localStorage.getItem('gameDifficulty') as 'facile' | 'moyen' | 'difficile' | 'cauchemar';
      if (savedDifficulty) {
        this.currentDifficulty = savedDifficulty;
        this.setupDifficultySources();
      }

      // Charger les stats sauvegardées
      this.loadSavedStats();
      
      this.loadTopScores(); // Charger au démarrage
    }
  }

  // ✅ MÉTHODES D'AUTHENTIFICATION
  checkAuthentication() {
    // ✅ CORRECTION - Supprimer l'appel à la méthode inexistante
    // this.gameService.setDevelopmentMode(true); // SUPPRIMER cette ligne
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
    const previews = {
      'facile': {
        label: '🟢 FACILE',
        description: 'Mots courants\nExemples: ARBRE, CHIEN, MAISON'
      },
      'moyen': {
        label: '📚 MOYEN', 
        description: 'Mots variés\nExemples: JARDIN, VOITURE, VOYAGE'
      },
      'difficile': {
        label: '🔥 DIFFICILE',
        description: 'Mots rares via API\nExemples: AZYME, FJORD, SPHINX'
      },
      'cauchemar': {
        label: '💀 CAUCHEMAR',
        description: 'Mots ultra-complexes (6-12 lettres)\nExemples: BYZANTINE, FREQUENCY'
      }
    };
    
    const preview = previews[difficulty];
    this.toastService.info(`${preview.label}\n${preview.description}`, 4000);
  }

  // ✅ MÉTHODES DE JEU
  private loadNewWord() {
    this.isLoading = true;
    this.errorMessage = '';
    this.wordStartTime = Date.now();
    
    if (this.currentDifficulty === 'difficile') {
      this.loadWordFromTrouveMot(); // ✅ CORRECTION - utiliser la bonne méthode
      return;
    }
    
    // ✅ NOUVEAU - Mode cauchemar avec mots longs
    if (this.currentDifficulty === 'cauchemar') {
      this.loadWordFromCauchemar();
      return;
    }
    
    // Pour les autres difficultés (facile, moyen)
    this.gameService.getRandomWord(this.currentDifficulty).subscribe({
      next: (response) => {
        if (response && response.gameId) {
          this.gameId = response.gameId;
          this.remainingAttempts = response.remainingAttempts;
          this.hint = response.hint;
          this.wordLength = response.length;
          this.targetWord = 'X'.repeat(response.length);
          
          this.resetGrid(); // ✅ CORRECTION - utiliser la bonne méthode
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

  // ✅ CORRECTION - Méthode pour charger un mot cauchemar avec vraie API
  private loadWordFromCauchemar() {
    console.log('💀 Chargement mot CAUCHEMAR (6-12 lettres) via vraie API...');
    
    // ✅ OPTION 1 - Utiliser sizemin pour avoir des mots longs garantis
    this.trouveMotService.getWordsForCauchemar(6, 30).subscribe({
      next: (words) => {
        console.log(`💀 API sizemin réponse:`, words);
        
        if (words && words.length > 0) {
          // Filtrer les mots entre 6 et 12 lettres
          const validWords = words.filter(word => word.length >= 6 && word.length <= 12);
          
          if (validWords.length > 0) {
            const randomWord = validWords[Math.floor(Math.random() * validWords.length)].toUpperCase();
            
            this.gameId = Date.now();
            this.remainingAttempts = 6;
            this.hint = randomWord.charAt(0);
            this.wordLength = randomWord.length;
            this.targetWord = randomWord;
            
            this.resetGrid();
            this.isLoading = false;
            
            this.toastService.success(`💀 Mot CAUCHEMAR chargé ! (${randomWord.length} lettres)`, 3000);
            console.log('✅ Mot cauchemar chargé via API sizemin:', randomWord);
            return;
          }
        }
        
        // Si pas de mots valides, utiliser fallback
        console.warn('⚠️ Pas de mots valides via sizemin, tentative avec longueur spécifique...');
        this.trySpecificLengthCauchemar();
      },
      error: (error) => {
        console.error('❌ Erreur chargement cauchemar via sizemin:', error);
        this.trySpecificLengthCauchemar();
      }
    });
  }

  // ✅ NOUVEAU - Essayer avec une longueur spécifique via l'API /size/
  private trySpecificLengthCauchemar() {
    // Générer une longueur aléatoire entre 6 et 12 lettres
    const minLength = 6;
    const maxLength = 12;
    const targetLength = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    
    console.log(`💀 Tentative API /size/ avec ${targetLength} lettres...`);
    
    this.trouveMotService.getWordsByLength(targetLength, 'cauchemar', 20).subscribe({
      next: (words) => {
        console.log(`💀 API /size/${targetLength} réponse:`, words);
        
        if (words && words.length > 0) {
          const validWords = words.filter(word => word.length >= 6 && word.length <= 12);
          
          if (validWords.length > 0) {
            const randomWord = validWords[Math.floor(Math.random() * validWords.length)].toUpperCase();
            
            this.gameId = Date.now();
            this.remainingAttempts = 6;
            this.hint = randomWord.charAt(0);
            this.wordLength = randomWord.length;
            this.targetWord = randomWord;
            
            this.resetGrid();
            this.isLoading = false;
            
            this.toastService.success(`💀 Mot CAUCHEMAR (${randomWord.length}L) chargé !`, 3000);
            console.log('✅ Mot cauchemar chargé via API /size/:', randomWord);
            return;
          }
        }
        
        // Dernier recours : fallback traditionnel
        console.warn('💀 Fallback vers méthode alternative...');
        this.tryAlternativeLengthCauchemar();
      },
      error: (error) => {
        console.error('❌ Erreur API /size/ cauchemar:', error);
        this.tryAlternativeLengthCauchemar();
      }
    });
  }

  // ✅ NOUVEAU - Essayer d'autres longueurs en cas d'échec
  private tryAlternativeLengthCauchemar() {
    const fallbackLengths = [8, 7, 6, 9, 10, 11]; // Ordre de préférence
    let currentIndex = 0;
    
    const tryNextLength = () => {
      if (currentIndex >= fallbackLengths.length) {
        // Dernier recours : utiliser un mot difficile normal
        console.warn('💀 Fallback vers mode difficile pour cauchemar');
        this.loadWordFromTrouveMot(); // ✅ CORRECTION - utiliser la bonne méthode
        return;
      }
      
      const length = fallbackLengths[currentIndex];
      console.log(`💀 Tentative fallback avec ${length} lettres...`);
      
      this.trouveMotService.getWordsByLength(length, 'cauchemar', 30).subscribe({
        next: (words) => {
          const validWords = words.filter(word => word.length >= 6);
          
          if (validWords.length > 0) {
            const randomWord = validWords[Math.floor(Math.random() * validWords.length)].toUpperCase();
            
            this.gameId = Date.now();
            this.remainingAttempts = 6;
            this.hint = randomWord.charAt(0);
            this.wordLength = randomWord.length;
            this.targetWord = randomWord;
            
            this.resetGrid(); // ✅ CORRECTION - utiliser la bonne méthode
            this.isLoading = false;
            
            this.toastService.success(`💀 Mot CAUCHEMAR (${randomWord.length}L) chargé !`, 3000);
            console.log('🔄 Mot cauchemar fallback chargé:', randomWord);
          } else {
            currentIndex++;
            tryNextLength();
          }
        },
        error: () => {
          currentIndex++;
          tryNextLength();
        }
      });
    };
    
    tryNextLength();
  }

  // ✅ CORRECTION - Méthode handleServerResponse
  private handleServerResponse(response: any, guess: string, attemptNumber: number) {
    console.log('📡 Traitement réponse serveur:', response);
    
    if (response.result && Array.isArray(response.result)) {
      // ✅ Mise à jour de la grille avec la réponse serveur
      for (let i = 0; i < guess.length; i++) {
        const cell = this.grid[this.currentRow][i];
        const serverState = response.result[i].status;
        
        // ✅ CORRECTION - Conversion des états serveur vers états CSS
        switch (serverState) {
          case 'correct':
            cell.state = 'correct';
            console.log(`✅ Lettre "${guess[i]}" correcte (position ${i})`);
            break;
          case 'present':
            cell.state = 'present';
            console.log(`🟡 Lettre "${guess[i]}" présente mais mal placée (position ${i})`);
            break;
          case 'absent':
          case 'wrong':
          case 'not_found':
          default:
            // ✅ FORCER l'état 'incorrect' pour toutes les lettres absentes
            cell.state = 'incorrect';
            console.log(`🔴 Lettre "${guess[i]}" absente -> état 'incorrect' (position ${i})`);
            break;
        }
        
        // ✅ DEBUG - Vérifier l'état final de chaque cellule
        console.log(`📝 Cellule [${this.currentRow}][${i}]: "${cell.letter}" -> état: "${cell.state}"`);
      }
      
      // ✅ Mise à jour du clavier
      const keyStates = response.result.map((r: any) => {
        switch (r.status) {
          case 'correct': return 'correct';
          case 'present': return 'present';
          case 'absent':
          case 'wrong':
          case 'not_found':
          default: return 'incorrect';
        }
      });
      
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
    console.log('🔄 Chargement TOP 3...');
    
    this.leaderboardService.getGlobalLeaderboard().subscribe({
      next: (scores) => {
        console.log('✅ Scores reçus:', scores);
        
        // ✅ ADAPTER les données LeaderboardEntry vers le format attendu
        this.topScores = scores.slice(0, 3).map(score => ({
          playerAlias: score.login,           // login → playerAlias
          totalScore: score.score,            // score → totalScore  
          wordsFound: score.words_found,      // words_found → wordsFound
          bestStreak: 1,                      // Valeur par défaut
          date: score.date_achieved           // date_achieved → date
        }));
        
        console.log('🏆 TOP 3 adapté:', this.topScores);
      },
      error: (error) => {
        console.error('❌ Erreur chargement TOP 3:', error);
        this.topScores = [];
      }
    });
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

  // ✅ CORRECTION - Méthode checkWordLocally
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
    
    // ✅ CORRECTION - MISE À JOUR DE LA GRILLE AVEC LES BONS ÉTATS CSS
    for (let i = 0; i < guess.length; i++) {
      const cell = this.grid[this.currentRow][i];
      cell.letter = guessLetters[i];
      
      // ✅ FORCER les bons états qui correspondent au CSS
      switch (result[i].status) {
        case 'correct':
          cell.state = 'correct';  // Carré rouge
          console.log(`✅ LOCAL - Lettre "${guessLetters[i]}" correcte -> 'correct'`);
          break;
        case 'present':
          cell.state = 'present';  // Cercle jaune
          console.log(`🟡 LOCAL - Lettre "${guessLetters[i]}" présente -> 'present'`);
          break;
        case 'absent':
        default:
          // ✅ IMPORTANT - Forcer 'incorrect' pour fond bleu
          cell.state = 'incorrect'; // Fond bleu
          console.log(`🔴 LOCAL - Lettre "${guessLetters[i]}" absente -> 'incorrect'`);
          break;
      }
      
      // ✅ DEBUG - Vérifier l'état final appliqué
      console.log(`📝 LOCAL - Cellule [${this.currentRow}][${i}]: "${cell.letter}" -> état final: "${cell.state}"`);
    }
    
    // ✅ MISE À JOUR DU CLAVIER
    const keyStates = result.map(r => {
      switch (r.status) {
        case 'correct': return 'correct';
        case 'present': return 'present';
        case 'absent': 
        default: return 'incorrect';
      }
    });
    
    this.updateKeyStates(guess, keyStates);

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

  // ✅ CORRECTION - Méthode updateKeyStates
  private updateKeyStates(guess: string, states: string[]) {
    console.log('⌨️ Mise à jour états clavier:', { guess, states });
    
    for (let i = 0; i < guess.length; i++) {
      const letter = guess[i];
      const state = states[i];
      
      console.log(`⌨️ Lettre "${letter}" -> nouvel état: "${state}"`);
      
      // ✅ Priorité des états : correct > present > incorrect
      if (state === 'correct') {
        this.keyStates[letter] = 'correct';
      } else if (state === 'present' && this.keyStates[letter] !== 'correct') {
        this.keyStates[letter] = 'present';
      } else if (state === 'incorrect' && !this.keyStates[letter]) {
        // ✅ CORRECTION - Bien utiliser 'incorrect'
        this.keyStates[letter] = 'incorrect';
        console.log(`⌨️ CORRECTION - Lettre "${letter}" mise à jour -> 'incorrect'`);
      }
    }
    
    console.log('⌨️ États finaux du clavier:', this.keyStates);
  }

  // ✅ GARDER SEULEMENT CETTE VERSION - handleKeyPress
  handleKeyPress(key: string) {
    if (this.isLoading || this.gameOver) {
      return;
    }

    if (key === 'ENTER') {
      this.checkWord();
    } else if (key === 'BACKSPACE') {
      this.deleteLetter();
    } else if (key.length === 1 && key.match(/[A-Z]/)) {
      this.addLetter(key);
    }
  }

  // ✅ AJOUTER - Méthode pour charger un mot difficile via trouve-mot
  private loadWordFromTrouveMot() {
    console.log('🔥 Chargement mot DIFFICILE via API trouve-mot.fr...');
    
    this.trouveMotService.getRandomWord().subscribe({
      next: (word) => {
        if (word && word.length >= 3) {
          const randomWord = word.toUpperCase();
          
          this.gameId = Date.now();
          this.remainingAttempts = 6;
          this.hint = randomWord.charAt(0);
          this.wordLength = randomWord.length;
          this.targetWord = randomWord;
          
          this.resetGrid();
          this.isLoading = false;
          
          this.toastService.success(`🔥 Mot DIFFICILE chargé via API ! (${randomWord.length} lettres)`, 3000);
          console.log('✅ Mot difficile chargé:', randomWord);
        } else {
          console.warn('⚠️ Mot difficile invalide, fallback vers alternative');
          this.loadAlternativeDifficultWord();
        }
      },
      error: (error) => {
        console.error('❌ Erreur chargement difficile:', error);
        this.loadAlternativeDifficultWord();
      }
    });
  }

  // ✅ AJOUTER - Fallback pour mode difficile
  private loadAlternativeDifficultWord() {
    this.trouveMotService.getWordsByLengthAlternative(5).subscribe({
      next: (words) => {
        if (words && words.length > 0) {
          const randomWord = words[Math.floor(Math.random() * words.length)].toUpperCase();
          
          this.gameId = Date.now();
          this.remainingAttempts = 6;
          this.hint = randomWord.charAt(0);
          this.wordLength = randomWord.length;
          this.targetWord = randomWord;
          
          this.resetGrid();
          this.isLoading = false;
          
          this.toastService.success(`🔥 Mot DIFFICILE (local) chargé ! (${randomWord.length} lettres)`, 3000);
          console.log('🔄 Mot difficile local chargé:', randomWord);
        } else {
          this.fallbackToEasyMode();
        }
      },
      error: () => {
        this.fallbackToEasyMode();
      }
    });
  }

  // ✅ AJOUTER - Fallback final vers mode facile
  private fallbackToEasyMode() {
    this.toastService.warning('🔄 Difficile indisponible, fallback vers Facile', 3000);
    this.currentDifficulty = 'facile';
    this.loadNewWord();
  }

  // ✅ AJOUTER - Méthode pour réinitialiser la grille
  private resetGrid() {
    this.grid = [];
    this.currentRow = 0;
    this.currentCol = 0;
    this.gameOver = false;
    this.wordFound = false;
    this.errorMessage = '';
    this.keyStates = {};

    // Créer une nouvelle grille
    for (let i = 0; i < 6; i++) {
      const row = [];
      for (let j = 0; j < this.wordLength; j++) {
        row.push({ letter: '', state: 'empty' });
      }
      this.grid.push(row);
    }

    // Si on a un hint, le placer sur la première ligne
    if (this.hint) {
      this.grid[0][0].letter = this.hint;
      this.grid[0][0].state = 'hint';
      this.currentCol = 1;
    }

    console.log('🔄 Grille réinitialisée:', {
      wordLength: this.wordLength,
      hint: this.hint,
      currentCol: this.currentCol
    });
  }

  // ✅ AJOUTER - Méthode pour vérifier un mot
  private checkWord() {
    if (this.currentCol !== this.wordLength || !this.gameId) {
      console.warn('⚠️ Mot incomplet ou pas de gameId', { 
        currentCol: this.currentCol, 
        wordLength: this.wordLength, 
        gameId: this.gameId 
      });
      return;
    }

    const guess = this.grid[this.currentRow].map(cell => cell.letter).join('');
    const attemptNumber = this.currentRow + 1;
    
    console.log('✅ Vérification mot:', { guess, attemptNumber, difficulty: this.currentDifficulty });
    
    // ✅ Gérer difficile ET cauchemar en local
    if (this.currentDifficulty === 'difficile' || this.currentDifficulty === 'cauchemar') {
      this.checkWordLocally(guess, attemptNumber);
    } else {
      // Vérification via GameService pour facile et moyen
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

  // ✅ AJOUTER - Méthode pour ajouter une lettre
  private addLetter(letter: string) {
    if (this.currentCol < this.wordLength && this.currentRow < 6) {
      this.grid[this.currentRow][this.currentCol].letter = letter.toUpperCase();
      this.currentCol++;
      console.log(`📝 Lettre ajoutée: ${letter} à [${this.currentRow}][${this.currentCol - 1}]`);
    }
  }

  // ✅ AJOUTER - Méthode pour supprimer une lettre
  private deleteLetter() {
    if (this.currentCol > 0) {
      // Si on a un hint sur la première colonne, ne pas l'effacer
      const minCol = (this.hint && this.currentRow === 0) ? 1 : 0;
      
      if (this.currentCol > minCol) {
        this.currentCol--;
        this.grid[this.currentRow][this.currentCol].letter = '';
        console.log(`🗑️ Lettre supprimée à [${this.currentRow}][${this.currentCol}]`);
      }
    }
  }
}
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, from, EMPTY, of } from 'rxjs';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { map, catchError, concatMap, first, switchMap, delay } from 'rxjs/operators';

// Interfaces pour les réponses de l'API
interface GameResponse {
  hint: string;
  length: number;
  gameId: number;
  remainingAttempts: number;
  difficulty?: string;
}

interface GuessResponse {
  result: Array<{
    letter: string;
    status: 'correct' | 'present' | 'absent' | 'invalid';
  }>;
  won: boolean;
  score?: number;
  gameOver?: boolean;
  message?: string;
  remainingAttempts?: number;
  targetWord?: string;
}

// ✅ Interface simplifiée pour les sources locales uniquement
interface WordSource {
  name: string;
  getWord: () => Observable<string>;
  priority: number;
  enabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private apiUrl = 'http://localhost:5000/api/game';
  
  // ✅ Gestion des mots utilisés pour éviter les répétitions
  private usedWords = new Set<string>();
  private maxUsedWords = 500; // Réduit car on a moins de mots maintenant
  
  // ✅ Mode hybride activé automatiquement si le serveur ne répond pas
  private offlineMode = false;
  private developmentMode = true; // Mode développement sans auth
  private currentTargetWord = ''; // Stockage du mot actuel pour le mode offline

  // ✅ Sources locales uniquement - plus d'API externe !
  private wordSources: WordSource[] = [
    {
      name: 'local-premium',
      getWord: () => this.getWordFromPremiumList(),
      priority: 1, // ✅ Premium en priorité maintenant !
      enabled: true
    },
    {
      name: 'local-security',
      getWord: () => this.getWordFromSecurityList(),
      priority: 2, // ✅ Sécurité en second
      enabled: true
    }
  ];

  // ✅ Liste de mots premium ÉLARGIE avec plus de variété
  private premiumWords = [
    // Animaux (tous niveaux)
    'TIGRE', 'LION', 'AIGLE', 'FAUCON', 'DAUPHIN', 'BALEINE', 'REQUIN', 'PANDA',
    'KOALA', 'JAGUAR', 'GUEPARD', 'PANTHERE', 'GORILLE', 'ZEBRE', 'GIRAFE', 'RHINO',
    'CHIEN', 'CHAT', 'OISEAU', 'POISSON', 'LAPIN', 'SOURIS', 'CHEVAL', 'VACHE',
    'MOUTON', 'POULE', 'CANARD', 'COCHON', 'CHEVRE', 'PIGEON', 'HIBOU', 'RENARD',
    
    // Nature et géographie
    'VOLCAN', 'GLACIER', 'DESERT', 'JUNGLE', 'SAVANE', 'TOUNDRA', 'CANYON', 'FALAISE',
    'CASCADE', 'TORRENT', 'ESTUAIRE', 'ARCHIPEL', 'PENINSULE', 'PLATEAU', 'COLLINE', 'VALLEE',
    'ARBRE', 'FLEUR', 'FORET', 'MONTAGNE', 'RIVIERE', 'OCEAN', 'SOLEIL', 'LUNE',
    'ETOILE', 'NUAGE', 'PLUIE', 'NEIGE', 'VENT', 'ORAGE', 'JARDIN', 'PRAIRIE',
    
    // Sciences et technologie
    'ROBOT', 'LASER', 'PLASMA', 'ATOME', 'PHOTON', 'ELECTRON', 'NEUTRON', 'GALAXIE',
    'PLANETE', 'COMETE', 'ASTEROIDE', 'PULSAR', 'QUASAR', 'NEBULEUSE', 'COSMOS', 'UNIVERS',
    'SCIENCE', 'CHIMIE', 'PHYSIQUE', 'BIOLOGIE', 'MATHEMA', 'FORMULE', 'ENERGIE', 'MATIERE',
    
    // Arts et culture
    'MUSIQUE', 'DANSE', 'CINEMA', 'THEATRE', 'PEINTURE', 'SCULPTURE', 'POESIE', 'ROMAN',
    'OPERA', 'BALLET', 'FRESQUE', 'MOSAIQUE', 'GRAVURE', 'ESTAMPE', 'AQUARELLE', 'PASTEL',
    'ARTISTE', 'COULEUR', 'DESSIN', 'CRAYON', 'PINCEAU', 'TOILE', 'STATUE', 'GALERIE',
    
    // Sentiments et émotions
    'AMOUR', 'PASSION', 'TENDRESSE', 'BONHEUR', 'JOIE', 'EXTASE', 'EUPHORIE', 'SERENITE',
    'PAIX', 'CALME', 'ZENITUDE', 'COURAGE', 'BRAVOURE', 'AUDACE', 'FIERTE', 'HONNEUR',
    'ESPOIR', 'FORCE', 'SAGESSE', 'BEAUTE', 'LIBERTE', 'AMITIE', 'FAMILLE', 'RESPECT',
    
    // Objets et matériaux
    'DIAMANT', 'EMERAUDE', 'RUBIS', 'SAPHIR', 'TOPAZE', 'AMBRE', 'PERLE', 'CORAIL',
    'CRISTAL', 'QUARTZ', 'GRANITE', 'MARBRE', 'BRONZE', 'ARGENT', 'PLATINE', 'TITANE',
    'METAL', 'PIERRE', 'BOIS', 'VERRE', 'TISSU', 'CUIR', 'SOIE', 'COTON',
    
    // Météo et phénomènes
    'CYCLONE', 'TYPHON', 'TORNADO', 'BLIZZARD', 'TEMPETE', 'BOURRASQUE', 'RAFALE', 'BRISE',
    'AURORE', 'ECLIPSE', 'SOLSTICE', 'EQUINOXE', 'SAISON', 'CLIMAT', 'MOUSSON', 'ALIZE',
    'BROUILLARD', 'ROSEE', 'GIVRE', 'GRELE', 'TONNERRE', 'ECLAIR', 'FOUDRE', 'NUAGE',
    
    // Maison et objets quotidiens
    'MAISON', 'TABLE', 'CHAISE', 'LIVRE', 'LAMPE', 'MIROIR', 'PORTE', 'FENETRE',
    'CUISINE', 'CHAMBRE', 'SALON', 'BUREAU', 'ARMOIRE', 'TIROIR', 'CLAVIER', 'ECRAN',
    'TELEPHONE', 'ORDINATEUR', 'VOITURE', 'VELO', 'TRAIN', 'AVION', 'BATEAU', 'FUSEE',
    
    // Nourriture
    'PAIN', 'POMME', 'ORANGE', 'BANANE', 'TOMATE', 'SALADE', 'FROMAGE', 'VIANDE',
    'GATEAU', 'CHOCOLAT', 'BONBON', 'SUCRE', 'FARINE', 'BEURRE', 'OEUF', 'LAIT',
    'FRUIT', 'LEGUME', 'CEREALE', 'EPICE', 'HERBE', 'SAUCE', 'SOUPE', 'PLAT',
    
    // Activités et loisirs
    'SPORT', 'JEUX', 'FETE', 'VOYAGE', 'VACANCES', 'WEEKEND', 'SORTIE', 'BALADE',
    'LECTURE', 'ECRITURE', 'ETUDE', 'TRAVAIL', 'ECOLE', 'COURS', 'EXAMEN', 'DIPLOME',
    'COMPETITION', 'VICTOIRE', 'DEFAITE', 'MATCH', 'EQUIPE', 'JOUEUR', 'CHAMPION', 'MEDAILLE',
    
    // Temps et mesures
    'TEMPS', 'JOUR', 'NUIT', 'MATIN', 'SOIR', 'HEURE', 'MINUTE', 'SECONDE',
    'SEMAINE', 'MOIS', 'ANNEE', 'SIECLE', 'EPOQUE', 'HISTOIRE', 'PASSE', 'FUTUR',
    'METRE', 'KILO', 'LITRE', 'DEGRE', 'VITESSE', 'DISTANCE', 'POIDS', 'TAILLE',
    
    // Couleurs et formes
    'ROUGE', 'BLEU', 'VERT', 'JAUNE', 'NOIR', 'BLANC', 'ROSE', 'VIOLET',
    'ORANGE', 'MARRON', 'GRIS', 'BEIGE', 'DORE', 'ARGENTE', 'BRONZE', 'CUIVRE',
    'CARRE', 'ROND', 'TRIANGLE', 'RECTANGLE', 'LOSANGE', 'ETOILE', 'CERCLE', 'LIGNE'
  ];

  // ✅ Liste de sécurité (mots simples et sûrs)
  private securityWords = [
    'CHAT', 'CHIEN', 'MAISON', 'ARBRE', 'FLEUR', 'SOLEIL', 'LUNE', 'TERRE',
    'LIVRE', 'TABLE', 'CHAISE', 'PORTE', 'MAIN', 'TETE', 'COEUR', 'AMOUR',
    'PAIN', 'EAU', 'FEU', 'AIR', 'MER', 'MONT', 'VILLE', 'ROUTE',
    'AUTO', 'VELO', 'TRAIN', 'AVION', 'BLANC', 'NOIR', 'ROUGE', 'BLEU',
    'GRAND', 'PETIT', 'HAUT', 'BAS', 'LONG', 'COURT', 'GROS', 'MINCE',
    'BEAU', 'LAID', 'BON', 'MAUVAIS', 'FACILE', 'DIFFICILE', 'RAPIDE', 'LENT'
  ];

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    console.log('🇫🇷 GameService initialisé avec listes françaises locales');
  }

  // ✅ Source de mots premium français (maintenant prioritaire !)
  private getWordFromPremiumList(): Observable<string> {
    const availableWords = this.premiumWords.filter(word => !this.usedWords.has(word));
    
    if (availableWords.length === 0) {
      console.log('📝 Tous les mots premium utilisés, passage à la liste de sécurité');
      return this.getWordFromSecurityList();
    }

    const randomWord = availableWords[Math.floor(Math.random() * availableWords.length)];
    console.log(`🎯 Mot premium sélectionné: ${randomWord}`);
    
    return of(randomWord);
  }

  // ✅ Source locale de sécurité (fallback)
  private getWordFromSecurityList(): Observable<string> {
    const availableWords = this.securityWords.filter(word => !this.usedWords.has(word));
    
    if (availableWords.length === 0) {
      console.log('🔄 Tous les mots de sécurité utilisés, réinitialisation...');
      this.resetUsedWords();
      return this.getWordFromSecurityList();
    }

    const randomWord = availableWords[Math.floor(Math.random() * availableWords.length)];
    console.log(`🛡️ Mot de sécurité sélectionné: ${randomWord}`);
    
    return of(randomWord);
  }

  // ✅ Méthode simplifiée pour essayer les sources locales
  private tryWordSources(): Observable<string> {
    const enabledSources = this.wordSources
      .filter(source => source.enabled)
      .sort((a, b) => a.priority - b.priority);

    console.log('🔄 Sources locales activées:', enabledSources.map(s => `${s.name}(${s.priority})`));

    return from(enabledSources).pipe(
      concatMap((source, index) => 
        source.getWord().pipe(
          map(word => {
            console.log(`✅ Source ${source.name} (#${index + 1}) a fourni: ${word}`);
            return word;
          }),
          catchError(err => {
            console.warn(`⚠️ Source ${source.name} failed:`, err.message);
            return EMPTY;
          })
        )
      ),
      first(),
      catchError(err => {
        console.error('❌ Toutes les sources ont échoué, utilisation du fallback de sécurité');
        return this.getWordFromSecurityList();
      })
    );
  }

  // ✅ Simuler une réponse de création de session pour le mode offline
  private simulateGameSession(word: string, difficulty: string): Observable<GameResponse> {
    this.currentTargetWord = word;
    
    const gameResponse: GameResponse = {
      gameId: Math.floor(Math.random() * 10000),
      hint: word.charAt(0), // Première lettre comme indice
      length: word.length,
      remainingAttempts: 6,
      difficulty: difficulty
    };
    
    console.log('🎮 Session simulée créée:', gameResponse);
    return of(gameResponse).pipe(delay(300));
  }

  // ✅ Simuler la vérification d'un mot
  private simulateGuessCheck(guess: string, gameId: number, attemptNumber: number): Observable<GuessResponse> {
    const targetWord = this.currentTargetWord;
    
    if (!targetWord) {
      return throwError(() => new Error('Aucun mot cible défini'));
    }
    
    console.log(`🎯 Vérification offline: "${guess}" vs "${targetWord}"`);
    
    const result = guess.split('').map((letter, index) => {
      if (letter === targetWord[index]) {
        return { letter, status: 'correct' as const };
      } else if (targetWord.includes(letter)) {
        return { letter, status: 'present' as const };
      } else {
        return { letter, status: 'absent' as const };
      }
    });
    
    const won = guess === targetWord;
    
    const response: GuessResponse = {
      result,
      won,
      gameOver: attemptNumber >= 6 || won,
      remainingAttempts: Math.max(0, 6 - attemptNumber),
      targetWord: won || attemptNumber >= 6 ? targetWord : undefined
    };
    
    console.log('📊 Résultat de vérification:', response);
    
    return of(response).pipe(delay(300));
  }

  // ✅ Créer une session de jeu (mode hybride)
  private createGameSession(word: string, difficulty: string): Observable<GameResponse> {
    // Si déjà en mode offline, utiliser la simulation
    if (this.offlineMode) {
      console.log('🔧 Mode offline - simulation de session');
      return this.simulateGameSession(word, difficulty);
    }
    
    // Mode développement sans auth
    if (this.developmentMode) {
      console.log('🔧 Mode développement - simulation de session');
      return this.simulateGameSession(word, difficulty);
    }
    
    const headers = this.getAuthHeaders();
    console.log(`🎮 Tentative de création de session avec le mot: ${word}`);
    
    return this.http.post<GameResponse>(`${this.apiUrl}/create-session`, {
      targetWord: word,
      difficulty: difficulty
    }, { headers }).pipe(
      catchError(err => {
        console.error('❌ Erreur création session:', err);
        
        if (err.status === 404 || err.status === 405) {
          console.log('🔄 Fallback vers ancien endpoint /start');
          return this.http.post<GameResponse>(`${this.apiUrl}/start`, {
            difficulty: difficulty
          }, { headers }).pipe(
            catchError(startErr => {
              console.warn('❌ Ancien endpoint échoué aussi, passage en mode offline');
              this.offlineMode = true;
              return this.simulateGameSession(word, difficulty);
            })
          );
        }
        
        console.warn('❌ Serveur inaccessible, passage en mode offline');
        this.offlineMode = true;
        return this.simulateGameSession(word, difficulty);
      })
    );
  }

  // ✅ Réinitialiser les mots utilisés
  private resetUsedWords() {
    console.log(`🔄 Réinitialisation des mots utilisés (${this.usedWords.size} mots)`);
    this.usedWords.clear();
  }

  // ✅ Vérification sécurisée du localStorage
  private getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('token') || sessionStorage.getItem('token');
    }
    return null;
  }

  // ✅ Mode développement - authentification simplifiée
  private isAuthenticated(): boolean {
    if (this.developmentMode) {
      console.log('🔧 Mode développement - authentification désactivée');
      return true;
    }
    
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    
    const token = this.getToken();
    return !!token;
  }

  // ✅ Headers simplifiés pour le développement
  private getAuthHeaders(): HttpHeaders {
    if (this.developmentMode) {
      console.log('🔧 Mode développement - headers basiques');
      return new HttpHeaders().set('Content-Type', 'application/json');
    }
    
    const token = this.getToken();
    
    if (!token) {
      if (isPlatformBrowser(this.platformId)) {
        this.router.navigate(['/login']);
      }
      throw new Error('Token manquant - redirection vers login');
    }

    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  // ✅ Méthode principale simplifiée - plus d'API externe !
  getRandomWord(difficulty: string = 'facile'): Observable<GameResponse> {
    // Réinitialiser si trop de mots utilisés
    if (this.usedWords.size >= this.maxUsedWords) {
      this.resetUsedWords();
    }

    console.log(`🎯 Recherche d'un nouveau mot local (${this.usedWords.size}/${this.maxUsedWords} utilisés)`);

    return this.tryWordSources().pipe(
      switchMap(word => {
        // Vérifier si le mot a déjà été utilisé récemment
        if (this.usedWords.has(word) && this.usedWords.size < this.maxUsedWords * 0.9) {
          console.log(`⚠️ Mot "${word}" déjà utilisé, nouvel essai...`);
          return this.getRandomWord(difficulty);
        }
        
        // Ajouter le mot aux mots utilisés
        this.usedWords.add(word);
        console.log(`🎉 Nouveau mot sélectionné: ${word} (${this.usedWords.size} mots utilisés)`);
        
        // Créer la session de jeu avec ce mot
        return this.createGameSession(word, difficulty);
      }),
      catchError(err => {
        console.error('❌ Erreur lors de la génération du mot:', err);
        return throwError(() => new Error('Impossible de générer un nouveau mot'));
      })
    );
  }

  // ✅ Vérification de guess en mode hybride
  submitGuess(guess: string, gameId: number, attemptNumber: number): Observable<GuessResponse> {
    // Mode offline ou développement
    if (this.offlineMode || this.developmentMode) {
      console.log('🔧 Vérification en mode local');
      return this.simulateGuessCheck(guess, gameId, attemptNumber);
    }
    
    if (!this.isAuthenticated()) {
      if (isPlatformBrowser(this.platformId)) {
        this.router.navigate(['/login']);
      }
      return throwError(() => new Error('Non authentifié'));
    }

    const headers = this.getAuthHeaders();
    
    return this.http.post<GuessResponse>(`${this.apiUrl}/check`, {
      guess,
      gameId,
      attemptNumber
    }, { headers }).pipe(
      catchError(err => {
        console.warn('❌ Erreur vérification serveur, basculement offline');
        this.offlineMode = true;
        return this.simulateGuessCheck(guess, gameId, attemptNumber);
      })
    );
  }

  // ✅ Statistiques des mots disponibles
  getUsedWordsStats() {
    return {
      used: this.usedWords.size,
      max: this.maxUsedWords,
      percentage: Math.round((this.usedWords.size / this.maxUsedWords) * 100),
      premiumAvailable: this.premiumWords.filter(w => !this.usedWords.has(w)).length,
      securityAvailable: this.securityWords.filter(w => !this.usedWords.has(w)).length,
      totalWords: this.premiumWords.length + this.securityWords.length
    };
  }

  // ✅ Activer le mode local uniquement
  useLocalWordsOnly() {
    this.wordSources.forEach(source => {
      source.enabled = true;
    });
    
    console.log('🇫🇷 Mode mots locaux français activé');
    console.log('📊 Sources disponibles:', this.getWordSourcesStatus());
  }

  // ✅ État des sources
  getWordSourcesStatus() {
    return this.wordSources.map(source => ({
      name: source.name,
      enabled: source.enabled,
      priority: source.priority,
      description: this.getSourceDescription(source.name)
    }));
  }

  private getSourceDescription(sourceName: string): string {
    switch (sourceName) {
      case 'local-premium': return `Mots français premium (${this.premiumWords.length} mots)`;
      case 'local-security': return `Liste de sécurité (${this.securityWords.length} mots)`;
      default: return 'Source inconnue';
    }
  }

  // ✅ Méthode pour déboguer
  debugWordSources() {
    console.log('=== 🔍 État des sources de mots LOCALES ===');
    this.wordSources.forEach(source => {
      console.log(`${source.name}: ${source.enabled ? '✅' : '❌'} (priorité: ${source.priority}) - ${this.getSourceDescription(source.name)}`);
    });
    
    const stats = this.getUsedWordsStats();
    console.log(`📊 Mots utilisés: ${stats.used}/${stats.max} (${stats.percentage}%)`);
    console.log(`🎯 Premium disponibles: ${stats.premiumAvailable}/${this.premiumWords.length}`);
    console.log(`🛡️ Sécurité disponibles: ${stats.securityAvailable}/${this.securityWords.length}`);
    console.log(`📚 Total de mots: ${stats.totalWords}`);
    console.log('=====================================');
  }

  // ✅ Réinitialisation forcée
  forceResetUsedWords() {
    this.resetUsedWords();
    console.log('🔄 Réinitialisation forcée des mots utilisés');
  }

  // ✅ Activer/désactiver le mode développement
  setDevelopmentMode(enabled: boolean) {
    this.developmentMode = enabled;
    console.log(`🔧 Mode développement: ${enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
  }

  // ✅ Obtenir des statistiques complètes
  getCompleteStats() {
    const stats = this.getUsedWordsStats();
    return {
      ...stats,
      offlineMode: this.offlineMode,
      developmentMode: this.developmentMode,
      sources: this.getWordSourcesStatus(),
      currentTargetWord: this.developmentMode ? this.currentTargetWord : '[CACHÉ]'
    };
  }
}
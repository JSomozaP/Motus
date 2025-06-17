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

// ✅ Interface pour les sources de mots avec support difficulté
interface WordSource {
  name: string;
  getWord: () => Observable<string>;
  priority: number;
  enabled: boolean;
  difficulty?: string;
}

// ✅ Interface pour les statistiques de mots (CORRIGÉE)
interface WordStats {
  used: number;
  max: number;
  percentage: number;
  premiumAvailable: number;
  securityAvailable: number;
  totalWords: number;
  hardMode?: {
    used: number;
    max: number;
    percentage: number;
    available: number;
    total: number;
    enabled: boolean;
  };
}

// ✅ Interface pour les statistiques complètes
interface CompleteStats extends WordStats {
  offlineMode: boolean;
  developmentMode: boolean;
  sources: Array<{
    name: string;
    enabled: boolean;
    priority: number;
    difficulty?: string;
    description: string;
  }>;
  currentTargetWord: string;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private apiUrl = 'http://localhost:5000/api/game';
  
  // ✅ Gestion des mots utilisés pour éviter les répétitions
  private usedWords = new Set<string>();
  private maxUsedWords = 500;
  
  // ✅ Cache pour les mots du mode hard (ancien système GitHub)
  private hardModeWords: string[] = [];
  private hardModeLoaded = false;
  private hardModeUsedWords = new Set<string>();
  private maxHardModeWords = 1000;

  // ✅ Nouvelle liste pour le mode cauchemar depuis mots.json
  private cauchemarWords: string[] = [];
  private cauchemarWordsLoaded = false;
  private cauchemarUsedWords = new Set<string>();
  private maxCauchemarWords = 2000;
  
  // ✅ Mode hybride activé automatiquement si le serveur ne répond pas
  private offlineMode = false;
  private developmentMode = true;
  private currentTargetWord = '';

  // ✅ Sources avec le mode cauchemar local
  private wordSources: WordSource[] = [
    {
      name: 'cauchemar-local',
      getWord: () => this.getWordFromCauchemarList(),
      priority: 1,
      enabled: false,
      difficulty: 'cauchemar'
    },
    {
      name: 'local-premium',
      getWord: () => this.getWordFromPremiumList(),
      priority: 2,
      enabled: true,
      difficulty: 'moyen'
    },
    {
      name: 'local-security',
      getWord: () => this.getWordFromSecurityList(),
      priority: 3,
      enabled: true,
      difficulty: 'facile'
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
    console.log('🇫🇷 GameService initialisé avec listes françaises locales + Mode CAUCHEMAR');
  }

  // ✅ Charger les mots depuis mots.json pour le mode cauchemar
  private loadCauchemarWords(): Observable<string[]> {
    if (this.cauchemarWordsLoaded && this.cauchemarWords.length > 0) {
      console.log(`🎯 Mots cauchemar déjà chargés: ${this.cauchemarWords.length} mots`);
      return of(this.cauchemarWords);
    }

    console.log('💀 Chargement des mots cauchemar depuis mots.json...');
    
    return this.http.get<string[]>('assets/mots.json').pipe(
      map(words => {
        console.log(`📡 Mots bruts reçus: ${words.length}`);
        
        // ✅ Filtrer les mots pour le mode cauchemar
        const filteredWords = words
          .filter(word => {
            if (!word || typeof word !== 'string') return false;
            
            const cleanWord = word.toUpperCase().trim();
            
            // Critères pour les mots cauchemar (plus difficiles)
            return (
              cleanWord.length >= 6 && cleanWord.length <= 12 && // Mots plus longs
              /^[A-ZÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ-]+$/.test(cleanWord) && // Lettres françaises + tirets
              !cleanWord.includes(' ') && // Pas d'espaces
              !/^\d/.test(cleanWord) && // Pas de mots commençant par un chiffre
              cleanWord.length > 5 // Mots complexes uniquement
            );
          })
          .map(word => {
            // Nettoyer les accents pour le jeu
            return word.toUpperCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .trim();
          })
          .filter((word, index, arr) => arr.indexOf(word) === index) // Supprimer les doublons
          .sort();

        console.log(`✅ Mots filtrés pour le mode cauchemar: ${filteredWords.length}`);
        
        this.cauchemarWords = filteredWords;
        this.cauchemarWordsLoaded = true;
        
        return filteredWords;
      }),
      catchError(err => {
        console.error('❌ Erreur lors du chargement des mots cauchemar:', err);
        
        // Fallback vers une liste réduite intégrée
        const fallbackWords = this.getFallbackHardWords(); // Réutiliser l'ancienne méthode
        console.log(`🛡️ Utilisation du fallback cauchemar: ${fallbackWords.length} mots`);
        
        this.cauchemarWords = fallbackWords;
        this.cauchemarWordsLoaded = true;
        
        return of(fallbackWords);
      })
    );
  }

  // ✅ Obtenir un mot du mode cauchemar
  private getWordFromCauchemarList(): Observable<string> {
    return this.loadCauchemarWords().pipe(
      switchMap(words => {
        const availableWords = words.filter(word => !this.cauchemarUsedWords.has(word));
        
        if (availableWords.length === 0) {
          console.log('🔄 Tous les mots cauchemar utilisés, réinitialisation...');
          this.cauchemarUsedWords.clear();
          return this.getWordFromCauchemarList();
        }

        // ✅ Favoriser les mots très longs pour le cauchemar
        const veryHardWords = availableWords.filter(word => word.length >= 8);
        const wordsToChooseFrom = veryHardWords.length > 0 ? veryHardWords : availableWords;
        
        const randomWord = wordsToChooseFrom[Math.floor(Math.random() * wordsToChooseFrom.length)];
        this.cauchemarUsedWords.add(randomWord);
        
        console.log(`💀 Mot CAUCHEMAR sélectionné: ${randomWord} (${randomWord.length} lettres)`);
        
        return of(randomWord);
      })
    );
  }

  // ✅ Charger les mots du mode hard depuis GitHub (ancien système)
  private loadHardModeWords(): Observable<string[]> {
    if (this.hardModeLoaded && this.hardModeWords.length > 0) {
      console.log(`🎯 Mots hard mode déjà chargés: ${this.hardModeWords.length} mots`);
      return of(this.hardModeWords);
    }

    console.log('🔄 Chargement des mots hard mode depuis GitHub...');
    
    return this.http.get<string[]>('https://raw.githubusercontent.com/words/an-array-of-french-words/master/index.json', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).pipe(
      map(words => {
        console.log(`📡 Mots bruts reçus: ${words.length}`);
        
        // ✅ Filtrer et nettoyer les mots pour le jeu
        const filteredWords = words
          .filter(word => {
            if (!word || typeof word !== 'string') return false;
            
            const cleanWord = word.toUpperCase().trim();
            
            // Critères de sélection pour un bon jeu de mots
            return (
              cleanWord.length >= 4 && cleanWord.length <= 8 && // Taille appropriée
              /^[A-ZÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ]+$/.test(cleanWord) && // Lettres françaises uniquement
              !cleanWord.includes('-') && // Pas de mots composés
              !cleanWord.includes(' ') && // Pas d'espaces
              !/^\d/.test(cleanWord) && // Pas de mots commençant par un chiffre
              cleanWord.length > 2 // Éviter les mots trop courts
            );
          })
          .map(word => {
            // Nettoyer les accents pour simplifier le jeu
            return word.toUpperCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '') // Supprimer tous les accents
              .trim();
          })
          .filter((word, index, arr) => arr.indexOf(word) === index) // Supprimer les doublons
          .sort(); // Trier alphabétiquement

        console.log(`✅ Mots filtrés pour le hard mode: ${filteredWords.length}`);
        console.log(`📊 Répartition par longueur:`, this.getWordLengthStats(filteredWords));
        
        // Sauvegarder en cache
        this.hardModeWords = filteredWords;
        this.hardModeLoaded = true;
        
        // ✅ Sauvegarder en localStorage pour éviter de recharger
        if (isPlatformBrowser(this.platformId)) {
          try {
            localStorage.setItem('hardModeWords', JSON.stringify({
              words: filteredWords,
              timestamp: Date.now(),
              version: '1.0'
            }));
            console.log('💾 Mots hard mode sauvegardés en cache local');
          } catch (e) {
            console.warn('⚠️ Impossible de sauvegarder en localStorage:', e);
          }
        }
        
        return filteredWords;
      }),
      catchError(err => {
        console.error('❌ Erreur lors du chargement des mots hard mode:', err);
        
        // ✅ Essayer de charger depuis le cache local
        if (isPlatformBrowser(this.platformId)) {
          try {
            const cachedData = localStorage.getItem('hardModeWords');
            if (cachedData) {
              const parsed = JSON.parse(cachedData);
              const age = Date.now() - parsed.timestamp;
              
              // Cache valide pendant 7 jours
              if (age < 7 * 24 * 60 * 60 * 1000 && parsed.words?.length > 0) {
                console.log('🔄 Utilisation du cache local pour le hard mode');
                this.hardModeWords = parsed.words;
                this.hardModeLoaded = true;
                return of(parsed.words);
              }
            }
          } catch (e) {
            console.warn('⚠️ Erreur lors de la lecture du cache:', e);
          }
        }
        
        // ✅ Fallback : utiliser une liste hard réduite intégrée
        const fallbackHardWords = this.getFallbackHardWords();
        console.log(`🛡️ Utilisation du fallback hard mode: ${fallbackHardWords.length} mots`);
        
        this.hardModeWords = fallbackHardWords;
        this.hardModeLoaded = true;
        
        return of(fallbackHardWords);
      })
    );
  }

  // ✅ Statistiques de répartition par longueur
  private getWordLengthStats(words: string[]): { [length: number]: number } {
    return words.reduce((stats, word) => {
      const len = word.length;
      stats[len] = (stats[len] || 0) + 1;
      return stats;
    }, {} as { [length: number]: number });
  }

  // ✅ Liste de fallback pour le mode hard (mots complexes intégrés)
  private getFallbackHardWords(): string[] {
    return [
      // Mots scientifiques et techniques
      'ALGORITHME', 'MAGNETISME', 'BIOCHIMIE', 'NEUROLOGIE', 'QUANTIQUE', 'RELATIVITE',
      
      // Mots littéraires et culturels
      'METAPHYSIQUE', 'DIALECTIQUE', 'RHETORIQUE', 'SYNECDOQUE', 'METONYMIE', 'ALLEGORIE',
      
      // Mots géographiques complexes
      'ARCHIPEL', 'TOUNDRA', 'ESTUAIRE', 'PENINSULE', 'TOPOGRAPHIE', 'TECTONIQUE',
      
      // Mots médicaux
      'DERMATOLOGIE', 'CARDIOLOGIE', 'PNEUMOLOGIE', 'HEMATOLOGIE', 'ONCOLOGIE', 'PEDIATRIE',
      
      // Mots artistiques
      'SYMPHONIE', 'POLYPHONIE', 'CONTREPOINT', 'HARMONIQUE', 'CHROMATIQUE', 'BAROQUE',
      
      // Mots philosophiques
      'EXISTENTIALISME', 'STRUCTURALISME', 'POSTMODERNISME', 'NIHILISME', 'DETERMINISME', 'PRAGMATISME'
    ];
  }

  // ✅ Obtenir un mot du mode hard GitHub (ancien système)
  private getWordFromGitHubHardMode(): Observable<string> {
    return this.loadHardModeWords().pipe(
      switchMap(words => {
        const availableWords = words.filter(word => !this.hardModeUsedWords.has(word));
        
        if (availableWords.length === 0) {
          console.log('🔄 Tous les mots hard mode utilisés, réinitialisation...');
          this.hardModeUsedWords.clear();
          return this.getWordFromGitHubHardMode();
        }

        // ✅ Favoriser les mots de longueur moyenne (5-7 lettres)
        const preferredWords = availableWords.filter(word => word.length >= 5 && word.length <= 7);
        const wordsToChooseFrom = preferredWords.length > 0 ? preferredWords : availableWords;
        
        const randomWord = wordsToChooseFrom[Math.floor(Math.random() * wordsToChooseFrom.length)];
        console.log(`🔥 Mot hard mode GitHub sélectionné: ${randomWord} (${randomWord.length} lettres)`);
        
        return of(randomWord);
      })
    );
  }

  // ✅ Source de mots premium français (maintenant niveau moyen)
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

  // ✅ Méthode pour essayer les sources selon la difficulté
  private tryWordSources(difficulty: string = 'facile'): Observable<string> {
    // Activer les sources selon la difficulté
    const enabledSources = this.wordSources
      .filter(source => {
        if (difficulty === 'cauchemar' && source.difficulty === 'cauchemar') return true;
        if (difficulty === 'difficile' && source.difficulty === 'difficile') return true;
        if (difficulty === 'moyen' && (source.difficulty === 'moyen' || source.difficulty === 'facile')) return true;
        if (difficulty === 'facile' && source.difficulty === 'facile') return true;
        return false;
      })
      .sort((a, b) => a.priority - b.priority);

    console.log(`🔄 Sources activées pour difficulté "${difficulty}":`, 
      enabledSources.map(s => `${s.name}(${s.priority})`));

    if (enabledSources.length === 0) {
      console.warn('⚠️ Aucune source disponible pour cette difficulté, fallback');
      return this.getWordFromSecurityList();
    }

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

  // ✅ Méthode principale avec support de difficulté - CORRIGÉE
  getRandomWord(difficulty: string = 'facile'): Observable<GameResponse> {
    // Réinitialiser si trop de mots utilisés
    let maxWords: number;
    let usedWordsSet: Set<string>;
    
    if (difficulty === 'cauchemar') {
      maxWords = this.maxCauchemarWords;
      usedWordsSet = this.cauchemarUsedWords;
    } else if (difficulty === 'difficile') {
      maxWords = this.maxHardModeWords;
      usedWordsSet = this.hardModeUsedWords;
    } else {
      maxWords = this.maxUsedWords;
      usedWordsSet = this.usedWords;
    }
    
    if (usedWordsSet.size >= maxWords) {
      usedWordsSet.clear();
    }

    console.log(`🎯 Recherche d'un nouveau mot ${difficulty} (${usedWordsSet.size}/${maxWords} utilisés)`);

    return this.tryWordSources(difficulty).pipe(
      switchMap(word => {
        // Vérifier si le mot a déjà été utilisé récemment
        if (usedWordsSet.has(word) && usedWordsSet.size < maxWords * 0.9) {
          console.log(`⚠️ Mot "${word}" déjà utilisé, nouvel essai...`);
          return this.getRandomWord(difficulty);
        }
        
        // Ajouter le mot aux mots utilisés
        usedWordsSet.add(word);
        console.log(`🎉 Nouveau mot sélectionné: ${word} (${usedWordsSet.size} mots utilisés)`);
        
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

  // ✅ Activer le mode cauchemar avec mots.json
  enableHardMode() {
    console.log('💀 Mode cauchemar activé - géré par TrouveMotService');
    // ✅ CORRECTION - Ne plus essayer de charger mots.json
  }

  disableHardMode() {
    console.log('💀 Mode cauchemar désactivé');
  }

  // ✅ SUPPRIMER ces méthodes si elles existent et causent des erreurs :
  // - loadCauchemarWords()
  // - loadCauchemarWordsFromFile() 
  // - getCauchemarWords()

} // ✅ CORRECTION - Assurer une fermeture correcte de la classe
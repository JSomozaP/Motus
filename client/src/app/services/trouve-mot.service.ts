import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, timeout } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TrouveMotService {
  // ✅ CHANGER LE PORT
  private apiUrl = 'http://localhost:3002/api/proxy/trouve-mot'; // ✅ 3001 → 3002
  private isOnline = true;

  constructor(private http: HttpClient) {}

  // Test de connexion via proxy
  testConnection(): Observable<boolean> {
    return this.http.get<any>(`${this.apiUrl}/test`).pipe(
      timeout(3000),
      map(response => {
        this.isOnline = response.available;
        console.log('🔗 Test connexion via proxy (port 5000):', this.isOnline);
        return this.isOnline;
      }),
      catchError((error) => {
        console.warn('❌ Connexion proxy échouée (port 5000):', error);
        this.isOnline = false;
        return of(false);
      })
    );
  }

  // ✅ Récupérer un mot aléatoire via proxy - CORRIGÉ AVEC VALIDATION
  getRandomWord(): Observable<string> {
    return this.http.get<any>(`${this.apiUrl}/random`).pipe(
      timeout(5000),
      map(response => {
        console.log('🎯 Réponse API via proxy:', response);
        
        // ✅ Traitement correct des réponses de l'API trouve-mot.fr
        if (response && Array.isArray(response) && response.length > 0) {
          const wordData = response[0];
          if (wordData && wordData.name) {
            let word = wordData.name.trim();
            
            // ✅ Nettoyage et validation du mot
            word = this.cleanAndValidateWord(word);
            
            if (word && word.length >= 3 && word.length <= 8) {
              console.log('✅ Mot API externe reçu via proxy:', word);
              return word;
            } else {
              console.warn('⚠️ Mot API externe invalide:', wordData.name, '-> utilisation fallback');
            }
          }
        }
        
        // ✅ Si pas de mot valide de l'API externe, utiliser le fallback local
        console.warn('⚠️ Pas de mot API externe valide, utilisation fallback local');
        const fallbackWord = this.getRandomFallbackWord();
        console.log('🎯 Mot fallback local:', fallbackWord);
        return fallbackWord;
      }),
      catchError((error) => {
        console.error('❌ Erreur API proxy, utilisation fallback:', error);
        // Fallback direct en cas d'erreur
        const fallbackWord = this.getRandomFallbackWord();
        console.log('🎯 Mot fallback après erreur:', fallbackWord);
        return of(fallbackWord);
      })
    );
  }

  // ✅ Nouvelle méthode pour nettoyer et valider les mots
  private cleanAndValidateWord(word: string): string {
    if (!word) return '';
    
    // Supprimer les espaces et convertir en majuscules
    let cleanWord = word.trim().toUpperCase();
    
    // Remplacer les caractères accentués par leurs équivalents
    const accentMap: {[key: string]: string} = {
      'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A',
      'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E',
      'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I',
      'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O',
      'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U',
      'Ç': 'C', 'Ñ': 'N',
      'Œ': 'OE', 'Æ': 'AE'
    };
    
    // Remplacer les accents
    for (const [accented, plain] of Object.entries(accentMap)) {
      cleanWord = cleanWord.replace(new RegExp(accented, 'g'), plain);
    }
    
    // Garder seulement les lettres A-Z
    cleanWord = cleanWord.replace(/[^A-Z]/g, '');
    
    console.log(`🧹 Mot nettoyé: "${word}" -> "${cleanWord}"`);
    return cleanWord;
  }

  // ✅ Nouvelle méthode pour obtenir un mot fallback aléatoire
  private getRandomFallbackWord(): string {
    const fallbackWords = [
      'AZYME', 'FJORD', 'SPHINX', 'TOXIN', 'XENON', 'QUARK', 'DJINN', 'EPOXY',
      'GEYSER', 'WHISKY', 'ZYGOTE', 'KLAXON', 'MYTHE', 'NEXUS', 'OZONE', 'KRILL'
    ];
    return fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
  }

  // ✅ AMÉLIORATION - Récupérer des mots par longueur via proxy
  getWordsByLength(length: number, difficulty: string = 'difficile', maxResults: number = 20): Observable<string[]> {
    // ✅ CORRECTION - Simplifier getWordsByLength pour éviter la confusion
    const apiUrl = `${this.apiUrl}/size/${length}/${maxResults}`;
    console.log(`🎯 Appel API trouve-mot.fr classique: ${apiUrl}`);
    
    return this.http.get<any>(apiUrl).pipe(
      timeout(5000),
      map(response => {
        console.log(`🎯 Réponse API trouve-mot.fr pour ${length} lettres:`, response);
        
        let words: string[] = [];
        
        if (Array.isArray(response)) {
          words = response
            .map(item => {
              let word = '';
              if (typeof item === 'string') {
                word = item;
              } else if (item && item.name) {
                word = item.name;
              }
              return this.cleanAndValidateWord(word);
            })
            .filter(word => word && word.length === length);
        }
        
        // Compléter avec mots locaux si nécessaire
        if (words.length < maxResults) {
          const localWords = this.hardWords.filter(word => word.length === length);
          words = [...words, ...localWords].slice(0, maxResults);
        }
        
        return this.shuffleArray(words);
      }),
      catchError((error) => {
        console.error(`❌ Erreur API pour ${length} lettres:`, error);
        // Fallback direct sur mots locaux
        const localWords = this.hardWords.filter(word => word.length === length);
        return of(this.shuffleArray(localWords).slice(0, maxResults));
      })
    );
  }

  // ✅ NOUVEAU - Méthode spéciale pour cauchemar avec sizemin (minimum 6 lettres)
  getWordsForCauchemar(minLength: number = 6, maxResults: number = 30): Observable<string[]> {
    const apiUrl = `${this.apiUrl}/sizemin/${minLength}/${maxResults}`;
    console.log(`💀 Tentative API cauchemar: ${apiUrl}`);
    
    return this.http.get<any>(apiUrl).pipe(
      timeout(5000),
      map(response => {
        console.log(`💀 Réponse API sizemin OK: ${response?.length || 0} mots`);
        
        let words: string[] = [];
        
        if (Array.isArray(response)) {
          words = response
            .map(item => {
              let word = '';
              if (typeof item === 'string') {
                word = item;
              } else if (item && item.name) {
                word = item.name;
              }
              
              return this.cleanAndValidateWord(word);
            })
            .filter(word => 
              word && 
              word.length >= 6 && 
              word.length <= 12
            );
        }
        
        // Compléter avec mots locaux si nécessaire
        if (words.length < 10) {
          const localLongWords = this.hardWords.filter(word => 
            word.length >= 6 && word.length <= 12
          );
          words = [...words, ...localLongWords];
        }
        
        console.log(`💀 Total mots cauchemar: ${words.length} (6-12L)`);
        return this.shuffleArray(words).slice(0, maxResults);
      }),
      catchError((error) => {
        console.log(`💀 API indisponible, utilisation mots locaux (${this.hardWords.filter(w => w.length >= 6 && w.length <= 12).length} mots)`);
        
        // Fallback sur mots locaux longs
        const localWords = this.hardWords.filter(word => 
          word.length >= 6 && word.length <= 12
        );
        return of(this.shuffleArray(localWords).slice(0, maxResults));
      })
    );
  }

  // ✅ Méthode alternative simplifiée
  getWordsByLengthAlternative(length: number): Observable<string[]> {
    console.log('🔄 Utilisation mots locaux difficiles...');
    const filtered = this.hardWords.filter(word => word.length === length);
    return of(this.shuffleArray(filtered).slice(0, 20));
  }

  // ✅ Échantillons pour prévisualisation
  getSampleWords(difficulty: string, count: number = 3): Observable<string[]> {
    // Utiliser directement des mots locaux pour les échantillons (rapide)
    const samples = this.shuffleArray(this.hardWords.filter(w => w.length === 5)).slice(0, count);
    console.log('🎯 Échantillons générés:', samples);
    return of(samples);
  }

  // ✅ Collection étendue de mots français difficiles
  private hardWords = [
    // 3 lettres
    'AXE', 'BYE', 'GYM', 'HIE', 'IFS', 'JEU', 'KIT', 'LAX', 'MYE', 'NET',
    'OXY', 'PYX', 'QUI', 'RYE', 'SYN', 'TYP', 'UNE', 'VEX', 'WAX', 'XIE', 'YEU', 'ZUT',
    
    // 4 lettres
    'AXER', 'CZAR', 'DYKE', 'EXAM', 'FAUX', 'GYMS', 'HOUX', 'IBEX', 'JAZZ', 'KIWI', 
    'LYNX', 'MAXI', 'NIXE', 'ONYX', 'PRIX', 'QUAI', 'RIXE', 'SEXY', 'TAXI', 'UNIX', 
    'VAUX', 'WAXY', 'XIEN', 'YEUX', 'ZULU',
    
    // 5 lettres
    'AZYME', 'BANJO', 'CAJOU', 'DJINN', 'EPOXY', 'FJORD', 'GNOME', 'HYMEN', 'ICHOR', 'JOKER',
    'KRILL', 'LUXER', 'MYTHE', 'NEXUS', 'OZONE', 'PIXEL', 'QUARK', 'RYTHM', 'SPHINX', 'TOXIN',
    'ULEMA', 'VORTEX', 'WHISKY', 'XENON', 'YACHT', 'ZINZIN', 'AZOTE', 'BUXUS', 'CYCAD', 'DRUZE',
    'FUZZY', 'GEYSER', 'HAPAX', 'IAMBE', 'JULEP', 'KYSTE', 'LATEX', 'MUZAK', 'NIXES', 'OPIUM',
    
    // ✅ AJOUT MASSIF - 6 lettres pour cauchemar
    'ABAQUE', 'ABSOLU', 'ABSENT', 'ABSOUS', 'ABYSME', 'ACACIA', 'ACCRUE', 'ACHEVE', 'ACIDUS', 'ACIERU',
    'ACTION', 'ADAGIO', 'ADAPTE', 'ADBUCE', 'ADHERE', 'ADJURE', 'ADMIRE', 'ADOPTE', 'ADROIT', 'ADULTE',
    'AERAGE', 'AERIEN', 'AFFAME', 'AFFINE', 'AFGANI', 'AGRAFE', 'AGRUME', 'AHURIE', 'AIGREUR', 'AILIER',
    'AZIMUT', 'BENZOL', 'COGNAC', 'DJEBEL', 'EXQUIS', 'FJORDS', 'GEYSER', 'HIJABS', 'ICONES', 'JOVIAL',
    'KLAXON', 'LUXURE', 'MYTHES', 'NAPALM', 'OXYDES', 'PIXELS', 'QUARTZ', 'RYTHME', 'TOXINE', 'UKASES',
    'VELOUR', 'WHISKY', 'XYLENE', 'YUCQUE', 'ZEPHYR', 'ZOMBIE', 'ZOUTER', 'ZYGOTE', 'ZYMASE', 'ZYXEUX',
    
    // ✅ AJOUT MASSIF - 7 lettres pour cauchemar
    'ABYSSES', 'ACCORDE', 'ACHETER', 'ACQUISE', 'ACTIVER', 'ADAPTER', 'ADHERER', 'ADJOINT', 'ADMIRER', 'ADOPTER',
    'AEROBIC', 'AEROSOL', 'AFFAIRE', 'AFFICHE', 'AFFREUX', 'AGENCER', 'AGRIPPE', 'AHURICH', 'AJOURNER', 'ALARMER',
    'AZIMUTS', 'BENZOLS', 'CYCLONE', 'DJEBELS', 'EXQUISE', 'GEYSERS', 'HYPOXIE', 'ISOTOPE', 'JAZZMEN',
    'KLAXONS', 'MYXOMES', 'NAPALMS', 'OXYURES', 'PYXIDES', 'QUETZAL', 'RYTHMES', 'TOXINES', 'VAMPIRE',
    'WHISKEY', 'XYLENES', 'YACHTING', 'ZEALOTE', 'ZIEUTER', 'ZONAGES', 'ZONARDS', 'ZOZOTER', 'ZYGOMAS',
    
    // ✅ AJOUT MASSIF - 8 lettres pour cauchemar
    'ABATTOIR', 'ABONNERA', 'ABORDAGE', 'ABSTRACT', 'ABSURDE', 'ACCIDENT', 'ACCORDER', 'ACHETEUR', 'ACIDULER', 'ACQUIERT',
    'ACTIVERA', 'ADAPTEUR', 'ADHERENT', 'ADJUGER', 'ADMIRERA', 'ADOPTIVE', 'AERIENNE', 'AFFICHER', 'AFFRONTE', 'AGENCEUR',
    'ABSINTHE', 'BYZANTINE', 'COMPLEXE', 'DYNAMITE', 'EXORCISE', 'FREQUENCE', 'GLYOXYLE', 'HYPNOTIC',
    'ISOCLINE', 'JACINTHE', 'KRYPTONE', 'LUXUEUX', 'MAXIMUM', 'NOCTULE', 'OXIDANT', 'PHYLUMS',
    'QUETZALS', 'RHYTHMES', 'SYNODAL', 'TOXIQUE', 'URANIUM', 'VORTICES', 'WHISKEYS', 'XANTHINE',
    'YACHTING', 'ZYGOMAS', 'ZYMOTIQUE', 'ZYTHUME',
    
    // ✅ AJOUT MASSIF - 9 lettres pour cauchemar
    'ABANDONNER', 'ABBREVIER', 'ABDICQUER', 'ABDUCTION', 'ABERRATION', 'ABOLITION', 'ABONDANCE', 'ABONNEMENT', 'ABORDABLE', 'ABOUTIQUE',
    'ABREUVOIR', 'ABRICOTIER', 'ABSCONDIT', 'ABSOLUTISME', 'ABSTINENCE', 'ACCABLEMENT', 'ACCELERER', 'ACCENTUER', 'ACCEPTEUR', 'ACCESSOIRE',
    'ASYMETRIE', 'BYZANTINE', 'COMPLEXES', 'EXCENTRIQUE', 'FREQUENCY', 'GLYCERINE', 'HYPNOTIZE',
    'IZQUIERDA', 'JUXTAPOSE', 'KRYOLITE', 'LUXURIEUX', 'MYSTERIUM', 'NEOLATINE', 'OXYMORRON',
    'PARADOXAL', 'QUIPROQUO', 'RHAPSODIC', 'SYNCHRONE', 'TECHNIQUE', 'UNANIMITE', 'VERTICALE',
    'WHIRLPOOL', 'XYLOPHONE', 'YACKETING', 'ZEALOTISM', 'ZYMOLOGIE',
    
    // ✅ AJOUT MASSIF - 10 lettres pour cauchemar
    'ABANDONNEE', 'ABBREVIATION', 'ABDICATION', 'ABERRANTES', 'ABOLITISME', 'ABONDANTES', 'ABONNEMENTS', 'ABORDABLES', 'ABREVIATEUR', 'ABRICOTIERS',
    'ABREVIATION', 'BIOCHEMIQUE', 'CRYPTOGRAMME', 'EXORBITANTE', 'GYNAECOLOGIE', 'HYPERTROPHIE',
    'LEXICOGRAPHE', 'PSYCHOLOGIE', 'SYNCHRONISME', 'XYLOGRAPHIE', 'ZOOTECHNIE', 'ZYGOMORPHE',
    
    // ✅ AJOUT MASSIF - 11 lettres pour cauchemar
    'ABANDONNANT', 'ABDICATIONS', 'ABERRATIONS', 'ABOLITIONS', 'ABONDAMMENT', 'ABONNEMENTS', 'ABREVIATIONS', 'ABRICOTIERS',
    'ACCELERATION', 'ACCENTUATION', 'ACCEPTATION', 'ACCESSOIRES', 'ACCLAMATION', 'ACCLIMATENT', 'ACCOMPAGNER', 'ACCORDEMENT',
    'BIOCHIMIQUE', 'CRYPTOGRAMMES', 'EXORBITANTES', 'GYNAECOLOGIES', 'HYPERTROPHIES', 'LEXICOGRAPHES',
    'PSYCHOLOGIES', 'SYNCHRONISMES', 'XYLOGRAPHIES', 'ZIRCALLOYES', 'ZOANTHAIRES',
    
    // ✅ AJOUT MASSIF - 12 lettres pour cauchemar
    'ABANDONNATES', 'ABDICATIONS', 'ABERRATIONS', 'ABOLITIONS', 'ABONNEMENTS', 'ABREVIATIONS', 'ABRICOTIERS',
    'ACCELERATIONS', 'ACCENTUATIONS', 'ACCEPTATIONS', 'ACCESSOIRES', 'ACCLAMATIONS', 'ACCLIMATENT', 'ACCOMPAGNENT', 'ACCORDEMENTS',
    'ACCOMPLISSEMENT', 'ACCOUCHEMENTS', 'ACCOUTUMANCES', 'ACCREDITATIONS', 'ACCROISSEMENT', 'ACCULTURATION', 'ACCUMULATIONS', 'ACCUSATIONS',
    'BIOCHIMIQUES', 'CRYPTOGRAMMES', 'EXORBITANTES', 'GYNAECOLOGIES', 'HYPERTROPHIES', 'LEXICOGRAPHES',
    'PSYCHOLOGIES', 'SYNCHRONISMES', 'XYLOGRAPHIES', 'ZIRCONIUMATE', 'ZOANTHROPIES'
  ];

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // ✅ Gestion d'erreur améliorée avec fallback automatique
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    console.error('❌ Erreur API trouve-mot via proxy:', error);
    this.isOnline = false;
    return throwError(() => new Error('Erreur API trouve-mot.fr via proxy'));
  };
}
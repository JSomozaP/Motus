import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, timeout } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TrouveMotService {
  private apiUrl = 'http://localhost:5000/api/proxy/trouve-mot';
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

  // ✅ Récupérer des mots par longueur via proxy - CORRIGÉ AVEC VALIDATION
  getWordsByLength(length: number, difficulty: string = 'difficile', maxResults: number = 20): Observable<string[]> {
    return this.http.get<any>(`${this.apiUrl}/longueur/${length}`).pipe(
      timeout(5000),
      map(response => {
        console.log('🎯 Mots par longueur via proxy:', response);
        
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
              
              // ✅ Nettoyer et valider chaque mot
              return this.cleanAndValidateWord(word);
            })
            .filter(word => word && word.length === length); // ✅ Filtrer par longueur exacte
        }
        
        // ✅ Si pas assez de mots, compléter avec des mots locaux
        if (words.length < maxResults) {
          const localWords = this.hardWords.filter(word => word.length === length);
          words = [...words, ...localWords].slice(0, maxResults);
        }
        
        console.log(`✅ ${words.length} mots de ${length} lettres récupérés`);
        return this.shuffleArray(words).slice(0, maxResults);
      }),
      catchError((error) => {
        console.error('❌ Erreur mots par longueur, fallback local:', error);
        // Fallback complet vers mots locaux
        const localWords = this.hardWords.filter(word => word.length === length);
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
    
    // 6 lettres
    'AZIMUT', 'BENZOL', 'COGNAC', 'DJEBEL', 'EXQUIS', 'FJORDS', 'GEYSER', 'HIJABS', 'ICONES', 'JOVIAL',
    'KLAXON', 'LUXURE', 'MYTHES', 'NAPALM', 'OXYDES', 'PIXELS', 'QUARTZ', 'RYTHME', 'TOXINE', 'UKASES',
    
    // 7 lettres
    'AZIMUTS', 'BENZOLS', 'CYCLONE', 'DJEBELS', 'EXQUISE', 'GEYSERS', 'HYPOXIE', 'ISOTOPE', 'JAZZMEN',
    'KLAXONS', 'MYXOMES', 'NAPALMS', 'OXYURES', 'PYXIDES', 'QUETZAL', 'RYTHMES', 'TOXINES'
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
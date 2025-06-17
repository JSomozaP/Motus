import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DatamuseService {
  private readonly API_BASE_URL = 'https://api.datamuse.com/words';
  private readonly TIMEOUT_MS = 5000;

  constructor(private http: HttpClient) {}

  // ✅ CORRECTION - Utiliser les paramètres supportés par Datamuse
  getWordsByDifficulty(
    length: number = 5, 
    difficulty: string = 'difficile', 
    maxResults: number = 20
  ): Observable<string[]> {
    
    console.log(`🔥 Recherche de mots français de ${length} lettres via Datamuse...`);
    
    // ✅ Paramètres VALIDES pour Datamuse
    let params = new HttpParams()
      .set('sp', '?'.repeat(length)) // Longueur exacte
      .set('max', maxResults.toString());

    // ✅ Utiliser des mots avec des lettres françaises communes
    if (difficulty === 'difficile') {
      // Rechercher des mots moins fréquents
      params = params.set('topics', 'literature,science,art'); // Topics valides
    }

    const url = `${this.API_BASE_URL}?${params.toString()}`;
    console.log('🌐 URL Datamuse:', url);

    return this.http.get<Array<{word: string, score?: number}>>(url).pipe(
      timeout(this.TIMEOUT_MS),
      map(response => {
        console.log('📡 Réponse brute Datamuse:', response);
        
        if (!response || !Array.isArray(response)) {
          throw new Error('Format de réponse invalide');
        }

        // ✅ Filtrage pour des mots français probables
        const filteredWords = response
          .map(item => item.word?.toUpperCase().trim())
          .filter(word => {
            if (!word) return false;
            
            // ✅ Critères pour identifier des mots français
            return (
              word.length === length && // Longueur exacte
              /^[A-Z]+$/.test(word) && // Lettres uniquement
              !word.includes('-') && // Pas de tirets
              !word.includes(' ') && // Pas d'espaces
              !word.includes('_') && // Pas d'underscores
              !/^\d/.test(word) && // Pas de nombres
              this.isProbablyFrench(word) // ✅ Vérification française
            );
          })
          .slice(0, Math.min(maxResults, 50)); // Limiter le nombre

        console.log(`✅ Mots filtrés (${filteredWords.length}):`, filteredWords);
        
        if (filteredWords.length === 0) {
          throw new Error('Aucun mot français trouvé');
        }

        return filteredWords;
      }),
      catchError(error => {
        console.error('❌ Erreur Datamuse:', error);
        
        // ✅ Fallback avec mots français difficiles intégrés
        const fallbackWords = this.getFrenchFallbackWords(length);
        console.log(`🛡️ Utilisation du fallback français (${fallbackWords.length} mots)`);
        
        return of(fallbackWords);
      })
    );
  }

  // ✅ Vérification pour identifier des mots probablement français
  private isProbablyFrench(word: string): boolean {
    // Mots anglais courants à éviter absolument
    const commonEnglishWords = [
      'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE',
      'OUR', 'HAD', 'WHAT', 'SAID', 'EACH', 'WHICH', 'SHE', 'HOW', 'ITS', 'WHO', 'USE',
      'MANY', 'DAY', 'GET', 'HAS', 'HIM', 'HIS', 'MAN', 'NEW', 'NOW', 'OLD', 'SEE', 'TWO',
      'WAY', 'MAY', 'SAY', 'MAKE', 'MOST', 'OVER', 'SOME', 'TIME', 'VERY', 'WHEN', 'COME',
      'HERE', 'JUST', 'LIKE', 'LONG', 'THAN', 'THEM', 'WELL', 'WERE', 'BEEN', 'HAVE',
      'THEIR', 'WOULD', 'THERE', 'COULD', 'OTHER', 'AFTER', 'FIRST', 'NEVER', 'THESE',
      'THINK', 'WHERE', 'BEING', 'EVERY', 'GREAT', 'MIGHT', 'SHALL', 'STILL', 'THOSE',
      'UNDER', 'WHILE', 'HOUSE', 'WORLD', 'ABOUT', 'AGAIN', 'WATER', 'FOUND', 'HEARD',
      'RIGHT', 'MUSIC', 'PLACE', 'YOUNG', 'STATE', 'NEVER', 'SMALL', 'SOUND', 'NIGHT'
    ];

    // Rejeter les mots anglais courants
    if (commonEnglishWords.includes(word)) {
      return false;
    }

    // Patterns qui suggèrent un mot français
    const frenchIndicators = [
      /EAU$/, // Terminaisons françaises
      /EUR$/, /TION$/, /SION$/, /MENT$/, /IQUE$/, /OIRE$/, /AIRE$/, /ETTE$/, /ELLE$/,
      /^CH/, /^QU/, /^PH/, // Débuts français courants
      /GN/, /QU/, /CH/, /PH/, /TH/, // Combinaisons françaises
      /J/, /Y/, /Z/, // Lettres moins courantes en anglais
    ];

    // Patterns qui suggèrent un mot anglais
    const englishIndicators = [
      /ING$/, /TION$/, /LY$/, /ED$/, /ER$/, /EST$/, /AL$/, /IC$/, /ABLE$/, /IBLE$/,
      /^TH/, /^WH/, /^SH/, /CK/, /GH/, /PH/, /TCH/, /DGE/,
      /[QWXY]/, // Lettres rares en français
    ];

    // Calculer un score de "françaisité"
    let frenchScore = 0;
    let englishScore = 0;

    frenchIndicators.forEach(pattern => {
      if (pattern.test(word)) frenchScore++;
    });

    englishIndicators.forEach(pattern => {
      if (pattern.test(word)) englishScore++;
    });

    // Bonus pour les voyelles françaises
    if (/[AEIOU]/.test(word)) frenchScore += 0.5;
    
    // Malus pour certaines combinaisons anglaises
    if (/[QWXY]/.test(word) && !/QU/.test(word)) englishScore += 2;

    console.log(`🔍 "${word}" - Score FR: ${frenchScore}, EN: ${englishScore}`);
    
    // Favoriser les mots avec plus d'indicateurs français
    return frenchScore >= englishScore;
  }

  // ✅ Mots français difficiles de fallback par longueur
  private getFrenchFallbackWords(length: number): string[] {
    const wordsByLength: { [key: number]: string[] } = {
      3: ['EAU', 'FEU', 'JEU', 'NEZ', 'YEU', 'ROI'],
      4: ['FAUX', 'EAUX', 'YEUX', 'POUX', 'JOUE', 'COEUR', 'BOEUF', 'OEUF'],
      5: ['CIEUX', 'ADIEU', 'BIJOU', 'GENOU', 'HIBOU', 'CAILLOU', 'JOUJOU', 'CHEVEU'],
      6: ['BATEAU', 'MANTEAU', 'RIDEAU', 'CADEAU', 'PLATEAU', 'COUTEAU', 'CISEAU', 'RESEAU'],
      7: ['OISEAU', 'NOUVEAU', 'TABLEAU', 'NIVEAU', 'BUREAU', 'CHATEAU', 'MARTEAU', 'ROULEAU'],
      8: ['QUESTION', 'FRANCAIS', 'HISTOIRE', 'PREMIERE', 'DERNIERE', 'LUMIERE', 'MYSTERE', 'CARACTERE'],
      9: ['QUESTIONNAIRE', 'TECHNIQUE', 'POLITIQUE', 'ECONOMIQUE', 'STATISTIQUE', 'ARTISTIQUE', 'POETIQUE', 'THEORIQUE'],
      10: ['METHODOLOGIE', 'TECHNOLOGIE', 'PSYCHOLOGIE', 'SOCIOLOGIE', 'ARCHEOLOGIE', 'METEOROLOGIE', 'TERMINOLOGIE', 'PHRASEOLOGIE']
    };

    let words = wordsByLength[length] || [];
    
    // Si pas assez de mots pour cette longueur, compléter avec des mots proches
    if (words.length < 8) {
      // Essayer longueur -1 et +1
      const nearbyWords = [
        ...(wordsByLength[length - 1] || []),
        ...(wordsByLength[length + 1] || [])
      ];
      words = [...words, ...nearbyWords];
    }

    // Si toujours pas assez, utiliser des mots de toutes longueurs
    if (words.length < 5) {
      words = Object.values(wordsByLength).flat();
    }

    return words.slice(0, 20); // Retourner au maximum 20 mots
  }

  // ✅ Test de connexion simplifié
  testConnection(): Observable<boolean> {
    console.log('🧪 Test de connexion Datamuse...');
    
    // Test simple sans paramètres problématiques
    const testParams = new HttpParams()
      .set('sp', '????') // 4 lettres
      .set('max', '1');

    return this.http.get<any[]>(`${this.API_BASE_URL}?${testParams.toString()}`).pipe(
      timeout(3000),
      map(response => {
        const isAvailable = Array.isArray(response) && response.length > 0;
        console.log(`🧪 Test Datamuse: ${isAvailable ? '✅ Disponible' : '❌ Indisponible'}`);
        return isAvailable;
      }),
      catchError(error => {
        console.log('🧪 Test Datamuse: ❌ Échec -', error.message);
        return of(false);
      })
    );
  }

  // ✅ Méthode pour obtenir des échantillons
  getSampleWords(difficulty: string, count: number = 3): Observable<string[]> {
    return this.getWordsByDifficulty(
      5, // Longueur fixe pour les échantillons
      difficulty,
      count * 3 // Demander plus pour avoir plus de choix
    ).pipe(
      map(words => words.slice(0, count))
    );
  }

  // ✅ Méthode de débogage simplifiée
  debugApiCall(): Observable<any> {
    console.log('🔍 Debug: Test API Datamuse basique...');
    
    const simpleParams = new HttpParams()
      .set('sp', '?????') // 5 lettres
      .set('max', '10');
    
    const url = `${this.API_BASE_URL}?${simpleParams.toString()}`;
    console.log('🔍 URL de test:', url);
    
    return this.http.get<any[]>(url).pipe(
      timeout(5000),
      map(response => {
        console.log('🔍 Réponse API brute:', response);
        return response;
      }),
      catchError(error => {
        console.error('🔍 Erreur API:', error);
        return of([]);
      })
    );
  }
}
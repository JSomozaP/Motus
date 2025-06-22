import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs'; // ✅ IMPORTS NÉCESSAIRES
import { catchError, map } from 'rxjs/operators'; // ✅ IMPORTS NÉCESSAIRES

export interface MotusWord {
  id: number;
  mot: string;
  difficulte: string;
  lettres: number;
}

export interface MotusPartie {
  id: number;
  mot: MotusWord;
  userId: number;
  dateCreation: string;
}

@Injectable({
  providedIn: 'root'
})
export class MotusApiService {
  private baseUrl = 'http://localhost:3002/api';

  constructor(private http: HttpClient) {}

  // 🔍 Test de connexion général
  testConnection(): Observable<any> {
    return this.http.get(`${this.baseUrl}/db/test`);
  }

  // 🎯 Récupérer un mot aléatoire
  getRandomWord(): Observable<MotusWord> {
    return this.http.get<MotusWord>(`${this.baseUrl}/db/mots/random`);
  }

  // 🎮 Créer une nouvelle partie
  createGame(userId: number, difficulty: string): Observable<{message: string, partie: MotusPartie}> {
    return this.http.post<{message: string, partie: MotusPartie}>(`${this.baseUrl}/parties/nouvelle`, {
      userId,
      difficulte: difficulty
    });
  }

  // 🏆 Enregistrer un score
  saveScore(userId: number, score: number, temps: number, motId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/scores/enregistrer`, {
      userId,
      score,
      temps,
      motId
    });
  }

  // 👤 Récupérer un utilisateur
  getUser(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/users/${id}`);
  }

  // 📊 Statistiques des mots
  getWordStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/stats/mots`);
  }
}
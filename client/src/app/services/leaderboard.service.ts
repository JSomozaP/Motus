import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs'; // ✅ AJOUTEZ 'of'
import { map, catchError } from 'rxjs/operators'; // ✅ AJOUTEZ 'map, catchError'
import { environment } from '../../environments/environment';

export interface LeaderboardEntry {
  id: number;
  score: number;
  login: string;
  difficulty: string;
  words_found: number;
  date_achieved: string;
}

export interface UserStats {
  total_games: number;
  avg_score: number;
  best_score: number;
  total_words_found: number;
}

@Injectable({
  providedIn: 'root'
})
export class LeaderboardService {
  // ✅ DIRECT PORT UPDATE
  private apiUrl = 'http://localhost:3002/api/leaderboard';

  constructor(private http: HttpClient) {}

  // ✅ RÉCUPÉRER LE CLASSEMENT GLOBAL
  getGlobalLeaderboard(): Observable<LeaderboardEntry[]> {
    return this.http.get<LeaderboardEntry[]>(`${this.apiUrl}/global`);
  }

  // ✅ AJOUTER UN SCORE
  addScore(scoreData: {
    user_id: number;
    login: string;
    score: number;
    words_found: number;
    difficulty: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/add-score`, scoreData);
  }

  // ✅ CLASSEMENT PAR DIFFICULTÉ
  getLeaderboardByDifficulty(difficulty: string): Observable<LeaderboardEntry[]> {
    return this.http.get<LeaderboardEntry[]>(`${this.apiUrl}/by-difficulty/${difficulty}`);
  }

  // ✅ STATISTIQUES UTILISATEUR
  getUserStats(userId: number): Observable<UserStats> {
    return this.http.get<UserStats>(`${this.apiUrl}/user-stats/${userId}`);
  }

  // ✅ MÉTHODE DE TEST AVEC IMPORTS CORRECTS
  testConnection(): Observable<boolean> {
    return this.http.get(`${this.apiUrl}/test`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }
}
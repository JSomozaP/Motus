import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Interfaces pour les réponses de l'API
interface GameResponse {
  hint: string;
  length: number;
  gameId: number;
  remainingAttempts: number;
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

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private apiUrl = 'http://localhost:5000/api/game';

  constructor(private http: HttpClient) {}

  getRandomWord(difficulty: string = 'facile'): Observable<GameResponse> {
    return this.http.get<GameResponse>(`${this.apiUrl}/word`, {
      params: { difficulty }
    });
  }

  submitGuess(guess: string, gameId: number, attempts: number): Observable<GuessResponse> {
    return this.http.post<GuessResponse>(`${this.apiUrl}/check`, {
      guess,
      gameId,
      attempts
    });
  }

  // Autres méthodes potentielles pour le tableau des scores, historique, etc.
  getLeaderboard(): Observable<any> {
    return this.http.get(`${this.apiUrl}/leaderboard`);
  }

  getPlayerHistory(): Observable<any> {
    return this.http.get(`${this.apiUrl}/history`);
  }

  getPlayerStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats`);
  }
}
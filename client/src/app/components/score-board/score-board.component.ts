import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LeaderboardService, LeaderboardEntry } from '../../services/leaderboard.service';

@Component({
  selector: 'app-score-board',
  templateUrl: './score-board.component.html',
  styleUrls: ['./score-board.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class ScoreBoardComponent implements OnInit {
  scores: LeaderboardEntry[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(private leaderboardService: LeaderboardService) {}

  ngOnInit() {
    this.loadLeaderboard();
  }

  loadLeaderboard() {
    this.isLoading = true;
    this.errorMessage = '';

    this.leaderboardService.getGlobalLeaderboard().subscribe({
      next: (data) => {
        console.log('🏆 Leaderboard chargé:', data);
        this.scores = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Erreur chargement leaderboard:', error);
        this.errorMessage = 'Impossible de charger le classement';
        this.isLoading = false;
      }
    });
  }

  refreshLeaderboard() {
    this.loadLeaderboard();
  }
}
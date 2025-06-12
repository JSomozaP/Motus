import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Score {
  username: string;
  score: number;
  date: Date;
}

@Component({
  selector: 'app-score-board',
  templateUrl: './score-board.component.html',
  styleUrls: ['./score-board.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class ScoreBoardComponent implements OnInit {
  scores: Score[] = [];
  isLoading = false;
  errorMessage = '';

  ngOnInit() {
    // TODO: Charger les scores depuis l'API
    this.scores = [
      { username: 'Joueur 1', score: 100, date: new Date() },
      { username: 'Joueur 2', score: 80, date: new Date() }
    ];
  }
}
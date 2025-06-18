import { Routes } from '@angular/router';
import { GameGridComponent } from './components/game-grid/game-grid.component';
import { ScoreBoardComponent } from './components/score-board/score-board.component';

export const routes: Routes = [
  { path: '', component: GameGridComponent },
  { path: 'game', component: GameGridComponent },
  { path: 'leaderboard', component: ScoreBoardComponent },
  { path: 'scores', redirectTo: '/leaderboard' },
  { path: '**', redirectTo: '' }
];
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GameGridComponent } from './components/game-grid/game-grid.component';
import { ScoreBoardComponent } from './components/score-board/score-board.component';

const routes: Routes = [
  { path: '', component: GameGridComponent },
  { path: 'game', component: GameGridComponent },
  { path: 'leaderboard', component: ScoreBoardComponent }, // ✅ CHANGÉ: scores → leaderboard
  { path: 'scores', redirectTo: '/leaderboard' }, // ✅ REDIRECTION pour compatibilité
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
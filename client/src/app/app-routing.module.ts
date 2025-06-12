import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GameGridComponent } from './components/game-grid/game-grid.component';
import { ScoreBoardComponent } from './components/score-board/score-board.component';

const routes: Routes = [
  { path: '', redirectTo: '/game', pathMatch: 'full' },
  { path: 'game', component: GameGridComponent },
  { path: 'scores', component: ScoreBoardComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
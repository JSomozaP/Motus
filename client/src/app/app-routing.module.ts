import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GameGridComponent } from './components/game-grid/game-grid.component';
import { ScoreBoardComponent } from './components/score-board/score-board.component';
import { LoginComponent } from './components/login/login.component';

const routes: Routes = [
  { path: '', component: GameGridComponent }, // ✅ Page principale avec modal
  { path: 'game', component: GameGridComponent },
  { path: 'scores', component: ScoreBoardComponent },
  { path: '**', redirectTo: '/login' } // ✅ Fallback vers login
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
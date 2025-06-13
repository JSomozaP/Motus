import { Routes } from '@angular/router';
import { GameGridComponent } from './components/game-grid/game-grid.component';

export const routes: Routes = [
  { path: '', component: GameGridComponent },
  { path: 'game', component: GameGridComponent },
  { path: '**', redirectTo: '' }
];
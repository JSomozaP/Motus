import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameGridComponent } from './components/game-grid/game-grid.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, GameGridComponent], // ✅ RouterOutlet retiré car non utilisé
  template: `
    <div class="app-container">
      <app-game-grid></app-game-grid>
    </div>
  `,
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Motus';
}
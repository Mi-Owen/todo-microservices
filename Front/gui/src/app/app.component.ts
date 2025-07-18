import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // necesario para ngClass
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ButtonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'] // CORRECTO: styleUrls con "s"
})
export class AppComponent {
  title = 'gui';
  isDarkMode = false;

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;

    const element = document.querySelector('html');
    if (element) {
      if (this.isDarkMode) {
        element.classList.add('my-app-dark');
      } else {
        element.classList.remove('my-app-dark');
      }
    }
  }
}

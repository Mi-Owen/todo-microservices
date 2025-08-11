import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { LogsDashboardComponent } from '../../../../pages/logs-dashboard/logs-dashboard.component';  

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [TooltipModule, DialogModule, ButtonModule, LogsDashboardComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  displayLogsModal = false;

  constructor(private router: Router) {}

  showLogs() {
    this.displayLogsModal = true;
  }

  hideLogs() {
    this.displayLogsModal = false;
  }

  logout(): void {
    this.router.navigate(['/auth/login']);
  }
}

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LogsDashboardComponent } from './logs-dashboard.component';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';


import { environment } from '../../../environments/environment';

@NgModule({
  declarations: [LogsDashboardComponent],
  imports: [
    CommonModule,
    CardModule,
    ChartModule
  ],
  exports: [LogsDashboardComponent]
})
export class LogsDashboardModule {}

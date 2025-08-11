import { Component, OnInit } from '@angular/core';
import { FirestoreLogsService, LogEntry } from './firestore-logs.service';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';

@Component({
  selector: 'app-logs-dashboard',
  standalone: true,   // <---- Aquí
  imports: [CommonModule, CardModule, ChartModule], // <---- Aquí importas lo necesario
  templateUrl: './logs-dashboard.component.html',
  styleUrls: ['./logs-dashboard.component.css']
})

export class LogsDashboardComponent implements OnInit {
  logs: LogEntry[] = [];

  // Métricas
  totalLogs = 0;
  statusCounts: Record<string, number> = {};
  avgResponseTime = 0;
  minResponseTime = Number.MAX_VALUE;
  apiUsageCount: Record<string, number> = {};

  // Datos para gráficas PrimeNG
  statusChartData: any;
  responseTimeChartData: any;
  apiUsageChartData: any;

  constructor(private logsService: FirestoreLogsService) {}

  ngOnInit() {
    this.logsService.getLogs().subscribe(logs => {
      this.logs = logs;

      this.processMetrics();
      this.prepareCharts();
    }, error => {
      console.error('Error al obtener logs:', error);
    });
  }

  processMetrics() {
    this.totalLogs = this.logs.length;

    let totalTime = 0;
    this.statusCounts = {};
    this.apiUsageCount = {};
    this.minResponseTime = Number.MAX_VALUE;

    this.logs.forEach(log => {
      // Contar status codes
      this.statusCounts[log.status] = (this.statusCounts[log.status] || 0) + 1;

      // Response time
      totalTime += log.response_time;
      if (log.response_time < this.minResponseTime) this.minResponseTime = log.response_time;

      // API usage (por ruta)
      this.apiUsageCount[log.path] = (this.apiUsageCount[log.path] || 0) + 1;
    });

    this.avgResponseTime = this.totalLogs > 0 ? totalTime / this.totalLogs : 0;
  }

  prepareCharts() {
    // Status codes chart (barra)
    this.statusChartData = {
      labels: Object.keys(this.statusCounts),
      datasets: [{
        label: 'Cantidad de status codes',
        data: Object.values(this.statusCounts),
        backgroundColor: ['#42A5F5', '#66BB6A', '#FFA726', '#EF5350', '#AB47BC']
      }]
    };

    // Response time chart (líneas)
    const times = this.logs.map(l => l.response_time);
    this.responseTimeChartData = {
      labels: this.logs.map(l => l.timestamp),
      datasets: [{
        label: 'Response Time (s)',
        data: times,
        fill: false,
        borderColor: '#42A5F5',
        tension: 0.3
      }]
    };

    // API usage chart (pastel)
    this.apiUsageChartData = {
      labels: Object.keys(this.apiUsageCount),
      datasets: [{
        label: 'Uso de APIs',
        data: Object.values(this.apiUsageCount),
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56',
          '#4BC0C0', '#9966FF', '#FF9F40'
        ]
      }]
    };
  }

  getMostUsedApi() {
    return Object.entries(this.apiUsageCount).reduce((a, b) => a[1] > b[1] ? a : b, ['', 0])[0] || 'N/A';
  }

  getLeastUsedApi() {
    return Object.entries(this.apiUsageCount).reduce((a, b) => a[1] < b[1] ? a : b, ['', Infinity])[0] || 'N/A';
  }
}

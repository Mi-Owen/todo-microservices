// src/app/pages/logs-dashboard/firestore-logs.service.ts
import { Injectable, inject } from '@angular/core';
import { Firestore, collectionData, collection } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface LogEntry {
  timestamp: string;
  method: string;
  path: string;           // coincide con Firestore
  status: number;
  response_time: number;  // coincide con Firestore
  user: string;
}

@Injectable({
  providedIn: 'root'
})
export class FirestoreLogsService {
  private firestore = inject(Firestore);

  getLogs(): Observable<LogEntry[]> {
    const logsCollection = collection(this.firestore, 'apigateway_logs');
    return collectionData(logsCollection, { idField: 'id' }) as Observable<LogEntry[]>;
  }
}

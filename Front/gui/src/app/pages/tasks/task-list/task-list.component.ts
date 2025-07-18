import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SplitterModule } from 'primeng/splitter';
import { Task } from '../../../core/models/task.model';
import { TasksService } from '../tasks.service';
import { PanelModule } from 'primeng/panel';


interface KanbanTask {
  id: number;
  name: string;
  description: string;
  create_at: string;
  deadline: string;
  color: string;
}

interface KanbanColumn {
  header: string;
  tasks: KanbanTask[];
}

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SplitterModule,
    PanelModule
  ],
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.css']
})
export class TaskListComponent implements OnInit {
  kanbanBoard: KanbanColumn[] = [];

  ngOnInit(): void {
    // Datos fijos (estáticos) simulando las columnas y tareas
    this.kanbanBoard = [
      {
        header: 'In Progress',
        tasks: [
          {
            id: 1,
            name: 'Tarea 1',
            description: 'Descripción tarea 1',
            create_at: '2025-07-18T10:00:00',
            deadline: '2025-07-20T18:00:00',
            color: 'blue'
          },
          {
            id: 2,
            name: 'Tarea 2',
            description: 'Descripción tarea 2',
            create_at: '2025-07-17T14:00:00',
            deadline: '2025-07-22T18:00:00',
            color: 'blue'
          }
        ]
      },
      {
        header: 'Revision',
        tasks: [
          {
            id: 3,
            name: 'Tarea 3',
            description: 'Descripción tarea 3',
            create_at: '2025-07-16T09:00:00',
            deadline: '2025-07-21T12:00:00',
            color: 'orange'
          }
        ]
      },
      {
        header: 'Completed',
        tasks: [
          {
            id: 4,
            name: 'Tarea 4',
            description: 'Descripción tarea 4',
            create_at: '2025-07-15T11:30:00',
            deadline: '2025-07-18T16:00:00',
            color: 'green'
          }
        ]
      },
      {
        header: 'Paused',
        tasks: []
      }
    ];
  }
  getColorForStatus(status: string): string {
    switch (status) {
      case 'InProgress': return 'blue';
      case 'Revision': return 'orange';
      case 'Completed': return 'green';
      case 'Paused': return 'gray';
      default: return 'gray';
    }
  }

  getTaskColor(color: string) {
    return {
      'task-blue': color === 'blue',
      'task-green': color === 'green',
      'task-gray': color === 'gray',
      'task-red': color === 'red',
      'task-orange': color === 'orange'
    };
  }
}
import { Component, OnInit } from '@angular/core';
import { TasksService, Task } from '../tasks.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SplitterModule } from 'primeng/splitter';
import { PanelModule } from 'primeng/panel';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { HeaderComponent } from '../../../shared/components/header/header/header.component';
import { ButtonModule } from 'primeng/button';
import { SidebarModule } from 'primeng/sidebar';

interface KanbanTask {
  id: number;
  name: string;
  description: string;
  create_at: string;
  deadline: string;
  color: string;
  status?: string; // opcional, para facilitar update
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
    PanelModule,
    HeaderComponent,
    DragDropModule,
    ButtonModule,
    SidebarModule
  ],
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.css']
})
export class TaskListComponent implements OnInit {
  kanbanBoard: KanbanColumn[] = [
    { header: 'InProgress', tasks: [] },
    { header: 'Revision', tasks: [] },
    { header: 'Completed', tasks: [] },
    { header: 'Paused', tasks: [] }
  ];

  hoveredTaskId: number | null = null;
  editedTaskId: number | null = null;
  editCache: { name: string; description: string; deadline: string } = { name: '', description: '', deadline: '' };

  // Nueva tarea (formulario)
  newTask: { name: string; description: string; deadline: string } = { name: '', description: '', deadline: '' };
  showNewTaskSidebar = false;

  // Getter para las listas conectadas necesarias para cdkDropListConnectedTo
  get connectedDropListsIds(): string[] {
    return this.kanbanBoard.map(col => col.header);
  }

  constructor(private tasksService: TasksService) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks() {
    this.tasksService.getTasks().subscribe({
      next: (response) => {
        const tasksArray = response.tasks;
        if (Array.isArray(tasksArray)) {
          this.organizeTasks(tasksArray);
        } else {
          console.error('tasks no es un array:', tasksArray);
        }
      },
      error: (err) => {
        console.error('Error cargando tareas:', err);
      }
    });
  }

  private organizeTasks(tasks: Task[]) {
    this.kanbanBoard.forEach(col => (col.tasks = []));

    tasks.forEach(task => {
      const color = this.getColorForStatus(task.status || 'Paused');
      const kanbanTask: KanbanTask = {
        id: task.id!,
        name: task.name,
        description: task.description,
        create_at: task.create_at || '',
        deadline: task.deadline,
        color: color,
        status: task.status
      };

      const column = this.kanbanBoard.find(col => col.header === (task.status || 'Paused'));
      if (column) {
        column.tasks.push(kanbanTask);
      }
    });
  }

  getColorForStatus(status: string): string {
    switch (status) {
      case 'InProgress':
        return 'blue';
      case 'Revision':
        return 'orange';
      case 'Completed':
        return 'green';
      case 'Paused':
        return 'gray';
      default:
        return 'gray';
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

  drop(event: CdkDragDrop<KanbanTask[]>, columnHeader: string) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      const movedTask = event.container.data[event.currentIndex];

      this.tasksService.updateTask(movedTask.id, {
        ...movedTask,
        status: columnHeader
      }).subscribe({
        next: () => {
          this.loadTasks();
        },
        error: () => {
          this.loadTasks();
        }
      });
    }
  }

  startEditTask(task: KanbanTask) {
    this.editedTaskId = task.id;
    this.editCache = {
      name: task.name,
      description: task.description,
      deadline: task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : ''
    };
  }

  cancelTaskEdit() {
    this.editedTaskId = null;
  }

  saveTaskEdit(task: KanbanTask) {
    const updatedTask: KanbanTask = {
      ...task,
      name: this.editCache.name,
      description: this.editCache.description,
      deadline: this.editCache.deadline
    };

    this.tasksService.updateTask(task.id, updatedTask).subscribe({
      next: () => {
        this.editedTaskId = null;
        this.loadTasks();
      }
    });
  }

  deleteTask(task: KanbanTask) {
    if (confirm(`¿Eliminar la tarea "${task.name}"?`)) {
      this.tasksService.deleteTask(task.id).subscribe({
        next: () => {
          this.loadTasks();
        }
      });
    }
  }

  openNewTaskSidebar() {
    this.showNewTaskSidebar = true;
    this.newTask = { name: '', description: '', deadline: '' };
  }

  closeNewTaskSidebar() {
    this.showNewTaskSidebar = false;
  }

  createTask() {
    if (!this.newTask.name.trim()) {
      alert('El nombre de la tarea es obligatorio');
      return;
    }

    // Ajustar deadline para formato ISO si es necesario
    const deadlineIso = this.newTask.deadline ? new Date(this.newTask.deadline).toISOString() : '';

    const taskToCreate: Task = {
      name: this.newTask.name,
      description: this.newTask.description,
      deadline: deadlineIso,
      status: 'Paused' // Estado inicial (puedes cambiar)
    };

    this.tasksService.createTask(taskToCreate).subscribe({
      next: () => {
        this.closeNewTaskSidebar();
        this.loadTasks();
      },
      error: err => {
        console.error('Error creando tarea:', err);
      }
    });
  }
}

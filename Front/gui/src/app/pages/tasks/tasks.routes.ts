import {Routes} from '@angular/router';
import { TaskListComponent } from './task-list/task-list.component';

export const TASKS_ROUTES: Routes = [
    { path: 'task-list', component: TaskListComponent}
];

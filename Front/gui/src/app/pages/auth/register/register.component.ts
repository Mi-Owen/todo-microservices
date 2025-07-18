// Importa módulos comunes de Angular
import { CommonModule } from '@angular/common';
import { Component, Renderer2 } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

// Importa módulos de PrimeNG para UI
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputTextModule } from 'primeng/inputtext';
import { CalendarModule } from 'primeng/calendar';

// Importa el servicio de autenticación
import { AuthService } from '../../../core/auth/auth.service';

// Define el componente Register
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    ButtonModule,
    CardModule,
    CalendarModule,
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent {
  public username: string = '';
  public password: string = '';
  public confirmPassword: string = '';
  public email: string = '';
  public birthdate: Date | null = null; // Tipado más preciso
  public secret_question: string = '';
  public secret_answer: string = '';
  public errorMessage: string = '';

  public qrCodeUrl: string = '';
  public showQr: boolean = false;
  public darkMode: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private renderer: Renderer2
  ) {
    const savedMode = localStorage.getItem('darkMode');
    this.darkMode = savedMode ? JSON.parse(savedMode) : false;
  }

  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
    localStorage.setItem('darkMode', String(this.darkMode));
    console.debug('Dark mode:', this.darkMode); // Reemplazado por console.debug
  }

  onRegister(): void {
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    // Validar campos obligatorios
    if (
      !this.username ||
      !this.password ||
      !this.email ||
      !this.secret_question ||
      !this.secret_answer ||
      !this.birthdate
    ) {
      this.errorMessage = 'Todos los campos son obligatorios.';
      return;
    }

    let formattedBirthdate: string = '';

    if (this.birthdate instanceof Date) {
      formattedBirthdate = this.birthdate.toISOString().split('T')[0];
    } else {
      formattedBirthdate = new Date(this.birthdate).toISOString().split('T')[0];
    }

    const data = {
      username: this.username,
      password: this.password,
      email: this.email,
      birthdate: formattedBirthdate,
      secret_question: this.secret_question,
      secret_answer: this.secret_answer,
    };

    this.authService.register(data).subscribe({
      next: (res) => {
        console.debug('Usuario registrado:', res); // Reemplazado por console.debug
        if (res.qrCodeUrl) {
          this.qrCodeUrl = res.qrCodeUrl;
          this.showQr = true;
        } else {
          this.router.navigate(['/auth/login']);
        }
      },
      error: (err) => {
        console.error('Error en el registro:', err); // Añadido console.error para trazar errores
        this.errorMessage = err.error?.error || 'Error al registrar usuario.';
      },
    });
  }
}

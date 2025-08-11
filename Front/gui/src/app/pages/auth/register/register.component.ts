// register.component.ts
import { CommonModule } from '@angular/common';
import { Component, Renderer2, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputTextModule } from 'primeng/inputtext';
import { CalendarModule } from 'primeng/calendar';
import { StepsModule } from 'primeng/steps';
import { MenuItem } from 'primeng/api';

// Servicio de autenticación (ruta según tu proyecto)
import { AuthService } from '../../../core/auth/auth.service';

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
    DropdownModule,
    CalendarModule,
    StepsModule,
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent implements OnInit {
  // PrimeNG steps
  items: MenuItem[] = [];
  activeIndex: number = 0;

  public secretQuestions = [
    { label: '¿Cuál es el nombre de tu primera mascota?', value: 'mascota' },
    { label: '¿Cuál es el nombre de tu escuela primaria?', value: 'escuela' },
    { label: '¿Cuál es tu ciudad natal?', value: 'ciudad' },
    { label: '¿Cuál es tu comida favorita?', value: 'comida' },
  ];

  // Form fields
  public username: string = '';
  public password: string = '';
  public confirmPassword: string = '';
  public email: string = '';
  public birthdate: Date | null = null;
  public secret_question: string = '';
  public secret_answer: string = '';

  // Misc
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

  ngOnInit(): void {
    this.items = [
      { label: 'Información Personal' },
      { label: 'Seguridad' },
      { label: 'Verificación 2FA' },
    ];
  }

  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
    localStorage.setItem('darkMode', String(this.darkMode));
    console.debug('Dark mode:', this.darkMode);
  }

  prevStep(): void {
    if (this.activeIndex > 0) {
      this.errorMessage = '';
      this.activeIndex--;
    }
  }

  nextStep(): void {
    // valida el paso actual antes de avanzar
    if (this.validateStep(this.activeIndex)) {
      this.errorMessage = '';
      this.activeIndex++;
    }
  }

  onRegister(): void {
    if (!this.validateStep(this.activeIndex)) return;

    let formattedBirthdate = '';
    if (this.birthdate instanceof Date) {
      formattedBirthdate = this.birthdate.toISOString().split('T')[0];
    } else if (this.birthdate) {
      formattedBirthdate = new Date(this.birthdate as any)
        .toISOString()
        .split('T')[0];
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
        console.debug('Usuario registrado:', res);
        if (res.qrCodeUrl) {
          this.qrCodeUrl = res.qrCodeUrl;
          this.showQr = true;
        } else {
          this.router.navigate(['/auth/login']);
        }
      },
      error: (err) => {
        console.error('Error en el registro:', err);
        this.errorMessage = err.error?.error || 'Error al registrar usuario.';
      },
    });
  }

  private validateStep(step: number): boolean {
    switch (step) {
      case 0:
        if (!this.username || !this.email || !this.birthdate) {
          this.errorMessage =
            'Completa todos los campos de información personal.';
          return false;
        }
        return true;
      case 1:
        if (
          !this.password ||
          !this.confirmPassword ||
          !this.secret_question ||
          !this.secret_answer
        ) {
          this.errorMessage = 'Completa todos los campos de seguridad.';
          return false;
        }
        if (this.password !== this.confirmPassword) {
          this.errorMessage = 'Las contraseñas no coinciden.';
          return false;
        }
        return true;
      case 2:
        // Paso 3 es opcional (2FA)
        return true;
      default:
        return true;
    }
  }
}

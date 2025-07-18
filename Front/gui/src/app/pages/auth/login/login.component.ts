// Importa funcionalidades básicas comunes de Angular
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

// Importa módulos de PrimeNG para interfaz de usuario
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

// Importa el servicio de autenticación personalizado
import { AuthService } from '../../../core/auth/auth.service';

// Define el componente de login
@Component({
  selector: 'app-login', // Selector HTML del componente
  standalone: true, // Este componente no necesita un módulo externo
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CardModule,
    InputTextModule,
    ButtonModule,
    InputGroupModule,
    InputGroupAddonModule,
    MessageModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  // Campos de entrada para login y OTP
  public username: string = '';
  public password: string = '';
  public darkMode: boolean = false;

  // OTP MFA
  public otp: string = '';
  public tempToken: string = '';
  public step: 'credentials' | 'otp' = 'credentials';

  // Control de errores y carga
  public errorMessage: string = '';
  public isLoading: boolean = false;

  // Inyección de dependencias
  constructor(private authService: AuthService, private router: Router) {
    // Cargar configuración del modo oscuro desde el almacenamiento local
    const savedMode = localStorage.getItem('darkMode');
    this.darkMode = savedMode === 'true';
  }

  // Cambiar entre modo oscuro y claro
  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
    localStorage.setItem('darkMode', String(this.darkMode));
  }

  // Ejecutado cuando el usuario presiona "Iniciar sesión"
  onLogin(): void {
    this.errorMessage = '';
    this.isLoading = true;

    // Determinar si estamos en la fase de credenciales o de OTP
    if (this.step === 'credentials') {
      this.handleCredentialLogin();
    } else {
      this.handleOtpVerification();
    }
  }

  // Manejo del login con usuario y contraseña
  private handleCredentialLogin(): void {
    if (!this.username?.trim() || !this.password?.trim()) {
      this.errorMessage = 'Usuario y contraseña son requeridos';
      this.isLoading = false;
      return;
    }

    console.debug('Enviando credenciales...', {
      username: this.username,
      password: this.password,
    });

    this.authService.login(this.username, this.password).subscribe({
      next: (res) => {
        console.debug('Respuesta del login:', res);
        this.isLoading = false;

        if (res.tempToken) {
          console.debug('Token temporal recibido, solicitando OTP');
          this.tempToken = res.tempToken;
          this.step = 'otp';
          this.errorMessage = '';
        } else if (res.token) {
          console.debug('Login exitoso con token completo');
          localStorage.setItem('token', res.token);
          this.router.navigate(['/task']);
        } else {
          console.error('Respuesta inesperada del servidor');
          this.errorMessage = 'Respuesta inesperada del servidor';
        }
      },
      error: (err) => {
        console.error('Error en login:', err);
        this.isLoading = false;

        if (err.status === 401) {
          this.errorMessage = 'Usuario o contraseña incorrectos';
        } else if (err.status === 400) {
          this.errorMessage = err.error?.error || 'Datos inválidos';
        } else if (err.status === 500) {
          this.errorMessage = 'Error interno del servidor';
        } else {
          this.errorMessage = 'Error de conexión. Intenta nuevamente.';
        }
      },
    });
  }

  // Manejo de la verificación OTP
  private handleOtpVerification(): void {
    if (!this.otp?.trim()) {
      this.errorMessage = 'Código OTP requerido';
      this.isLoading = false;
      return;
    }

    if (!/^\d{6}$/.test(this.otp)) {
      this.errorMessage = 'El código OTP debe tener 6 dígitos numéricos';
      this.isLoading = false;
      return;
    }

    console.debug('Verificando OTP...', {
      otp: this.otp,
      tempToken: this.tempToken ? 'Presente' : 'Ausente',
    });

    this.authService.verifyOtp(this.otp, this.tempToken).subscribe({
      next: (res) => {
        console.debug('OTP verificado correctamente:', res);
        this.isLoading = false;

        if (res.token) {
          localStorage.setItem('token', res.token);
          this.router.navigate(['/tasks']);
        } else {
          this.errorMessage = 'No se recibió token de autenticación';
        }
      },
      error: (err) => {
        console.error('Error en verificación OTP:', err);
        this.isLoading = false;

        if (err.status === 401) {
          if (err.error?.error?.includes('Token expirado')) {
            this.errorMessage = 'Token expirado. Vuelve a iniciar sesión.';
            this.resetToCredentials();
          } else {
            this.errorMessage = 'Código OTP incorrecto';
          }
        } else if (err.status === 400) {
          this.errorMessage = err.error?.error || 'Datos inválidos';
        } else {
          this.errorMessage = 'Error de verificación. Intenta nuevamente.';
        }
      },
    });
  }

  // Restablecer a la pantalla de usuario/contraseña
  resetToCredentials(): void {
    this.step = 'credentials';
    this.otp = '';
    this.tempToken = '';
    this.errorMessage = '';
    this.isLoading = false;
  }

  // Borrar mensaje de error manualmente
  clearError(): void {
    this.errorMessage = '';
  }
}

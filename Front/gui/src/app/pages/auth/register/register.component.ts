// Importa módulos comunes de Angular
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

// Importa módulos de PrimeNG para UI
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputTextModule } from 'primeng/inputtext';

// Importa el servicio de autenticación
import { AuthService } from '../../../core/auth/auth.service';

// Define el componente Register
@Component({
  selector: 'app-register', // Nombre del selector usado en HTML
  standalone: true, // Este componente es independiente (no requiere AppModule)
  imports: [ // Módulos requeridos para este componente
    CommonModule,
    FormsModule,
    RouterModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    ButtonModule,
    CardModule
  ],
  templateUrl: './register.component.html', // Ruta de la plantilla HTML
  styleUrls: ['./register.component.css']   // Ruta del archivo de estilos
})
export class RegisterComponent {
  // Propiedades enlazadas a los inputs del formulario
  public username: string = '';
  public password: string = '';
  public confirmPassword: string = '';
  public email: string = '';
  public birthdate: string | Date = '';
  public secret_question: string = '';
  public secret_answer: string = '';
  public errorMessage: string = ''; // Para mostrar errores al usuario

  // Inyección del servicio AuthService y el router para navegación
  constructor(private authService: AuthService, private router: Router) {}

  // Método que se ejecuta al hacer clic en "Registrar"
  onRegister(): void {
    // Verifica que las contraseñas coincidan
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    // Prepara los datos para enviarlos al backend
    const data = {
      username: this.username,
      password: this.password,
      email: this.email,
      birthdate: typeof this.birthdate === 'string' ? this.birthdate : this.birthdate.toISOString().split('T')[0],
      secret_question: this.secret_question,
      secret_answer: this.secret_answer
    };

    // Llama al servicio para registrar al usuario
    this.authService.register(data).subscribe({
      next: (res) => {
        console.log('Usuario registrado:', res); // Log para depuración
        this.router.navigate(['/auth/login']);   // Redirige al login después de registrar
      },
      error: (err) => {
        // Muestra un mensaje de error si la respuesta del servidor lo incluye
        this.errorMessage = err.error?.error || 'Error al registrar usuario.';
      }
    });
  }
}

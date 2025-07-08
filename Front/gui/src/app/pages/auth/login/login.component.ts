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

// Importa el servicio de autenticación personalizado
import { AuthService } from '../../../core/auth/auth.service';

// Define el componente de login
@Component({
  selector: 'app-login', // Selector que se usará en HTML para este componente
  standalone: true, // El componente es standalone, no necesita un NgModule
  imports: [ // Módulos necesarios para el funcionamiento del componente
    CommonModule,
    FormsModule,
    RouterModule,
    CardModule,
    InputTextModule,
    ButtonModule,
    InputGroupModule,
    InputGroupAddonModule
  ],
  templateUrl: './login.component.html', // Ruta al archivo HTML
  styleUrls: ['./login.component.css']   // Ruta a los estilos CSS
})
export class LoginComponent {
  // Propiedades enlazadas con [(ngModel)] en el formulario
  public username: string = '';
  public password: string = '';

  // Inyecta el AuthService para autenticación y Router para navegación
  constructor(
    private authService: AuthService,
    private router: Router 
  ) {}

  // Método que se ejecuta cuando el usuario hace clic en "Iniciar sesión"
  onLogin(): void {
    // Llama al servicio de login con las credenciales proporcionadas
    this.authService.login(this.username, this.password).subscribe({
      next: (res) => {
        // Muestra en consola el mensaje y token devuelto
        console.log(`✅ ${res.message}\nToken: ${res.token}`);
        
        // Guarda el token en localStorage para futuras peticiones autenticadas
        localStorage.setItem('token', res.token);

        // Redirige al usuario a la ruta principal de tareas (ajusta si es necesario)
        this.router.navigate(['/tasks']);
      },
      error: (err) => {
        // Muestra un mensaje de error en consola si ocurre algún fallo
        console.log(` ${err.error?.error || 'Error al iniciar sesión'}`);
      }
    });
  }
}

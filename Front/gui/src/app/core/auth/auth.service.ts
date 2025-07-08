// Importa el servicio HttpClient para hacer peticiones HTTP
import { HttpClient } from '@angular/common/http';

// Marca esta clase como inyectable (puede ser utilizada en otras partes con DI)
import { Injectable } from '@angular/core';

// Importa Observable para manejar respuestas asíncronas
import { Observable } from 'rxjs';

// Decorador que indica que el servicio estará disponible en toda la aplicación
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // URL base del backend o API Gateway para autenticación
  private apiUrl = 'http://localhost:5000/auth';

  // Inyección del servicio HttpClient para hacer peticiones HTTP
  constructor(private http: HttpClient) {}

  /**
   * Método para iniciar sesión.
   * Hace una petición POST al endpoint /login con nombre de usuario y contraseña.
   * 
   * ⚠️ Nota: No se usa `withCredentials: true`, por lo tanto:
   * - No se envían cookies o tokens de sesión automáticamente.
   * - El navegador no activa la validación CORS estricta para credenciales.
   */
  login(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, {
      username,
      password,
    });
  }

  /**
   * Método para registrar un nuevo usuario.
   * Envía un objeto con todos los datos del formulario al endpoint /register.
   * 
   * @param data Objeto con la información de registro del usuario
   */
  register(data: {
    username: string;
    password: string;
    email: string;
    birthdate: string;
    secret_question: string;
    secret_answer: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }
}

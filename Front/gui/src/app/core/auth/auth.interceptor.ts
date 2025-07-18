// Importamos el tipo HttpInterceptorFn desde el módulo de HTTP de Angular.
// Este tipo se usa para definir funciones interceptoras para las solicitudes HTTP.
import { HttpInterceptorFn } from "@angular/common/http";

// Definimos el interceptor de autenticación llamado "authInterceptor".
// Esta función intercepta todas las solicitudes HTTP salientes.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  
  // Obtenemos el token de autenticación almacenado en el localStorage del navegador.
  const token = localStorage.getItem('auth_token');

  // Si el token existe, modificamos la solicitud original.
  if (token && !req.url.includes('/auth/verify-otp')) {
    // Clonamos la solicitud y le añadimos un encabezado de autorización con el token.
    // Esto es importante porque las solicitudes HTTP son inmutables en Angular.
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`  // Agrega el token como "Bearer" en el encabezado.
      }
    });
  }

  // Continuamos con la cadena de interceptores y devolvemos la solicitud (modificada o no).
  return next(req);
};

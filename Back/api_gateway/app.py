import time
import logging
from datetime import datetime
import requests
import jwt
from flask import Flask, jsonify, request, g
from flask_cors import CORS

# Configura tu clave secreta para decodificar JWT (debe coincidir con la del backend de auth)
# ⚠️ Reemplaza esto por tu clave real
SECRET_KEY = 'A9d$3f8#GjLqPwzVx7!KmRtYsB2eH4Uw'

# Crear una instancia de la aplicación Flask
app = Flask(__name__)
CORS(app, origins=["http://localhost:4200"])

# Configuración del logger
logging.basicConfig(
    filename='apigateway.log',
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# URLs base de los microservicios que se van a consumir
AUTH_SERVICE_URL = 'http://localhost:5001'
USER_SERVICE_URL = 'http://localhost:5002'
TASK_SERVICE_URL = 'http://localhost:5003'

# Función para extraer el usuario desde el token JWT


def get_user_from_token(token):
    try:
        token = token.replace("Bearer ", "")
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload.get("username") or payload.get("user_id") or "unknown"
    except Exception:
        return "invalid_token"

# Middleware: antes de cada request, guardar tiempo de inicio


@app.before_request
def start_timer():
    g.start_time = time.time()

# Middleware: después de cada request, registrar log


@app.after_request
def log_request(response):
    if not hasattr(g, 'start_time'):
        g.start_time = time.time()

    duration = round(time.time() - g.start_time, 4)
    timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    status = response.status_code
    method = request.method
    full_path = request.full_path

    # Obtener el usuario desde el token si existe
    raw_token = request.headers.get('Authorization')
    user = get_user_from_token(raw_token) if raw_token else 'anonymous'

    log_message = (
        f"{timestamp} | {method} {full_path} | Status: {status} | Time: {duration}s | User: {user}"
    )
    logging.info(log_message)

    return response

# Función genérica para reenviar (proxy) la solicitud HTTP al microservicio correspondiente


def proxy_request(service_url, path):
    method = request.method
    url = f'{service_url}/{path}'

    resp = requests.request(
        method=method,
        url=url,
        json=request.get_json(silent=True),
        headers={key: value for key,
                 value in request.headers if key.lower() != 'host'}
    )

    try:
        return jsonify(resp.json()), resp.status_code
    except ValueError:
        return resp.text, resp.status_code

# Rutas proxy para cada microservicio


@app.route('/auth/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
def proxy_auth(path):
    return proxy_request(AUTH_SERVICE_URL, path)


@app.route('/user/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
def proxy_user(path):
    return proxy_request(USER_SERVICE_URL, path)


@app.route('/tasks', methods=['GET', 'POST'])
@app.route('/tasks/<path:path>', methods=['GET', 'PUT', 'DELETE'])
def proxy_tasks(path=''):
    fixed_path = 'tasks' if path == '' else f'tasks/{path}'
    return proxy_request(TASK_SERVICE_URL, fixed_path)


# Ejecutar la app Flask
if __name__ == '__main__':
    app.run(port=5000, debug=True)

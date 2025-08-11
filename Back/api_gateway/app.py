import time
import logging
from datetime import datetime
import requests
import jwt
from flask import Flask, jsonify, request, g
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Agregado para Firebase Admin
import firebase_admin
from firebase_admin import credentials, firestore

SECRET_KEY = 'A9d$3f8#GjLqPwzVx7!KmRtYsB2eH4Uw'

app = Flask(__name__)
CORS(app, origins=["http://localhost:4200"])

# Inicializar Firebase Admin
cred = credentials.Certificate('firebase-service-account.json')  # Asegúrate que la ruta es correcta
firebase_admin.initialize_app(cred)
db = firestore.client()

def get_user_id():
    try:
        auth_header = request.headers.get('Authorization')
        if auth_header:
            user = get_user_from_token(auth_header)
            if user and user not in ['invalid_token', 'anonymous']:
                return f"user:{user}"
    except RuntimeError:
        # No hay contexto de request aún, usar IP como fallback
        pass
    return f"ip:{get_remote_address()}"

limiter = Limiter(
    key_func=get_user_id,
    default_limits=["1000 per day", "200 per hour"],
    storage_uri="memory://"
)

limiter.init_app(app)

logging.basicConfig(
    filename='apigateway.log',
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

AUTH_SERVICE_URL = 'http://localhost:5001'
USER_SERVICE_URL = 'http://localhost:5002'
TASK_SERVICE_URL = 'http://localhost:5003'

def get_user_from_token(token):
    try:
        token = token.replace("Bearer ", "")
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload.get("username") or payload.get("user_id") or "unknown"
    except Exception:
        return "invalid_token"

@app.before_request
def start_timer():
    g.start_time = time.time()

def log_response(status_code):
    duration = round(time.time() - getattr(g, 'start_time', time.time()), 4)
    timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    method = request.method
    full_path = request.full_path
    raw_token = request.headers.get('Authorization')
    user = get_user_from_token(raw_token) if raw_token else 'anonymous'

    log_message = (
        f"{timestamp} | {method} {full_path} | Status: {status_code} | Time: {duration}s | User: {user}"
    )
    logging.info(log_message)

    try:
        doc_ref = db.collection('apigateway_logs').document()  # ID automático
        doc_ref.set({
            'timestamp': timestamp,
            'method': method,
            'path': full_path,
            'status': status_code,
            'response_time': duration,
            'user': user
        })
    except Exception as e:
        logging.error(f"Error guardando log en Firestore: {e}")

@app.after_request
def log_request(response):
    # Solo loguear aquí si el status NO es de error común, para evitar doble log
    if response.status_code < 400:
        log_response(response.status_code)
    return response

# Manejadores de errores para capturar logs de errores HTTP comunes

@app.errorhandler(404)
def handle_404(error):
    log_response(404)
    return jsonify({"error": "Not Found"}), 404

@app.errorhandler(403)
def handle_403(error):
    log_response(403)
    return jsonify({"error": "Forbidden"}), 403

@app.errorhandler(400)
def handle_400(error):
    log_response(400)
    return jsonify({"error": "Bad Request"}), 400

@app.errorhandler(500)
def handle_500(error):
    log_response(500)
    return jsonify({"error": "Internal Server Error"}), 500

@app.errorhandler(401)
def handle_401(error):
    log_response(401)
    return jsonify({"error": "Unauthorized"}), 401

def proxy_request(service_url, path):
    method = request.method
    url = f'{service_url}/{path}'

    resp = requests.request(
        method=method,
        url=url,
        json=request.get_json(silent=True),
        headers={key: value for key, value in request.headers if key.lower() != 'host'}
    )

    try:
        return jsonify(resp.json()), resp.status_code
    except ValueError:
        return resp.text, resp.status_code

@app.route('/auth/login', methods=['POST'])
@limiter.limit("5 per minute")
def proxy_auth_login():
    return proxy_request(AUTH_SERVICE_URL, 'login')

@app.route('/auth/register', methods=['POST'])
@limiter.limit("3 per minute")
def proxy_auth_register():
    return proxy_request(AUTH_SERVICE_URL, 'register')

@app.route('/auth/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
@limiter.limit("100 per hour")
def proxy_auth(path):
    return proxy_request(AUTH_SERVICE_URL, path)

@app.route('/user/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
@limiter.limit("200 per hour")
def proxy_user(path):
    return proxy_request(USER_SERVICE_URL, path)

@app.route('/tasks', methods=['GET', 'POST'])
@app.route('/tasks/<path:path>', methods=['GET', 'PUT', 'DELETE'])
@limiter.limit("500 per hour")
def proxy_tasks(path=''):
    fixed_path = 'tasks' if path == '' else f'tasks/{path}'
    return proxy_request(TASK_SERVICE_URL, fixed_path)

@app.route('/health')
@limiter.exempt
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.utcnow().isoformat()})

@app.errorhandler(429)
def ratelimit_handler(e):
    user_id = get_user_id()
    logging.warning(f"Rate limit exceeded for {user_id}: {e.description}")
    return jsonify({
        "error": "Rate limit exceeded",
        "message": "Too many requests. Please try again later.",
        "retry_after": getattr(e, 'retry_after', None)
    }), 429

if __name__ == '__main__':
    app.run(port=5000, debug=True)

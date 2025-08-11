from flask import Flask, request, jsonify
import pyotp
import qrcode
import io
import base64
import os
import jwt
import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
from werkzeug.security import generate_password_hash, check_password_hash

# Configuración Flask
app = Flask(__name__)
SECRET_KEY = os.environ.get('SECRET_KEY')
DATABASE_URL = os.environ.get('DATABASE_URL')

# --- INICIO DEL CAMBIO ---
# Agregamos este print para depuración
print(f"La aplicación está usando esta URL de base de datos: {DATABASE_URL}")
# --- FIN DEL CAMBIO ---

if not SECRET_KEY:
    raise RuntimeError("FATAL: La variable de entorno 'SECRET_KEY' no está configurada. Necesaria para JWT.")
if not DATABASE_URL:
    raise RuntimeError("FATAL: La variable de entorno 'DATABASE_URL' no está configurada.")

# Conexión a PostgreSQL
def get_db_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

# Registro
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    if not data or 'username' not in data or 'password' not in data or 'email' not in data:
        return jsonify({'error': 'Faltan campos'}), 400

    hashed_password = generate_password_hash(data['password'])
    totp_secret = pyotp.random_base32()
    conn = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (username, password, email, totp_secret) VALUES (%s, %s, %s, %s) RETURNING id",
            (data['username'], hashed_password, data['email'], totp_secret)
        )
        user_id = cur.fetchone()['id']
        conn.commit()
        cur.close()

        otp_uri = pyotp.TOTP(totp_secret).provisioning_uri(
            name=data['username'], issuer_name="SeguridadApp"
        )
        qr = qrcode.make(otp_uri)
        buf = io.BytesIO()
        qr.save(buf, format='PNG')
        qr_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
        qr_url = f"data:image/png;base64,{qr_b64}"

        return jsonify({'message': 'Usuario registrado correctamente', 'user_id': user_id, 'qrCodeUrl': qr_url}), 201

    except psycopg2.errors.UniqueViolation:
        return jsonify({'error': 'Nombre de usuario o email ya existe'}), 409
    except psycopg2.Error as e:
        print(f"Database error during registration: {e}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    finally:
        if conn:
            conn.close()

# Login
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    if not data or 'username' not in data or 'password' not in data:
        return jsonify({'error': 'Faltan campos'}), 400

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE username = %s", (data['username'],))
        user = cur.fetchone()
        cur.close()

        if user and check_password_hash(user['password'], data['password']):
            temp_token = jwt.encode({
                'id': user['id'],
                'username': user['username'],
                'mfa': True,
                'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
            }, SECRET_KEY, algorithm='HS256')

            return jsonify({'tempToken': temp_token}), 200

        return jsonify({'error': 'Credenciales incorrectas'}), 401
    except psycopg2.Error as e:
        print(f"Database error during login: {e}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    finally:
        if conn:
            conn.close()


# Verificar OTP
@app.route('/verify-otp', methods=['POST'])
def verify_otp():
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer'):
        return jsonify({'error': 'Falta token en header'}), 401

    temp_token = auth_header.split(' ')[1]
    data = request.get_json()

    if not data or 'otp' not in data:
        return jsonify({'error': 'Falta OTP'}), 400

    conn = None
    try:
        payload = jwt.decode(temp_token, SECRET_KEY, algorithms=['HS256'])
        if not payload.get('mfa'):
            return jsonify({'error': 'Token invalido por MFA'}), 401

        user_id = payload['id']

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()
        cur.close()

        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404

        totp = pyotp.TOTP(user['totp_secret'])
        if totp.verify(data['otp']):
            final_token = jwt.encode({
                'id': user['id'],
                'username': user['username'],
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
            }, SECRET_KEY, algorithm='HS256')

            return jsonify({'token': final_token}), 200
        else:
            return jsonify({'error': 'OTP incorrecto'}), 401

    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Token expirado'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Token invalido'}), 401
    except psycopg2.Error as e:
        print(f"Database error during OTP verification: {e}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    finally:
        if conn:
            conn.close()

# Main para desarrollo local, no se usará en Render
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
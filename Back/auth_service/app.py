from flask import Flask, request, jsonify
import pyotp
import qrcode
import io
import base64
import os
import jwt
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError

app = Flask(__name__)

# Clave secreta para JWT, obligatoriamente usar variable de entorno en Render
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("Falta configurar SECRET_KEY en variables de entorno")

# URL de la base de datos desde variable de entorno
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("Falta configurar DATABASE_URL en variables de entorno")

engine = create_engine(DATABASE_URL)

def init_db():
    with engine.connect() as conn:
        with conn.begin():
            # Crear tabla con todos los constraints necesarios
            conn.execute(text('''
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    email TEXT UNIQUE,
                    status TEXT DEFAULT 'active',
                    totp_secret TEXT
                )
            '''))
            
            # Agregar constraints si no existen (para tablas existentes)
            try:
                conn.execute(text('''
                    ALTER TABLE users 
                    ADD CONSTRAINT unique_username UNIQUE (username)
                '''))
            except IntegrityError:
                pass  # Constraint ya existe
            
            try:
                conn.execute(text('''
                    ALTER TABLE users 
                    ADD CONSTRAINT unique_email UNIQUE (email)
                '''))
            except IntegrityError:
                pass  # Constraint ya existe

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data or 'email' not in data:
        return jsonify({'error': 'Faltan campos'}), 400

    username = data['username'].strip()
    email = data['email'].strip() if data['email'] else None
    hashed_password = generate_password_hash(data['password'])
    totp_secret = pyotp.random_base32()

    try:
        with engine.connect() as conn:
            with conn.begin():
                conn.execute(text("""
                    INSERT INTO users (username, password, email, totp_secret)
                    VALUES (:u, :p, :e, :t)
                """), {
                    "u": username, 
                    "p": hashed_password, 
                    "e": email, 
                    "t": totp_secret
                })

                otp_uri = pyotp.totp.TOTP(totp_secret).provisioning_uri(
                    name=username, issuer_name="SeguridadApp"
                )
                qr = qrcode.make(otp_uri)
                buf = io.BytesIO()
                qr.save(buf, format='PNG')
                qr_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
                qr_url = f"data:image/png;base64,{qr_b64}"

        return jsonify({
            'message': 'Usuario registrado correctamente', 
            'qrCodeUrl': qr_url
        }), 201
        
    except IntegrityError as e:
        error_str = str(e).lower()
        print(f"IntegrityError details: {e}")  # Para debugging
        
        if "username" in error_str or "unique_username" in error_str:
            return jsonify({'error': 'El nombre de usuario ya existe'}), 409
        elif "email" in error_str or "unique_email" in error_str:
            return jsonify({'error': 'El email ya está registrado'}), 409
        else:
            return jsonify({'error': 'El usuario ya existe'}), 409
    except Exception as e:
        print(f"Error inesperado: {e}")  # Para debugging
        return jsonify({'error': 'Error interno del servidor'}), 500

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({'error': 'Faltan campos'}), 400

    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM users WHERE username = :u"), {"u": data['username']})
        user = result.fetchone()

    if user and check_password_hash(user.password, data['password']):
        temp_token = jwt.encode({
            'id': user.id,
            'username': user.username,
            'mfa': True,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
        }, SECRET_KEY, algorithm='HS256')

        return jsonify({'tempToken': temp_token}), 200

    return jsonify({'error': 'Credenciales incorrectas'}), 401

@app.route('/verify-otp', methods=['POST'])
def verify_otp():
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Falta token en header'}), 401

    temp_token = auth_header.split(' ')[1]
    data = request.get_json()
    if not data or 'otp' not in data:
        return jsonify({'error': 'Falta OTP'}), 400

    try:
        payload = jwt.decode(temp_token, SECRET_KEY, algorithms=['HS256'])
        if not payload.get('mfa'):
            return jsonify({'error': 'Token invalido por MFA'}), 401

        user_id = payload['id']
        with engine.connect() as conn:
            result = conn.execute(text("SELECT * FROM users WHERE id = :id"), {"id": user_id})
            user = result.fetchone()

        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404

        totp = pyotp.TOTP(user.totp_secret)
        if totp.verify(data['otp']):
            final_token = jwt.encode({
                'id': user.id,
                'username': user.username,
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
            }, SECRET_KEY, algorithm='HS256')

            return jsonify({'token': final_token}), 200
        else:
            return jsonify({'error': 'OTP incorrecto'}), 401

    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Token expirado'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Token invalido'}), 401

if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port)
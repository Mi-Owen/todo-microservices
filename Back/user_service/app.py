from flask import Flask, jsonify, request
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
import os

app = Flask(__name__)

# Obtener la URL de la base de datos desde variable de entorno (configúrala en Render)
DATABASE_URL = os.environ.get('DATABASE_URL')

if not DATABASE_URL:
    raise RuntimeError("La variable de entorno DATABASE_URL no está configurada")

# Crear motor de SQLAlchemy
engine = create_engine(DATABASE_URL)

@app.route('/users', methods=['GET'])
def get_users():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT id, username, email, status FROM users"))
            users = result.fetchall()
        return jsonify({'users': [
            {'id': u.id, 'username': u.username, 'email': u.email, 'status': u.status} for u in users
        ]})
    except SQLAlchemyError as e:
        return jsonify({'error': str(e)}), 500

@app.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT id, username, email, status FROM users WHERE id = :id"), {'id': user_id})
            user = result.fetchone()
        if user:
            return jsonify({'user': {'id': user.id, 'username': user.username, 'email': user.email, 'status': user.status}})
        else:
            return jsonify({'error': 'Usuario no encontrado'}), 404
    except SQLAlchemyError as e:
        return jsonify({'error': str(e)}), 500

@app.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    data = request.get_json()
    try:
        with engine.connect() as conn:
            conn.execute(
                text("UPDATE users SET username = :username, email = :email WHERE id = :id"),
                {'username': data.get('username'), 'email': data.get('email'), 'id': user_id}
            )
        return jsonify({'message': 'Usuario actualizado'})
    except SQLAlchemyError as e:
        return jsonify({'error': str(e)}), 500

@app.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    try:
        with engine.connect() as conn:
            conn.execute(
                text("UPDATE users SET status = 'inactive' WHERE id = :id"),
                {'id': user_id}
            )
        return jsonify({'message': 'Usuario desactivado'})
    except SQLAlchemyError as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5002, debug=True)

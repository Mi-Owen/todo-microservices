from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
import jwt
import os
import datetime
from functools import wraps

app = Flask(__name__)

# Obtener la URL de la base de datos de la variable de entorno
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise RuntimeError("La variable de entorno DATABASE_URL no está definida")

app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

SECRET_KEY = 'A9d$3f8#GjLqPwzVx7!KmRtYsB2eH4Uw'

class Task(db.Model):
    __tablename__ = 'tasks'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)
    description = db.Column(db.Text)
    create_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.utcnow)
    deadline = db.Column(db.DateTime)
    status = db.Column(db.String, nullable=False, default='InProgress')
    isAlive = db.Column(db.Boolean, nullable=False, default=True)
    created_by = db.Column(db.Integer, nullable=False)  # Relación a users.id

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token requerido'}), 401
        try:
            token = token.replace('Bearer ', '')
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            request.user = data
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expirado'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token inválido'}), 401
        return f(*args, **kwargs)
    return decorated

@app.route('/tasks', methods=['POST'])
@token_required
def create_task():
    data = request.get_json()
    required_fields = ['name', 'description', 'deadline']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Faltan campos obligatorios'}), 400

    try:
        deadline = datetime.datetime.fromisoformat(data['deadline'])
    except Exception:
        return jsonify({'error': 'Formato de deadline inválido'}), 400

    task = Task(
        name=data['name'],
        description=data['description'],
        deadline=deadline,
        status='InProgress',
        isAlive=True,
        created_by=request.user['id']
    )
    db.session.add(task)
    db.session.commit()
    return jsonify({'message': 'Tarea creada', 'task_id': task.id}), 201

@app.route('/tasks', methods=['GET'])
@token_required
def get_tasks():
    created_by = request.user['id']
    tasks = Task.query.filter_by(created_by=created_by, isAlive=True).all()
    tasks_list = []
    for t in tasks:
        tasks_list.append({
            'id': t.id,
            'name': t.name,
            'description': t.description,
            'create_at': t.create_at.isoformat(),
            'deadline': t.deadline.isoformat() if t.deadline else None,
            'status': t.status,
            'isAlive': t.isAlive
        })
    return jsonify({'tasks': tasks_list})

@app.route('/tasks/<int:task_id>', methods=['GET'])
@token_required
def get_task(task_id):
    created_by = request.user['id']
    t = Task.query.filter_by(id=task_id, created_by=created_by, isAlive=True).first()
    if not t:
        return jsonify({'error': 'Tarea no encontrada'}), 404
    task = {
        'id': t.id,
        'name': t.name,
        'description': t.description,
        'create_at': t.create_at.isoformat(),
        'deadline': t.deadline.isoformat() if t.deadline else None,
        'status': t.status,
        'isAlive': t.isAlive
    }
    return jsonify({'task': task})

@app.route('/tasks/<int:task_id>', methods=['PUT'])
@token_required
def update_task(task_id):
    data = request.get_json()
    created_by = request.user['id']
    task = Task.query.filter_by(id=task_id, created_by=created_by).first()
    if not task:
        return jsonify({'error': 'Tarea no encontrada o no autorizada'}), 404

    if 'status' in data and data['status'] not in ['InProgress', 'Revision', 'Completed', 'Paused']:
        return jsonify({'error': 'Estado inválido'}), 400

    for field in ['name', 'description', 'deadline', 'status', 'isAlive']:
        if field in data:
            if field == 'deadline' and data[field]:
                try:
                    setattr(task, field, datetime.datetime.fromisoformat(data[field]))
                except Exception:
                    return jsonify({'error': 'Formato de deadline inválido'}), 400
            else:
                setattr(task, field, data[field])

    db.session.commit()
    return jsonify({'message': 'Tarea actualizada'})

@app.route('/tasks/<int:task_id>', methods=['DELETE'])
@token_required
def delete_task(task_id):
    created_by = request.user['id']
    task = Task.query.filter_by(id=task_id, created_by=created_by).first()
    if not task:
        return jsonify({'error': 'Tarea no encontrada o no autorizada'}), 404
    task.isAlive = False
    db.session.commit()
    return jsonify({'message': 'Tarea eliminada (borrado lógico)'})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Crear tablas si no existen
    app.run(host='0.0.0.0', port=5003, debug=True)

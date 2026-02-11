from database import db

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.String(5), unique=True, nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)

    discord_id = db.Column(db.String(30), unique=True, nullable=True)

    role = db.Column(db.String(20), default="member")
    status = db.Column(db.String(20), default="active")


class AuditLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    actor = db.Column(db.String(50))
    action = db.Column(db.String(100))
    target = db.Column(db.String(50))
    timestamp = db.Column(db.DateTime, default=db.func.now())

import uuid
from datetime import datetime
from database import db

class Card(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    card_id = db.Column(db.String, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(6), unique=True)
    discord_id = db.Column(db.String, unique=True)
    full_name = db.Column(db.String)
    nationality = db.Column(db.String)
    password = db.Column(db.String)
    status = db.Column(db.String, default="pending")
    issued_at = db.Column(db.DateTime)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

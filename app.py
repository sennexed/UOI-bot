import os
import random
from flask import Flask, request, jsonify
from database import db
from models import Card
from datetime import datetime

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

def generate_id():
    return str(random.randint(100000, 999999))

@app.before_first_request
def create_tables():
    db.create_all()

@app.route("/register", methods=["POST"])
def register():
    data = request.json

    if len(data["password"]) != 6:
        return jsonify({"error": "Password must be exactly 6 characters"}), 400

    existing = Card.query.filter_by(discord_id=data["discord_id"]).first()
    if existing:
        return jsonify({"error": "Already registered"}), 400

    new_card = Card(
        user_id=generate_id(),
        discord_id=data["discord_id"],
        full_name=data["full_name"],
        nationality=data["nationality"],
        password=data["password"],
        status="pending"
    )

    db.session.add(new_card)
    db.session.commit()

    return jsonify({"message": "Request submitted"})

@app.route("/approve/<discord_id>", methods=["POST"])
def approve(discord_id):
    card = Card.query.filter_by(discord_id=discord_id).first()
    if not card:
        return jsonify({"error": "Not found"}), 404

    card.status = "active"
    card.issued_at = datetime.utcnow()
    db.session.commit()

    return jsonify({
        "message": "Approved",
        "user_id": card.user_id
    })

@app.route("/card/<discord_id>")
def get_card(discord_id):
    card = Card.query.filter_by(discord_id=discord_id).first()
    if not card:
        return jsonify({"error": "Not found"}), 404

    return jsonify({
        "full_name": card.full_name,
        "nationality": card.nationality,
        "user_id": card.user_id,
        "status": card.status,
        "issued_at": card.issued_at
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)

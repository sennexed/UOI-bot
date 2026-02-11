from flask import Flask, request, jsonify
import os

from database import db
from models import User, AuditLog
from services import (
    admin_create_user,
    link_discord_account,
    get_user_by_discord_id,
    suspend_user,
    activate_user
)
from auth import authenticate

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///uoi.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)


@app.route("/login", methods=["POST"])
def login():
    data = request.json
    user = authenticate(data.get("username"), data.get("password"))
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    return jsonify({
        "user_id": user.user_id,
        "role": user.role
    })


@app.route("/link-discord", methods=["POST"])
def link_discord():
    data = request.json
    user = User.query.filter_by(username=data.get("username")).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    if not link_discord_account(user, data.get("discord_id")):
        return jsonify({"error": "Discord already linked"}), 409

    return jsonify({"message": "Linked"})


@app.route("/myid", methods=["POST"])
def myid():
    user = get_user_by_discord_id(request.json.get("discord_id"))
    if not user:
        return jsonify({"error": "No ID"}), 404

    return jsonify({
        "user_id": user.user_id,
        "username": user.username,
        "role": user.role,
        "status": user.status
    })


@app.route("/admin/suspend", methods=["POST"])
def admin_suspend():
    data = request.json
    admin = authenticate(data.get("admin_username"), data.get("admin_password"))
    user = suspend_user(admin, data.get("user_id"))
    if not user:
        return jsonify({"error": "Unauthorized or not found"}), 403
    return jsonify({"message": "Suspended"})


@app.route("/admin/activate", methods=["POST"])
def admin_activate():
    data = request.json
    admin = authenticate(data.get("admin_username"), data.get("admin_password"))
    user = activate_user(admin, data.get("user_id"))
    if not user:
        return jsonify({"error": "Unauthorized or not found"}), 403
    return jsonify({"message": "Activated"})


@app.route("/admin/audit-logs", methods=["POST"])
def audit_logs():
    data = request.json
    admin = authenticate(data.get("admin_username"), data.get("admin_password"))
    if not admin or admin.role != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    logs = AuditLog.query.order_by(AuditLog.timestamp.desc()).limit(10).all()
    return jsonify([
        {
            "actor": l.actor,
            "action": l.action,
            "target": l.target,
            "time": l.timestamp.isoformat()
        } for l in logs
    ])


if __name__ == "__main__":
    with app.app_context():
        db.create_all()

    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)

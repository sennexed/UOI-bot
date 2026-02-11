import random
from werkzeug.security import generate_password_hash

from models import User, AuditLog
from database import db


def log_action(actor, action, target):
    log = AuditLog(actor=actor, action=action, target=target)
    db.session.add(log)
    db.session.commit()


def generate_user_id():
    while True:
        uid = str(random.randint(1000, 99999))
        if not User.query.filter_by(user_id=uid).first():
            return uid


def admin_create_user(admin_user, username, password, role="member"):
    if admin_user.role != "admin":
        return None

    user = User(
        user_id=generate_user_id(),
        username=username,
        password_hash=generate_password_hash(password),
        role=role
    )
    db.session.add(user)
    db.session.commit()

    log_action(admin_user.username, "ISSUE_ID", user.user_id)
    return user


def link_discord_account(user, discord_id):
    existing = User.query.filter_by(discord_id=discord_id).first()
    if existing and existing.id != user.id:
        return False

    user.discord_id = discord_id
    db.session.commit()

    log_action(user.username, "LINK_DISCORD", discord_id)
    return True


def get_user_by_discord_id(discord_id):
    return User.query.filter_by(discord_id=discord_id).first()


def suspend_user(admin_user, target_user_id):
    if admin_user.role != "admin":
        return None

    user = User.query.filter_by(user_id=target_user_id).first()
    if not user:
        return None

    user.status = "suspended"
    db.session.commit()

    log_action(admin_user.username, "SUSPEND", user.user_id)
    return user


def activate_user(admin_user, target_user_id):
    if admin_user.role != "admin":
        return None

    user = User.query.filter_by(user_id=target_user_id).first()
    if not user:
        return None

    user.status = "active"
    db.session.commit()

    log_action(admin_user.username, "ACTIVATE", user.user_id)
    return user

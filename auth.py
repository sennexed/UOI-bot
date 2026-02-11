from werkzeug.security import check_password_hash
from datetime import datetime

from models import User
from database import db
from services import log_action


def authenticate(username, password):
    user = User.query.filter_by(username=username).first()

    if not user:
        return None
    if user.status != "active":
        return None
    if not check_password_hash(user.password_hash, password):
        return None

    log_action(user.username, "LOGIN", user.user_id)
    return user

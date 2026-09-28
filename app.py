"""
Tableau Embedded Analytics Demo
Flask backend — generates JWT via Connected Apps (Direct Trust)
"""

import jwt
import uuid
import datetime
from flask import Flask, render_template, session, redirect, request

app = Flask(__name__)
app.secret_key = "demo-secret-change-in-production"

# ── Tableau Cloud config — fill in your values ────────────────────────────────
TABLEAU_SERVER   = "https://prod-apnortheast-a.online.tableau.com"   # e.g. https://10ax.online.tableau.com
TABLEAU_SITE     = "your-site-name"                                   # Site name (empty string for Default)
TABLEAU_WORKBOOK = "workbook_hotembed"                                # Workbook name
TABLEAU_VIEW     = "MyTCDash"                                         # Sheet/dashboard name

# ── Connected App credentials — from Tableau Cloud Settings > Connected Apps ─
CONNECTED_APP_CLIENT_ID  = "YOUR_CLIENT_ID"
CONNECTED_APP_SECRET_ID  = "YOUR_SECRET_ID"
CONNECTED_APP_SECRET_KEY = "YOUR_SECRET_KEY"

# ── UAF: which states each demo user can see ──────────────────────────────────
USER_CONFIG = {
    "user_east": {
        "email":      "user_east@demo.com",
        "uaf_values": ["New York", "Massachusetts", "Pennsylvania", "Virginia", "Vermont"],
    },
    "user_west": {
        "email":      "user_west@demo.com",
        "uaf_values": ["California", "Oregon", "Washington", "Utah", "Nevada"],
    },
    "user_all": {
        "email":      "user_admin@demo.com",
        "uaf_values": [],   # empty = no UAF filter applied = sees everything
    },
}

DEFAULT_USER = "user_east"


def build_viz_url(view=TABLEAU_VIEW):
    site = f"/t/{TABLEAU_SITE}" if TABLEAU_SITE else ""
    return f"{TABLEAU_SERVER}{site}/views/{TABLEAU_WORKBOOK}/{view}"


def get_jwt(user_key: str) -> str:
    """Generate a signed JWT for Tableau Connected Apps (Direct Trust)."""
    user = USER_CONFIG.get(user_key, USER_CONFIG[DEFAULT_USER])
    username = user["email"]
    uaf_values = user["uaf_values"]

    payload = {
        "iss": CONNECTED_APP_CLIENT_ID,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=10),
        "jti": str(uuid.uuid4()),
        "aud": "tableau",
        "sub": username,
        "scp": ["tableau:views:embed", "tableau:metrics:embed"],
    }

    # Only add UAF claim when there are restricted values
    if uaf_values:
        payload["myuaf"] = uaf_values

    token = jwt.encode(
        payload,
        CONNECTED_APP_SECRET_KEY,
        algorithm="HS256",
        headers={
            "kid": CONNECTED_APP_SECRET_ID,
            "iss": CONNECTED_APP_CLIENT_ID,
        },
    )
    return token


@app.route("/")
def index():
    user_key = session.get("user", DEFAULT_USER)
    user = USER_CONFIG.get(user_key, USER_CONFIG[DEFAULT_USER])

    token     = get_jwt(user_key)
    viz_url   = build_viz_url()
    uaf_vals  = user["uaf_values"] if user["uaf_values"] else ["(all data — no restriction)"]

    return render_template(
        "index.html",
        tableau_viz_url = viz_url,
        jwt_token       = token,
        current_user    = user_key,
        uaf_values      = uaf_vals,
    )


@app.route("/switch-user")
def switch_user():
    user_key = request.args.get("user", DEFAULT_USER)
    if user_key in USER_CONFIG:
        session["user"] = user_key
    return redirect("/")


if __name__ == "__main__":
    app.run(debug=True, port=5000)

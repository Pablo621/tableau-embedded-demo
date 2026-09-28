# Tableau Embedded Analytics Demo

A clean demo portal showing Tableau Embedded Analytics with:
- **Connected Apps + JWT** for seamless SSO (no Tableau login prompt)
- **Embedding API v3** for programmatic filter control
- **User Attribute Functions (UAF)** for row-level security per user

## Structure

```
├── app.py              ← Flask backend, JWT generation
├── requirements.txt
├── templates/
│   └── index.html      ← Portal UI
└── static/
    ├── css/style.css
    └── js/embed.js     ← Embedding API v3 logic
```

## Setup

```bash
pip install -r requirements.txt
```

Edit `app.py` and fill in your values:

```python
TABLEAU_SERVER   = "https://prod-apnortheast-a.online.tableau.com"
TABLEAU_SITE     = "your-site-name"
TABLEAU_WORKBOOK = "workbook_hotembed"
TABLEAU_VIEW     = "MyTCDash"

CONNECTED_APP_CLIENT_ID  = "YOUR_CLIENT_ID"
CONNECTED_APP_SECRET_ID  = "YOUR_SECRET_ID"
CONNECTED_APP_SECRET_KEY = "YOUR_SECRET_KEY"
```

## Run

```bash
python app.py
```

Open `http://localhost:5000`

## Demo Flow

1. **SSO** — user lands on portal, Tableau loads with no login prompt. Click "SSO Active" to inspect the decoded JWT.
2. **Filters** — use the Region chips (static) and Category dropdown (dynamically read from the viz).
3. **UAF** — switch the user in the top-right dropdown. Each user's JWT contains a different `myuaf` claim, filtering the data server-side.

# Landslide Alert & Tracker — Full Stack

Stack: HTML/CSS/JavaScript + Flask REST API + MySQL + Leaflet/OpenStreetMap.

## Run
1. Open MySQL Workbench and run `database/schema.sql`.
2. Open terminal in `backend`.
3. `pip install -r requirements.txt`
4. `python app.py`
5. Open `http://127.0.0.1:5000`

Do NOT open `frontend/index.html` directly.

## API
- GET /api/health
- GET /api/incidents
- GET /api/statistics
- GET /api/states
- GET /api/districts
- GET /api/analytics
- GET /api/risk (if added later)
- POST /api/incidents

The included records are demo/sample project data, not official real-time disaster information.
If your MySQL root account has a password, set `DB_PASSWORD` before running Flask.

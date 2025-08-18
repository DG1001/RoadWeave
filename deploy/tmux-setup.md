# RoadWeave tmux Setup

## Quick Start

1. **Domain setzen:**
   ```bash
   export ROADWEAVE_DOMAIN="roadweave.yourdomain.com"
   ```

2. **App starten:**
   ```bash
   ./start-roadweave.sh
   ```

## Manuelle tmux-Session

```bash
# tmux-Session starten
tmux new-session -d -s roadweave

# In Session wechseln
tmux attach-session -t roadweave

# App starten
export ROADWEAVE_DOMAIN="roadweave.yourdomain.com"
./start-roadweave.sh

# Session verlassen (App läuft weiter)
Ctrl+B, dann D

# Wieder zur Session
tmux attach-session -t roadweave

# Session beenden
tmux kill-session -t roadweave
```

## Build & Start Commands

### Einmalig: Setup
```bash
# Backend-Umgebung
cp backend/.env.example backend/.env
nano backend/.env  # GEMINI_API_KEY setzen

# Python Virtual Environment
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

# Frontend Build
cd frontend
npm ci --only=production
REACT_APP_API_BASE=https://roadweave.yourdomain.com npm run build
cd ..
```

### Start in tmux
```bash
# Neue tmux-Session
tmux new-session -d -s roadweave -c /path/to/roadweave

# In Session
tmux send-keys -t roadweave 'source venv/bin/activate' Enter
tmux send-keys -t roadweave 'cd backend' Enter
tmux send-keys -t roadweave 'python app.py' Enter

# Session anzeigen
tmux attach-session -t roadweave
```

## Nginx Konfiguration

Deine nginx-Konfiguration sollte sein:
```nginx
location / {
    proxy_pass http://127.0.0.1:7300;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Environment Konfiguration

**Wichtige Einstellungen in `backend/.env`:**
```env
# Server
FLASK_ENV=production
FLASK_DEBUG=False
FLASK_HOST=0.0.0.0
FLASK_PORT=7300

# API Key (REQUIRED!)
GEMINI_API_KEY=your-actual-api-key

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password

# Security (generate new!)
SECRET_KEY=your-unique-secret-key
JWT_SECRET_KEY=your-unique-jwt-key

# Features
ENABLE_PHOTO_ANALYSIS=true
DAILY_PHOTO_ANALYSIS_LIMIT=200
```

## Monitoring

```bash
# Session anzeigen
tmux list-sessions

# Logs in Session ansehen
tmux attach-session -t roadweave

# Port prüfen
sudo netstat -tlnp | grep 7300

# Prozess prüfen
ps aux | grep "python.*app.py"
```

## Neustart nach Änderungen

```bash
# In tmux-Session:
Ctrl+C  # App stoppen
python app.py  # Neu starten

# Oder von außen:
tmux send-keys -t roadweave C-c
tmux send-keys -t roadweave 'python app.py' Enter
```

## Frontend-Updates

```bash
# Neues Frontend bauen
cd frontend
REACT_APP_API_BASE=https://roadweave.yourdomain.com npm run build

# Flask automatisch neu laden (production mode)
# Kein Neustart nötig - Flask dient statische Dateien
```

## Backup

```bash
# Wichtige Dateien sichern
tar -czf roadweave-backup-$(date +%Y%m%d).tar.gz \
    backend/.env \
    backend/roadweave.db \
    backend/uploads/
```

## Troubleshooting

1. **Port 7300 bereits belegt:**
   ```bash
   sudo lsof -i :7300
   # Prozess beenden oder anderen Port wählen
   ```

2. **Frontend nicht gefunden:**
   ```bash
   # Frontend neu bauen
   cd frontend && npm run build
   ```

3. **Nginx 502 Error:**
   ```bash
   # Prüfen ob App läuft
   curl http://localhost:7300/api/health
   ```

4. **tmux Session verschwunden:**
   ```bash
   tmux list-sessions
   # Neue Session starten
   ```
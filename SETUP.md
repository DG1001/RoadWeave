# RoadWeave Quick Setup

## Local Configuration

1. **Create your domain configuration:**
   ```bash
   # Create local config (not committed to git)
   echo 'ROADWEAVE_DOMAIN=roadweave.example.com' > .env.local
   ```

2. **Configure backend:**
   ```bash
   cp backend/.env.example backend/.env
   nano backend/.env  # Set your GEMINI_API_KEY
   ```

3. **Build frontend (if npm install already done):**
   ```bash
   ./build-frontend.sh
   ```

4. **Start application:**
   ```bash
   ./start-roadweave.sh
   ```

## What happens:
- ✅ Domain automatically loaded from `.env.local`
- ✅ Frontend built for your domain
- ✅ Backend started on port 7300
- ✅ Ready for nginx proxy

## Nginx Configuration

Your nginx config should proxy to port 7300:
```nginx
location / {
    proxy_pass http://127.0.0.1:7300;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## For tmux:
```bash
tmux new-session -d -s roadweave
tmux attach-session -t roadweave
./start-roadweave.sh
# Ctrl+B, D to detach
```

## Files (git-ignored):
- `.env.local` - Your domain configuration
- `backend/.env` - Backend configuration with API keys
- `frontend/build/` - Built React application
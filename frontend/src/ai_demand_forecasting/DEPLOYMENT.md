# Deploying AI Demand Forecasting

Two pieces: the FastAPI backend and the Vite/React frontend. Both have free
tiers suitable for a pilot demo — no cost until you need real scale.

## 1. Backend → Render (or Railway)

Render is the simplest — it builds straight from the included `Dockerfile`.

1. Push the `vijetha_backend/` folder to a GitHub repo.
2. Go to render.com → New → Web Service → connect the repo.
3. Render auto-detects the `Dockerfile`. Leave build/start commands blank.
4. Instance type: Free (fine for a pilot demo; sleeps after inactivity on
   the free tier — first request after idle takes ~30s to wake up).
5. Deploy. You'll get a URL like `https://vijetha-backend.onrender.com`.

**Database — start with SQLite, upgrade later.** The free Render instance's
filesystem is ephemeral (SQLite data is wiped on redeploy), which is fine
while you're just demoing. When you're ready for persistent data:

1. Render → New → PostgreSQL (free tier available).
2. Copy the "Internal Database URL" it gives you.
3. In your web service's environment variables, add:
   `DATABASE_URL = <that connection string>`
4. Redeploy. No code changes needed — `app/database.py` already reads
   `DATABASE_URL` from the environment.

Once deployed, re-run the ingest → train → generate-forecasts sequence
against the live URL (via `/docs`, curl, or a small script) to populate it.

## 2. Frontend → Vercel (or Netlify)

1. Push `vijetha_frontend/` to a GitHub repo (same repo or separate, either works).
2. vercel.com → New Project → import the repo.
3. Framework preset: Vite (auto-detected).
4. Add an environment variable: `VITE_API_URL = https://vijetha-backend.onrender.com`
   (your actual Render URL from step 1).
5. Deploy. You'll get a URL like `https://vijetha-demand-intelligence.vercel.app`.

That URL is what you'd share, or open live in a meeting.

## 3. Verify the connection

Open the deployed frontend URL. It calls `/health` on load — if the backend
is reachable it shows the dashboard, otherwise a clear "can't reach backend"
screen with the target URL shown (built into `App.jsx`'s `SetupScreen`).

If the backend has no data yet (fresh Postgres), the frontend will show a
"no data yet" screen telling you to run the ingest/train/forecast sequence.

## Local development (no deployment)

Terminal 1:
```bash
cd vijetha_backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Terminal 2:
```bash
cd vijetha_frontend
npm install
npm run dev
```

Frontend defaults to `http://localhost:8000` when `VITE_API_URL` isn't set,
so local dev works with zero config.

## Cost note

Render free web service + free Postgres + Vercel free tier = $0/month for
a pilot demo at this scale (20 stores, 100 SKUs, 730K rows). This comfortably
covers showing the tool to Vijetha or any other prospect. Revisit paid tiers
only once there's a real retailer's full dataset and consistent traffic.

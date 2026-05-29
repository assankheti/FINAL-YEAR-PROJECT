# Render Deployment Guide

This repo is a monorepo. The backend Render service should use:

- Root directory: `app-assankheti-backend`
- Build command: `pip install --upgrade pip && pip install -r requirements.txt`
- Start command: `bash start.sh`
- Python version: `3.11.11`

The root `render.yaml` already contains these settings for a Render Blueprint.

## 1. Prepare GitHub

1. Push this project to GitHub, GitLab, or Bitbucket.
2. Make sure these files are committed:
   - `render.yaml`
   - `app-assankheti-backend/start.sh`
   - `app-assankheti-backend/render.env.example`
   - `app-assankheti-backend/requirements.txt`
   - `app-assankheti-backend/src/app/main.py`

## 2. Create MongoDB Atlas

Render does not provide managed MongoDB, so use MongoDB Atlas.

1. Go to MongoDB Atlas and create a free or paid cluster.
2. Create a database user and password.
3. In Network Access, allow Render to connect. For easiest setup, add `0.0.0.0/0`. For production, tighten this later.
4. Copy your connection string. It should look like:

```text
mongodb+srv://USERNAME:PASSWORD@YOUR-CLUSTER.mongodb.net/?retryWrites=true&w=majority
```

Use this value as `MONGODB_URI` in Render.

## 3. Create The Render Backend

Recommended path:

1. Open the Render Dashboard.
2. Click New > Blueprint.
3. Connect the repository that contains this project.
4. Render will detect `render.yaml` at the repo root.
5. Review the service named `assan-kheti-backend`.
6. Keep the plan as `starter` if you want persistent uploads. The included disk stores files at `/var/data/uploads`.
7. Click Apply.

Free-plan alternative:

1. Open `render.yaml`.
2. Change `plan: starter` to `plan: free`.
3. Remove the whole `disk:` block.
4. Change `UPLOAD_ROOT` from `/var/data/uploads` to `/tmp/uploads`.

Free services can lose uploaded files after restarts and can spin down when idle.

## 4. Add Environment Variables

In Render, open the new backend service, then go to Environment.

Add the values from `app-assankheti-backend/render.env.example`. Do not paste example placeholder values. Replace them with real credentials.

Required for basic backend startup:

```text
PYTHON_VERSION=3.11.11
PYTHONUNBUFFERED=1
PYTHONPATH=src
MONGODB_URI=your_mongodb_atlas_uri
MONGO_DB_NAME=dbasssankheti
UPLOAD_ROOT=/var/data/uploads
STYTCH_PROJECT_ID=your_stytch_project_id
STYTCH_SECRET=your_stytch_secret
STYTCH_ENV=live
STYTCH_ENVIRONMENT=live
```

Required for enabled integrations:

```text
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_ADMIN_MOBILE_IDS=admin-001,admin-002
STREAM_APP_ID=your_stream_app_id
STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_api_secret
STREAM_ADMIN_MOBILE_IDS=admin-001,admin-002
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
FRONTEND_URL=https://your-frontend-domain.example
API_URL=https://assan-kheti-backend.onrender.com
```

Optional chatbot variables:

```text
OPENAI_API_KEY=your_openai_api_key
OPENAI_CHAT_MODEL=gpt-3.5-turbo
```

## 5. Deploy

1. In the Render service, click Manual Deploy > Deploy latest commit.
2. Watch the deploy logs.
3. A successful deploy should end with Uvicorn listening on Render's provided port.
4. Open:

```text
https://YOUR-SERVICE-NAME.onrender.com/
```

You should see the API welcome JSON.

## 6. Verify The API

Check these URLs:

```text
https://YOUR-SERVICE-NAME.onrender.com/
https://YOUR-SERVICE-NAME.onrender.com/docs
https://YOUR-SERVICE-NAME.onrender.com/health/db
```

If `/health/db` returns `503`, fix `MONGODB_URI`, database user permissions, or MongoDB Atlas Network Access.

## 7. Configure Stripe Webhook

After the backend has a public Render URL:

1. Go to Stripe Dashboard > Developers > Webhooks.
2. Add endpoint:

```text
https://YOUR-SERVICE-NAME.onrender.com/api/v1/stripe/webhook
```

3. Copy the webhook signing secret.
4. Set it as `STRIPE_WEBHOOK_SECRET` in Render.
5. Save and redeploy the backend.

## 8. Point The Frontend At Render

Set the frontend API URL to:

```text
API_URL=https://YOUR-SERVICE-NAME.onrender.com
```

For Expo, make sure `app-assankheti-frontend/app.config.js` receives that value when building or running the frontend.

## 9. Common Fixes

No open ports detected:

- Confirm the start command is `bash start.sh`.
- Confirm `start.sh` uses `--host 0.0.0.0 --port "${PORT:-8000}"`.

ModuleNotFoundError for `app`:

- Confirm `PYTHONPATH=src`.
- Confirm Render root directory is `app-assankheti-backend`.

MongoDB connection fails:

- Use `MONGODB_URI`, not `MONGODB_LOCAL`, on Render.
- Check Atlas username, password, and Network Access.

Build fails on TensorFlow:

- Confirm `PYTHON_VERSION=3.11.11`.
- Use at least the `starter` plan. TensorFlow is heavy for small instances.

Uploads disappear:

- Use the `starter` plan with the included persistent disk.
- Confirm `UPLOAD_ROOT=/var/data/uploads`.

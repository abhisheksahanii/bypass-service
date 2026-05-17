# Bypass Service

Self-hosted link bypasser for link-hub.net, linkvertise.com, work.ink and more.
Built with Node.js + Puppeteer. Deploy on Railway in 2 minutes.

---

## Deploy on Railway

1. Go to https://railway.app and sign up (free)
2. Click **New Project** → **Deploy from GitHub**
3. Push this folder to a GitHub repo first:
   ```bash
   git init
   git add .
   git commit -m "initial"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```
4. In Railway, connect your GitHub repo
5. Add these **Environment Variables** in Railway dashboard:
   - `API_KEY` → any secret string e.g. `mysecretkey123`
   - `PORT` → `3000`
6. Deploy — Railway gives you a public URL like `https://bypass-service.up.railway.app`

---

## API Usage

### Bypass a link
```
POST /bypass
Headers:
  x-api-key: YOUR_API_KEY
  Content-Type: application/json

Body:
{
  "url": "https://link-hub.net/246317/4WZRznPiPv8V"
}

Response:
{
  "status": "success",
  "original": "https://link-hub.net/246317/4WZRznPiPv8V",
  "result": "https://mega.nz/folder/xxx#yyy"
}
```

### Health check
```
GET /health
Headers:
  x-api-key: YOUR_API_KEY

Response:
{ "status": "ok" }
```

---

## n8n HTTP Request Node Setup

- **Method:** POST
- **URL:** `https://YOUR-RAILWAY-URL/bypass`
- **Headers:**
  - `x-api-key: YOUR_API_KEY`
  - `Content-Type: application/json`
- **Body (JSON):**
  ```json
  { "url": "={{ $json.url }}" }
  ```

---

## Supported Link Lockers

| Site | Status |
|------|--------|
| link-hub.net | ✅ Supported |
| linkvertise.com | ✅ Supported |
| work.ink | ✅ Supported |
| Generic lockers | ✅ Best effort |

---

## Run Locally

```bash
npm install
API_KEY=mysecretkey123 npm start
```

Then test:
```bash
curl -X POST http://localhost:3000/bypass \
  -H "x-api-key: mysecretkey123" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://link-hub.net/246317/4WZRznPiPv8V"}'
```

# EC Moodboard Studio

AI-powered moodboard generation for EC Creative Studio. Receives vision prompts from n8n, generates creative direction + images, uploads to Google Drive, sends email notification.

---

## Stack

- **Next.js 14** — frontend + API routes
- **Vercel** — hosting + serverless
- **Supabase** — project storage
- **Google Drive API** — client folder creation + image upload
- **Resend** — email notification
- **Gemini 2.5 Flash** — creative direction engine
- **Fal.ai Flux** — image generation (default, ~$0.003/img)
- **GPT Image 2** — premium image option

---

## Deploy to Vercel

1. Push this folder to a GitHub repo
2. Connect repo to Vercel
3. Add all env vars from `.env.example` in Vercel → Settings → Environment Variables
4. Deploy

---

## Supabase Setup

1. Create a Supabase project at supabase.com
2. Go to SQL Editor
3. Paste and run the contents of `supabase-schema.sql`
4. Copy your project URL and service role key into `.env`

---

## Google Drive Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable **Google Drive API**
4. Go to IAM → Service Accounts → Create Service Account
5. Give it a name like `ec-moodboard-drive`
6. Click the service account → Keys → Add Key → JSON
7. Download the JSON file
8. Paste the **entire JSON content** as the value of `GOOGLE_SERVICE_ACCOUNT_JSON` in Vercel
9. **Important:** Share your Google Drive root folder with the service account email
   - Open Google Drive
   - Right-click your root folder (or create "EC Creative Studio" folder)
   - Share → paste the service account email (looks like `ec-moodboard-drive@project.iam.gserviceaccount.com`)
   - Give it Editor access

---

## n8n Webhook Setup

In your n8n automation, after building the vision prompt:

**HTTP Request node:**
- Method: `POST`
- URL: `https://your-app.vercel.app/api/webhook`
- Headers:
  - `Content-Type: application/json`
  - `x-webhook-secret: your-secret-here` (matches `WEBHOOK_SECRET` env var)
- Body (JSON):
```json
{
  "prompt": "{{ $node['AI Prompt Builder'].json.prompt }}",
  "clientName": "{{ $node['Notion Lookup'].json.name }}",
  "sessionType": "{{ $node['Form Data'].json.sessionType }}",
  "email": "{{ $node['Form Data'].json.email }}",
  "notionPageId": "{{ $node['Notion Lookup'].json.id }}"
}
```

n8n will get a `202 Accepted` immediately. Generation runs in the background.
You get an email when the moodboard is ready.

---

## n8n Notion Lookup Pattern

To get client name from your Notion Project DB:

1. **Trigger:** Form 2 webhook (email field)
2. **Notion node:** Query Projects DB where Email = `{{ $json.email }}`
3. **AI node (Gemini/GPT-4o):** Build vision prompt from form fields
4. **HTTP Request:** POST to `/api/webhook` with name from Notion + prompt from AI

---

## Local Development

```bash
cp .env.example .env.local
# Fill in your keys

npm install
npm run dev
```

Open http://localhost:3000

---

## Image Models

| Model | Key | Cost | Quality |
|-------|-----|------|---------|
| Fal.ai Flux Schnell | `FAL_API_KEY` | ~$0.003/img | Excellent editorial |
| Fal.ai Flux Dev | `FAL_API_KEY` | ~$0.025/img | Higher quality |
| Gemini Imagen 4 | `GEMINI_API_KEY` | ~$0.04–0.07/img | Google quality |
| GPT Image 2 | `OPENAI_API_KEY` | ~$0.12–0.60/img | Premium, reasoning |

---

## Webhook Response

n8n receives this immediately (202):
```json
{
  "success": true,
  "projectId": "mb_1234567890_abc123",
  "message": "Moodboard generation started. You will receive an email when ready.",
  "studioUrl": "https://your-app.vercel.app?project=mb_1234567890_abc123"
}
```

You can store `projectId` back to Notion if you want to link the project.

---

## Environment Variables

See `.env.example` for all required variables with descriptions.

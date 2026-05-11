import { NextRequest, NextResponse } from 'next/server';
import { WebhookPayload, MoodboardProject, GeneratedImage } from '@/types';
import { generateCreativeDirection } from '@/lib/gemini';
import { buildAllPrompts } from '@/lib/promptBuilder';
import { generateMoodboardImages } from '@/lib/imageGen';
import { createClientMoodboardFolder, uploadImageToDrive, uploadDirectionNotes } from '@/lib/drive';
import { sendMoodboardNotification } from '@/lib/resend';
import { saveProject, updateProject } from '@/lib/supabase';

// Validate webhook secret
function validateSecret(req: NextRequest): boolean {
  const secret = req.headers.get('x-webhook-secret');
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected) return true; // No secret set = allow (dev mode)
  return secret === expected;
}

// Generate a unique project ID
function genId(): string {
  return `mb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(req: NextRequest) {
  // Validate secret
  if (!validateSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: WebhookPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { prompt, clientName, sessionType, email, notionPageId } = body;

  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  const projectId = genId();

  // ── RESPOND IMMEDIATELY (fire and forget) ────────────────────────────────
  // n8n gets 202 right away. Generation happens in background.
  const responsePayload = {
    success: true,
    projectId,
    message: 'Moodboard generation started. You will receive an email when ready.',
    studioUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}?project=${projectId}`
  };

  // Kick off async generation (don't await)
  generateMoodboard(projectId, body).catch(err => {
    console.error(`[webhook] Generation failed for ${projectId}:`, err);
  });

  return NextResponse.json(responsePayload, { status: 202 });
}

// ── BACKGROUND GENERATION PIPELINE ───────────────────────────────────────────
async function generateMoodboard(projectId: string, payload: WebhookPayload) {
  const {
    prompt,
    clientName = 'Client',
    sessionType = '',
    email = '',
    notionPageId = ''
  } = payload;

  // Read env config
  const geminiKey    = process.env.GEMINI_API_KEY;
  const openaiKey    = process.env.OPENAI_API_KEY;
  const falKey       = process.env.FAL_API_KEY;
  const resendKey    = process.env.RESEND_API_KEY;
  const notifyEmail  = process.env.NOTIFICATION_EMAIL || '';
  const fromEmail    = process.env.FROM_EMAIL || 'studio@eccreativestudios.com';
  const studioName   = process.env.STUDIO_NAME || 'EC Creative Studio';
  const defaultStyle = process.env.DEFAULT_STYLE || 'Warm cinematic lighting. Shallow depth of field. Natural skin tones. Minimal environments. Luxury editorial restraint.';
  const textModel    = (process.env.TEXT_MODEL || 'gemini') as 'gemini' | 'openai';
  const imageModel   = (process.env.IMAGE_MODEL || 'fal') as 'fal' | 'gemini' | 'openai';
  const imageCount   = parseInt(process.env.IMAGE_COUNT || '4');
  const imageQuality = (process.env.IMAGE_QUALITY || 'standard') as 'standard' | 'high';
  const driveEnabled = process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.GOOGLE_SERVICE_ACCOUNT_JSON !== '{}';

  console.log(`[webhook] Starting generation for ${projectId} — ${clientName}`);

  // 1. Create initial project record (status: generating)
  const initialProject: MoodboardProject = {
    id: projectId,
    created_at: new Date().toISOString(),
    client_name: clientName,
    client_email: email,
    session_type: sessionType,
    notion_page_id: notionPageId,
    original_prompt: prompt,
    direction: {} as any,
    images: [],
    status: 'generating',
    image_model: imageModel,
    triggered_by: 'webhook'
  };

  try { await saveProject(initialProject); } catch (e) {
    console.error('[webhook] Failed to save initial project:', e);
  }

  // 2. Generate creative direction
  console.log(`[webhook] Generating creative direction...`);
  let direction;
  try {
    direction = await generateCreativeDirection(
      prompt, sessionType, defaultStyle, studioName,
      textModel, geminiKey, openaiKey
    );
  } catch (e) {
    console.error('[webhook] Creative direction failed:', e);
    await updateProject(projectId, { status: 'review' }).catch(() => {});
    return;
  }

  // 3. Build 11-layer prompts
  console.log(`[webhook] Building ${imageCount} layered prompts...`);
  const prompts = buildAllPrompts(direction, imageCount);
  const beats = direction.storyBeats?.slice(0, imageCount) || prompts.map((_, i) => `Image ${i + 1}`);

  // 4. Generate images
  console.log(`[webhook] Generating images with ${imageModel}...`);
  const images = await generateMoodboardImages(
    prompts, beats, imageModel, imageQuality,
    { fal: falKey, gemini: geminiKey, openai: openaiKey }
  );

  // 5. Create Google Drive folder and upload
  let driveFolderId = '';
  let driveFolderUrl = '';

  if (driveEnabled) {
    console.log(`[webhook] Creating Drive folder...`);
    try {
      const folder = await createClientMoodboardFolder(
        clientName, sessionType, direction.moodboardTitle
      );
      driveFolderId = folder.folderId;
      driveFolderUrl = folder.folderUrl;

      // Upload each image
      const updatedImages: GeneratedImage[] = [];
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (img.url && img.status === 'done') {
          try {
            const uploaded = await uploadImageToDrive(
              img.url,
              `image-${i + 1}-${direction.moodboardTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.jpg`,
              driveFolderId
            );
            updatedImages.push({ ...img, driveUrl: uploaded.fileUrl, driveFileId: uploaded.fileId });
          } catch (e) {
            console.error(`[webhook] Drive upload failed for image ${i + 1}:`, e);
            updatedImages.push(img);
          }
        } else {
          updatedImages.push(img);
        }
      }
      images.splice(0, images.length, ...updatedImages);

      // Upload direction notes
      await uploadDirectionNotes(direction as any, clientName, driveFolderId).catch(() => {});

    } catch (e) {
      console.error('[webhook] Drive folder creation failed:', e);
    }
  }

  // 6. Save completed project
  const completedProject: MoodboardProject = {
    ...initialProject,
    direction,
    images,
    drive_folder_id: driveFolderId,
    drive_folder_url: driveFolderUrl,
    status: 'review'
  };

  try { await saveProject(completedProject); } catch (e) {
    console.error('[webhook] Failed to save completed project:', e);
  }

  // 7. Send email notification
  if (resendKey && notifyEmail) {
    console.log(`[webhook] Sending email notification to ${notifyEmail}...`);
    try {
      await sendMoodboardNotification(completedProject, resendKey, notifyEmail, fromEmail);
    } catch (e) {
      console.error('[webhook] Email notification failed:', e);
    }
  }

  console.log(`[webhook] Complete for ${projectId} — ${direction.moodboardTitle}`);
}

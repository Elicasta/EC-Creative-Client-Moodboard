import { NextRequest, NextResponse } from 'next/server';
import { GenerateRequest, MoodboardProject } from '@/types';
import { generateCreativeDirection } from '@/lib/gemini';
import { buildAllPrompts } from '@/lib/promptBuilder';
import { generateMoodboardImages } from '@/lib/imageGen';
import { createClientMoodboardFolder, uploadImageToDrive, uploadDirectionNotes } from '@/lib/drive';
import { saveProject } from '@/lib/supabase';

function genId(): string {
  return `mb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(req: NextRequest) {
  let body: GenerateRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    prompt, clientName = 'Internal', sessionType = '',
    email = '', notionPageId = '',
    imageModel = 'fal', imageCount = 4, imageQuality = 'standard'
  } = body;

  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  // Read API keys — from env (server) or from request headers (client-provided)
  const geminiKey    = process.env.GEMINI_API_KEY    || req.headers.get('x-gemini-key') || undefined;
  const openaiKey    = process.env.OPENAI_API_KEY    || req.headers.get('x-openai-key') || undefined;
  const falKey       = process.env.FAL_API_KEY       || req.headers.get('x-fal-key')    || undefined;
  const studioName   = process.env.STUDIO_NAME       || 'EC Creative Studio';
  const defaultStyle = process.env.DEFAULT_STYLE     || 'Warm cinematic lighting. Shallow depth of field. Natural skin tones. Minimal environments. Luxury editorial restraint.';
  const textModel    = (process.env.TEXT_MODEL       || 'gemini') as 'gemini' | 'openai';
  const driveEnabled = !!(process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.GOOGLE_SERVICE_ACCOUNT_JSON !== '{}');

  const projectId = genId();

  try {
    // 1. Creative direction
    const direction = await generateCreativeDirection(
      prompt, sessionType, defaultStyle, studioName,
      textModel, geminiKey, openaiKey
    );

    // 2. Build prompts
    const prompts = buildAllPrompts(direction, imageCount);
    const beats = direction.storyBeats?.slice(0, imageCount) || [];

    // 3. Generate images
    const images = await generateMoodboardImages(
      prompts, beats, imageModel, imageQuality,
      { fal: falKey, gemini: geminiKey, openai: openaiKey }
    );

    // 4. Drive upload (if configured)
    let driveFolderId = '';
    let driveFolderUrl = '';

    if (driveEnabled) {
      try {
        const folder = await createClientMoodboardFolder(clientName, sessionType, direction.moodboardTitle);
        driveFolderId = folder.folderId;
        driveFolderUrl = folder.folderUrl;

        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          if (img.url && img.status === 'done') {
            try {
              const uploaded = await uploadImageToDrive(
                img.url,
                `image-${i + 1}.jpg`,
                driveFolderId
              );
              images[i] = { ...img, driveUrl: uploaded.fileUrl, driveFileId: uploaded.fileId };
            } catch {}
          }
        }

        await uploadDirectionNotes(direction as any, clientName, driveFolderId).catch(() => {});
      } catch (e) {
        console.error('[generate] Drive failed:', e);
      }
    }

    // 5. Save to Supabase
    const project: MoodboardProject = {
      id: projectId,
      created_at: new Date().toISOString(),
      client_name: clientName,
      client_email: email,
      session_type: sessionType,
      notion_page_id: notionPageId,
      original_prompt: prompt,
      direction,
      images,
      drive_folder_id: driveFolderId,
      drive_folder_url: driveFolderUrl,
      status: 'review',
      image_model: imageModel,
      triggered_by: 'manual'
    };

    try { await saveProject(project); } catch {}

    return NextResponse.json({ success: true, project });

  } catch (e: any) {
    console.error('[generate] Error:', e);
    return NextResponse.json({ error: e.message || 'Generation failed' }, { status: 500 });
  }
}

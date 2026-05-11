import { GeneratedImage } from '@/types';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── FAL.AI FLUX SCHNELL ───────────────────────────────────────────────────────
async function generateFal(
  prompt: string,
  key: string,
  quality: 'standard' | 'high'
): Promise<string> {
  const model = quality === 'high' ? 'fal-ai/flux/dev' : 'fal-ai/flux/schnell';

  const submitRes = await fetch(`https://queue.fal.run/${model}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${key}`
    },
    body: JSON.stringify({
      prompt,
      image_size: 'portrait_4_3',
      num_inference_steps: quality === 'high' ? 28 : 4,
      num_images: 1,
      enable_safety_checker: false
    })
  });

  if (!submitRes.ok) {
    throw new Error(`Fal submit error ${submitRes.status}: ${await submitRes.text()}`);
  }

  const { request_id, response_url } = await submitRes.json();
  const pollUrl = response_url || `https://queue.fal.run/${model}/requests/${request_id}`;

  for (let attempt = 0; attempt < 40; attempt++) {
    await sleep(2500);
    try {
      const pollRes = await fetch(pollUrl, {
        headers: { 'Authorization': `Key ${key}` }
      });
      if (!pollRes.ok) continue;
      const data = await pollRes.json();
      const imgs = data.images || data.output?.images;
      if (imgs?.[0]) return imgs[0].url || imgs[0];
      if (data.status === 'FAILED') throw new Error('Fal generation failed');
    } catch (e) {
      if (attempt > 35) throw e;
    }
  }
  throw new Error('Fal generation timeout after 100s');
}

// ── GEMINI IMAGEN 4 ───────────────────────────────────────────────────────────
async function generateGemini(
  prompt: string,
  key: string,
  quality: 'standard' | 'high'
): Promise<string> {
  const model = quality === 'high'
    ? 'imagen-4.0-ultra-generate-001'
    : 'imagen-4.0-generate-001';

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '3:4',
          safetyFilterLevel: 'BLOCK_ONLY_HIGH',
          personGeneration: 'ALLOW_ALL'
        }
      })
    }
  );

  if (!res.ok) throw new Error(`Gemini image error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const b64 = data.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error('No image data from Gemini');
  return `data:image/png;base64,${b64}`;
}

// ── GPT IMAGE 2 ───────────────────────────────────────────────────────────────
async function generateOpenAI(
  prompt: string,
  key: string,
  quality: 'standard' | 'high'
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model: 'gpt-image-2',
      prompt: prompt.slice(0, 4000),
      n: 1,
      size: quality === 'high' ? '1536x1024' : '1024x1024',
      quality: quality === 'high' ? 'high' : 'medium',
      output_format: 'url'
    })
  });

  if (!res.ok) throw new Error(`OpenAI image error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const result = data.data?.[0];
  if (!result) throw new Error('No image from OpenAI');
  if (result.b64_json) return `data:image/png;base64,${result.b64_json}`;
  if (result.url) return result.url;
  throw new Error('No URL or b64 from OpenAI');
}

// ── MAIN DISPATCHER ───────────────────────────────────────────────────────────
export async function generateSingleImage(
  prompt: string,
  model: 'fal' | 'gemini' | 'openai',
  quality: 'standard' | 'high',
  keys: { fal?: string; gemini?: string; openai?: string }
): Promise<string> {
  // Try requested model first, fall back if key missing
  const order: Array<'fal' | 'gemini' | 'openai'> = [
    model,
    ...(['fal', 'gemini', 'openai'] as const).filter(m => m !== model)
  ];

  for (const m of order) {
    try {
      if (m === 'fal' && keys.fal) return await generateFal(prompt, keys.fal, quality);
      if (m === 'gemini' && keys.gemini) return await generateGemini(prompt, keys.gemini, quality);
      if (m === 'openai' && keys.openai) return await generateOpenAI(prompt, keys.openai, quality);
    } catch (e) {
      console.error(`[imageGen] ${m} failed:`, e);
      if (m === model) continue; // try fallback
      throw e;
    }
  }
  throw new Error('No image API keys available for any provider.');
}

// ── GENERATE ALL IMAGES FOR A MOODBOARD ──────────────────────────────────────
export async function generateMoodboardImages(
  prompts: string[],
  beats: string[],
  model: 'fal' | 'gemini' | 'openai',
  quality: 'standard' | 'high',
  keys: { fal?: string; gemini?: string; openai?: string },
  onProgress?: (index: number, total: number) => void
): Promise<GeneratedImage[]> {
  const results: GeneratedImage[] = [];

  for (let i = 0; i < prompts.length; i++) {
    onProgress?.(i, prompts.length);
    try {
      const url = await generateSingleImage(prompts[i], model, quality, keys);
      results.push({ url, prompt: prompts[i], beat: beats[i] || '', status: 'done' });
    } catch (e: any) {
      results.push({
        url: null,
        prompt: prompts[i],
        beat: beats[i] || '',
        status: 'error',
        error: e.message
      });
    }
    // Small delay between requests to avoid rate limits
    if (i < prompts.length - 1) await sleep(500);
  }

  return results;
}

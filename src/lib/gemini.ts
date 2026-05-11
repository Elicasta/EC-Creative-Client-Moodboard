import { CreativeDirection } from '@/types';

export async function generateCreativeDirection(
  prompt: string,
  sessionType: string,
  defaultStyle: string,
  studioName: string,
  model: 'gemini' | 'openai',
  geminiKey?: string,
  openaiKey?: string
): Promise<CreativeDirection> {

  const systemPrompt = `You are the creative director of "${studioName}", a luxury photography studio.
You think like a world-class art director, visual stylist, and moodboard curator.
Your role is to transform a client vision prompt into a fully realized editorial creative direction.
Return ONLY valid JSON, no markdown, no explanation.`;

  const userPrompt = `Transform this client vision into a complete luxury editorial creative direction.

CLIENT VISION: ${prompt}
SESSION TYPE: ${sessionType || 'Photography Session'}
STUDIO STYLE DNA: ${defaultStyle || 'Warm cinematic lighting. Shallow depth of field. Natural skin tones. Minimal environments. Luxury editorial restraint.'}

Return this exact JSON structure:
{
  "moodboardTitle": "Evocative editorial title (4-7 poetic words)",
  "subtitle": "One cinematic sentence capturing the emotional core",
  "moodKeywords": ["word1","word2","word3","word4","word5"],
  "colorStory": "2-3 sentences on palette, tones, psychological effect of the colors",
  "lightingDirection": "Specific: quality, direction, time of day, modifiers, mood",
  "wardrobeNotes": "Fabrics, silhouettes, palette, textures, accessories, movement",
  "environmentNotes": "Location specifics, props, backgrounds, set details, spatial feel",
  "compositionStyle": "Framing, angles, depth of field, negative space, editorial rhythm",
  "cinematicReferences": ["Reference 1","Reference 2","Reference 3"],
  "storyBeats": [
    "Opening image: establish mood and environment",
    "Second image: wardrobe and movement",
    "Third image: emotional close detail",
    "Fourth image: wide environmental context",
    "Fifth image: intimate connection moment",
    "Sixth image: final editorial closing frame"
  ],
  "photographyNotes": {
    "camera": "Lens choice, aperture feel, camera movement",
    "lighting": "Natural or artificial, specific setup, modifiers",
    "postProcessing": "Color grade, skin treatment, grain, shadow treatment",
    "pacing": "Session flow, energy management, timing notes"
  },
  "imagePromptBase": "60-80 word cinematic photography foundation prompt. Include: photographic style, film stock aesthetic, lighting quality, color temperature, mood atmosphere, technical specs. Do NOT include specific subjects or poses here.",
  "clientMessage": "One poetic sentence to share with the client about their vision"
}`;

  let text: string;

  if (model === 'openai' && openaiKey) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1800,
        response_format: { type: 'json_object' }
      })
    });
    if (!res.ok) throw new Error(`OpenAI direction error ${res.status}: ${await res.text()}`);
    text = (await res.json()).choices[0].message.content;

  } else if (geminiKey) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 1800
          }
        })
      }
    );
    if (!res.ok) throw new Error(`Gemini direction error ${res.status}: ${await res.text()}`);
    text = (await res.json()).candidates[0].content.parts[0].text;

  } else {
    throw new Error('No text API key configured.');
  }

  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean) as CreativeDirection;
}

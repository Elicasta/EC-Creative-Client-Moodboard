import { CreativeDirection, PromptLayers } from '@/types';

// ── ANCHOR DESCRIPTORS (locked across all images for visual cohesion) ──────────
function buildAnchorDNA(d: CreativeDirection): string {
  const keywords = (d.moodKeywords || []).slice(0, 3).join(', ');
  return `consistent visual world: ${keywords}, ${d.colorStory?.split('.')[0] || ''}, ${d.lightingDirection?.split(',')[0] || ''}`;
}

// ── 11-LAYER PROMPT BUILDER ───────────────────────────────────────────────────
export function buildPromptLayers(
  d: CreativeDirection,
  beat: string,
  index: number
): PromptLayers {

  // Layer 1 — Subject (from story beat)
  const subject = beat;

  // Layer 2 — Emotion (derived from tone + keyword)
  const emotionMap: Record<string, string> = {
    'soft': 'tender emotional presence, quiet vulnerability, genuine feeling',
    'cinematic': 'dramatic emotional resonance, intentional expression, story in a frame',
    'editorial': 'composed confident emotion, fashion-forward feeling, purposeful energy',
    'warm': 'tender warmth, nostalgic feeling, golden emotional safety',
    'intimate': 'private quiet moment, closeness and trust, unguarded authentic feeling',
    'luxury': 'composed elegance, effortless sophistication, unhurried presence',
    'dreamy': 'soft reverie, floating emotional lightness, ethereal feeling',
    'nostalgic': 'timeless emotion, memory-like quality, aching beauty',
  };
  const keywordLower = (d.moodKeywords?.[index % d.moodKeywords.length] || '').toLowerCase();
  const emotion = Object.entries(emotionMap).find(([k]) => keywordLower.includes(k))?.[1]
    || 'authentic emotional presence, genuine feeling, natural expression';

  // Layer 3 — Wardrobe
  const wardrobe = d.wardrobeNotes || 'soft neutral wardrobe, natural fabrics, elegant silhouette';

  // Layer 4 — Environment
  const environment = d.environmentNotes || 'minimal clean environment, intentional negative space';

  // Layer 5 — Lighting
  const lighting = d.lightingDirection || 'warm natural light, soft directional, golden quality';

  // Layer 6 — Cinematic
  const cinematicRef = (d.cinematicReferences || [])[index % (d.cinematicReferences?.length || 1)] || '';
  const cinematic = `cinematic quality${cinematicRef ? `, ${cinematicRef} aesthetic` : ''}, editorial film feel, intentional visual storytelling`;

  // Layer 7 — Texture
  const textureMap: Record<string, string> = {
    'beach': 'soft sand texture, sea air atmosphere, natural organic texture',
    'home': 'linen texture, wood grain, domestic softness, lived-in warmth',
    'nature': 'botanical texture, organic naturalism, earth and leaf detail',
    'studio': 'clean minimal texture, controlled surface, refined simplicity',
    'city': 'urban texture, architectural detail, concrete and glass softness',
  };
  const envLower = (d.environmentNotes || '').toLowerCase();
  const texture = Object.entries(textureMap).find(([k]) => envLower.includes(k))?.[1]
    || 'soft organic texture, natural material quality, tactile editorial feel';

  // Layer 8 — Photography style
  const photographyStyle = `${d.imagePromptBase || 'luxury editorial photography'}, Kodak Portra film aesthetic, analog warmth, premium lifestyle photography`;

  // Layer 9 — Editorial styling
  const editorialStyling = `Pinterest-worthy editorial composition, luxury magazine quality, art-directed styling, ${(d.moodKeywords || []).join(' ')}, no text overlays, no watermarks`;

  // Layer 10 — Color
  const color = d.colorStory || 'warm cream tones, soft natural palette, muted luxury colors';

  // Layer 11 — Lens / Composition
  const lensComp = `${d.compositionStyle || 'intentional framing, generous negative space'}, shallow depth of field f/1.8-f/2.8, 85mm portrait perspective, natural bokeh, editorial framing`;

  return { subject, emotion, wardrobe, environment, lighting, cinematic, texture, photographyStyle, editorialStyling, color, lensComposition: lensComp };
}

// ── ASSEMBLE FINAL PROMPT ─────────────────────────────────────────────────────
export function assembleFinalPrompt(
  layers: PromptLayers,
  anchorDNA: string
): string {
  const parts = [
    layers.photographyStyle,
    layers.subject,
    layers.emotion,
    layers.lighting,
    layers.environment,
    layers.wardrobe,
    layers.cinematic,
    layers.lensComposition,
    layers.texture,
    layers.color,
    layers.editorialStyling,
    `[visual consistency: ${anchorDNA}]`,
    'photorealistic, no AI artifacts, natural skin rendering, avoid oversaturation, avoid synthetic lighting'
  ];

  return parts
    .filter(Boolean)
    .join('. ')
    .replace(/\.\s*\./g, '.')
    .trim();
}

// ── BUILD ALL PROMPTS FOR A MOODBOARD ────────────────────────────────────────
export function buildAllPrompts(
  d: CreativeDirection,
  count: number
): string[] {
  const anchorDNA = buildAnchorDNA(d);
  const beats = (d.storyBeats || []).slice(0, count);

  // Pad beats if we need more than provided
  while (beats.length < count) {
    beats.push(`Additional editorial moment: ${d.subtitle}`);
  }

  return beats.map((beat, i) => {
    const layers = buildPromptLayers(d, beat, i);
    return assembleFinalPrompt(layers, anchorDNA);
  });
}

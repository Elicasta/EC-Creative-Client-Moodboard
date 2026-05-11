// ── Webhook payload from n8n ──────────────────────────────────────────────────
export interface WebhookPayload {
  prompt: string;
  clientName?: string;
  sessionType?: string;
  email?: string;
  notionPageId?: string;
}

// ── Creative Direction (output of Gemini) ─────────────────────────────────────
export interface CreativeDirection {
  moodboardTitle: string;
  subtitle: string;
  moodKeywords: string[];
  colorStory: string;
  lightingDirection: string;
  wardrobeNotes: string;
  environmentNotes: string;
  compositionStyle: string;
  cinematicReferences: string[];
  storyBeats: string[];
  photographyNotes: {
    camera: string;
    lighting: string;
    postProcessing: string;
    pacing: string;
  };
  imagePromptBase: string;
  clientMessage: string;
}

// ── 11-Layer Prompt ───────────────────────────────────────────────────────────
export interface PromptLayers {
  subject: string;
  emotion: string;
  wardrobe: string;
  environment: string;
  lighting: string;
  cinematic: string;
  texture: string;
  photographyStyle: string;
  editorialStyling: string;
  color: string;
  lensComposition: string;
}

// ── Generated Image ───────────────────────────────────────────────────────────
export interface GeneratedImage {
  url: string | null;
  driveUrl?: string;
  driveFileId?: string;
  prompt: string;
  beat: string;
  status: 'done' | 'error' | 'loading';
  error?: string;
}

// ── Moodboard Project ─────────────────────────────────────────────────────────
export interface MoodboardProject {
  id: string;
  created_at: string;
  client_name: string;
  client_email?: string;
  session_type?: string;
  notion_page_id?: string;
  original_prompt: string;
  direction: CreativeDirection;
  images: GeneratedImage[];
  drive_folder_id?: string;
  drive_folder_url?: string;
  status: 'generating' | 'review' | 'approved' | 'exported';
  image_model: string;
  triggered_by: 'webhook' | 'manual';
}

// ── Generation Request ────────────────────────────────────────────────────────
export interface GenerateRequest {
  prompt: string;
  clientName: string;
  sessionType?: string;
  email?: string;
  notionPageId?: string;
  imageModel: 'fal' | 'gemini' | 'openai';
  imageCount: number;
  imageQuality: 'standard' | 'high';
}

// ── Settings ──────────────────────────────────────────────────────────────────
export interface AppSettings {
  geminiKey?: string;
  openaiKey?: string;
  falKey?: string;
  textModel: 'gemini' | 'openai';
  imageModel: 'fal' | 'gemini' | 'openai';
  imageCount: number;
  imageQuality: 'standard' | 'high';
  studioName: string;
  photographerName: string;
  defaultStyle?: string;
  notificationEmail?: string;
}

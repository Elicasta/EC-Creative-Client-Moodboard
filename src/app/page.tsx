'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MoodboardProject } from '@/types';

// ── ICONS ──────────────────────────────────────────────────────────────────────
const icons = {
  eye:      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5z"/><circle cx="12" cy="12" r="3"/></svg>,
  grid:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  folder:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>,
  settings: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>,
  menu:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h18M3 12h18M3 18h18"/></svg>,
  x:        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  drive:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 12l-9 15H2l9-15z"/><path d="M2 12l5-8h10l5 8z"/><path d="M14 7L7 19"/></svg>,
  refresh:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>,
  download: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>,
  check:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 6L9 17l-5-5"/></svg>,
  mail:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8l10 6 10-6"/></svg>,
  phone:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 012 2.18C2.01 1.06 2.88.03 4 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function useToast() {
  const [msg, setMsg] = useState('');
  const [show, setShow] = useState(false);
  const timer = useRef<NodeJS.Timeout>();

  const toast = useCallback((message: string) => {
    setMsg(message);
    setShow(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(false), 3500);
  }, []);

  return { msg, show, toast };
}

// ── LOCAL SETTINGS ────────────────────────────────────────────────────────────
const SETTINGS_KEY = 'ecmb_settings_v2';
interface Settings {
  geminiKey: string;
  openaiKey: string;
  falKey: string;
  textModel: 'gemini' | 'openai';
  imageModel: 'fal' | 'gemini' | 'openai';
  imageCount: number;
  imageQuality: 'standard' | 'high';
  studioName: string;
  photographerName: string;
  defaultStyle: string;
  webhookSecret: string;
}
const defaultSettings: Settings = {
  geminiKey: '', openaiKey: '', falKey: '',
  textModel: 'gemini', imageModel: 'fal',
  imageCount: 4, imageQuality: 'standard',
  studioName: 'EC Creative Studio', photographerName: 'Eli Castaneda',
  defaultStyle: 'Warm cinematic lighting. Shallow depth of field. Natural skin tones. Minimal environments. Luxury editorial restraint.',
  webhookSecret: '',
};

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function Home() {
  const [page, setPage] = useState<'vision' | 'moodboard' | 'projects' | 'settings'>('vision');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [projects, setProjects] = useState<MoodboardProject[]>([]);
  const [activeProject, setActiveProject] = useState<MoodboardProject | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState('');
  const [genProgress, setGenProgress] = useState(0);
  const [mobileView, setMobileView] = useState<'desktop' | 'mobile'>('desktop');
  const { msg: toastMsg, show: toastShow, toast } = useToast();

  // Vision form state
  const [visionPrompt, setVisionPrompt] = useState('');
  const [clientName, setClientName] = useState('');
  const [sessionType, setSessionType] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  // Load settings from localStorage
  useEffect(() => {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      try { setSettings({ ...defaultSettings, ...JSON.parse(raw) }); } catch {}
    }
  }, []);

  // Load projects
  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch {}
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  // Poll for generating projects
  useEffect(() => {
    const generatingProjects = projects.filter(p => p.status === 'generating');
    if (!generatingProjects.length) return;
    const interval = setInterval(loadProjects, 5000);
    return () => clearInterval(interval);
  }, [projects, loadProjects]);

  // Check URL params for project
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('project');
    if (projectId) {
      loadProjects().then(() => {
        setPage('projects');
      });
    }
  }, []);

  function saveSettings(s: Settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    setSettings(s);
    toast('Settings saved.');
  }

  function navTo(p: typeof page) {
    setPage(p);
    setSidebarOpen(false);
    if (p === 'projects') loadProjects();
  }

  const hasApiKeys = settings.geminiKey || settings.openaiKey;
  const hasImageKey = settings.falKey || settings.geminiKey || settings.openaiKey;

  // ── GENERATE (manual) ─────────────────────────────────────────────────────
  async function handleGenerate() {
    if (!visionPrompt.trim()) { toast('Enter a vision prompt first.'); return; }
    if (!hasApiKeys) { toast('Add API keys in Settings first.'); navTo('settings'); return; }

    setGenerating(true);
    setGenProgress(5);
    setGenStatus('Interpreting vision...');

    try {
      setGenProgress(15);
      setGenStatus('Building creative direction...');
      await sleep(400);
      setGenProgress(30);
      setGenStatus('Layering image prompts...');

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-key': settings.geminiKey,
          'x-openai-key': settings.openaiKey,
          'x-fal-key': settings.falKey,
        },
        body: JSON.stringify({
          prompt: visionPrompt,
          clientName: clientName || 'Internal',
          sessionType,
          email: clientEmail,
          imageModel: settings.imageModel,
          imageCount: settings.imageCount,
          imageQuality: settings.imageQuality,
        })
      });

      setGenProgress(85);
      setGenStatus('Composing moodboard...');

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Generation failed');
      }

      const data = await res.json();
      setGenProgress(100);
      setGenStatus('Done.');
      await sleep(400);

      setActiveProject(data.project);
      setProjects(prev => [data.project, ...prev.filter(p => p.id !== data.project.id)]);
      navTo('moodboard');
      toast('Moodboard ready.');
    } catch (e: any) {
      toast('Error: ' + (e.message || 'Generation failed'));
    } finally {
      setGenerating(false);
      setGenProgress(0);
      setGenStatus('');
    }
  }

  // ── APPROVE ───────────────────────────────────────────────────────────────
  async function handleApprove(id: string) {
    try {
      await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'approved' })
      });
      setActiveProject(p => p ? { ...p, status: 'approved' } : p);
      setProjects(prev => prev.map(p => p.id === id ? { ...p, status: 'approved' } : p));
      toast('Moodboard approved.');
    } catch { toast('Approval failed.'); }
  }

  // ── REGEN IMAGE ───────────────────────────────────────────────────────────
  async function handleRegenImage(index: number) {
    if (!activeProject) return;
    toast('Regenerating image...');
    try {
      // Rebuild a single image using the same prompt
      const { buildAllPrompts } = await import('@/lib/promptBuilder');
      const prompts = buildAllPrompts(activeProject.direction, activeProject.images.length);
      const prompt = prompts[index] || prompts[0];

      const { generateSingleImage } = await import('@/lib/imageGen');
      const url = await generateSingleImage(
        prompt,
        activeProject.image_model as 'fal' | 'gemini' | 'openai',
        'standard',
        { fal: settings.falKey, gemini: settings.geminiKey, openai: settings.openaiKey }
      );

      const updatedImages = [...activeProject.images];
      updatedImages[index] = { ...updatedImages[index], url, status: 'done' };
      const updated = { ...activeProject, images: updatedImages };
      setActiveProject(updated);
      toast('Image regenerated.');
    } catch (e: any) {
      toast('Regen failed: ' + e.message);
    }
  }

  // ── DOWNLOAD IMAGE ────────────────────────────────────────────────────────
  function handleDownloadImage(index: number) {
    const img = activeProject?.images?.[index];
    if (!img?.url) return;
    const a = document.createElement('a');
    a.href = img.url; a.download = `moodboard-${index + 1}.jpg`;
    a.target = '_blank'; a.click();
  }

  // ── SIDEBAR ───────────────────────────────────────────────────────────────
  const Sidebar = (
    <aside style={{ background: 'var(--accent)', display: 'flex', flexDirection: 'column', padding: '28px 18px 24px', height: '100%' }}>
      <div style={{ marginBottom: 32, padding: '0 8px' }}>
        <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 22, fontWeight: 300, color: '#f7f5f2', letterSpacing: '0.04em' }}>EC</div>
        <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(189,167,150,0.65)', marginTop: 5, fontWeight: 400 }}>Moodboard Studio</div>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {[
          { id: 'vision',    label: 'New Vision',   icon: icons.eye },
          { id: 'moodboard', label: 'Moodboard',    icon: icons.grid },
          { id: 'projects',  label: 'Projects',     icon: icons.folder },
        ].map(item => (
          <button key={item.id} className={`nav-btn ${page === item.id ? 'active' : ''}`}
            onClick={() => navTo(item.id as typeof page)}>
            {item.icon}{item.label}
          </button>
        ))}
        <div style={{ height: 1, background: 'rgba(189,167,150,0.12)', margin: '12px 8px' }} />
        <button className={`nav-btn ${page === 'settings' ? 'active' : ''}`} onClick={() => navTo('settings')}>
          {icons.settings} Settings
        </button>
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(189,167,150,0.12)' }}>
        <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(189,167,150,0.4)', padding: '0 8px', marginBottom: 6 }}>
          n8n Webhook
        </div>
        <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, color: 'rgba(189,167,150,0.55)', padding: '0 8px', wordBreak: 'break-all', lineHeight: 1.5 }}>
          POST /api/webhook
        </div>
        <div style={{ marginTop: 10, padding: '0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: hasApiKeys && hasImageKey ? '#6db87a' : 'rgba(189,167,150,0.3)', flexShrink: 0 }} />
          <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, color: 'rgba(189,167,150,0.45)', letterSpacing: '0.06em' }}>
            {hasApiKeys && hasImageKey ? 'APIs connected' : 'Setup required'}
          </span>
        </div>
      </div>
    </aside>
  );

  // ── VISION PAGE ───────────────────────────────────────────────────────────
  const VisionPage = (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: 40 }}>
        <div className="label-text" style={{ marginBottom: 10 }}>EC Creative Studio</div>
        <h1 className="display-text" style={{ fontSize: 'clamp(32px, 5vw, 52px)', marginBottom: 12 }}>
          New <span className="accent-text" style={{ color: 'var(--accent)', fontSize: '1.02em' }}>Moodboard</span>
        </h1>
        <div style={{ width: 32, height: 1, background: 'var(--taupe)', marginBottom: 12 }} />
        <p className="body-text" style={{ maxWidth: 420 }}>
          Enter the client vision or paste the prompt generated by n8n. The AI creative direction engine handles everything else.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 28, alignItems: 'start' }}>
        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          <div>
            <label className="label-text" style={{ display: 'block', marginBottom: 8 }}>Vision Prompt</label>
            <textarea
              className="ec-input ec-textarea"
              value={visionPrompt}
              onChange={e => setVisionPrompt(e.target.value)}
              placeholder="Paste the AI-generated prompt from n8n, or describe the client vision manually...&#10;&#10;e.g. Soft luxury maternity session at golden hour on the beach. She wants to feel timeless and beautiful. Cream flowing wardrobe, wind movement, old money editorial energy."
              style={{ width: '100%', minHeight: 160, padding: '14px 16px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label className="label-text" style={{ display: 'block', marginBottom: 8 }}>Client Name</label>
              <input className="ec-input" value={clientName} onChange={e => setClientName(e.target.value)}
                placeholder="From Notion project..." style={{ width: '100%', padding: '10px 14px' }} />
            </div>
            <div>
              <label className="label-text" style={{ display: 'block', marginBottom: 8 }}>Session Type</label>
              <select className="ec-input" value={sessionType} onChange={e => setSessionType(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239a9b9c' stroke-width='1.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', appearance: 'none' }}>
                <option value="">Select...</option>
                {['Maternity','Newborn','Family','Couples','Boudoir','Brand','Editorial','Wedding'].map(t =>
                  <option key={t} value={t}>{t}</option>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="label-text" style={{ display: 'block', marginBottom: 8 }}>Client Email (optional)</label>
            <input className="ec-input" value={clientEmail} onChange={e => setClientEmail(e.target.value)}
              placeholder="For project records..." style={{ width: '100%', padding: '10px 14px' }} />
          </div>

          {/* n8n note */}
          <div style={{ padding: '14px 18px', background: 'rgba(47,70,53,0.05)', borderLeft: '2px solid var(--accent)' }}>
            <div className="label-text" style={{ marginBottom: 6, color: 'var(--accent)' }}>n8n Webhook Endpoint</div>
            <code style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
              POST {typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook
            </code>
            <p className="body-text" style={{ marginTop: 8, fontSize: '0.8rem' }}>
              Payload: <code style={{ fontSize: 11, background: 'rgba(51,52,54,0.06)', padding: '1px 6px' }}>
                {`{ "prompt": "...", "clientName": "...", "sessionType": "...", "email": "..." }`}
              </code>
            </p>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Image settings */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 20, backdropFilter: 'blur(8px)' }}>
            <div className="label-text" style={{ marginBottom: 14 }}>Image Settings</div>

            <div className="label-text" style={{ marginBottom: 8 }}>Count</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {[2, 4, 6].map(n => (
                <button key={n} onClick={() => setSettings(s => ({ ...s, imageCount: n }))}
                  style={{ flex: 1, padding: '8px 4px', border: `1px solid ${settings.imageCount === n ? 'var(--accent)' : 'var(--border)'}`, background: settings.imageCount === n ? 'var(--accent-light)' : 'transparent', color: settings.imageCount === n ? 'var(--accent)' : 'var(--text-secondary)', fontFamily: "'Jost',sans-serif", fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}>
                  {n}
                </button>
              ))}
            </div>

            <div className="label-text" style={{ marginBottom: 8 }}>Quality</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {(['standard', 'high'] as const).map(q => (
                <button key={q} onClick={() => setSettings(s => ({ ...s, imageQuality: q }))}
                  style={{ flex: 1, padding: '7px 4px', border: `1px solid ${settings.imageQuality === q ? 'var(--accent)' : 'var(--border)'}`, background: settings.imageQuality === q ? 'var(--accent-light)' : 'transparent', color: settings.imageQuality === q ? 'var(--accent)' : 'var(--text-secondary)', fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s' }}>
                  {q}
                </button>
              ))}
            </div>

            <div className="label-text" style={{ marginBottom: 8 }}>Image Model</div>
            {([
              { id: 'fal',    name: 'Fal.ai Flux',    price: '~$0.003/img · Best value' },
              { id: 'gemini', name: 'Gemini Imagen 4', price: '~$0.04–0.07/img' },
              { id: 'openai', name: 'GPT Image 2',     price: '~$0.12–0.60/img · Premium' },
            ] as const).map(m => (
              <div key={m.id} onClick={() => setSettings(s => ({ ...s, imageModel: m.id }))}
                style={{ padding: '10px 12px', border: `1px solid ${settings.imageModel === m.id ? 'var(--accent)' : 'var(--border)'}`, background: settings.imageModel === m.id ? 'var(--accent-light)' : 'transparent', cursor: 'pointer', marginBottom: 6, transition: 'all 0.25s' }}>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, fontWeight: 400, color: settings.imageModel === m.id ? 'var(--accent)' : 'var(--text-primary)' }}>{m.name}</div>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{m.price}</div>
              </div>
            ))}
          </div>

          {/* Cost estimate */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 16, backdropFilter: 'blur(8px)' }}>
            <div className="label-text" style={{ marginBottom: 8 }}>Estimated Cost</div>
            <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 18, fontWeight: 300, color: 'var(--accent)', fontStyle: 'italic' }}>
              ~${(({ fal: 0.003, gemini: 0.067, openai: 0.167 })[settings.imageModel] * settings.imageCount).toFixed(3)}
            </div>
            <div className="body-text" style={{ fontSize: '0.75rem', marginTop: 4 }}>
              {settings.imageCount} images · {settings.imageModel === 'fal' ? 'Fal.ai Flux' : settings.imageModel === 'gemini' ? 'Gemini Imagen' : 'GPT Image 2'}
            </div>
          </div>

          {/* Generate button */}
          <button className="btn-primary" onClick={handleGenerate}
            disabled={generating || !visionPrompt.trim()}
            style={{ width: '100%', padding: '14px', cursor: generating ? 'not-allowed' : 'pointer' }}>
            {generating ? genStatus || 'Generating...' : 'Generate Moodboard'}
          </button>

          {generating && (
            <div style={{ height: 2, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--accent)', width: `${genProgress}%`, transition: 'width 0.6s ease' }} />
            </div>
          )}

          <p className="body-text" style={{ fontSize: '0.75rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            AI creative direction + 11-layer prompt system.<br />Takes 20–60 seconds.
          </p>
        </div>
      </div>
    </div>
  );

  // ── MOODBOARD PAGE ────────────────────────────────────────────────────────
  const MoodboardPage = activeProject ? (() => {
    const d = activeProject.direction;
    const imgs = activeProject.images;

    // Layout: hero (2 images) + row (rest)
    const heroImgs  = imgs.slice(0, 2);
    const restImgs  = imgs.slice(2);

    const ImgCell = ({ img, index }: { img: typeof imgs[0], index: number }) => (
      <div className="mb-img-cell" style={{ height: '100%', minHeight: 200 }}>
        {img.url ? (
          <>
            <img src={img.url} alt={`Moodboard ${index + 1}`} loading="lazy" />
            <div className="mb-img-overlay" />
            <div className="mb-img-actions">
              <button className="mb-img-btn" onClick={() => handleRegenImage(index)}>{icons.refresh} Regen</button>
              <button className="mb-img-btn" onClick={() => handleDownloadImage(index)}>{icons.download}</button>
              {img.driveUrl && (
                <a href={img.driveUrl} target="_blank" rel="noopener noreferrer" className="mb-img-btn" style={{ textDecoration: 'none' }}>{icons.drive}</a>
              )}
            </div>
          </>
        ) : img.status === 'loading' ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'var(--ec-linen)', minHeight: 200 }}>
            <div style={{ width: 24, height: 24, border: '1.5px solid var(--border-strong)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span className="label-text">Generating...</span>
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', minHeight: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'var(--ec-linen)', padding: 20 }}>
            <span className="accent-text" style={{ color: 'var(--text-muted)', fontSize: 16 }}>Image {index + 1}</span>
            {img.error && <span className="body-text" style={{ fontSize: '0.75rem', textAlign: 'center' }}>{img.error}</span>}
            <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.58rem' }} onClick={() => handleRegenImage(index)}>Retry</button>
          </div>
        )}
      </div>
    );

    return (
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, gap: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div className="label-text" style={{ color: 'var(--taupe)', marginBottom: 8 }}>{activeProject.session_type || 'Editorial Session'}</div>
            <h1 className="display-text" style={{ fontSize: 'clamp(28px, 4vw, 48px)', lineHeight: 1.05, marginBottom: 12 }}>{d.moodboardTitle}</h1>
            <p className="accent-text" style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 480, marginBottom: 16 }}>{d.subtitle}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(d.moodKeywords || []).map(k => (
                <span key={k} style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', padding: '4px 12px', border: '1px solid rgba(47,70,53,0.28)', background: 'rgba(47,70,53,0.04)' }}>{k}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
            <span className={`badge badge-${activeProject.status}`}>{activeProject.status}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {activeProject.drive_folder_url && (
                <a href={activeProject.drive_folder_url} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.58rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {icons.drive} Drive
                </a>
              )}
              <button className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.58rem' }} onClick={() => navTo('vision')}>↺ New</button>
              {activeProject.status !== 'approved' && (
                <button className="btn-primary" style={{ padding: '8px 18px' }} onClick={() => handleApprove(activeProject.id)}>
                  {icons.check} Approve
                </button>
              )}
            </div>
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 9.5, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
              {activeProject.client_name} · {formatDate(activeProject.created_at)} · {activeProject.triggered_by === 'webhook' ? 'n8n' : 'Manual'}
            </div>
          </div>
        </div>

        {/* Image grid */}
        {heroImgs.length >= 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 10, height: 'clamp(280px, 35vw, 420px)', marginBottom: 10 }}>
            {heroImgs.map((img, i) => <ImgCell key={i} img={img} index={i} />)}
          </div>
        )}
        {restImgs.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(restImgs.length, 4)}, 1fr)`, gap: 10, height: 'clamp(180px, 22vw, 260px)', marginBottom: 28 }}>
            {restImgs.map((img, i) => <ImgCell key={i + 2} img={img} index={i + 2} />)}
          </div>
        )}
        {imgs.length === 1 && (
          <div style={{ height: 'clamp(280px, 40vw, 480px)', marginBottom: 28 }}>
            <ImgCell img={imgs[0]} index={0} />
          </div>
        )}

        {/* Direction cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 12 }}>
          {[
            { label: 'Color Story',      text: d.colorStory },
            { label: 'Lighting',         text: d.lightingDirection },
            { label: 'Wardrobe',         text: d.wardrobeNotes },
          ].map(card => (
            <div key={card.label} className="direction-card">
              <div className="label-text" style={{ color: 'var(--taupe)', marginBottom: 10 }}>{card.label}</div>
              <p className="accent-text" style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{card.text}</p>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Environment', text: d.environmentNotes },
            { label: 'Composition', text: d.compositionStyle, sub: (d.cinematicReferences || []).join(' · ') },
          ].map(card => (
            <div key={card.label} className="direction-card">
              <div className="label-text" style={{ color: 'var(--taupe)', marginBottom: 10 }}>{card.label}</div>
              <p className="accent-text" style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{card.text}</p>
              {card.sub && <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, color: 'var(--taupe)', marginTop: 10, letterSpacing: '0.06em', fontStyle: 'italic' }}>{card.sub}</p>}
            </div>
          ))}
        </div>

        {/* Photography notes */}
        {d.photographyNotes && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '22px 26px', marginBottom: 16, backdropFilter: 'blur(8px)' }}>
            <div className="label-text" style={{ marginBottom: 16 }}>Photography Direction</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
              {[
                { label: 'Camera & Lens',    text: d.photographyNotes.camera },
                { label: 'Light Setup',      text: d.photographyNotes.lighting },
                { label: 'Post Processing',  text: d.photographyNotes.postProcessing },
                { label: 'Session Flow',     text: d.photographyNotes.pacing },
              ].map(note => (
                <div key={note.label}>
                  <div className="label-text" style={{ marginBottom: 7 }}>{note.label}</div>
                  <p className="accent-text" style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{note.text || '—'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Client message */}
        {d.clientMessage && (
          <div style={{ padding: '18px 22px', borderLeft: '2px solid var(--accent)', background: 'rgba(47,70,53,0.04)', marginBottom: 20 }}>
            <div className="label-text" style={{ color: 'var(--accent)', marginBottom: 8 }}>Client Message</div>
            <p className="accent-text" style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.8 }}>"{d.clientMessage}"</p>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 18, borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 12 }}>
          <div className="body-text" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {activeProject.image_model.toUpperCase()} · {imgs.filter(i => i.status === 'done').length}/{imgs.length} images · {formatDate(activeProject.created_at)}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.58rem' }} onClick={() => window.print()}>Export PDF</button>
            <button className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.58rem' }} onClick={() => navTo('vision')}>+ New Vision</button>
          </div>
        </div>
      </div>
    );
  })() : (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', textAlign: 'center', gap: 16 }}>
      <div style={{ width: 56, height: 56, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icons.grid}</div>
      <h2 className="display-text" style={{ fontSize: 26, color: 'var(--text-secondary)' }}>No moodboard selected</h2>
      <p className="body-text">Generate a new moodboard or select one from Projects.</p>
      <button className="btn-primary" style={{ padding: '11px 24px' }} onClick={() => navTo('vision')}>Start a Vision</button>
    </div>
  );

  // ── PROJECTS PAGE ─────────────────────────────────────────────────────────
  const ProjectsPage = (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <div className="label-text" style={{ marginBottom: 6 }}>EC Creative Studio</div>
          <h1 className="display-text" style={{ fontSize: 'clamp(24px, 4vw, 36px)' }}>All Projects</h1>
        </div>
        <button className="btn-primary" style={{ padding: '10px 20px' }} onClick={() => navTo('vision')}>+ New Vision</button>
      </div>

      {projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p className="accent-text" style={{ fontSize: 22, color: 'var(--text-muted)', marginBottom: 8 }}>No projects yet</p>
          <p className="body-text">Generated moodboards appear here. Trigger via n8n or generate manually.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
          {projects.map(p => {
            const thumbImgs = p.images?.filter(i => i.url && i.status === 'done').slice(0, 4) || [];
            return (
              <div key={p.id} onClick={() => { setActiveProject(p); navTo('moodboard'); }}
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.3s ease', backdropFilter: 'blur(8px)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(51,52,54,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}>

                {/* Thumbnail */}
                <div style={{ width: '100%', aspectRatio: '4/3', background: 'var(--ec-linen)', overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 1 }}>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{ background: 'var(--ec-linen)', overflow: 'hidden' }}>
                      {thumbImgs[i] && <img src={thumbImgs[i].url!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                    </div>
                  ))}
                </div>

                <div style={{ padding: '14px 16px' }}>
                  <p className="accent-text" style={{ fontSize: 17, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.2 }}>
                    {p.direction?.moodboardTitle || 'Untitled'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span className="body-text" style={{ fontSize: '0.75rem' }}>{p.client_name || 'Internal'}</span>
                    <span style={{ color: 'var(--border-strong)' }}>·</span>
                    <span className="body-text" style={{ fontSize: '0.75rem' }}>{formatDate(p.created_at)}</span>
                    <span className={`badge badge-${p.status}`}>{p.status}</span>
                    {p.triggered_by === 'webhook' && (
                      <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.1em', color: 'var(--ec-blue)', background: 'rgba(105,138,155,0.1)', padding: '2px 7px', border: '1px solid rgba(105,138,155,0.25)' }}>n8n</span>
                    )}
                  </div>
                  {p.drive_folder_url && (
                    <a href={p.drive_folder_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: "'Jost',sans-serif", fontSize: 10, color: 'var(--accent)', letterSpacing: '0.08em', textDecoration: 'none' }}>
                      {icons.drive} View in Drive
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── SETTINGS PAGE ─────────────────────────────────────────────────────────
  const SettingsPage = () => {
    const [local, setLocal] = useState<Settings>(settings);
    const set = (k: keyof Settings, v: any) => setLocal(s => ({ ...s, [k]: v }));

    return (
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 className="display-text" style={{ fontSize: 'clamp(24px, 4vw, 36px)', marginBottom: 8 }}>API Settings</h1>
          <p className="body-text" style={{ maxWidth: 480 }}>Connect your API keys. Stored locally in your browser only — never sent anywhere except the AI providers you choose.</p>
        </div>

        <div style={{ display: 'grid', gap: 18 }}>

          {/* Text AI */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 24, backdropFilter: 'blur(8px)' }}>
            <div className="label-text" style={{ marginBottom: 18 }}>Text AI — Creative Direction Engine</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <div className="label-text" style={{ color: 'var(--accent)', marginBottom: 10 }}>★ Gemini 2.5 Flash — Recommended (Free)</div>
                <label className="label-text" style={{ display: 'block', marginBottom: 6 }}>Gemini API Key</label>
                <input className="ec-input" type="password" value={local.geminiKey} onChange={e => set('geminiKey', e.target.value)}
                  placeholder="AIza..." style={{ width: '100%', padding: '10px 14px', marginBottom: 8 }} />
                <p className="body-text" style={{ fontSize: '0.78rem' }}>Free key at <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>aistudio.google.com</a>. Generous free tier.</p>
              </div>
              <div>
                <div className="label-text" style={{ marginBottom: 10 }}>GPT-4o (OpenAI)</div>
                <label className="label-text" style={{ display: 'block', marginBottom: 6 }}>OpenAI API Key</label>
                <input className="ec-input" type="password" value={local.openaiKey} onChange={e => set('openaiKey', e.target.value)}
                  placeholder="sk-..." style={{ width: '100%', padding: '10px 14px', marginBottom: 8 }} />
                <p className="body-text" style={{ fontSize: '0.78rem' }}>Key at <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>platform.openai.com</a>. ~$0.01/moodboard.</p>
              </div>
            </div>
            <div style={{ marginTop: 16, maxWidth: 300 }}>
              <label className="label-text" style={{ display: 'block', marginBottom: 6 }}>Preferred Text Model</label>
              <select className="ec-input" value={local.textModel} onChange={e => set('textModel', e.target.value as any)}
                style={{ width: '100%', padding: '10px 14px', appearance: 'none' }}>
                <option value="gemini">Gemini 2.5 Flash (recommended)</option>
                <option value="openai">GPT-4o</option>
              </select>
            </div>
          </div>

          {/* Image generation */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 24, backdropFilter: 'blur(8px)' }}>
            <div className="label-text" style={{ marginBottom: 18 }}>Image Generation</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
              {[
                { key: 'falKey', label: '★ Fal.ai Flux — Best Value', placeholder: 'fal_...', link: 'https://fal.ai', desc: '~$0.003/img. Free trial credits.', accent: true },
                { key: 'geminiKey', label: 'Gemini Imagen 4', placeholder: 'AIza... (same key)', link: 'https://aistudio.google.com', desc: '~$0.04–0.07/img.', accent: false },
                { key: 'openaiKey', label: 'GPT Image 2', placeholder: 'sk-... (same key)', link: 'https://platform.openai.com', desc: '~$0.12–0.60/img. Premium quality.', accent: false },
              ].map(f => (
                <div key={f.key}>
                  <div className="label-text" style={{ color: f.accent ? 'var(--accent)' : undefined, marginBottom: 10 }}>{f.label}</div>
                  <label className="label-text" style={{ display: 'block', marginBottom: 6 }}>API Key</label>
                  <input className="ec-input" type="password" value={(local as any)[f.key]} onChange={e => set(f.key as keyof Settings, e.target.value)}
                    placeholder={f.placeholder} style={{ width: '100%', padding: '10px 14px', marginBottom: 8 }} />
                  <p className="body-text" style={{ fontSize: '0.78rem' }}>{f.desc} <a href={f.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Get key →</a></p>
                </div>
              ))}
            </div>
          </div>

          {/* n8n webhook */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 24, backdropFilter: 'blur(8px)' }}>
            <div className="label-text" style={{ marginBottom: 18 }}>n8n Webhook Security</div>
            <div style={{ maxWidth: 400 }}>
              <label className="label-text" style={{ display: 'block', marginBottom: 6 }}>Webhook Secret</label>
              <input className="ec-input" type="password" value={local.webhookSecret} onChange={e => set('webhookSecret', e.target.value)}
                placeholder="Any secret string..." style={{ width: '100%', padding: '10px 14px', marginBottom: 8 }} />
              <p className="body-text" style={{ fontSize: '0.78rem' }}>n8n sends this in the <code style={{ background: 'rgba(51,52,54,0.06)', padding: '1px 5px', fontSize: 11 }}>x-webhook-secret</code> header. Set the same value in your Vercel env as <code style={{ background: 'rgba(51,52,54,0.06)', padding: '1px 5px', fontSize: 11 }}>WEBHOOK_SECRET</code>.</p>
            </div>
          </div>

          {/* Studio profile */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 24, backdropFilter: 'blur(8px)' }}>
            <div className="label-text" style={{ marginBottom: 18 }}>Studio Profile</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18 }}>
              <div>
                <label className="label-text" style={{ display: 'block', marginBottom: 6 }}>Studio Name</label>
                <input className="ec-input" value={local.studioName} onChange={e => set('studioName', e.target.value)} style={{ width: '100%', padding: '10px 14px' }} />
              </div>
              <div>
                <label className="label-text" style={{ display: 'block', marginBottom: 6 }}>Photographer</label>
                <input className="ec-input" value={local.photographerName} onChange={e => set('photographerName', e.target.value)} style={{ width: '100%', padding: '10px 14px' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="label-text" style={{ display: 'block', marginBottom: 6 }}>Default Style DNA</label>
                <textarea className="ec-input ec-textarea" value={local.defaultStyle} onChange={e => set('defaultStyle', e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', minHeight: 80 }} />
              </div>
            </div>
          </div>

          {/* Save */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" style={{ padding: '12px 28px' }} onClick={() => saveSettings(local)}>Save Settings</button>
          </div>
        </div>
      </div>
    );
  };

  // ── PAGE TITLES ───────────────────────────────────────────────────────────
  const pageMeta = {
    vision:    { eye: 'EC Creative Studio', title: 'New Vision' },
    moodboard: { eye: activeProject?.client_name || 'Active Project', title: activeProject?.direction?.moodboardTitle || 'Moodboard' },
    projects:  { eye: 'EC Creative Studio', title: 'All Projects' },
    settings:  { eye: 'System', title: 'API Settings' },
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="grain-overlay" aria-hidden="true" />

      {/* Toast */}
      <div className={`toast ${toastShow ? 'show' : ''}`}>{toastMsg}</div>

      {/* Mobile top bar */}
      <div className="mobile-topbar" style={{ display: 'none', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'var(--accent)', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 18, fontWeight: 300, color: '#f7f5f2' }}>EC Moodboard Studio</div>
        <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f7f5f2', padding: 4 }}>{icons.menu}</button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 39 }} />
      )}

      {/* Mobile sidebar drawer */}
      <div style={{ position: 'fixed', top: 0, left: 0, height: '100vh', width: 240, zIndex: 40, transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.3s ease' }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 18px', borderBottom: '1px solid rgba(189,167,150,0.12)' }}>
            <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 20, fontWeight: 300, color: '#f7f5f2' }}>EC</div>
            <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(247,245,242,0.6)', padding: 2 }}>{icons.x}</button>
          </div>
          {Sidebar}
        </div>
      </div>

      {/* Desktop layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100vh' }}>

        {/* Desktop sidebar */}
        <div className="desktop-sidebar" style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
          {Sidebar}
        </div>

        {/* Main */}
        <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'hidden' }}>

          {/* Topbar */}
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 36px', borderBottom: '1px solid var(--border)', background: 'rgba(247,245,242,0.92)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 20 }}>
            <div>
              <div className="label-text" style={{ marginBottom: 2 }}>{pageMeta[page].eye}</div>
              <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 19, fontWeight: 300, fontStyle: 'italic', color: 'var(--text-primary)' }}>{pageMeta[page].title}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {page === 'moodboard' && activeProject && (
                <>
                  {activeProject.drive_folder_url && (
                    <a href={activeProject.drive_folder_url} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ padding: '7px 14px', fontSize: '0.58rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      {icons.drive} Drive
                    </a>
                  )}
                  <button className="btn-secondary" style={{ padding: '7px 14px', fontSize: '0.58rem' }} onClick={() => window.print()}>Export PDF</button>
                </>
              )}
              {page === 'projects' && (
                <button className="btn-primary" style={{ padding: '7px 16px' }} onClick={() => navTo('vision')}>+ New Vision</button>
              )}
            </div>
          </header>

          {/* Page content */}
          <div style={{ flex: 1, padding: 'clamp(20px, 4vw, 40px)', overflowY: 'auto' }}>
            {page === 'vision'    && VisionPage}
            {page === 'moodboard' && MoodboardPage}
            {page === 'projects'  && ProjectsPage}
            {page === 'settings'  && <SettingsPage />}
          </div>
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-topbar { display: flex !important; }
        }
        @media (min-width: 769px) {
          .mobile-topbar { display: none !important; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          [style*="gridTemplateColumns: '1fr 1fr'"] { grid-template-columns: 1fr !important; }
          [style*="gridTemplateColumns: '1.6fr 1fr'"] { grid-template-columns: 1fr !important; height: auto !important; }
        }
        @media print {
          .desktop-sidebar, header, .mobile-topbar { display: none !important; }
          .grain-overlay, .toast { display: none !important; }
        }
      `}</style>
    </>
  );
}

import { Resend } from 'resend';
import { MoodboardProject } from '@/types';

export async function sendMoodboardNotification(
  project: MoodboardProject,
  resendKey: string,
  toEmail: string,
  fromEmail: string
): Promise<void> {
  const resend = new Resend(resendKey);

  const d = project.direction;
  const successImages = project.images.filter(i => i.status === 'done');
  const driveUrl = project.drive_folder_url || '';

  // Build image preview rows (first 2 images that have Drive URLs)
  const previewImages = project.images
    .filter(i => i.driveUrl && i.status === 'done')
    .slice(0, 2);

  const imagePreviewHtml = previewImages.length
    ? previewImages.map(img => `
        <tr><td style="padding:0 0 12px 0;">
          <a href="${img.driveUrl}" target="_blank">
            <img src="${img.url || img.driveUrl}" width="100%" style="display:block;max-width:520px;border:1px solid #e6ddd3;" alt="Moodboard image"/>
          </a>
        </td></tr>`).join('')
    : `<tr><td style="padding:14px 0;font-family:Georgia,serif;font-size:13px;color:#9a9b9c;font-style:italic;">
        ${successImages.length} image(s) generated — view in Google Drive
      </td></tr>`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f7f5f2;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f5f2;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;background:#ffffff;border:1px solid #e6ddd3;">

  <!-- Header -->
  <tr><td style="background:#2f4635;padding:32px 40px;">
    <p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.3em;text-transform:uppercase;color:#bda796;">EC Moodboard Studio</p>
    <h1 style="margin:8px 0 0 0;font-family:Georgia,serif;font-size:22px;font-weight:300;color:#f7f5f2;line-height:1.2;font-style:italic;">${d.moodboardTitle}</h1>
    <p style="margin:8px 0 0 0;font-family:Arial,sans-serif;font-size:11px;color:rgba(247,245,242,0.5);">${project.client_name}${project.session_type ? ` · ${project.session_type}` : ''} · ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </td></tr>

  <!-- Status bar -->
  <tr><td style="background:#eee7dd;padding:12px 40px;border-bottom:1px solid #e6ddd3;">
    <p style="margin:0;font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#2f4635;">
      ${successImages.length} of ${project.images.length} images generated · Ready for review
    </p>
  </td></tr>

  <tr><td style="padding:32px 40px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">

    <!-- Subtitle -->
    <tr><td style="padding:0 0 24px 0;">
      <p style="margin:0;font-family:Georgia,serif;font-size:16px;color:#5a5b5c;font-style:italic;line-height:1.7;">${d.subtitle}</p>
    </td></tr>

    <!-- Keywords -->
    <tr><td style="padding:0 0 28px 0;">
      ${(d.moodKeywords || []).map(k =>
        `<span style="display:inline-block;border:1px solid rgba(47,70,53,0.25);padding:4px 12px;font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:#2f4635;margin:0 4px 4px 0;">${k}</span>`
      ).join('')}
    </td></tr>

    <!-- Image previews -->
    ${imagePreviewHtml}

    <!-- Drive link -->
    ${driveUrl ? `
    <tr><td style="padding:20px 0 0 0;border-top:1px solid #e6ddd3;">
      <a href="${driveUrl}" target="_blank"
        style="display:inline-block;background:#2f4635;color:#f7f5f2;font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.22em;text-transform:uppercase;padding:12px 24px;text-decoration:none;">
        View in Google Drive →
      </a>
    </td></tr>` : ''}

    <!-- Direction summary -->
    <tr><td style="padding:28px 0 0 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">

        <tr><td style="padding:0 0 20px 0;">
          <p style="margin:0 0 6px 0;font-family:Arial,sans-serif;font-size:8.5px;letter-spacing:0.2em;text-transform:uppercase;color:#2f4635;border-bottom:1px solid #e6ddd3;padding-bottom:8px;">Creative Direction</p>
          <p style="margin:10px 0 6px 0;font-family:Arial,sans-serif;font-size:8.5px;letter-spacing:0.1em;text-transform:uppercase;color:#9a9b9c;">Color Story</p>
          <p style="margin:0;font-family:Georgia,serif;font-size:13px;color:#333436;line-height:1.7;">${d.colorStory}</p>
        </td></tr>

        <tr><td style="padding:0 0 20px 0;">
          <p style="margin:0 0 6px 0;font-family:Arial,sans-serif;font-size:8.5px;letter-spacing:0.1em;text-transform:uppercase;color:#9a9b9c;">Lighting</p>
          <p style="margin:0;font-family:Georgia,serif;font-size:13px;color:#333436;line-height:1.7;">${d.lightingDirection}</p>
        </td></tr>

        <tr><td style="padding:0 0 20px 0;">
          <p style="margin:0 0 6px 0;font-family:Arial,sans-serif;font-size:8.5px;letter-spacing:0.1em;text-transform:uppercase;color:#9a9b9c;">Wardrobe</p>
          <p style="margin:0;font-family:Georgia,serif;font-size:13px;color:#333436;line-height:1.7;">${d.wardrobeNotes}</p>
        </td></tr>

      </table>
    </td></tr>

    <!-- Client message -->
    ${d.clientMessage ? `
    <tr><td style="padding:20px 0 0 0;">
      <div style="font-family:Georgia,serif;font-size:14px;color:#333436;line-height:1.8;font-style:italic;padding:16px 20px;background:#f7f5f2;border-left:2px solid #2f4635;">
        "${d.clientMessage}"
      </div>
    </td></tr>` : ''}

    <!-- Review CTA -->
    <tr><td style="padding:28px 0 0 0;border-top:1px solid #e6ddd3;text-align:center;">
      <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:11px;color:#9a9b9c;">Open the studio to review, approve, or regenerate images.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}"
        style="display:inline-block;border:1px solid #333436;color:#333436;font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.22em;text-transform:uppercase;padding:11px 22px;text-decoration:none;">
        Open Moodboard Studio
      </a>
    </td></tr>

  </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#eee7dd;padding:16px 40px;border-top:1px solid #e6ddd3;">
    <p style="margin:0;font-family:Arial,sans-serif;font-size:9px;color:#9a9b9c;letter-spacing:0.08em;">
      EC Creative Studios · Moodboard Studio · Triggered by n8n automation
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;

  await resend.emails.send({
    from: `EC Creative Studio <${fromEmail}>`,
    to: [toEmail],
    subject: `New Moodboard Ready — ${d.moodboardTitle} · ${project.client_name}`,
    html
  });
}

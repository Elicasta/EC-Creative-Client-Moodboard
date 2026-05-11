import { google } from 'googleapis';

function getDriveClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}');

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive']
  });

  return google.drive({ version: 'v3', auth });
}

// ── FIND OR CREATE FOLDER ─────────────────────────────────────────────────────
async function findOrCreateFolder(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId?: string
): Promise<string> {
  // Search for existing folder
  const q = [
    `name='${name.replace(/'/g, "\\'")}'`,
    `mimeType='application/vnd.google-apps.folder'`,
    parentId ? `'${parentId}' in parents` : `'root' in parents`,
    `trashed=false`
  ].join(' and ');

  const search = await drive.files.list({
    q,
    fields: 'files(id, name)',
    spaces: 'drive'
  });

  if (search.data.files?.length) {
    return search.data.files[0].id!;
  }

  // Create new folder
  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined
    },
    fields: 'id'
  });

  return folder.data.id!;
}

// ── BUILD CLIENT FOLDER STRUCTURE ─────────────────────────────────────────────
export async function createClientMoodboardFolder(
  clientName: string,
  sessionType: string,
  moodboardTitle: string
): Promise<{ folderId: string; folderUrl: string }> {
  const drive = getDriveClient();

  const rootName = process.env.DRIVE_ROOT_FOLDER_NAME || 'EC Creative Studio';
  const date = new Date().toISOString().split('T')[0];

  // EC Creative Studio/
  const rootId = await findOrCreateFolder(drive, rootName);

  // EC Creative Studio/Clients/
  const clientsId = await findOrCreateFolder(drive, 'Clients', rootId);

  // EC Creative Studio/Clients/[Client Name] — [Session Type]/
  const clientFolder = `${clientName}${sessionType ? ` — ${sessionType}` : ''}`;
  const clientId = await findOrCreateFolder(drive, clientFolder, clientsId);

  // EC Creative Studio/Clients/.../Moodboards/
  const moodboardsId = await findOrCreateFolder(drive, 'Moodboards', clientId);

  // EC Creative Studio/Clients/.../Moodboards/[Date] — [Title]/
  const sessionFolder = `${date} — ${moodboardTitle}`;
  const folderId = await findOrCreateFolder(drive, sessionFolder, moodboardsId);

  // Make folder viewable by anyone with link
  await drive.permissions.create({
    fileId: folderId,
    requestBody: { role: 'reader', type: 'anyone' }
  }).catch(() => {}); // non-fatal if this fails

  const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
  return { folderId, folderUrl };
}

// ── UPLOAD IMAGE TO DRIVE ─────────────────────────────────────────────────────
export async function uploadImageToDrive(
  imageUrl: string,
  fileName: string,
  folderId: string
): Promise<{ fileId: string; fileUrl: string }> {
  const drive = getDriveClient();

  // Fetch the image as buffer
  let buffer: Buffer;
  let mimeType = 'image/jpeg';

  if (imageUrl.startsWith('data:')) {
    // Base64 data URL
    const [header, b64] = imageUrl.split(',');
    mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
    buffer = Buffer.from(b64, 'base64');
  } else {
    // Remote URL — fetch it
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
    mimeType = res.headers.get('content-type') || 'image/jpeg';
  }

  const { Readable } = await import('stream');
  const stream = Readable.from(buffer);

  const file = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
      mimeType
    },
    media: {
      mimeType,
      body: stream
    },
    fields: 'id, webViewLink'
  });

  // Make file viewable
  await drive.permissions.create({
    fileId: file.data.id!,
    requestBody: { role: 'reader', type: 'anyone' }
  }).catch(() => {});

  return {
    fileId: file.data.id!,
    fileUrl: file.data.webViewLink || `https://drive.google.com/file/d/${file.data.id}/view`
  };
}

// ── UPLOAD DIRECTION NOTES AS TEXT FILE ──────────────────────────────────────
export async function uploadDirectionNotes(
  direction: Record<string, unknown>,
  clientName: string,
  folderId: string
): Promise<void> {
  const drive = getDriveClient();

  const notes = [
    `EC Moodboard Studio — Creative Direction Notes`,
    `Client: ${clientName}`,
    `Generated: ${new Date().toLocaleString()}`,
    ``,
    `MOODBOARD TITLE: ${direction.moodboardTitle}`,
    `SUBTITLE: ${direction.subtitle}`,
    ``,
    `MOOD KEYWORDS: ${(direction.moodKeywords as string[] || []).join(', ')}`,
    ``,
    `COLOR STORY:`,
    direction.colorStory as string,
    ``,
    `LIGHTING DIRECTION:`,
    direction.lightingDirection as string,
    ``,
    `WARDROBE:`,
    direction.wardrobeNotes as string,
    ``,
    `ENVIRONMENT:`,
    direction.environmentNotes as string,
    ``,
    `COMPOSITION:`,
    direction.compositionStyle as string,
    ``,
    `CINEMATIC REFERENCES: ${(direction.cinematicReferences as string[] || []).join(', ')}`,
    ``,
    `CLIENT MESSAGE: "${direction.clientMessage}"`,
  ].join('\n');

  const { Readable } = await import('stream');
  const stream = Readable.from(Buffer.from(notes, 'utf-8'));

  await drive.files.create({
    requestBody: {
      name: 'direction-notes.txt',
      parents: [folderId],
      mimeType: 'text/plain'
    },
    media: { mimeType: 'text/plain', body: stream },
    fields: 'id'
  }).catch(e => console.error('[drive] notes upload failed:', e));
}

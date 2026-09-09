import { getGoogleAccessToken } from './googleDrive';

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet?: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  labelIds?: string[];
}

export interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
  fromName?: string;
}

// Helper to encode string to URL-safe Base64
function encodeBase64Url(str: string): string {
  // UTF-8 safe base64 encoding
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// 1. Get User Profile from Gmail
export async function getGmailProfile(): Promise<{ emailAddress: string; messagesTotal: number }> {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Not authenticated with Google.');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch Gmail profile: ${res.status}`);
  }

  return await res.json();
}

// 2. List Recent Messages
export async function listGmailMessages(
  query: string = '',
  maxResults: number = 15
): Promise<GmailMessageSummary[]> {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Not authenticated with Google.');

  let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`;
  if (query) {
    url += `&q=${encodeURIComponent(query)}`;
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to list Gmail messages: ${res.status}`);
  }

  const data = await res.json();
  const messagesList = data.messages || [];

  // Fetch summaries for the list
  const summaries: GmailMessageSummary[] = [];
  for (const m of messagesList.slice(0, 10)) {
    try {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (msgRes.ok) {
        const msgData = await msgRes.json();
        const headers = msgData.payload?.headers || [];
        const subject = headers.find((h: any) => h.name?.toLowerCase() === 'subject')?.value || '(No Subject)';
        const from = headers.find((h: any) => h.name?.toLowerCase() === 'from')?.value || '';
        const to = headers.find((h: any) => h.name?.toLowerCase() === 'to')?.value || '';
        const date = headers.find((h: any) => h.name?.toLowerCase() === 'date')?.value || '';

        summaries.push({
          id: msgData.id,
          threadId: msgData.threadId,
          snippet: msgData.snippet || '',
          subject,
          from,
          to,
          date,
          labelIds: msgData.labelIds || []
        });
      }
    } catch (e) {
      console.warn('Error fetching message detail:', e);
    }
  }

  return summaries;
}

// 3. Send Email via Gmail API
export async function sendGmailEmail(payload: SendEmailPayload): Promise<{ id: string; threadId: string }> {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Not authenticated with Google.');

  const fromSender = payload.fromName ? `Cards Crafted Studio <me>` : `me`;
  
  // Format RFC 2822 email content
  const emailLines = [
    `From: ${fromSender}`,
    `To: ${payload.to}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(payload.subject)))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    payload.htmlBody || payload.body.replace(/\n/g, '<br/>')
  ];

  const rawMessage = emailLines.join('\r\n');
  const encodedMessage = encodeBase64Url(rawMessage);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      raw: encodedMessage
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to send email via Gmail: ${res.status}`);
  }

  return await res.json();
}

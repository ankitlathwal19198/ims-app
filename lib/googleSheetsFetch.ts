import { google, sheets_v4 } from 'googleapis';

type FetchSheetDataArgs = {
  sheetId: string;
  range: string;
  credentialsBase64?: string;
};

type SheetRow = Record<string, string>;

function toSnakeCase(str: string): string {
  return str
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '')
    .toLowerCase();
}

function decodeGoogleCredentials(base64: string): Record<string, unknown> {
  const decoded = Buffer.from(base64, 'base64').toString('utf8');
  return JSON.parse(decoded) as Record<string, unknown>;
}

async function getSheetsClient(credentials: Record<string, unknown>): Promise<sheets_v4.Sheets> {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return google.sheets({ version: 'v4', auth });
}

export async function fetchDataFromGoogleSheet({
  sheetId,
  range,
  credentialsBase64,
}: FetchSheetDataArgs): Promise<SheetRow[]> {
  const base64Credentials = credentialsBase64 ?? process.env.GOOGLE_CREDENTIALS;

  if (!base64Credentials) {
    throw new Error('GOOGLE_CREDENTIALS environment variable is missing');
  }

  const credentials = decodeGoogleCredentials(base64Credentials);

  try {
    const sheets = await getSheetsClient(credentials);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });

    const rows = response.data.values ?? [];
    if (rows.length === 0) return [];

    const [headersRaw, ...dataRows] = rows;
    const headers = headersRaw.map((h) => String(h ?? ''));
    const normalizedHeaders = headers.map(toSnakeCase);

    return dataRows
      .filter((row) => row.some((cell) => String(cell ?? '').trim() !== '')) // ✅ skip completely empty rows
      .map((row) => {
        const rowValues = row.map((v) => String(v ?? ''));
        return normalizedHeaders.reduce<SheetRow>((obj, key, i) => {
          obj[key] = rowValues[i] ?? '';
          return obj;
        }, {});
      });
  } catch (err) {
    console.error('Error reading Google Sheets data:', err);
    throw err; // ✅ throw instead of returning [] to reveal the real cause
  }
}

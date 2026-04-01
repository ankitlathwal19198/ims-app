import { google, sheets_v4 } from 'googleapis';

type AppendItemsArgs = {
    sheetId: string;
    sheetName: string;
    items: Array<Record<string, unknown>>;
    /**
     * If not passed, A1:1 is used for header row.
     * Example: 'A1:1'
     */
    headerRange?: string;
    credentialsBase64?: string;
};

type AppendFieldMasterArgs = {
    items: Array<Record<string, unknown>>;
    credentialsBase64?: string;

    sheetIdFieldMaster?: string; // default given below
    sheetNameFieldMaster?: string; // default given below
};

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

async function getSheetsClient(
    credentials: Record<string, unknown>,
    scopes: string[]
): Promise<sheets_v4.Sheets> {
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes,
    });

    return google.sheets({ version: 'v4', auth });
}

/**
 * ✅ REUSABLE APPEND
 * Automatically reads header row and appends in same order.
 */
export async function appendItemsToSheet({
    sheetId,
    sheetName,
    items,
    headerRange = 'A1:1',
    credentialsBase64,
}: AppendItemsArgs): Promise<sheets_v4.Schema$AppendValuesResponse> {
    const base64Credentials = credentialsBase64 ?? process.env.GOOGLE_CREDENTIALS;
    if (!base64Credentials) throw new Error('GOOGLE_CREDENTIALS environment variable is missing');

    const credentials = decodeGoogleCredentials(base64Credentials);

    const sheets = await getSheetsClient(credentials, [
        'https://www.googleapis.com/auth/spreadsheets',
    ]);

    // 1) Get headers
    const headerRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!${headerRange}`,
    });

    const headersRow = headerRes.data.values?.[0];
    if (!headersRow || headersRow.length === 0) {
        throw new Error(`No headers found in sheet "${sheetName}"`);
    }

    const headers = headersRow.map((h) => String(h ?? ''));
    const headerKeys = headers.map((h) => toSnakeCase(h));

    // 2) Map items -> values in header order
    const values = items.map((item) =>
        headerKeys.map((key) => {
            const v = item[key];
            if (v === null || v === undefined) return '';
            // Google Sheets values can be string/number/bool; keep safe string/number/bool
            if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
            return String(v);
        })
    );

    // 3) Append
    const appendRes = await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: sheetName,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values },
    });

    return appendRes.data;
}

/**
 * (Optional) Field Master append with defaults.
 * Tum isko bhi reuse kar sakte ho by passing sheetIdFieldMaster/sheetNameFieldMaster.
 */
export async function appendToFieldMaster({
    items,
    credentialsBase64,
    sheetIdFieldMaster = '1GuIm8_z7RTY3udA6-3PdoH1rYHb49sKBuSJxAAvw12Y',
    sheetNameFieldMaster = 'Field Master',
}: AppendFieldMasterArgs): Promise<sheets_v4.Schema$AppendValuesResponse> {
    const base64Credentials = credentialsBase64 ?? process.env.GOOGLE_CREDENTIALS;
    if (!base64Credentials) throw new Error('GOOGLE_CREDENTIALS environment variable is missing');

    const credentials = decodeGoogleCredentials(base64Credentials);

    const sheets = await getSheetsClient(credentials, [
        'https://www.googleapis.com/auth/spreadsheets',
    ]);

    // 1) Get headers
    const headerRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetIdFieldMaster,
        range: `${sheetNameFieldMaster}!A1:1`,
    });

    const headersRow = headerRes.data.values?.[0];
    if (!headersRow || headersRow.length === 0) {
        throw new Error(`No headers found in Field Master sheet "${sheetNameFieldMaster}"`);
    }

    const headers = headersRow.map((h) => String(h ?? ''));
    const headerKeys = headers.map((h) => toSnakeCase(h));

    const itemCodeIndex = headerKeys.indexOf('itemcode');
    const packagingTypesIndex = headerKeys.indexOf('packagingtypes');

    if (itemCodeIndex === -1 || packagingTypesIndex === -1) {
        throw new Error('ItemCode or packagingTypes column not found in Field Master sheet');
    }

    const values = items.map((item) => {
        return headers.map((_, idx) => {
            if (idx === itemCodeIndex) {
                const v = item['item_code'];
                return typeof v === 'string' ? v : v ? String(v) : '';
            }
            if (idx === packagingTypesIndex) {
                const v = item['description'];
                return typeof v === 'string' ? v : v ? String(v) : '';
            }
            return '';
        });
    });

    const appendRes = await sheets.spreadsheets.values.append({
        spreadsheetId: sheetIdFieldMaster,
        range: sheetNameFieldMaster,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values },
    });

    return appendRes.data;
}

import { NextResponse } from 'next/server';
import { fetchDataFromGoogleSheet } from '@/lib/googleSheetsFetch';

export async function GET() {
  try {
    // Example usage (same behavior as before):
    const data = await fetchDataFromGoogleSheet({
      sheetId: process.env.FG_STOCK_SHEET_ID || '1JqvLBD2SFaElUuFUGjBjPH8usMksIkLD8vJ2XTAPXXI',
      range: 'Form Responses 1!A1:AH',
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

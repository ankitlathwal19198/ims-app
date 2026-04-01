import { NextResponse } from 'next/server';
import { fetchDataFromGoogleSheet } from '@/lib/googleSheetsFetch';

export async function GET() {
  try {
    // Example usage (same behavior as before):
    const data = await fetchDataFromGoogleSheet({
      sheetId: '1iu2DpL-4fxIHudItXKqWhfSzUGE-0n8JAsyuIrd0t1c',
      range: 'Split Sales Order!A1:BZ',
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

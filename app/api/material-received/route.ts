import { NextResponse } from 'next/server';
import { fetchDataFromGoogleSheet } from '@/lib/googleSheetsFetch';

export async function GET() {
  try {
    // Example usage (same behavior as before):
    const data = await fetchDataFromGoogleSheet({
      sheetId: '1GC949x535Eu9hf-8k8WpXvurYRjU45ch9y_sxp8Xnt0',
      range: 'MATERIAL_REC!A1:AH',
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

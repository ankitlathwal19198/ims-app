import { NextResponse } from 'next/server';
import { fetchDataFromGoogleSheet } from '@/lib/googleSheetsFetch';
import { appendItemsToSheet } from '@/lib/masterData';

type PostBody = {
  items?: Array<Record<string, unknown>>;
};

export async function GET(_req: Request) {
  try {
    // ✅ Ab fetchMasterData reusable hai: sheetId + range pass kar rahe
    const data = await fetchDataFromGoogleSheet({
      sheetId: '1ySUFhzuW1AMobBuyWFgygCGBWIKO-yIm63RWjpbj-ws',
      range: 'IMS RM Master Packaging!A1:O',
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PostBody;
    const items = body.items;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    // ✅ append also reusable: sheetId + sheetName
    const result = await appendItemsToSheet({
      sheetId: '1ySUFhzuW1AMobBuyWFgygCGBWIKO-yIm63RWjpbj-ws',
      sheetName: 'IMS RM Master Packaging',
      items,
    });

    // await appendToFieldMaster(items);

    const itemCodes = items
      .map((item) => (typeof item.item_code === 'string' ? item.item_code : ''))
      .filter(Boolean);

    return NextResponse.json({ success: true, result, itemCodes });
  } catch (err: unknown) {
    console.error('Add Items API Error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

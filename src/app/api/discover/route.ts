import { NextResponse } from 'next/server';
import { guardRequest } from '@/lib/api-guard';
import { discoverUrl, fetchDiscover } from '@/lib/tmdb';

export const runtime = 'nodejs';
export async function GET(req: Request) {
  const guarded = guardRequest(req);
  if (guarded) return guarded;
  let url: URL;
  try { url = discoverUrl(new URL(req.url).searchParams); }
  catch { return NextResponse.json({ error: '筛选参数无效' }, { status: 400 }); }
  try { return NextResponse.json(await fetchDiscover(url), { headers: { 'Cache-Control': 'private, no-store' } }); }
  catch (err) {
    const message = err instanceof Error && /^(全球片库|TMDB)/.test(err.message)
      ? err.message : '全球片库连接失败，请稍后重试。';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

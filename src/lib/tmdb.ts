import { getCache, setCache } from './fetch-utils';
import type { DiscoverResponse } from './discover-types';

export function discoverUrl(input: URLSearchParams): URL {
  const type = input.get('type') || 'movie';
  const year = input.get('year') || '';
  const country = input.get('country') || '';
  const sort = input.get('sort') || 'popular';
  const page = input.get('page') || '1';
  if (!['movie', 'tv', 'show'].includes(type) || !['popular', 'rating', 'newest'].includes(sort)
    || !/^\d+$/.test(page) || Number(page) < 1 || Number(page) > 500
    || (year && (!/^\d{4}$/.test(year) || Number(year) < 1870 || Number(year) > 2100))
    || (country && !/^[A-Z]{2}$/.test(country))) throw new Error('筛选参数无效');
  const movie = type === 'movie';
  const url = new URL(`https://api.themoviedb.org/3/discover/${movie ? 'movie' : 'tv'}`);
  const p = url.searchParams;
  p.set('language', 'zh-CN');
  p.set('include_adult', 'false');
  p.set('page', String(Number(page)));
  p.set('sort_by', sort === 'rating' ? 'vote_average.desc' : sort === 'newest'
    ? (movie ? 'primary_release_date.desc' : 'first_air_date.desc') : 'popularity.desc');
  p.set(movie ? 'primary_release_date.lte' : 'first_air_date.lte', new Date().toISOString().slice(0, 10));
  if (sort === 'rating') p.set('vote_count.gte', '100');
  if (year) p.set(movie ? 'primary_release_year' : 'first_air_date_year', year);
  if (country) p.set('with_origin_country', country);
  // TMDB has no exact Chinese "综艺" category: Reality OR Talk is the documented approximation.
  if (type === 'show') p.set('with_genres', '10764|10767');
  if (type === 'tv') p.set('without_genres', '10764,10767');
  return url;
}

export async function fetchDiscover(url: URL): Promise<DiscoverResponse> {
  const token = process.env.TMDB_READ_ACCESS_TOKEN?.trim();
  if (!token) throw new Error('全球片库尚未配置，请先使用原有推荐。管理员需设置 TMDB_READ_ACCESS_TOKEN。');
  const key = `tmdb:${url.href}`;
  const cached = getCache<DiscoverResponse>(key);
  if (cached) return cached;
  // Fixed host; do not forward the bearer credential through redirects.
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    redirect: 'error', signal: AbortSignal.timeout(10000), cache: 'no-store' });
  if (!res.ok) throw new Error(res.status === 401 || res.status === 403
    ? 'TMDB 凭证无效或无访问权限，请管理员检查配置。'
    : res.status === 429 ? 'TMDB 请求较多，请稍后重试。' : '全球片库暂时不可用，请稍后重试。');
  const raw = await res.json();
  if (!Array.isArray(raw.results) || !Number.isInteger(raw.total_pages) || !Number.isInteger(raw.total_results)) {
    throw new Error('全球片库返回格式异常');
  }
  const movie = url.pathname.endsWith('/movie');
  const items: DiscoverResponse['items'] = [];
  for (const r of raw.results) {
    const title = movie ? (r.title || r.original_title) : (r.name || r.original_name);
    if (!Number.isInteger(r.id) || typeof title !== 'string' || !title || r.adult === true) continue;
    const date = movie ? r.release_date : r.first_air_date;
    items.push({ id: `${movie ? 'movie' : 'tv'}_${r.id}`, title,
      cover: typeof r.poster_path === 'string' && /^\/[\w.-]+$/.test(r.poster_path) ? `https://image.tmdb.org/t/p/w342${r.poster_path}` : '',
      rating: typeof r.vote_average === 'number' && r.vote_average > 0 ? r.vote_average.toFixed(1) : undefined,
      year: typeof date === 'string' ? date.slice(0, 4) : '' });
  }
  const result = { items, page: Number(url.searchParams.get('page')), totalPages: Math.min(500, Math.max(0, raw.total_pages)), totalResults: Math.max(0, raw.total_results) };
  setCache(key, result, 10 * 60 * 1000);
  return result;
}

import { afterEach, describe, expect, it, vi } from 'vitest';
import { discoverUrl, fetchDiscover } from './tmdb';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('TMDB discovery', () => {
  it('uses release year and origin country, and advances the upstream page', () => {
    const url = discoverUrl(new URLSearchParams('type=movie&year=2026&country=KR&page=2'));
    expect(url.hostname).toBe('api.themoviedb.org');
    expect(url.searchParams.get('primary_release_year')).toBe('2026');
    expect(url.searchParams.get('with_origin_country')).toBe('KR');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('sort_by')).toBe('popularity.desc');
    expect(url.searchParams.has('api_key')).toBe(false);
  });
  it('uses first series air year and approximates variety using two genres', () => {
    const url = discoverUrl(new URLSearchParams('type=show&year=2026&sort=rating'));
    expect(url.pathname).toBe('/3/discover/tv');
    expect(url.searchParams.get('first_air_date_year')).toBe('2026');
    expect(url.searchParams.get('with_genres')).toBe('10764|10767');
    expect(url.searchParams.get('vote_count.gte')).toBe('100');
  });
  it.each(['page=0', 'page=501', 'page=1.5', 'year=abc', 'country=https://evil.test', 'type=unknown', 'sort=invalid'])('rejects invalid input %s', q => {
    expect(() => discoverUrl(new URLSearchParams(q))).toThrow();
  });
  it('does not request upstream without credentials', async () => {
    vi.stubEnv('TMDB_READ_ACCESS_TOKEN', '');
    const mock = vi.fn(); vi.stubGlobal('fetch', mock);
    await expect(fetchDiscover(discoverUrl(new URLSearchParams()))).rejects.toThrow('尚未配置');
    expect(mock).not.toHaveBeenCalled();
  });
  it('normalizes posters, keeps missing posters, and caps pagination', async () => {
    vi.stubEnv('TMDB_READ_ACCESS_TOKEN', 'test-token');
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ total_pages: 700, total_results: 14000, results: [
      { id: 1, title: '电影', poster_path: '/a.jpg', vote_average: 8.35, release_date: '2026-01-01' },
      { id: 2, title: '无海报', poster_path: null }, { id: 3, title: '成人', adult: true },
    ] })));
    vi.stubGlobal('fetch', mock);
    const result = await fetchDiscover(discoverUrl(new URLSearchParams('year=2026&page=3')));
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({ year: '2026', cover: 'https://image.tmdb.org/t/p/w342/a.jpg' });
    expect(result.items[1].cover).toBe('');
    expect(result.totalPages).toBe(500);
    expect(mock.mock.calls[0][1].redirect).toBe('error');
    expect(JSON.stringify(result)).not.toContain('test-token');
  });
  it.each([401, 429, 500])('handles upstream status %s without leaking credentials', async status => {
    vi.stubEnv('TMDB_READ_ACCESS_TOKEN', 'private-test-token');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('private-test-token', { status })));
    await expect(fetchDiscover(discoverUrl(new URLSearchParams(`page=${status === 500 ? 5 : 4}`)))).rejects.toThrow(/TMDB|全球片库/);
  });
});

import { afterEach, expect, it, vi } from 'vitest';
import { GET } from './route';
import { guardRequest } from '@/lib/api-guard';
import { fetchDiscover } from '@/lib/tmdb';
vi.mock('@/lib/api-guard', () => ({ guardRequest: vi.fn() }));
vi.mock('@/lib/tmdb', async original => ({ ...await original<typeof import('@/lib/tmdb')>(), fetchDiscover: vi.fn() }));
afterEach(() => vi.resetAllMocks());
it('preserves the password guard and never calls upstream when logged out', async () => {
  vi.mocked(guardRequest).mockReturnValue(new Response('unauthorized', { status: 401 }) as never);
  expect((await GET(new Request('https://example.test/api/discover'))).status).toBe(401);
  expect(fetchDiscover).not.toHaveBeenCalled();
});
it('rejects invalid filters before upstream', async () => {
  expect((await GET(new Request('https://example.test/api/discover?page=501'))).status).toBe(400);
  expect(fetchDiscover).not.toHaveBeenCalled();
});
it('does not expose unexpected transport errors', async () => {
  vi.mocked(fetchDiscover).mockRejectedValue(new Error('secret token transport failure'));
  const response = await GET(new Request('https://example.test/api/discover'));
  expect(response.status).toBe(502);
  expect(await response.text()).not.toContain('secret');
});

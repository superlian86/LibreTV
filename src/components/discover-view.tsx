'use client';

import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/client-api';
import { DoubanCard } from './video-card';

const countries = [['', '全部地区'], ['CN', '中国大陆'], ['HK', '中国香港'], ['TW', '中国台湾'], ['KR', '韩国'], ['JP', '日本'], ['US', '美国'], ['GB', '英国'], ['FR', '法国'], ['DE', '德国'], ['IN', '印度'], ['TH', '泰国'], ['MY', '马来西亚'], ['SG', '新加坡'], ['AU', '澳大利亚'], ['CA', '加拿大'], ['ES', '西班牙'], ['IT', '意大利']];

export function DiscoverView({ onPick }: { onPick: (title: string) => void }) {
  const [type, setType] = useState('movie');
  const [year, setYear] = useState('2026');
  const [country, setCountry] = useState('');
  const [sort, setSort] = useState('popular');
  const query = useInfiniteQuery({
    queryKey: ['discover', type, year, country, sort],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => api.discover(new URLSearchParams({ type, year, country, sort, page: String(pageParam) }), signal),
    getNextPageParam: (last) => last.page < last.totalPages ? last.page + 1 : undefined,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const items = [...new Map((query.data?.pages.flatMap(p => p.items) ?? []).map(i => [i.id, i])).values()];
  const selectStyle = 'mt-1 w-full rounded-lg border border-line bg-chip text-content px-3 py-2';
  const last = query.data?.pages.at(-1);
  return <section aria-label="全球影视片库">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <h2 className="text-lg font-semibold">{year ? `${year} 年作品` : '全部年份作品'} · {sort === 'popular' ? '当前热度' : sort === 'rating' ? '高分排行' : '最新首播'}</h2>
      <button className="px-3 py-2 rounded-lg bg-accent text-on-accent" onClick={() => { setYear('2026'); setCountry(''); setSort('popular'); }}>2026 年作品热度榜</button>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
      <label>类别<select className={selectStyle} value={type} onChange={e => setType(e.target.value)}>
        <option value="movie">电影</option><option value="tv">剧集</option><option value="show">综艺 / 真人秀 / 脱口秀</option>
      </select></label>
      <label>发行 / 首播年份<select className={selectStyle} value={year} onChange={e => setYear(e.target.value)}>
        <option value="">全部年份</option>{Array.from({ length: new Date().getFullYear() - 1899 }, (_, i) => String(new Date().getFullYear() - i)).map(y => <option key={y}>{y}</option>)}
      </select></label>
      <label>出品国家 / 地区<select className={selectStyle} value={country} onChange={e => setCountry(e.target.value)}>
        {countries.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label>排序<select className={selectStyle} value={sort} onChange={e => setSort(e.target.value)}>
        <option value="popular">当前热度</option><option value="rating">评分最高（至少 100 票）</option><option value="newest">最新发行 / 首播</option>
      </select></label>
    </div>
    <p className="text-xs text-muted mb-4">热度采用 TMDB 当前人气指标，不是全年累计播放量；卡片星数为 TMDB 评分。剧集年份按整部作品首次开播计算。综艺按真人秀、脱口秀分类近似筛选，收录可能不完整。点击海报搜索播放资源，不保证可播放。</p>
    {query.isPending && <p role="status" className="py-8 text-center">正在加载片库…</p>}
    {query.isError && <div role="alert" className="py-4 text-sm"><p>{query.error.message}</p><button className="mt-2 text-accent" disabled={query.isFetching} onClick={() => query.isFetchNextPageError ? query.fetchNextPage() : query.refetch()}>重试</button><p className="text-muted mt-2">也可以切换到上方「原有推荐 / 周榜」。</p></div>}
    {query.data && <p aria-live="polite" className="text-xs text-muted mb-3">数据源匹配 {query.data.pages[0].totalResults.toLocaleString()} 部，已加载 {items.length} 部（不是可播放数量）</p>}
    {!query.isPending && !query.isError && items.length === 0 && <p className="py-8 text-center">暂无匹配作品，请调整年份或地区。</p>}
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
      {items.map(item => <div key={item.id}><DoubanCard item={item} onClick={() => onPick(item.title)} /><p className="text-xs text-muted mt-1">{item.year || '年份未知'}</p></div>)}
    </div>
    {query.hasNextPage && <div className="text-center my-6"><button className="bg-chip rounded-lg px-6 py-3 disabled:opacity-50" disabled={query.isFetching} onClick={() => query.fetchNextPage()}>{query.isFetchingNextPage ? '正在加载…' : '加载更多'}</button></div>}
    {last && !query.hasNextPage && items.length > 0 && <p className="text-center text-xs text-muted my-5">{last.page >= 500 ? '已到数据源可浏览页数上限，请缩小筛选范围。' : '已加载完当前筛选结果。'}</p>}
    <footer className="text-xs text-muted mt-6 border-t border-line pt-4">
      <a className="text-accent" href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">影视资料来源：TMDB</a>
      <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
    </footer>
  </section>;
}

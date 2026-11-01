export interface DiscoverItem {
  id: string;
  title: string;
  cover: string;
  rating?: string;
  year: string;
}
export interface DiscoverResponse {
  items: DiscoverItem[];
  page: number;
  totalPages: number;
  totalResults: number;
}

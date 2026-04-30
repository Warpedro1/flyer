import type { EventRead } from '../types/index.ts';

export function pickCoverImage(event: EventRead): string | null {
  const sorted = [...event.media].sort((a, b) => a.order_index - b.order_index);
  const img = sorted.find((m) => m.type === 'image');
  return img?.media_url ?? null;
}

export function formatPriceLabel(price: string | null): { text: string; isFree: boolean } {
  if (price === null) {
    return { text: 'Grátis', isFree: true };
  }
  const n = Number(price);
  if (Number.isFinite(n)) {
    return {
      text:
        new Intl.NumberFormat('pt-PT', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(n) + ' €',
      isFree: false,
    };
  }
  return { text: price, isFree: false };
}

export function formatEventDate(iso: string | null): { date: string; time: string } {
  if (!iso) {
    return { date: '—', time: '' };
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { date: '—', time: '' };
  }
  return {
    date: d.toLocaleDateString('pt-PT'),
    time: d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
  };
}

export function formatRating(rating: string | null): string {
  if (rating === null) return '—';
  const n = Number(rating);
  return Number.isFinite(n) ? n.toFixed(1) : rating;
}

export const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGVlMmU2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzZjNzU3ZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5lbmh1bWEgaW1hZ2VtPC90ZXh0Pjwvc3ZnPg==';

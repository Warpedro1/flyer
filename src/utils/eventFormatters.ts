import type { SyntheticEvent } from 'react';

import type { EventRead } from '../types/index.ts';

export function pickCoverImage(event: EventRead): string | null {
  const sorted = [...event.media].sort((a, b) => a.order_index - b.order_index);
  const img = sorted.find((m) => m.type === 'image');
  // Itens importados não têm media própria: usam a imagem pública da fonte.
  return img?.media_url ?? event.cover_url ?? null;
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatMoney(value: number): string {
  return BRL.format(value);
}

/**
 * Preço de um evento. 0 é grátis; null é preço desconhecido (a fonte não o deu),
 * que não se pode mostrar como grátis.
 */
export function formatPriceLabel(price: string | null): { text: string; isFree: boolean } {
  if (price === null) {
    return { text: 'Preço a confirmar', isFree: false };
  }
  const n = Number(price);
  if (Number.isFinite(n)) {
    return n === 0 ? { text: 'Grátis', isFree: true } : { text: formatMoney(n), isFree: false };
  }
  return { text: price, isFree: false };
}

/** O que mostrar como preço: o nível ($ a $$$$) para lugares, o valor para eventos. */
export function eventPriceText(event: EventRead): string {
  if (event.kind === 'place') {
    return event.price_level ? '$'.repeat(event.price_level) : '';
  }
  return formatPriceLabel(event.price).text;
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
    date: d.toLocaleDateString('pt-BR'),
    time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  };
}

export function formatRating(rating: string | null): string {
  if (rating === null) return '—';
  const n = Number(rating);
  return Number.isFinite(n) ? n.toFixed(1) : rating;
}

export const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGVlMmU2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzZjNzU3ZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5lbmh1bWEgaW1hZ2VtPC90ZXh0Pjwvc3ZnPg==';

/** `onError` das imagens de capa: uma imagem da fonte que falhe dá lugar à de reserva. */
export function showPlaceholder(event: SyntheticEvent<HTMLImageElement>): void {
  const img = event.currentTarget;
  if (img.getAttribute('src') !== PLACEHOLDER_IMAGE) img.src = PLACEHOLDER_IMAGE;
}

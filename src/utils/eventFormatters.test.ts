import { describe, expect, it } from 'vitest';

import type { EventRead } from '../types/index.ts';

import { eventPriceText, formatMoney, formatPriceLabel, pickCoverImage } from './eventFormatters.ts';

function item(overrides: Partial<EventRead> = {}): EventRead {
  return {
    id: 'x',
    kind: 'event',
    place_id: null,
    creator_id: null,
    title: 'T',
    description: null,
    category: null,
    location_name: null,
    lat: -8.06,
    long: -34.87,
    event_date: null,
    price: null,
    rating: null,
    attendee_count: 0,
    capacity: null,
    waitlist_enabled: true,
    call_ttl_minutes: 10,
    capacity_state: null,
    my_rsvp: null,
    is_boosted: false,
    boost_expires_at: null,
    created_at: null,
    media: [],
    opening_hours: null,
    price_level: null,
    source_url: null,
    cover_url: null,
    moderation_blocked: false,
    ends_at: null,
    checkin_opens_at: null,
    checkin_closes_at: null,
    checkin_status: null,
    checkin_method: 'qr',
    ...overrides,
  };
}

// O Intl separa "R$" do valor com um espaço inquebrável.
const nbsp = (s: string) => s.replace(/\u00a0/g, ' ');

describe('preços em reais', () => {
  it('formata em R$ no formato brasileiro', () => {
    expect(nbsp(formatMoney(1234.5))).toBe('R$ 1.234,50');
  });

  it('0 é grátis', () => {
    expect(formatPriceLabel('0.00')).toEqual({ text: 'Grátis', isFree: true });
  });

  it('um preço vem em reais', () => {
    expect(nbsp(formatPriceLabel('40.00').text)).toBe('R$ 40,00');
  });

  it('sem preço não é grátis: a fonte não o informou', () => {
    expect(formatPriceLabel(null)).toEqual({ text: 'Preço a confirmar', isFree: false });
  });

  it('um lugar mostra o nível de preço, não "a confirmar"', () => {
    expect(eventPriceText(item({ kind: 'place', price_level: 2 }))).toBe('$$');
    expect(eventPriceText(item({ kind: 'place', price_level: null }))).toBe('');
  });
});

describe('imagem de capa', () => {
  it('sem media própria usa a imagem da fonte', () => {
    expect(pickCoverImage(item({ cover_url: 'https://img/x.jpg' }))).toBe('https://img/x.jpg');
  });

  it('a media do evento tem prioridade', () => {
    const media = [{ id: 'm', media_url: 'https://own.jpg', type: 'image' as const, order_index: 0 }];

    expect(pickCoverImage(item({ media, cover_url: 'https://img/x.jpg' }))).toBe('https://own.jpg');
  });
});

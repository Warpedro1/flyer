import type { EventRead } from '../types/index.ts';

/** Um EventRead completo para testes; cada teste muda só o que lhe interessa. */
export function makeEvent(overrides: Partial<EventRead> = {}): EventRead {
  return {
    id: 'evt-1',
    kind: 'event',
    place_id: null,
    creator_id: null,
    title: 'Evento',
    description: null,
    category: null,
    location_name: 'Recife',
    lat: -8.06,
    long: -34.87,
    event_date: null,
    price: '0.00',
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
    checkin_status: 'open',
    checkin_method: 'qr',
    ...overrides,
  };
}

export function makePlace(overrides: Partial<EventRead> = {}): EventRead {
  return makeEvent({
    id: 'place-1',
    kind: 'place',
    title: 'Parraxaxá',
    category: 'comida_bebida',
    location_name: 'Av. Fernando Simões Barbosa, 1200 - Boa Viagem',
    price: null,
    price_level: 2,
    rating: '4.6',
    opening_hours: [
      { day: 'segunda-feira', hours: '11:30 a 22:00' },
      { day: 'terça-feira', hours: '11:30 a 22:00' },
    ],
    source_url: 'https://www.google.com/maps/place/parraxaxa',
    checkin_method: 'gps',
    ...overrides,
  });
}

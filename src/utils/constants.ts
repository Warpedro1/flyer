export const APP_NAME = 'Flyer';
export const APP_DESCRIPTION =
  'Descobre eventos perto de ti, faz check-in e ganha troféus.';

export const CONTACT_INFO = {
  email: 'contato@flyer.com',
  phone: '(11) 99999-9999',
  location: 'São Paulo, SP',
} as const;

/** Defaults aligned with backend `DiscoverRequest`. */
export const DISCOVER_DEFAULTS = {
  radiusKm: 10,
  pageSize: 20,
} as const;

/** Tighter radius for check-in screen (walkable area). */
export const CHECKIN_DISCOVER_RADIUS_KM = 1;

/**
 * Quando o browser/OS não devolve GPS (permissão, serviço de localização Windows, etc.),
 * o utilizador pode continuar a descobrir eventos com um centro aproximado.
 */
export const FALLBACK_GEO = {
  label: 'Lisboa (centro aproximado)',
  latitude: 38.7223,
  longitude: -9.1393,
} as const;

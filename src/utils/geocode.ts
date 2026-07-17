/**
 * Geocodificação via Nominatim (OpenStreetMap) — mesmo provedor dos tiles do mapa.
 *
 * Usa `fetch` (não o apiClient) por ser um serviço externo: não deve levar o Bearer
 * do Supabase nem o baseURL da nossa API. A política do Nominatim pede baixo volume
 * (~1 req/s) e identificação via Referer (enviado pelo browser), por isso só
 * chamamos sob ação explícita do usuário (botão/submit), nunca a cada tecla.
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

export interface GeocodeResult {
  lat: number;
  lng: number;
  /** Endereço canônico resolvido (ex.: "Avenida Paulista, São Paulo, Brasil"). */
  displayName: string;
}

interface NominatimSearchHit {
  lat: string;
  lon: string;
  display_name: string;
}

/** Endereço → coordenadas. Retorna `null` quando não há resultado. */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const q = query.trim();
  if (!q) return null;

  const url = `${NOMINATIM_BASE}/search?format=jsonv2&limit=1&addressdetails=0&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
  if (!res.ok) throw new Error(`geocode_http_${res.status}`);

  const data = (await res.json()) as NominatimSearchHit[];
  const hit = Array.isArray(data) ? data[0] : undefined;
  if (!hit) return null;

  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng, displayName: hit.display_name };
}

interface NominatimReverseResult {
  display_name?: string;
}

/** Coordenadas → endereço legível. Retorna `null` quando não há correspondência. */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const url = `${NOMINATIM_BASE}/reverse?format=jsonv2&lat=${encodeURIComponent(
    String(lat),
  )}&lon=${encodeURIComponent(String(lng))}`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
  if (!res.ok) throw new Error(`reverse_geocode_http_${res.status}`);

  const data = (await res.json()) as NominatimReverseResult;
  const label = data?.display_name?.trim();
  return label ? label : null;
}

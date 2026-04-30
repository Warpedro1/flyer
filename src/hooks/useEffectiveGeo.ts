import { useCallback, useEffect, useState } from 'react';

import { FALLBACK_GEO } from '../utils/constants.ts';

import { useGeolocation } from './useGeolocation.ts';

/**
 * Combina GPS real com opção de centro fixo quando `getCurrentPosition` falha
 * (comum no Windows se o serviço de localização estiver desligado).
 */
export function useEffectiveGeo() {
  const geo = useGeolocation();
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    if (geo.latitude !== null && geo.longitude !== null) {
      setUseFallback(false);
    }
  }, [geo.latitude, geo.longitude]);

  const effectiveLat =
    geo.latitude !== null
      ? geo.latitude
      : useFallback
        ? FALLBACK_GEO.latitude
        : null;

  const effectiveLng =
    geo.longitude !== null
      ? geo.longitude
      : useFallback
        ? FALLBACK_GEO.longitude
        : null;

  const chooseFallback = useCallback(() => {
    setUseFallback(true);
  }, []);

  /** True quando estamos a usar coordenadas fixas porque o GPS falhou. */
  const isEstimatedPosition =
    useFallback && geo.latitude === null && geo.longitude === null;

  return {
    ...geo,
    effectiveLat,
    effectiveLng,
    chooseFallback,
    isEstimatedPosition,
  };
}

import { Place, TransportMode } from '../types';

const KAKAO_MODES: Record<TransportMode, string> = {
  driving: 'car', walking: 'walk', transit: 'traffic', bicycling: 'bicycle',
};

function hasValidCoordinates(place: Place): boolean {
  return Number.isFinite(place.latitude) && Math.abs(place.latitude) <= 90
    && Number.isFinite(place.longitude) && Math.abs(place.longitude) <= 180;
}

export function getGooglePlaceLink(place: Place): string | null {
  if (!hasValidCoordinates(place)) return null;
  // Keep the saved location even when its display name has been customized.
  const query = encodeURIComponent(`${place.latitude},${place.longitude}`);
  const placeId = place.placeId?.trim();
  // Namespaced provider IDs (for example kakao:123) are not Google Place IDs.
  const googleId = placeId && !placeId.includes(':') ? placeId : null;
  return `https://www.google.com/maps/search/?api=1&query=${query}${googleId ? `&query_place_id=${encodeURIComponent(googleId)}` : ''}`;
}

function isKoreanPlace(place: Place): boolean {
  if (place.countryCode) return place.countryCode.toUpperCase() === 'KR';
  // Older saved trips have no country code. Use the address only to select a
  // map link, never to reject a route or fabricate an automatic travel time.
  return /대한민국|South Korea|Republic of Korea|韓国|韩国/i.test(place.address)
    || /^(서울(?:특별시)?|부산(?:광역시)?|대구(?:광역시)?|인천(?:광역시)?|광주(?:광역시)?|대전(?:광역시)?|울산(?:광역시)?|세종(?:특별자치시)?|경기도|강원(?:도|특별자치도)|충청[남북]도|전라[남북]도|전북특별자치도|경상[남북]도|제주(?:도|특별자치도))\s/.test(place.address.trim());
}

export function getExternalRouteLink(origin: Place, destination: Place, mode: TransportMode): {
  url: string; provider: 'kakao' | 'google';
} | null {
  if (!hasValidCoordinates(origin) || !hasValidCoordinates(destination) || !KAKAO_MODES[mode]) return null;
  if (isKoreanPlace(origin) && isKoreanPlace(destination)) {
    // Kakao IDs are unrelated to Google Place IDs. Pass WGS84 coordinates and
    // labels using the documented /link/by route; it needs no API key.
    const point = (place: Place) => {
      const label = place.name.replace(/[,/\r\n]/g, ' ').trim() || `${place.latitude}, ${place.longitude}`;
      return `${encodeURIComponent(label)},${place.latitude},${place.longitude}`;
    };
    return { provider: 'kakao', url: `https://map.kakao.com/link/by/${KAKAO_MODES[mode]}/${point(origin)}/${point(destination)}` };
  }
  return {
    provider: 'google',
    url: `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=${mode}`,
  };
}

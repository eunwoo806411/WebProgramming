// 등록 페이지 전용 위치 선택 지도. 메인 지도(pages/main/map.js)와 코드를 공유하지 않습니다.
// Leaflet 기본 마커 이미지는 vendor에 없으므로 CSS 핀(divIcon)을 사용합니다.
import {CONFIG} from '../../shared/js/config.js';

export function createLocationPicker(container, {onChange, onTileError, tiles = true} = {}) {
  const L = window.L;
  if (!L) return null;
  const {center, zoom, minZoom, maxZoom, maxNativeZoom, maxBounds, tileUrl, attribution} = CONFIG.map;
  const bounds = L.latLngBounds(maxBounds);
  const map = L.map(container, {minZoom, maxZoom, maxBounds, maxBoundsViscosity: 1, zoomSnap: 0.5}).setView(center, zoom);
  if (tiles) {
    L.tileLayer(tileUrl, {maxNativeZoom, maxZoom, attribution}).addTo(map).on('tileerror', () => onTileError?.());
  }
  const icon = L.divIcon({className: 'upload-pin', html: '<span></span>', iconSize: [28, 36], iconAnchor: [14, 34]});
  let marker = null, last = null;

  function place(latitude, longitude, {pan = false, notify = true} = {}) {
    const latlng = L.latLng(latitude, longitude);
    if (!bounds.contains(latlng)) return false;
    if (!marker) {
      marker = L.marker(latlng, {icon, draggable: true, keyboard: false, title: '선택한 위치'}).addTo(map);
      marker.on('dragend', () => {
        const p = marker.getLatLng();
        if (bounds.contains(p)) { last = p; onChange?.(p.lat, p.lng); } else marker.setLatLng(last);
      });
    } else marker.setLatLng(latlng);
    last = latlng;
    if (pan) map.panTo(latlng);
    if (notify) onChange?.(latlng.lat, latlng.lng);
    return true;
  }
  map.on('click', e => place(e.latlng.lat, e.latlng.lng));
  return {
    setPosition: (lat, lng, options) => place(lat, lng, {pan: true, notify: false, ...options}),
    useCenter() { const c = map.getCenter(); return place(c.lat, c.lng); },
    clear() { marker?.remove(); marker = last = null; },
    focus() { container.scrollIntoView({block: 'center', behavior: 'smooth'}); container.focus({preventScroll: true}); },
    destroy() { map.remove(); }
  };
}

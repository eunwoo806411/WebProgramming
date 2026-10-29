// 등록 페이지 전용 위치 선택 지도. 메인 지도(pages/main/map.js)와 코드를 공유하지 않습니다.
// Leaflet 기본 마커 이미지는 vendor에 없으므로 CSS 핀(divIcon)을 사용합니다.
import {CONFIG} from '../../shared/js/config.js';

export function createLocationPicker(container, {onChange, onTileError, onBuildingSelect, buildings = [], tiles = true} = {}) {
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

  // 건물 위치 점: 누르면 해당 건물을 촬영 위치로 선택합니다. (마커 클릭은 지도 클릭으로 번지지 않습니다.)
  const buildingMarkers = new Map();
  for (const b of buildings) {
    const dot = L.marker([b.latitude, b.longitude], {
      icon: L.divIcon({className: 'upload-building-dot', html: '<span></span>', iconSize: [16, 16], iconAnchor: [8, 8]}),
      keyboard: false, title: `${b.name} 선택`, zIndexOffset: -100
    }).addTo(map);
    dot.on('click', () => onBuildingSelect?.(b.id));
    buildingMarkers.set(b.id, {dot, name: b.name});
  }
  // 선택한 건물은 이름표를 계속 보여주고, 나머지는 마우스를 올렸을 때만 보여줍니다.
  function highlightBuilding(id) {
    for (const [key, {dot, name}] of buildingMarkers) {
      const active = key === id;
      dot.getElement()?.classList.toggle('is-active', active);
      dot.unbindTooltip().bindTooltip(name, {direction: 'top', offset: [0, -8], permanent: active, className: `upload-building-tip${active ? ' is-active' : ''}`});
    }
  }
  highlightBuilding(null);

  return {
    highlightBuilding,
    setPosition: (lat, lng, options) => place(lat, lng, {pan: true, notify: false, ...options}),
    useCenter() { const c = map.getCenter(); return place(c.lat, c.lng); },
    clear() { marker?.remove(); marker = last = null; highlightBuilding(null); },
    focus() { container.scrollIntoView({block: 'center', behavior: 'smooth'}); container.focus({preventScroll: true}); },
    destroy() { map.remove(); }
  };
}

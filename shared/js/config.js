export const CONFIG = Object.freeze({
  timeField: 'uploadedAt', timeZone: 'Asia/Seoul', demoLoginEnabled: true,
  map: { center: [37.4964,126.9575], zoom: 17.5, minZoom: 17.5, maxZoom: 21, maxNativeZoom: 19,
    // 캠퍼스 경계에서 건물 한 동 정도의 여유만 둡니다.
    maxBounds: [[37.4938,126.9538],[37.4990,126.9612]],
    wheelPxPerZoomLevel: 500,
    tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }
});

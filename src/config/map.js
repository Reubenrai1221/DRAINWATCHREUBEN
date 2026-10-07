// Map settings. The basemap is free and needs no API key, but its terms
// require the attribution line below to stay visible on the map.

export const NYC_CENTER = [40.7128, -73.9];
export const DEFAULT_ZOOM = 11;

export const BASEMAP = {
  url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 19,
};

export const CURRENT_YEAR = new Date().getFullYear();

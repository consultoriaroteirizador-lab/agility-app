/**
 * Configuração do servidor de tiles para o mapa
 * 
 * Por padrão usa OpenStreetMap gratuito
 * Para produção, configure seu próprio servidor de tiles
 */

/**
 * URLs gratuitas para tiles de mapa
 * 
 * OSM Oficial (padrão):
 * - https://tile.openstreetmap.org/{z}/{x}/{y}.png
 * 
 * OSM Alternativos (mais rápidos em algumas regiões):
 * - https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png
 * - https://tile.openstreetmap.de/{z}/{x}/{y}.png
 * 
 * Outros provedores gratuitos:
 * - https://tiles.stadiamaps.com/tiles/osm_streets/{z}/{x}/{y}.png (Stadia Maps)
 * - https://tile.thunderforest.com/cycle/{z}/{x}/{y}.png (Thunderforest - ciclo)
 * - https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png (CartoDB Light)
 * - https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png (CartoDB Dark)
 * 
 * Nota: O servidor oficial do OSM tem rate limiting.
 * Para uso intensivo, considere um servidor próprio ou provedor comercial.
 */
export const FREE_TILE_URLS = {
    osm: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    osmHot: 'https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    osmDe: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
    cartoLight: 'https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
    cartoDark: 'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
} as const;

export const MAP_CONFIG = {
    /**
     * URL do servidor de tiles OSM
     */
    tileUrl: FREE_TILE_URLS.osm,

    /**
     * URL do servidor de tiles para produção (configure seu próprio)
     * Exemplo com TileServer GL: https://seu-servidor.com/tiles/{z}/{x}/{y}.png
     */
    customTileUrl: null as string | null,

    /**
     * Zoom máximo
     */
    maxZoom: 19,

    /**
     * Zoom mínimo
     */
    minZoom: 3,

    /**
     * Attribution obrigatória para OSM
     */
    attribution: '© OpenStreetMap contributors',
};

/**
 * Retorna a URL do tile server ativa
 */
export function getTileUrl(): string {
    return MAP_CONFIG.customTileUrl || MAP_CONFIG.tileUrl;
}

/**
 * Configura um servidor de tiles customizado
 * Útil para apontar para seu próprio servidor em produção
 */
export function setCustomTileUrl(url: string | null): void {
    MAP_CONFIG.customTileUrl = url;
}
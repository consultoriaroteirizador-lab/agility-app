/**
 * Tipos para o módulo de tracking
 */

export interface DriverLocationUpdate {
  driverId: string;
  location: {
    lat: number;
    lng: number;
  };
  timestamp: string;
}

export interface TrackingWebSocketOptions {
  onDriverLocationUpdate?: (data: DriverLocationUpdate) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

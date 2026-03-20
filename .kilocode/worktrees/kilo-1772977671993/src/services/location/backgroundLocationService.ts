/**
 * Serviço de Background Geolocation usando o SDK da TransistorSoft
 * 
 * Este serviço gerencia o rastreamento de localização em segundo plano
 * com otimização de bateria através de detecção de movimento via acelerômetro.
 * 
 * Documentação: https://transistorsoft.github.io/react-native-background-geolocation/
 */

import { Platform } from 'react-native';
import BackgroundGeolocation, {
  Location,
  State,
  MotionChangeEvent,
  MotionActivityEvent,
  ProviderChangeEvent,
  HttpEvent,
  GeofenceEvent,
  GeofencesChangeEvent,
  HeartbeatEvent,
  Subscription,
} from 'react-native-background-geolocation';

import { BACKGROUND_GEOLOCATION_LICENSES } from '@/config/background-geolocation.license';
import { urls } from '@/config/urls';
import { isDevelopment } from '@/config/environment';

// Tipos exportados
export type LocationData = {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: string;
  isMoving: boolean;
  activityType: string | null;
  odometer: number;
  uuid: string;
};

export type GeofenceData = {
  identifier: string;
  latitude: number;
  longitude: number;
  radius: number;
  notifyOnEntry: boolean;
  notifyOnExit: boolean;
  notifyOnDwell: boolean;
  loiteringDelay?: number;
  extras?: Record<string, any>;
};

export type TrackingState = {
  isInitialized: boolean;
  isTracking: boolean;
  isEnabled: boolean;
  driverId: string | null;
};

export type TrackingAuthConfig = {
  driverId: string;
  accessToken: string;
  tenantId: string;
};

// Estado do serviço
let trackingState: TrackingState = {
  isInitialized: false,
  isTracking: false,
  isEnabled: false,
  driverId: null,
};

// Subscriptions para cleanup
let subscriptions: Subscription[] = [];

// Callbacks
type LocationCallback = (location: LocationData) => void;
type GeofenceCallback = (event: GeofenceEvent) => void;
type MotionCallback = (isMoving: boolean) => void;

let locationCallbacks: LocationCallback[] = [];
let geofenceCallbacks: GeofenceCallback[] = [];
let motionCallbacks: MotionCallback[] = [];

/**
 * Configurações padrão do Background Geolocation
 * Na v5.x, a configuração usa namespaces aninhados
 * @see https://transistorsoft.github.io/react-native-background-geolocation/
 */
const getDefaultConfig = (authConfig: TrackingAuthConfig) => ({
  // Geolocation Config (v5.x namespace)
  geolocation: {
    desiredAccuracy: BackgroundGeolocation.DesiredAccuracy.High,
    distanceFilter: 10, // 10 metros
    stationaryRadius: 25, // 25 metros parado
    stopTimeout: 5, // 5 minutos parado antes de desligar GPS
    disableElasticity: false,
    elasticityMultiplier: 1,
  },

  // Logger Config (v5.x namespace)
  logger: {
    debug: __DEV__,
    logLevel: __DEV__ 
      ? BackgroundGeolocation.LogLevel.Verbose 
      : BackgroundGeolocation.LogLevel.Off,
    maxLogsToPersist: 100,
  },

  // App Config (v5.x namespace)
  app: {
    stopOnTerminate: false, // Continua após fechar app
    startOnBoot: true, // Inicia no boot do dispositivo
  },

  // HTTP Config (v5.x namespace)
  http: {
    url: `${urls.agilityApi}/tracking/locations`, // Endpoint batch do backend (plural)
    method: 'POST' as const,
    autoSync: true, // Envia automaticamente cada localização
    autoSyncThreshold: 5, // Envia após 5 localizações
    batchSync: true, // Envia em batch
    maxBatchSize: 50, // Máximo de 50 localizações por request
    maxRecordsToPersist: -1, // Sem limite de registros
    httpTimeout: 60000,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authConfig.accessToken}`,
      'x-tenant-id': authConfig.tenantId,
    },
    // NOTA: params e extras no http config podem não ser aplicados ao body
    // Vamos usar o extras global (fora do http) para garantir
  },

  // Extras GLOBAL - Este é aplicado a CADA localização no body
  extras: {
    driver_id: authConfig.driverId,
    app_version: '1.0.0',
    platform: Platform.OS,
  },

  // Notification Config (Android) (v5.x namespace)
  notification: {
    title: 'Agility App',
    text: 'Rastreamento de rota ativo',
    channelName: 'Rastreamento',
    smallIcon: 'mipmap/ic_notification',
    priority: BackgroundGeolocation.NotificationPriority.High,
  },

  // Activity Recognition Config (v5.x namespace)
  activityRecognition: {
    stopTimeout: 5, // 5 minutos sem movimento para parar
  },
});

/**
 * Inicializa o serviço de Background Geolocation
 */
export async function initializeBackgroundGeolocation(authConfig: TrackingAuthConfig): Promise<State> {
  if (trackingState.isInitialized) {
    console.log('[BGGeolocation] Já inicializado');
    return BackgroundGeolocation.getState();
  }

  console.log('[BGGeolocation] Inicializando serviço...');
  console.log('[BGGeolocation] driverId:', authConfig.driverId);

  // Registrar listeners de eventos
  setupEventListeners();

  // Obter configurações
  const config = getDefaultConfig(authConfig);

  // Ready do plugin
  const state = await BackgroundGeolocation.ready(config as any);

  trackingState.isInitialized = true;
  trackingState.driverId = authConfig.driverId;
  trackingState.isEnabled = state.enabled;

  console.log('[BGGeolocation] Serviço inicializado:', {
    enabled: state.enabled,
    driverId: authConfig.driverId,
    tenantId: authConfig.tenantId ? '***' : 'missing',
  });

  return state;
}

/**
 * Configura os listeners de eventos do SDK
 */
function setupEventListeners() {
  // Limpar subscriptions anteriores
  subscriptions.forEach(sub => sub.remove());
  subscriptions = [];

  // Evento: Nova localização
  subscriptions.push(
    BackgroundGeolocation.onLocation(onLocationHandler, (error) => {
      console.error('[BGGeolocation] Erro no onLocation:', error);
    })
  );

  // Evento: Mudança de movimento (parado/movendo)
  subscriptions.push(
    BackgroundGeolocation.onMotionChange(onMotionChangeHandler)
  );

  // Evento: Mudança de atividade (andando, dirigindo, etc)
  subscriptions.push(
    BackgroundGeolocation.onActivityChange(onActivityChangeHandler)
  );

  // Evento: Mudança de provider (GPS habilitado/desabilitado)
  subscriptions.push(
    BackgroundGeolocation.onProviderChange(onProviderChangeHandler)
  );

  // Evento: HTTP response
  subscriptions.push(
    BackgroundGeolocation.onHttp(onHttpHandler)
  );

  // Evento: Heartbeat
  subscriptions.push(
    BackgroundGeolocation.onHeartbeat(onHeartbeatHandler)
  );

  // Evento: Geofences
  subscriptions.push(
    BackgroundGeolocation.onGeofence(onGeofenceHandler)
  );

  // Evento: Mudança na lista de geofences
  subscriptions.push(
    BackgroundGeolocation.onGeofencesChange(onGeofencesChangeHandler)
  );

  console.log('[BGGeolocation] Event listeners configurados');
}

/**
 * Converte Location do SDK para LocationData
 */
function locationToData(location: Location): LocationData {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    speed: location.coords.speed ?? null,
    heading: location.coords.heading ?? null,
    timestamp: location.timestamp,
    isMoving: location.is_moving,
    activityType: location.activity?.type ?? null,
    odometer: location.odometer,
    uuid: location.uuid,
  };
}

/**
 * Handler: Nova localização recebida
 */
function onLocationHandler(location: Location) {
  const locationData = locationToData(location);

  if (isDevelopment || __DEV__) {
    console.log('[BGGeolocation] onLocation:', {
      lat: locationData.latitude.toFixed(6),
      lng: locationData.longitude.toFixed(6),
      accuracy: locationData.accuracy.toFixed(1),
      isMoving: locationData.isMoving,
      activity: locationData.activityType,
      extras: location.extras, // Log extras to verify
    });
  }

  // Notificar callbacks
  locationCallbacks.forEach(cb => {
    try {
      cb(locationData);
    } catch (e) {
      console.error('[BGGeolocation] Erro no callback de localização:', e);
    }
  });
}

/**
 * Handler: Mudança de estado de movimento
 */
function onMotionChangeHandler(event: MotionChangeEvent) {
  console.log('[BGGeolocation] onMotionChange:', {
    isMoving: event.isMoving,
    location: {
      lat: event.location.coords.latitude.toFixed(6),
      lng: event.location.coords.longitude.toFixed(6),
    },
    extras: event.location.extras, // Log extras
  });

  trackingState.isTracking = event.isMoving;

  // Notificar callbacks
  motionCallbacks.forEach(cb => {
    try {
      cb(event.isMoving);
    } catch (e) {
      console.error('[BGGeolocation] Erro no callback de movimento:', e);
    }
  });
}

/**
 * Handler: Mudança de atividade detectada
 */
function onActivityChangeHandler(event: MotionActivityEvent) {
  console.log('[BGGeolocation] onActivityChange:', {
    activity: event.activity,
    confidence: event.confidence,
  });
}

/**
 * Handler: Mudança no provider de localização
 */
function onProviderChangeHandler(event: ProviderChangeEvent) {
  console.log('[BGGeolocation] onProviderChange:', {
    enabled: event.enabled,
    status: event.status,
    network: event.network,
    gps: event.gps,
  });

  if (!event.enabled) {
    console.warn('[BGGeolocation] GPS desabilitado pelo usuário');
  }
}

/**
 * Handler: Resposta HTTP do servidor
 */
function onHttpHandler(event: HttpEvent) {
  if (isDevelopment || __DEV__) {
    console.log('[BGGeolocation] onHttp:', {
      status: event.status,
      responseText: event.responseText?.substring(0, 200),
    });
  }

  if (event.status >= 400) {
    console.error('[BGGeolocation] Erro HTTP:', event.status, event.responseText);
  }
}

/**
 * Handler: Heartbeat periódico
 */
function onHeartbeatHandler(event: HeartbeatEvent) {
  console.log('[BGGeolocation] onHeartbeat:', {
    location: event.location ? {
      lat: event.location.coords.latitude.toFixed(6),
      lng: event.location.coords.longitude.toFixed(6),
    } : null,
  });
}

/**
 * Handler: Evento de geofence
 */
function onGeofenceHandler(event: GeofenceEvent) {
  console.log('[BGGeolocation] onGeofence:', {
    identifier: event.identifier,
    action: event.action,
    location: {
      lat: event.location.coords.latitude.toFixed(6),
      lng: event.location.coords.longitude.toFixed(6),
    },
  });

  // Notificar callbacks
  geofenceCallbacks.forEach(cb => {
    try {
      cb(event);
    } catch (e) {
      console.error('[BGGeolocation] Erro no callback de geofence:', e);
    }
  });
}

/**
 * Handler: Mudança na lista de geofences
 */
function onGeofencesChangeHandler(event: GeofencesChangeEvent) {
  console.log('[BGGeolocation] onGeofencesChange:', {
    on: event.on.map(g => g.identifier),
    off: event.off,
  });
}

/**
 * Inicia o rastreamento de localização
 */
export async function startBackgroundTracking(authConfig: TrackingAuthConfig): Promise<void> {
  console.log('[BGGeolocation] Iniciando tracking para driver:', authConfig.driverId);

  // Inicializar se necessário
  if (!trackingState.isInitialized) {
    await initializeBackgroundGeolocation(authConfig);
  }

  // IMPORTANTE: Atualizar extras global para garantir que driver_id esteja em cada localização
  await BackgroundGeolocation.setConfig({
    extras: {
      driver_id: authConfig.driverId,
      app_version: '1.0.0',
      platform: Platform.OS,
    },
    http: {
      headers: {
        'Authorization': `Bearer ${authConfig.accessToken}`,
        'x-tenant-id': authConfig.tenantId,
      },
    },
  } as any);

  console.log('[BGGeolocation] Config atualizado com extras:', {
    driver_id: authConfig.driverId,
  });

  // Iniciar tracking
  await BackgroundGeolocation.start();

  trackingState.isTracking = true;
  trackingState.isEnabled = true;
  trackingState.driverId = authConfig.driverId;

  console.log('[BGGeolocation] Tracking iniciado com sucesso');
}

/**
 * Para o rastreamento de localização
 */
export async function stopBackgroundTracking(): Promise<void> {
  console.log('[BGGeolocation] Parando tracking...');

  if (!trackingState.isInitialized) {
    console.log('[BGGeolocation] Serviço não estava inicializado');
    return;
  }

  await BackgroundGeolocation.stop();

  trackingState.isTracking = false;
  trackingState.isEnabled = false;

  console.log('[BGGeolocation] Tracking parado');
}

/**
 * Obtém a posição atual
 */
export async function getCurrentPosition(): Promise<LocationData | null> {
  try {
    const location = await BackgroundGeolocation.getCurrentPosition({
      timeout: 30,
      samples: 3,
      desiredAccuracy: BackgroundGeolocation.DesiredAccuracy.High,
      persist: true,
    });

    return locationToData(location);
  } catch (error) {
    console.error('[BGGeolocation] Erro ao obter posição atual:', error);
    return null;
  }
}

/**
 * Obtém o odômetro (distância percorrida em metros)
 */
export async function getOdometer(): Promise<number> {
  try {
    const odometer = await BackgroundGeolocation.getOdometer();
    return odometer;
  } catch (error) {
    console.error('[BGGeolocation] Erro ao obter odômetro:', error);
    return 0;
  }
}

/**
 * Reseta o odômetro
 */
export async function resetOdometer(): Promise<void> {
  try {
    await BackgroundGeolocation.resetOdometer();
    console.log('[BGGeolocation] Odômetro resetado');
  } catch (error) {
    console.error('[BGGeolocation] Erro ao resetar odômetro:', error);
  }
}

/**
 * Adiciona geofences para monitoramento
 */
export async function addGeofences(geofences: GeofenceData[]): Promise<void> {
  try {
    await BackgroundGeolocation.addGeofences(geofences);
    console.log('[BGGeolocation] Geofences adicionados:', geofences.length);
  } catch (error) {
    console.error('[BGGeolocation] Erro ao adicionar geofences:', error);
    throw error;
  }
}

/**
 * Remove todos os geofences
 */
export async function removeAllGeofences(): Promise<void> {
  try {
    await BackgroundGeolocation.removeGeofences();
    console.log('[BGGeolocation] Todos os geofences removidos');
  } catch (error) {
    console.error('[BGGeolocation] Erro ao remover geofences:', error);
  }
}

/**
 * Remove geofences específicos
 */
export async function removeGeofencesById(identifiers: string[]): Promise<void> {
  try {
    await BackgroundGeolocation.removeGeofences(identifiers);
    console.log('[BGGeolocation] Geofences removidos:', identifiers);
  } catch (error) {
    console.error('[BGGeolocation] Erro ao remover geofences:', error);
  }
}

/**
 * Obtém geofences ativos
 */
export async function getGeofences(): Promise<GeofenceData[]> {
  try {
    const geofences = await BackgroundGeolocation.getGeofences();
    return geofences.map(g => ({
      identifier: g.identifier,
      latitude: g.latitude,
      longitude: g.longitude,
      radius: g.radius,
      notifyOnEntry: g.notifyOnEntry,
      notifyOnExit: g.notifyOnExit,
      notifyOnDwell: g.notifyOnDwell,
      loiteringDelay: g.loiteringDelay,
      extras: g.extras,
    }));
  } catch (error) {
    console.error('[BGGeolocation] Erro ao obter geofences:', error);
    return [];
  }
}

/**
 * Registra callback para receber localizações
 */
export function onLocationReceived(callback: LocationCallback): () => void {
  locationCallbacks.push(callback);
  return () => {
    locationCallbacks = locationCallbacks.filter(cb => cb !== callback);
  };
}

/**
 * Registra callback para eventos de geofence
 */
export function onGeofenceEvent(callback: GeofenceCallback): () => void {
  geofenceCallbacks.push(callback);
  return () => {
    geofenceCallbacks = geofenceCallbacks.filter(cb => cb !== callback);
  };
}

/**
 * Registra callback para mudança de movimento
 */
export function onMotionEvent(callback: MotionCallback): () => void {
  motionCallbacks.push(callback);
  return () => {
    motionCallbacks = motionCallbacks.filter(cb => cb !== callback);
  };
}

/**
 * Obtém estado atual do tracking
 */
export function getTrackingState(): TrackingState {
  return { ...trackingState };
}

/**
 * Obtém estado do SDK
 */
export async function getSDKState(): Promise<State> {
  return BackgroundGeolocation.getState();
}

/**
 * Sincroniza localizações pendentes com o servidor
 */
export async function syncNow(): Promise<void> {
  try {
    await BackgroundGeolocation.sync();
    console.log('[BGGeolocation] Sincronização iniciada');
  } catch (error) {
    console.error('[BGGeolocation] Erro na sincronização:', error);
  }
}

/**
 * Obtém quantidade de localizações pendentes
 */
export async function getCount(): Promise<number> {
  try {
    return await BackgroundGeolocation.getCount();
  } catch (error) {
    console.error('[BGGeolocation] Erro ao obter count:', error);
    return 0;
  }
}

/**
 * Limpa todas as localizações pendentes
 */
export async function destroyLocations(): Promise<void> {
  try {
    await BackgroundGeolocation.destroyLocations();
    console.log('[BGGeolocation] Localizações destruídas');
  } catch (error) {
    console.error('[BGGeolocation] Erro ao destruir localizações:', error);
  }
}

/**
 * Cleanup do serviço
 */
export async function cleanupBackgroundGeolocation(): Promise<void> {
  console.log('[BGGeolocation] Fazendo cleanup...');

  // Remover todos os subscriptions
  subscriptions.forEach(sub => sub.remove());
  subscriptions = [];

  // Limpar callbacks
  locationCallbacks = [];
  geofenceCallbacks = [];
  motionCallbacks = [];

  // Resetar estado
  trackingState = {
    isInitialized: false,
    isTracking: false,
    isEnabled: false,
    driverId: null,
  };

  console.log('[BGGeolocation] Cleanup concluído');
}

// Exportar namespace para compatibilidade
export const BackgroundLocationService = {
  initialize: initializeBackgroundGeolocation,
  start: startBackgroundTracking,
  stop: stopBackgroundTracking,
  getCurrentPosition,
  getOdometer,
  resetOdometer,
  addGeofences,
  removeGeofences: removeAllGeofences,
  removeGeofencesById,
  getGeofences,
  onLocationReceived,
  onGeofenceEvent,
  onMotionEvent,
  getTrackingState,
  getSDKState,
  syncNow,
  getCount,
  destroyLocations,
  cleanup: cleanupBackgroundGeolocation,
};

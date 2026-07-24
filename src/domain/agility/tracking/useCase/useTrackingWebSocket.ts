/**
 * Hook para WebSocket de Tracking/Monitoramento
 * 
 * Conecta ao namespace /monitoring do backend para receber
 * atualizações em tempo real de localização dos motoristas.
 */

import { useEffect, useRef, useCallback } from 'react';

import { io, Socket } from 'socket.io-client';

import { urls } from '@/config/urls';
import { useAuthCredentialsService } from '@/services/authCredentials/useAuthCredentialsService';

import type { DriverLocationUpdate } from '../types';

// Tipos
export interface TrackingWebSocketOptions {
  onDriverLocationUpdate?: (data: DriverLocationUpdate) => void;
  /** Rota atualizada no backend (replan, re-projeção de ETA por atraso, etc.). */
  onRoutingUpdated?: (data: { id?: string } & Record<string, unknown>) => void;
  /** Serviço/parada atualizado (status, ETA re-projetada, etc.). */
  onServiceUpdated?: (data: { id?: string; routingId?: string } & Record<string, unknown>) => void;
  /** Nova oferta de rota disponível pra este motorista (uberização/leilão).
   *  Emitido pelo backend em `offer.available` na sala `user:${keycloakUserId}`. */
  onOfferAvailable?: (data: { id?: string; code?: string } & Record<string, unknown>) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

// Estado global do socket para evitar múltiplas conexões
let globalSocket: Socket | null = null;
let connectionCount = 0;
// Guardamos o token usado na conexão atual para detectar refresh e forçar
// reconexão com credenciais novas.
let connectedAccessToken: string | null = null;

/**
 * Hook para conexão WebSocket com o namespace /monitoring
 */
export function useTrackingWebSocket(options: TrackingWebSocketOptions = {}) {
  const { userAuth, authCredentials } = useAuthCredentialsService();
  const socketRef = useRef<Socket | null>(null);
  const optionsRef = useRef(options);

  // Manter options atualizadas
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  /**
   * Conectar ao WebSocket
   */
  const connect = useCallback(() => {
    const currentToken = authCredentials?.accessToken ?? null;

    // Se o socket global já existe mas o token mudou (refresh), derruba para
    // que o handshake aconteça com o token novo. Sem isso, o socket continua
    // autenticado com o token velho e cai em loop de reconnect quando expira.
    if (globalSocket && connectedAccessToken !== currentToken) {
      console.log('[TrackingWebSocket] Token mudou, recriando conexão');
      globalSocket.removeAllListeners();
      globalSocket.disconnect();
      globalSocket = null;
      connectedAccessToken = null;
    }

    // Reutilizar conexão global se existir (e token coincide)
    if (globalSocket?.connected) {
      socketRef.current = globalSocket;
      connectionCount++;
      console.log('[TrackingWebSocket] Reutilizando conexão existente');
      return;
    }

    // Obter tenantId de authCredentials (não de userAuth)
    const tenantId = authCredentials?.tenantId;
    const userId = userAuth?.id;

    // Não conectar sem autenticação
    if (!tenantId || !userId) {
      console.warn('[TrackingWebSocket] Sem credenciais, não conectando');
      return;
    }

    // Construir URL do WebSocket
    const baseUrl = urls.agilityApi;
    const wsBase = baseUrl.replace(/^https?:\/\//, '');
    const protocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${wsBase}`;

    console.log('[TrackingWebSocket] Conectando a:', wsUrl);

    // Criar socket
    globalSocket = io(`${wsUrl}/monitoring`, {
      path: '/socket.io',
      auth: {
        token: authCredentials?.accessToken,
        tenantId,
        userId,
      },
      transports: ['websocket', 'polling'],
      query: {
        tenantId,
        userId,
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // Usar referência local para evitar race com globalSocket sendo nullado
    // entre a anexação do listener e o fire do evento (ex: refresh de token
    // durante o handshake).
    const socket = globalSocket;
    socketRef.current = socket;
    connectionCount++;
    connectedAccessToken = authCredentials?.accessToken ?? null;

    // Eventos de conexão. `subscribe_routings` precisa ser re-emitido a cada
    // (re)conexão do socket. ATENÇÃO: emitir no `connect` do cliente dispara
    // ANTES do servidor terminar handleConnection (que é async — busca
    // tenant no Redis + valida JWT via JWKS). Resultado: o handler de
    // subscribe responde "Not authenticated" porque client.tenantId ainda
    // não foi setado pelo backend. O servidor emite o evento `connected`
    // só depois de toda a auth terminar — esse é o sinal correto para
    // emitir subscribe.
    socket.on('connect', () => {
      console.log('[TrackingWebSocket] Conectado ao namespace /monitoring (aguardando confirmação do servidor)');
    });

    socket.on('connected', () => {
      console.log('[TrackingWebSocket] Servidor confirmou autenticação, subscrevendo');
      socket.emit('subscribe_routings', { tenantId });
      optionsRef.current.onConnect?.();
    });

    socket.on('disconnect', (reason) => {
      console.log('[TrackingWebSocket] Desconectado:', reason);
      optionsRef.current.onDisconnect?.();
    });

    socket.on('connect_error', (error) => {
      console.error('[TrackingWebSocket] Erro de conexão:', error.message);
      optionsRef.current.onError?.(error);
    });

    // Escutar atualizações de localização dos motoristas
    socket.on('driver_location_updated', (data: DriverLocationUpdate) => {
      console.log('[TrackingWebSocket] Location update:', data.driverId);
      optionsRef.current.onDriverLocationUpdate?.(data);
    });

    // Rota atualizada (replan / re-projeção de ETA por atraso).
    socket.on('routing_updated', (data: { id?: string }) => {
      console.log('[TrackingWebSocket] Routing update:', data?.id);
      optionsRef.current.onRoutingUpdated?.(data);
    });

    // Serviço/parada atualizado (status, ETA re-projetada).
    socket.on('service_updated', (data: { id?: string; routingId?: string }) => {
      console.log('[TrackingWebSocket] Service update:', data?.id);
      optionsRef.current.onServiceUpdated?.(data);
    });

    // Nova oferta de rota disponível (uberização): backend emite na sala do
    // usuário. A tela de ofertas usa isso para atualizar a lista ao vivo +
    // alertar o motorista, sem precisar recarregar.
    socket.on('offer.available', (data: { id?: string; code?: string }) => {
      console.log('[TrackingWebSocket] Offer available:', data?.code ?? data?.id);
      optionsRef.current.onOfferAvailable?.(data);
    });

    // Escutar erros
    socket.on('error', (error: { message: string }) => {
      console.error('[TrackingWebSocket] Erro do servidor:', error.message);
    });

  }, [userAuth?.id, authCredentials?.tenantId, authCredentials?.accessToken]);

  /**
   * Desconectar do WebSocket
   */
  const disconnect = useCallback(() => {
    connectionCount--;

    // Só desconectar se for a última referência
    if (connectionCount <= 0 && globalSocket) {
      console.log('[TrackingWebSocket] Desconectando socket global');
      globalSocket.removeAllListeners();
      globalSocket.disconnect();
      globalSocket = null;
      connectionCount = 0;
      connectedAccessToken = null;
    }

    socketRef.current = null;
  }, []);

  /**
   * Enviar evento de localização (se necessário)
   */
  const emitLocation = useCallback((location: { lat: number; lng: number }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('driver_location', {
        location,
        timestamp: new Date().toISOString(),
      });
    }
  }, []);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    emitLocation,
    isConnected: socketRef.current?.connected ?? false,
    socket: socketRef.current,
  };
}

/**
 * Hook simplificado para apenas escutar atualizações de localização
 */
export function useDriverLocationListener(
  onLocationUpdate: (data: DriverLocationUpdate) => void,
) {
  const { connect, disconnect } = useTrackingWebSocket({
    onDriverLocationUpdate: onLocationUpdate,
  });

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { isConnected: true };
}

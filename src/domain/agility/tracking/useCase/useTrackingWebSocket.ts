/**
 * Hook para WebSocket de Tracking/Monitoramento
 * 
 * Conecta ao namespace /monitoring do backend para receber
 * atualizações em tempo real de localização dos motoristas.
 */

import { useEffect, useRef, useCallback } from 'react';

import { io, Socket } from 'socket.io-client';

import { urls } from '@/config/urls';
import type { OfferPayload } from '@/domain/agility/offer/offerStore';
import { useAuthCredentialsService } from '@/services/authCredentials/useAuthCredentialsService';

import type { DriverLocationUpdate } from '../types';

// Tipos
export interface TrackingWebSocketOptions {
  onDriverLocationUpdate?: (data: DriverLocationUpdate) => void;
  /** Rota atualizada no backend (replan, re-projeção de ETA por atraso, etc.). */
  onRoutingUpdated?: (data: { id?: string } & Record<string, unknown>) => void;
  /** Serviço/parada atualizado (status, ETA re-projetada, etc.). */
  onServiceUpdated?: (data: { id?: string; routingId?: string } & Record<string, unknown>) => void;
  /** Nova oferta disponível para o motorista (uberização).
   *  Emitido pelo backend em `offer.available` na sala `user:${keycloakUserId}`. */
  onOfferAvailable?: (offer: OfferPayload) => void;
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
// Geração do socket global: sobe a cada socket criado. `connectionCount` conta
// referências AO SOCKET ATUAL; quem segurava um socket já descartado (troca de
// token) não pode descontar do contador do novo.
let socketGeneration = 0;

/** Só para testes: zera o estado de módulo entre casos. */
export function __resetTrackingSocketForTests() {
  globalSocket = null;
  connectionCount = 0;
  connectedAccessToken = null;
}

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

  // Esta instância segura no máximo UMA referência ao socket global. Antes o
  // consumidor decrementava duas vezes (o próprio disconnect + o cleanup
  // interno), e sair do detalhe da rota zerava o contador e derrubava o socket
  // que entregava `offer.available`. Guarda a GERAÇÃO do socket segurado (ou
  // null): depois de uma troca de token, a referência ao socket velho não
  // conta mais.
  const holdsRef = useRef<number | null>(null);
  const detachRef = useRef<(() => void) | null>(null);

  /** Soma a referência desta instância ao socket atual, uma vez só. */
  const hold = useCallback(() => {
    if (holdsRef.current === socketGeneration) return;
    holdsRef.current = socketGeneration;
    connectionCount++;
  }, []);

  /** Listeners DESTA instância, anexados a qualquer socket (novo ou reusado). */
  const attach = useCallback((socket: Socket) => {
    detachRef.current?.();
    const on = <T,>(ev: string, fn: (d: T) => void) => {
      socket.on(ev, fn);
      return () => { socket.off(ev, fn); };
    };
    const offs = [
      on('driver_location_updated', (d: DriverLocationUpdate) => optionsRef.current.onDriverLocationUpdate?.(d)),
      on('routing_updated', (d: { id?: string }) => optionsRef.current.onRoutingUpdated?.(d)),
      on('service_updated', (d: { id?: string; routingId?: string }) => optionsRef.current.onServiceUpdated?.(d)),
      on('offer.available', (o: OfferPayload) => optionsRef.current.onOfferAvailable?.(o)),
      on('disconnect', () => optionsRef.current.onDisconnect?.()),
      on('connect_error', (e: Error) => optionsRef.current.onError?.(e)),
    ];
    detachRef.current = () => { offs.forEach((off) => off()); detachRef.current = null; };
  }, []);

  /**
   * Conectar ao WebSocket
   */
  const connect = useCallback(() => {
    const currentToken = authCredentials?.accessToken ?? null;

    // Se o socket global já existe mas o token mudou (refresh), derruba para
    // que o handshake aconteça com o token novo. Sem isso, o socket continua
    // autenticado com o token velho e cai em loop de reconnect quando expira.
    // O contador volta a zero: as instâncias vivas se registram de novo ao
    // reconectar (o efeito de cada consumidor depende do token).
    if (globalSocket && connectedAccessToken !== currentToken) {
      console.log('[TrackingWebSocket] Token mudou, recriando conexão');
      connectionCount = 0;
      globalSocket.removeAllListeners();
      globalSocket.disconnect();
      globalSocket = null;
      connectedAccessToken = null;
    }

    // Reutilizar o socket global se existir (e o token coincide), MESMO que
    // ainda não esteja conectado: em handshake ou em backoff de reconexão, o
    // socket.io retoma sozinho. Exigir `connected` aqui criava um segundo
    // socket e o primeiro virava órfão, vivo depois do logout. `connect()` no
    // socket existente é inócuo em handshake/backoff e reabre o socket que
    // esgotou as tentativas de reconexão.
    if (globalSocket) {
      if (!globalSocket.connected) globalSocket.connect();
      socketRef.current = globalSocket;
      attach(globalSocket);
      hold();
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
    socketGeneration++;
    socketRef.current = socket;
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

    // Só log: os callbacks de cada consumidor (disconnect, connect_error,
    // localização, rota, serviço, oferta) são anexados por `attach`.
    socket.on('disconnect', (reason) => {
      console.log('[TrackingWebSocket] Desconectado:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[TrackingWebSocket] Erro de conexão:', error.message);
    });

    // Escutar erros
    socket.on('error', (error: { message: string }) => {
      console.error('[TrackingWebSocket] Erro do servidor:', error.message);
    });

    attach(socket);
    hold();
  }, [userAuth?.id, authCredentials?.tenantId, authCredentials?.accessToken, attach, hold]);

  /**
   * Desconectar do WebSocket
   */
  const disconnect = useCallback(() => {
    detachRef.current?.();
    socketRef.current = null;
    if (holdsRef.current === null) return; // idempotente por instância
    const heldCurrent = holdsRef.current === socketGeneration;
    holdsRef.current = null;
    // Referência a um socket já descartado (troca de token) não desconta do atual.
    if (!heldCurrent) return;
    connectionCount = Math.max(0, connectionCount - 1);

    // Só desconectar se for a última referência
    if (connectionCount === 0 && globalSocket) {
      console.log('[TrackingWebSocket] Desconectando socket global');
      globalSocket.removeAllListeners();
      globalSocket.disconnect();
      globalSocket = null;
      connectedAccessToken = null;
    }
  }, []);

  /**
   * Reconectar ao voltar do background: acorda o socket que já existe em vez
   * de criar outro. Só cria (via `connect`) se não houver socket nenhum.
   */
  const reconnect = useCallback(() => {
    if (globalSocket && !globalSocket.connected) globalSocket.connect();
    else if (!globalSocket) connect();
  }, [connect]);

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
    reconnect,
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

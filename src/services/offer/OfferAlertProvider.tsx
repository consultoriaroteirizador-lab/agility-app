import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Modal, Platform, Vibration } from 'react-native';

import { router } from 'expo-router';

import { useUserLocation } from '@/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_hooks/useUserLocation';
import { Box, Button, Text } from '@/components';
import { useFindOneDriver } from '@/domain/agility/driver/useCase';
import {
  activeOffer,
  addOffer,
  dropOffer,
  expiresAtOf,
  pruneExpired,
} from '@/domain/agility/offer/offerStore';
import type { OfferPayload, PendingOffer } from '@/domain/agility/offer/offerStore';
import { useAcceptRouting, useFindBroadcastingRoutings } from '@/domain/agility/routing/useCase';
import { useAppSafeArea } from '@/hooks';
import { useAuthCredentialsService } from '@/services/authCredentials/useAuthCredentialsService';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';

// ─── Formatadores ────────────────────────────────────────────────────────────
// Replicados minimamente de `(tabs)/ofertas/index.tsx` (não exportados de lá).

function formatarDistancia(km: number | null | undefined): string {
  if (!km) return '0 km';
  return `${km.toFixed(1).replace('.', ',')} km`;
}

function formatarTempo(minutos: number | null | undefined): string {
  if (!minutos) return '0min';
  if (minutos < 60) return `${Math.round(minutos)}min`;
  const horas = Math.floor(minutos / 60);
  const mins = Math.round(minutos % 60);
  return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
}

function formatarPreco(valor: number | null | undefined): string {
  if (!valor) return 'R$ 0,00';
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

function formatarTimer(segundos: number): string {
  if (segundos <= 0) return 'Expirada';
  const mins = Math.floor(segundos / 60);
  const secs = segundos % 60;
  if (mins > 0) return `${mins}min ${String(secs).padStart(2, '0')}s`;
  return `${segundos}s`;
}

// ─── Contexto ────────────────────────────────────────────────────────────────

interface OfferAlertContextValue {
  pushOffer: (offer: OfferPayload) => void;
}

const OfferAlertContext = createContext<OfferAlertContextValue>({ pushOffer: () => {} });

export const useOfferAlert = () => useContext(OfferAlertContext);

// ─── Provider ────────────────────────────────────────────────────────────────

/**
 * Popup global de oferta de uberização. Fica montado acima de toda a árvore
 * autenticada para que uma oferta que chegue via WebSocket apareça sobre
 * qualquer tela (não só na tab Ofertas). Ver Task B2a (WS) e B2b (offerStore).
 */
export function OfferAlertProvider({ children }: { children: React.ReactNode }) {
  const { bottom } = useAppSafeArea();
  const { showToast } = useToastService();
  const { userAuth } = useAuthCredentialsService();
  const driverId = userAuth?.driverId;
  const { driver } = useFindOneDriver(driverId);
  const isAvailable = !!driver?.isAvailable;
  const { userLocation } = useUserLocation();
  const { acceptRoutingAsync, isLoading } = useAcceptRouting();

  const [offers, setOffers] = useState<PendingOffer[]>([]);
  const [now, setNow] = useState(() => Date.now());

  // Gating: só empilha oferta se o motorista estiver disponível.
  const pushOffer = useCallback((offer: OfferPayload) => {
    if (!isAvailable) return;
    // Defensivo: normaliza o id caso o backend mande `routingId` em vez de `id`.
    const normalized: OfferPayload = { ...offer, id: offer.id ?? (offer as { routingId?: string }).routingId };
    if (!normalized.id) return;
    setOffers((list) => addOffer(list, normalized, Date.now()));
  }, [isAvailable]);

  // Fallback de polling: enquanto o motorista estiver disponível, busca ofertas
  // em broadcasting periodicamente (o hook faz refetchInterval). Complementa o
  // WebSocket (dedup por id em `addOffer` cobre a sobreposição WS+poll).
  const { routings: broadcastRoutings } = useFindBroadcastingRoutings(
    {
      driverLatitude: userLocation?.coords.latitude,
      driverLongitude: userLocation?.coords.longitude,
    },
    { pollWhileAvailable: isAvailable },
  );

  useEffect(() => {
    (broadcastRoutings ?? []).forEach((r) => pushOffer({
      id: r.id,
      code: r.code ?? undefined,
      offerTime: r.offerTime ?? undefined,
      totalServices: r.totalServices ?? undefined,
      totalDistanceKm: r.totalDistanceKm ?? undefined,
      totalDurationMinutes: r.totalDurationMinutes ?? undefined,
      totalValue: r.totalValue ?? undefined,
    }));
  }, [broadcastRoutings, pushOffer]);

  // Tick de 1s: expira ofertas vencidas e atualiza o contador regressivo.
  // Só roda enquanto houver ofertas na fila, para não churnar em idle.
  useEffect(() => {
    if (offers.length === 0) return;
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      setOffers((list) => pruneExpired(list, t));
    }, 1000);
    return () => clearInterval(timer);
  }, [offers.length]);

  // Se o motorista deixar de estar disponível, descarta a fila inteira: uma
  // oferta pendente não deve continuar visível/aceitável fora de disponibilidade.
  useEffect(() => {
    if (!isAvailable) setOffers([]);
  }, [isAvailable]);

  const current = activeOffer(offers);
  const secondsLeft = current ? Math.max(0, Math.ceil((expiresAtOf(current) - now) / 1000)) : 0;

  // Vibra ao surgir uma nova oferta ativa (som customizado fica para follow-up;
  // o som do sistema já toca via a push em background).
  useEffect(() => {
    if (current?.id) {
      Vibration.vibrate(Platform.OS === 'ios' ? [0, 400, 200, 400] : 600);
    }
  }, [current?.id]);

  const onRecusar = useCallback(() => {
    setOffers((list) => (current ? dropOffer(list, current.id) : list));
  }, [current]);

  const onAceitar = useCallback(async () => {
    if (!current) return;
    const offerId = current.id;
    try {
      await acceptRoutingAsync({
        routingId: offerId,
        payload: {
          driverLatitude: userLocation?.coords.latitude,
          driverLongitude: userLocation?.coords.longitude,
        },
      });
      setOffers((list) => dropOffer(list, offerId));
      showToast({ message: 'Rota aceita com sucesso', type: 'success' });
      router.push('/(auth)/(tabs)');
    } catch (error: unknown) {
      // 409 (já pega por outro motorista) ou qualquer outro erro: a oferta
      // sai da lista e avisamos o motorista via toast.
      setOffers((list) => dropOffer(list, offerId));
      const message = error instanceof Error ? error.message : 'Esta oferta não está mais disponível';
      showToast({ message, type: 'error' });
    }
  }, [current, acceptRoutingAsync, userLocation, showToast]);

  return (
    <OfferAlertContext.Provider value={{ pushOffer }}>
      {children}

      <Modal
        animationType="slide"
        transparent
        visible={!!current && isAvailable}
        onRequestClose={onRecusar}
      >
        <Box flex={1} justifyContent="flex-end" backgroundColor="blackOpaque">
          <Box
            backgroundColor="white"
            borderTopStartRadius="s20"
            borderTopEndRadius="s20"
            padding="y20"
            style={{ paddingBottom: bottom + 16 }}
          >
            {current && (
              <>
                <Box
                  alignSelf="flex-start"
                  borderWidth={measure.m1}
                  borderColor="primary100"
                  borderRadius="s20"
                  px="x12"
                  py="y4"
                  mb="y12"
                >
                  <Text preset="text13" color={secondsLeft <= 0 ? 'redError' : 'primary100'}>
                    Oferta sumirá: {formatarTimer(secondsLeft)}
                  </Text>
                </Box>

                <Text preset="text18" fontWeight="700" color="colorTextPrimary" mb="y4">
                  Nova oferta de rota
                </Text>
                <Text preset="text14" color="gray400" mb="y12">
                  {current.totalServices ?? 0} paradas · {formatarDistancia(current.totalDistanceKm)} · {formatarTempo(current.totalDurationMinutes)}
                </Text>
                <Text preset="text24" color="primary100" fontWeight="700" mb="y20">
                  {formatarPreco(current.totalValue)}
                </Text>

                <Box flexDirection="row" gap="x12">
                  <Button
                    flex={1}
                    preset="outline"
                    title="Recusar"
                    onPress={onRecusar}
                    disabled={isLoading}
                  />
                  <Button
                    flex={1}
                    title="Aceitar"
                    iconName="check-circle"
                    onPress={onAceitar}
                    disabled={isLoading || secondsLeft <= 0}
                  />
                </Box>
              </>
            )}
          </Box>
        </Box>
      </Modal>
    </OfferAlertContext.Provider>
  );
}

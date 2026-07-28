import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Vibration } from 'react-native';

import { router } from 'expo-router';

import { useUserLocation } from '@/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_hooks/useUserLocation';
import { Box, Button, Text, TextButton } from '@/components';
import { useFindOneDriver } from '@/domain/agility/driver/useCase';
import {
  activeOffer,
  addOffer,
  applySilenced,
  dropOffer,
  expiresAtOf,
  forgetSilenced,
  pruneExpired,
  rememberSilenced,
} from '@/domain/agility/offer/offerStore';
import type { OfferPayload, PendingOffer, SilencedOffers } from '@/domain/agility/offer/offerStore';
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
  // Memória das ofertas que o motorista já dispensou neste aparelho — por
  // "Ver detalhes" ou por "Recusar". Um conceito só: dispensar é parar de
  // alertar. Vive FORA da fila de propósito: a fila é volátil (ver o efeito
  // de disponibilidade), a memória não.
  const [silenced, setSilenced] = useState<SilencedOffers>({});
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
  // Só roda enquanto houver o que envelhecer — fila OU memória —, para não
  // churnar em idle. A memória entra no gate porque ela precisa envelhecer
  // justamente quando a fila está vazia (motorista indisponível).
  const silencedCount = Object.keys(silenced).length;
  useEffect(() => {
    if (offers.length === 0 && silencedCount === 0) return;
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      setOffers((list) => pruneExpired(list, t));
    }, 1000);
    return () => clearInterval(timer);
  }, [offers.length, silencedCount]);

  // Esquece as ofertas dispensadas cujo prazo passou (e renova o prazo das que
  // seguem na fila), para a memória não crescer sem limite. Não referencia
  // `silenced`: o updater lê a memória fresca e `forgetSilenced` devolve a
  // mesma referência quando nada muda, então o React corta o re-render e isto
  // não vira laço.
  useEffect(() => {
    setSilenced((memory) => forgetSilenced(memory, offers, now));
  }, [offers, now]);

  // Se o motorista deixar de estar disponível, descarta a fila inteira: uma
  // oferta pendente não deve continuar visível/aceitável fora de disponibilidade.
  // A memória do que ele já dispensou sobrevive de propósito — senão a mesma
  // oferta reentraria pelo próximo poll sem o silêncio, e o alerta reabriria
  // por cima da tela de detalhe que ele foi justamente ver.
  useEffect(() => {
    if (!isAvailable) setOffers([]);
  }, [isAvailable]);

  // Fila efetiva: a memória reaplica o silêncio às ofertas que reentraram.
  const fila = useMemo(() => applySilenced(offers, silenced), [offers, silenced]);
  const current = activeOffer(fila);
  const secondsLeft = current ? Math.max(0, Math.ceil((expiresAtOf(current) - now) / 1000)) : 0;

  // Vibra ao surgir uma nova oferta ativa (som customizado fica para follow-up;
  // o som do sistema já toca via a push em background).
  useEffect(() => {
    if (current?.id) {
      Vibration.vibrate(Platform.OS === 'ios' ? [0, 400, 200, 400] : 600);
    }
  }, [current?.id]);

  // Recusar é LOCAL POR DECISÃO DO PRODUTO, não por falta de endpoint: vale só
  // neste aparelho, a rota segue em broadcasting para os outros motoristas e
  // continua visível na aba Ofertas deste (que é alimentada pela query de
  // broadcasting, não por esta fila). O backend tem um `RespondOfferDto` órfão,
  // com campo de motivo, desenhado e nunca ligado — NÃO o ligue aqui achando
  // que é um esquecimento; recusar não notifica o backend de propósito.
  //
  // Reusa a mesma memória do "Ver detalhes": dispensar é dispensar. Sem ela, o
  // poll de 25s reempilhava a oferta e o alerta voltava — o sistema insistindo
  // no que o motorista acabou de recusar.
  const onRecusar = useCallback(() => {
    if (!current) return;
    setSilenced((memory) => rememberSilenced(memory, current, Date.now()));
  }, [current]);

  // "Ver detalhes": fecha o alerta SEM recusar. A oferta é silenciada (segue na
  // fila, válida e aceitável) e o motorista decide na tela de detalhe, que já
  // tem mapa, paradas, Aceitar e Recusar. Sem o silêncio, o polling de
  // `useFindBroadcastingRoutings` reempilharia a oferta e o popup voltaria por
  // cima da própria tela que ele foi ver. Registrar na memória — e não marcar a
  // fila — é o que faz o silêncio sobreviver ao esvaziamento por disponibilidade.
  const onVerDetalhes = useCallback(() => {
    if (!current) return;
    const offerId = current.id;
    setSilenced((memory) => rememberSilenced(memory, current, Date.now()));
    router.push(`/(auth)/(tabs)/ofertas/${offerId}`);
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

                {/* Terceira ação, secundária: não compete com Aceitar/Recusar. */}
                <Box alignItems="center" mt="y16">
                  <TextButton
                    preset="textPrimaryUnderline"
                    title="Ver detalhes"
                    onPress={onVerDetalhes}
                    disabled={isLoading}
                    hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
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

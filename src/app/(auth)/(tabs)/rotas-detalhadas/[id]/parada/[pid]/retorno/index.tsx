import { useCallback, useMemo, useState } from 'react';
import { TextInput } from 'react-native';

import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  ActivityIndicator,
  Box,
  Button,
  LocalIcon,
  ScreenBase,
  Text,
  TouchableOpacityBox,
} from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { Icon } from '@/components/Icon/Icon';
import { MultiPhotoPicker } from '@/components/MultiPhotoPicker';
import { useCompleteRouting, useGetRoutingMapData, useReturnManifest } from '@/domain/agility/routing/useCase';
import type { ReturnChecklistItem } from '@/domain/agility/service/dto/request/service-completion-details.request';
import { uploadMultipleServicePhotos } from '@/domain/agility/service/serviceUploadUtils';
import { useCompleteServiceWithDetails, useFindOneService } from '@/domain/agility/service/useCase';
import { useRouteDirections } from '@/domain/ors/useRouteDirections';
import { KEY_ROUTINGS, KEY_SERVICES } from '@/domain/queryKeys';
import { formatHHmm } from '@/functions';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';

import { splitRouteAtLastStop } from '../_components/shared/geo';
import { Map, MapPoint } from '../_components/shared/Map';
import { useStopActions, useUserLocation } from '../_hooks';
import { getCurrentCoords } from '../_hooks/getCurrentCoords';

/**
 * Tela da parada de RETORNO (CD/origem).
 *
 * Fluxo: "Cheguei no retorno" (start-attendance → IN_ATTENDANCE) → conferência
 * das devoluções/itens não entregues (checklist do manifesto) → "Concluir
 * retorno" (complete). Concluir a rota fica liberado só depois disso (gate no
 * backend + a parada de retorno segura o "nenhum andamento" na lista).
 *
 * O retorno costuma ter só lat/long (sem Address cadastrado), então o endereço e
 * o mapa vêm do ponto de retorno do map-data (mapData.return / origin).
 */
/** Status terminal de parada (concluída/falha/cancelada). */
function isTerminalStatus(st?: string | null): boolean {
  return ['COMPLETED', 'FAILED', 'CANCELED', 'CANCELLED'].includes(String(st ?? '').toUpperCase());
}

/**
 * Fases de custódia (cross-docking) em que o pedido JÁ foi entregue no CD de
 * destino (handoff feito) — passou a ser responsabilidade do CD, não do
 * motorista. Conta como "concluído p/ o trecho" no gate do retorno MESMO com
 * status ainda PENDING (o pedido recebido segue no last-mile, então nunca vira
 * COMPLETED na transferência). AT_ORIGIN/IN_TRANSIT são pré-handoff (ainda com o
 * motorista) e EXCEPTION é desvio — nenhum conta como entregue, então o gate
 * segue bloqueando se o handoff não terminou.
 */
const HANDED_OFF_PHASES = new Set(['AT_HUB', 'OUT_FOR_DELIVERY', 'DELIVERED']);
function isHandedOff(phase?: string | null): boolean {
  return HANDED_OFF_PHASES.has(String(phase ?? '').toUpperCase());
}

/** Rótulo do motivo do retorno (separado da quantidade). Vazio quando não há. */
function reasonLabel(reason?: string | null): string {
  switch (String(reason ?? '').toUpperCase()) {
    case 'FAILED': return ' · Falha na entrega';
    case 'PARTIAL': return ' · Entrega parcial';
    case 'MISSING': return ' · Item ausente';
    case 'DAMAGED': return ' · Danificado';
    case 'REFUSED': return ' · Recusado';
    default: return '';
  }
}

export default function RetornoScreen() {
  const params = useLocalSearchParams<{ id: string; pid: string }>();
  const routeId = params.id as string;
  const serviceId = params.pid as string;

  const { service, isLoading } = useFindOneService(serviceId || '');
  const { items, isLoading: isLoadingManifest } = useReturnManifest(routeId || '');
  const { mapData, services } = useGetRoutingMapData(routeId || '');
  const { userLocation } = useUserLocation();

  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToastService();

  // "Cheguei no retorno" (start-attendance) continua vindo do useStopActions.
  const { handleStartAttendance, isStartingAttendance } = useStopActions({
    serviceId,
    routeId,
    serviceStatus: service?.status,
  });

  // Conclusão do retorno: persiste a conferência (+ foto opcional) via completion-details.
  // A navegação é decidida no handler (finaliza a rota OU volta às paradas).
  const { completeServiceWithDetailsAsync, isLoading: isCompleting } = useCompleteServiceWithDetails({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, serviceId] });
      void queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, 'routing', routeId] });
    },
    onError: () => {
      showToast({ message: 'Não foi possível concluir o retorno. Tente novamente.', type: 'error' });
    },
  });

  // Como o retorno é a ÚLTIMA parada, concluí-lo finaliza a rota: encadeia o
  // complete da routing e vai pra home (sem voltar pro botão "Concluir Rota").
  const { completeRouting, isLoading: isCompletingRouting } = useCompleteRouting({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [KEY_ROUTINGS] });
      router.replace('/(auth)/(tabs)');
    },
    onError: () => {
      // Rota não pôde fechar agora (ex.: outra pendência) — volta às paradas.
      showToast({ message: 'Retorno concluído. Finalize a rota na lista de paradas.', type: 'success' });
      setTimeout(() => router.back(), 400);
    },
  });

  const hasArrived = !!(service?.isInAttendance || service?.status === 'IN_ATTENDANCE');

  // Trava do retorno: por ser a ÚLTIMA parada, o check-in ("Cheguei no retorno")
  // só libera quando todas as demais paradas estão terminais. Espelha a trava
  // das paradas normais. (Se já chegou, mantém liberado para concluir.)
  const othersDone = useMemo(() => {
    const others = (services ?? []).filter(
      (s) => String(s.serviceType ?? '').toUpperCase() !== 'RETURN',
    );
    // Pedido "concluído p/ o trecho" = terminal (COMPLETED/FAILED/CANCELED — inclui
    // os NÃO recebidos, que voltam) OU já entregue no CD (custódia AT_HUB+). Assim o
    // retorno libera pós-handoff, sem confundir "recebido no CD" (PENDING/AT_HUB) com
    // "ainda pendente com o motorista".
    return others.every((s) => isTerminalStatus(s.status) || isHandedOff(s.custodyPhase));
  }, [services]);
  const canCheckIn = hasArrived || othersDone;

  // Foto(s) opcional(is) da carga descarregada no CD.
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Ponto de retorno: quando volta à origem, usa a origem; senão o return.
  const returnPoint = useMemo(() => {
    const info = mapData?.returnToOrigin ? mapData?.origin : mapData?.return;
    if (info?.latitude == null || info?.longitude == null) return null;
    return { latitude: info.latitude, longitude: info.longitude, address: info.address ?? null };
  }, [mapData]);

  // Última parada real (com coordenadas) — origem do trecho até o retorno.
  const lastStop = useMemo(() => {
    const sorted = (services ?? [])
      .filter(s => s.latitude != null && s.longitude != null && String(s.serviceType ?? '').toUpperCase() !== 'RETURN')
      .sort((a, b) => (a.sequenceOrder ?? 999) - (b.sequenceOrder ?? 999));
    return sorted[sorted.length - 1] ?? null;
  }, [services]);

  // Pinos + trecho (última parada → retorno). Recorta do traçado global; sem
  // geometria, cai para linha reta entre os dois pontos.
  const { points, coordinateSegments } = useMemo(() => {
    if (!returnPoint) return { points: [] as MapPoint[], coordinateSegments: undefined };

    const pts: MapPoint[] = [];
    if (lastStop) {
      pts.push({
        id: 'last-stop',
        latitude: lastStop.latitude,
        longitude: lastStop.longitude,
        title: 'Última parada',
        color: '#9CA3AF',
        size: 30,
      });
    }
    pts.push({
      id: 'return',
      latitude: returnPoint.latitude,
      longitude: returnPoint.longitude,
      title: 'Retorno',
      color: '#EF4444',
      label: 'F',
    });

    let segs: number[][][] | undefined;
    if (lastStop) {
      const split = splitRouteAtLastStop(mapData?.geometry, {
        latitude: lastStop.latitude,
        longitude: lastStop.longitude,
      });
      if (split && split.returnLeg.length > 1) {
        segs = [split.returnLeg];
      } else {
        segs = [[
          [lastStop.longitude, lastStop.latitude],
          [returnPoint.longitude, returnPoint.latitude],
        ]];
      }
    }

    return { points: pts, coordinateSegments: segs };
  }, [returnPoint, lastStop, mapData?.geometry]);

  // Traçado de estrada do retorno (última parada → CD) via ORS ao vivo. O
  // `mapData.geometry` costuma ser o trajeto de ida (ex.: CD1→CD2 na malha), sem
  // o trecho de volta — por isso a linha saía reta. Com ORS, segue as ruas;
  // fallback = os `coordinateSegments` (linha reta) enquanto o ORS não responde.
  const roadGeometry = useRouteDirections(
    lastStop ? { latitude: lastStop.latitude, longitude: lastStop.longitude } : null,
    returnPoint ? { latitude: returnPoint.latitude, longitude: returnPoint.longitude } : null,
  );

  // Pedidos que voltam (transferência de malha): serviços FAILED do trecho que
  // NÃO têm material no manifesto. Regra dedupe: se o serviço já aparece como
  // material (last-mile), NÃO vira card de pedido — evita duplicar. No transfer,
  // o pedido falho não tem material → aparece aqui.
  const pedidosVolta = useMemo(() => {
    return (services ?? []).filter((s) => {
      const st = String(s.status ?? '').toUpperCase();
      const isReturn = String(s.serviceType ?? '').toUpperCase() === 'RETURN';
      const jaNoManifesto = items.some((it) => it.serviceId === s.id);
      return st === 'FAILED' && !isReturn && !jaNoManifesto;
    });
  }, [services, items]);
  const [pedidoConferred, setPedidoConferred] = useState<Record<string, boolean>>({});
  const togglePedido = useCallback((id: string) => {
    setPedidoConferred((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Conferência: cada item do manifesto é marcado pelo motorista. Quando há
  // itens, todos precisam estar conferidos antes de concluir. Pedidos falhos
  // (transferência de malha) entram no mesmo gate.
  const [conferred, setConferred] = useState<Record<number, boolean>>({});
  // Quantidade recebida no CD por item (string do input; vazio = quantidade cheia).
  const [received, setReceived] = useState<Record<number, string>>({});
  const allConferred = useMemo(
    () =>
      (items.length === 0 || items.every((_, idx) => conferred[idx])) &&
      pedidosVolta.every((p) => pedidoConferred[p.id]),
    [items, conferred, pedidosVolta, pedidoConferred],
  );

  const toggle = useCallback((idx: number) => {
    setConferred((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }, []);

  // Quantidade recebida efetiva (clampada em [0, esperado]); vazio = cheio.
  const receivedQty = useCallback((idx: number, expected: number): number => {
    const raw = received[idx];
    const parsed = raw != null && raw !== '' ? Number(raw) : expected;
    if (!Number.isFinite(parsed)) return expected;
    return Math.max(0, Math.min(expected, parsed));
  }, [received]);

  // Conclui o retorno: monta o checklist conferido, sobe as fotos (se houver) e
  // finaliza via completion-details (persiste em services.return_checklist).
  const handleConcluirRetorno = useCallback(async () => {
    if (submitting || isCompleting) return;
    setSubmitting(true);
    try {
      const returnChecklist: ReturnChecklistItem[] = items.map((item, idx) => ({
        material: item.material,
        serviceId: item.serviceId,
        serviceCode: item.serviceCode,
        quantity: item.quantity,
        unit: item.unit,
        origin: item.origin,
        reason: item.reason,
        received: receivedQty(idx, Number(item.quantity ?? 0)),
        checked: !!conferred[idx],
      }));

      let photoProof: string | undefined;
      if (photos.length > 0) {
        const urls = await uploadMultipleServicePhotos(photos, serviceId, 'before');
        const joined = urls.filter(Boolean).join(',');
        if (joined) photoProof = joined;
      }

      const coords = await getCurrentCoords();

      await completeServiceWithDetailsAsync({
        id: serviceId,
        details: {
          returnChecklist,
          ...(photoProof ? { photoProof } : {}),
          ...(coords ? { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy } : {}),
        },
      });

      // Retorno é a última parada → finaliza a rota direto (sem voltar pro botão
      // "Concluir Rota"). Só encadeia se as demais paradas já estão terminais;
      // caso contrário, volta às paradas (cenário fora de ordem).
      if (othersDone) {
        completeRouting(routeId); // onSuccess: invalida + vai pra home; onError: volta às paradas
      } else {
        setTimeout(() => router.back(), 300);
      }
    } catch {
      showToast({ message: 'Não foi possível concluir o retorno. Tente novamente.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }, [submitting, isCompleting, items, conferred, receivedQty, photos, serviceId, othersDone, routeId, completeServiceWithDetailsAsync, completeRouting, router, showToast]);

  // Endereço do retorno: do ponto de retorno (quando cadastrado); senão um
  // rótulo padrão. NUNCA mostra lat/long cru no cabeçalho.
  const address = returnPoint?.address || 'CD de origem';
  // Fallback vazio (não '--:--') p/ o guard `eta ?` esconder quando não há ETA.
  const eta = formatHHmm(service?.estimatedArrival, '');

  if (isLoading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" px="x16" py="y32">
        <ActivityIndicator />
        <Text mt="y16">Carregando retorno...</Text>
      </Box>
    );
  }

  // Enquanto finaliza (sobe foto → conclui retorno → fecha a rota), mostra um
  // estado único de "finalizando" para evitar o flicker da tela revertendo ao
  // "Cheguei no retorno" (o status vira COMPLETED e hasArrived cai) antes de navegar.
  if (submitting || isCompleting || isCompletingRouting) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" px="x16" py="y32">
        <ActivityIndicator />
        <Text mt="y16">Finalizando rota...</Text>
      </Box>
    );
  }

  return (
    <ScreenBase
      scrollable
      buttonLeft={<ButtonBack />}
      title={
        <Text preset="text16" fontWeightPreset="semibold" color="colorTextPrimary" textAlign="center">
          Retorno
        </Text>
      }
    >
      <Box flex={1} pt="y8" gap="y16">
        {/* Cabeçalho do retorno: card de destino, no mesmo padrão do CD na
            visão de transferência (quadrado colorido + ícone casinha). */}
        <Box
          backgroundColor="gray50"
          borderWidth={1}
          borderColor="gray200"
          borderRadius="s12"
          p="y12"
          flexDirection="row"
          alignItems="flex-start"
        >
          <Box
            width={measure.m36}
            height={measure.m36}
            borderRadius="s20"
            justifyContent="center"
            alignItems="center"
            backgroundColor="secondary100"
          >
            <Icon name="warehouse" size={measure.m20} color="white" />
          </Box>
          <Box flex={1} marginLeft="x12">
            <Text preset="text12" color="gray600">
              Retorno ao CD de origem{eta ? ` · previsão ${eta}` : ''}
            </Text>
            <Text preset="text14" fontWeightPreset="bold" color="colorTextPrimary" marginTop="y2">
              {address}
            </Text>
            <Text preset="text12" color="gray500" marginTop="y4">
              Descarregue e confira as devoluções e os itens não entregues neste ponto para finalizar a rota.
            </Text>
          </Box>
        </Box>

        {/* Mapa do retorno (trecho última parada → CD). Some após o check-in
            ("Cheguei no retorno") — já chegou, o trajeto não serve mais. */}
        {returnPoint && !hasArrived && (
          <Box borderRadius="s12" overflow="hidden">
            <Map
              points={points}
              geometries={roadGeometry ? [roadGeometry] : undefined}
              coordinateSegments={roadGeometry ? undefined : coordinateSegments}
              routeColor="#EF4444"
              routeWidth={4}
              addressText={address}
              customerName="Retorno"
              userLocation={userLocation}
            />
          </Box>
        )}

        {/* Conferência de retorno: pedidos falhos (transferência) + materiais (last-mile) */}
        <Box gap="y8">
          <Text preset="text14" fontWeightPreset="bold" color="gray600">
            Conferência de retorno
          </Text>

          {/* Trava visual: a conferência só fica clicável após o check-in. */}
          {!hasArrived && (items.length > 0 || pedidosVolta.length > 0) ? (
            <Box flexDirection="row" alignItems="center" gap="x8" backgroundColor="secondary10" p="y12" borderRadius="s12">
              <LocalIcon iconName="location" size={measure.m20} color="secondary100" />
              <Text preset="text12" color="gray600" flex={1}>
                Toque em &quot;Cheguei no retorno&quot; para liberar a conferência dos itens.
              </Text>
            </Box>
          ) : null}

          {isLoadingManifest ? (
            <Box py="y16" alignItems="center">
              <ActivityIndicator />
            </Box>
          ) : items.length === 0 && pedidosVolta.length === 0 ? (
            <Box backgroundColor="gray50" p="y12" borderRadius="s12">
              <Text preset="text14" color="gray600">
                Nenhum item de devolução nesta rota. Confirme a chegada para concluir.
              </Text>
            </Box>
          ) : (
            <>
              {/* Pedidos falhos (transferência de malha): card check-only, sem quantidade. */}
              {pedidosVolta.map((p) => {
                const pedidoChecked = !!pedidoConferred[p.id];
                return (
                  <TouchableOpacityBox
                    key={p.id}
                    flexDirection="row"
                    alignItems="center"
                    gap="x12"
                    backgroundColor={pedidoChecked ? 'primary10' : 'gray50'}
                    p="y12"
                    borderRadius="s12"
                    borderWidth={1}
                    borderColor={pedidoChecked ? 'primary100' : 'gray100'}
                    opacity={hasArrived ? 1 : 0.5}
                    disabled={!hasArrived}
                    onPress={() => togglePedido(p.id)}
                  >
                    <Icon
                      name={pedidoChecked ? 'check-circle' : 'inventory-2'}
                      size={measure.m20}
                      color={pedidoChecked ? 'primary100' : 'gray400'}
                    />
                    <Box flex={1}>
                      <Text preset="text14" fontWeightPreset="semibold" color="colorTextPrimary">
                        {p.title || 'Pedido'}
                      </Text>
                      <Text preset="text12" color="colorTextError">
                        Não recebido no CD
                      </Text>
                    </Box>
                  </TouchableOpacityBox>
                );
              })}

              {items.map((item, idx) => {
                const checked = !!conferred[idx];
                const expected = Number(item.quantity ?? 0);
                const recvValue = received[idx] ?? String(expected);
                return (
                  <Box
                    key={`${item.serviceId}-${idx}`}
                    flexDirection="row"
                    alignItems="center"
                    gap="x12"
                    backgroundColor={checked ? 'primary10' : 'gray50'}
                    p="y12"
                    borderRadius="s12"
                    borderWidth={1}
                    borderColor={checked ? 'primary100' : 'gray100'}
                    opacity={hasArrived ? 1 : 0.5}
                  >
                    {/* Toque na área do item (ícone + texto) alterna o check.
                        Só o input de quantidade fica fora do alvo de toque. */}
                    <TouchableOpacityBox
                      flex={1}
                      flexDirection="row"
                      alignItems="center"
                      gap="x12"
                      disabled={!hasArrived}
                      onPress={() => toggle(idx)}
                    >
                      <LocalIcon
                        iconName={checked ? 'check' : 'box'}
                        size={measure.m20}
                        color={checked ? 'primary100' : 'gray400'}
                      />
                      <Box flex={1}>
                        <Text preset="text14" fontWeightPreset="semibold" color="colorTextPrimary">
                          {item.material}
                        </Text>
                        <Text preset="text12" color="gray600">
                          {item.origin === 'PICKUP' ? 'Devolução/coleta' : `Não entregue${reasonLabel(item.reason)}`}
                          {item.serviceCode ? ` · #${item.serviceCode}` : ''}
                        </Text>
                      </Box>
                    </TouchableOpacityBox>

                    {/* Quantidade recebida no CD (default = esperado, editável p/ baixo) */}
                    <Box alignItems="flex-end" gap="y2">
                      <Box
                        flexDirection="row"
                        alignItems="center"
                        gap="x4"
                        borderWidth={1}
                        borderColor="gray200"
                        borderRadius="s8"
                        paddingHorizontal="x8"
                        paddingVertical="y4"
                        backgroundColor="white"
                      >
                        <TextInput
                          value={recvValue}
                          onChangeText={(t) => setReceived((prev) => ({ ...prev, [idx]: t.replace(/[^\d.]/g, '') }))}
                          keyboardType="numeric"
                          editable={hasArrived}
                          style={{ minWidth: 26, textAlign: 'right', padding: 0, color: '#111827' }}
                        />
                        <Text preset="text12" color="gray500">
                          / {expected}{item.unit ? ` ${item.unit}` : ''}
                        </Text>
                      </Box>
                      <Text preset="text12" color="gray500">recebido</Text>
                    </Box>
                  </Box>
                );
              })}
            </>
          )}
        </Box>

        {/* Comprovante (opcional): mesmo componente de anexo do fluxo de entrega */}
        {hasArrived ? (
          <MultiPhotoPicker
            photos={photos}
            onPhotosChange={setPhotos}
            label="Comprovante (opcional)"
            maxPhotos={5}
            allowCamera
            photoSize={88}
          />
        ) : null}

        {/* Ações */}
        <Box gap="y12" pb="y24" alignItems='center'>
          {!hasArrived ? (
            <>
              <Button
                title={isStartingAttendance ? 'Confirmando...' : 'Cheguei no retorno'}
                onPress={handleStartAttendance}
                disabled={isStartingAttendance || !canCheckIn}
              />
              {!canCheckIn ? (
                <Text preset="text12" color="gray500" textAlign="center">
                  Conclua as demais paradas antes de ir ao retorno.
                </Text>
              ) : null}
            </>
          ) : (
            <Button
              title={(isCompleting || submitting || isCompletingRouting) ? 'Concluindo...' : 'Concluir retorno e finalizar rota'}
              onPress={handleConcluirRetorno}
              disabled={isCompleting || submitting || isCompletingRouting || !allConferred}
            />
          )}
          {hasArrived && !allConferred ? (
            <Text preset="text12" color="gray500" textAlign="center">
              Confira todos os itens para concluir o retorno.
            </Text>
          ) : null}
        </Box>
      </Box>
    </ScreenBase>
  );
}

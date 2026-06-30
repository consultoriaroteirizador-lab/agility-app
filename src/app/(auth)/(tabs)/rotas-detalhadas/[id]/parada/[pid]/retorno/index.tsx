import { useCallback, useMemo, useState } from 'react';

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
import { MultiPhotoPicker } from '@/components/MultiPhotoPicker';
import { useCompleteRouting, useGetRoutingMapData, useReturnManifest } from '@/domain/agility/routing/useCase';
import type { ReturnChecklistItem } from '@/domain/agility/service/dto/request/service-completion-details.request';
import { uploadMultipleServicePhotos } from '@/domain/agility/service/serviceUploadUtils';
import { useCompleteServiceWithDetails, useFindOneService } from '@/domain/agility/service/useCase';
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
    return others.every((s) => isTerminalStatus(s.status));
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

  // Conferência: cada item do manifesto é marcado pelo motorista. Quando há
  // itens, todos precisam estar conferidos antes de concluir.
  const [conferred, setConferred] = useState<Record<number, boolean>>({});
  const allConferred = useMemo(
    () => items.length === 0 || items.every((_, idx) => conferred[idx]),
    [items, conferred],
  );

  const toggle = useCallback((idx: number) => {
    setConferred((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }, []);

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
  }, [submitting, isCompleting, items, conferred, photos, serviceId, othersDone, routeId, completeServiceWithDetailsAsync, completeRouting, router, showToast]);

  // Endereço do retorno: do ponto de retorno (quando cadastrado); senão as
  // coordenadas do CD; senão um rótulo padrão.
  const address =
    returnPoint?.address ??
    (returnPoint ? `${returnPoint.latitude.toFixed(5)}, ${returnPoint.longitude.toFixed(5)}` : 'Retorno ao CD/origem');
  const eta = formatHHmm(service?.estimatedArrival);

  if (isLoading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" px="x16" py="y32">
        <ActivityIndicator />
        <Text mt="y16">Carregando retorno...</Text>
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
        {/* Cabeçalho do retorno */}
        <Box backgroundColor="secondary10" p="y12" borderRadius="s12" gap="y8">
          <Box flexDirection="row" alignItems="center" gap="x8">
            <LocalIcon iconName="location" size={measure.m20} color="secondary100" />
            <Box flex={1}>
              <Text preset="text12" color="gray600">
                Última parada {eta ? `· previsão ${eta}` : ''}
              </Text>
              <Text preset="text14" fontWeightPreset="semibold" color="colorTextPrimary">
                {address}
              </Text>
            </Box>
          </Box>
          <Text preset="text13" color="gray600">
            Descarregue e confira as devoluções e os itens não entregues neste ponto para finalizar a rota.
          </Text>
        </Box>

        {/* Mapa do retorno (trecho última parada → CD) */}
        {returnPoint && (
          <Map
            points={points}
            coordinateSegments={coordinateSegments}
            routeColor="#EF4444"
            routeWidth={4}
            addressText={address}
            customerName="Retorno"
            userLocation={userLocation}
          />
        )}

        {/* Conferência de devoluções */}
        <Box gap="y8">
          <Text preset="text14" fontWeightPreset="bold" color="gray600">
            Conferência de devoluções
          </Text>

          {/* Trava visual: a conferência só fica clicável após o check-in. */}
          {!hasArrived && items.length > 0 ? (
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
          ) : items.length === 0 ? (
            <Box backgroundColor="gray50" p="y12" borderRadius="s12">
              <Text preset="text14" color="gray600">
                Nenhum item de devolução nesta rota. Confirme a chegada para concluir.
              </Text>
            </Box>
          ) : (
            items.map((item, idx) => {
              const checked = !!conferred[idx];
              return (
                <TouchableOpacityBox
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
                      {item.quantity}
                      {item.unit ? ` ${item.unit}` : ''}
                      {' · '}
                      {item.origin === 'PICKUP' ? 'Devolução/coleta' : `Não entregue${reasonLabel(item.reason)}`}
                      {item.serviceCode ? ` · #${item.serviceCode}` : ''}
                    </Text>
                  </Box>
                </TouchableOpacityBox>
              );
            })
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

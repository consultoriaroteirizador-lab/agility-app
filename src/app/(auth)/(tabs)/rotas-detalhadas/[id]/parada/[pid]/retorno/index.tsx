import { useCallback, useMemo, useState } from 'react';
import { TextInput } from 'react-native';

import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ActivityIndicator, Box, Button, LocalIcon, ScreenBase, Text, TouchableOpacityBox, ServiceFlowTheme } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { Icon } from '@/components/Icon/Icon';
import { MultiPhotoPicker } from '@/components/MultiPhotoPicker';
import { useFindAllDistributionCenters } from '@/domain/agility/distribution-center/useCase';
import { useCompleteRouting, useFindOneRouting, useGetRoutingMapData, usePendingReturns, useReturnManifest } from '@/domain/agility/routing/useCase';
import { uploadMultipleServicePhotos } from '@/domain/agility/service/serviceUploadUtils';
import { useCompleteServiceWithDetails, useFindOneService } from '@/domain/agility/service/useCase';
import { useRouteDirections } from '@/domain/ors/useRouteDirections';
import { KEY_ROUTINGS, KEY_SERVICES } from '@/domain/queryKeys';
import { formatHHmm } from '@/functions';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';

import { useIsFieldServiceRoute } from '../../../../../_rotas/hooks';
import { splitRouteAtLastStop } from '../_components/shared/geo';
import { Map, MapPoint } from '../_components/shared/Map';
import { useStopActions, useUserLocation } from '../_hooks';
import { getCurrentCoords } from '../_hooks/getCurrentCoords';
import { montarReturnChecklist } from '../_utils/returnChecklist';
import { othersConcluidos } from '../_utils/returnGate';

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

function RetornoContent() {
  const params = useLocalSearchParams<{ id: string; pid: string }>();
  const routeId = params.id as string;
  const serviceId = params.pid as string;

  const { service, isLoading } = useFindOneService(serviceId || '');
  const { items, isLoading: isLoadingManifest } = useReturnManifest(routeId || '');
  // `alwaysFresh`: é daqui que sai o `othersDone` — a trava do "Cheguei no
  // retorno". Decidir por cache velho deixava o botão morto depois de concluir
  // todas as paradas (a lista, que lê /services, já mostrava tudo concluído).
  const { mapData, services } = useGetRoutingMapData(routeId || '', { alwaysFresh: true });
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

  // CD da devolução e quem recebeu: o CD de retorno da rota vem sugerido, mas o
  // motorista pode ter deixado a carga em OUTRO CD (ex.: falhou numa cidade que
  // tem CD próprio). Os dois são opcionais — sem CD o backend fecha a tentativa
  // sem gravar custódia, e sem recebedor ele usa o nome do motorista.
  // A rota é lida aqui (e não mais abaixo) porque o `othersDone` depende do
  // `legType` dela.
  const { routing } = useFindOneRouting(routeId || '');
  const { distributionCenters } = useFindAllDistributionCenters({ activeOnly: true });
  const [cdEscolhido, setCdEscolhido] = useState<string | null>(null);
  const [recebedor, setRecebedor] = useState('');
  const cdDaDevolucao = cdEscolhido ?? routing?.returnFacilityId ?? null;

  // Trava do retorno: por ser a ÚLTIMA parada, o check-in ("Cheguei no retorno")
  // só libera quando todas as demais paradas estão terminais. Espelha a trava
  // das paradas normais. (Se já chegou, mantém liberado para concluir.)
  // Pedido "concluído p/ o trecho" = terminal (COMPLETED/FAILED/CANCELED — inclui
  // os NÃO recebidos, que voltam) OU já entregue no CD. A fase AT_HUB só vale como
  // entregue em perna de MALHA: em rota comum ela agora marca também o pedido
  // devolvido, que não pode liberar o retorno sozinho.
  const othersDone = useMemo(
    () => othersConcluidos(services, routing?.legType),
    [services, routing?.legType],
  );
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

  // Pedidos que voltam: quem diz é o BACKEND, pelas tentativas de devolução
  // pendentes da rota. Antes isto era deduzido aqui ("FAILED ainda na rota"), e
  // o pedido CANCELADO devolvido nunca aparecia — ele sai da rota no mesmo gesto
  // do cancelamento. Regra de dedupe mantida: se o serviço já aparece como
  // material do manifesto (last-mile), NÃO vira card de pedido.
  const { pendentes: pendentesDoBackend } = usePendingReturns(routeId || '');
  const pedidosVolta = useMemo(
    () => pendentesDoBackend.filter((p) => !items.some((it) => it.serviceId === p.serviceId)),
    [pendentesDoBackend, items],
  );
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
      pedidosVolta.every((p) => pedidoConferred[p.serviceId]),
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
      const returnChecklist = montarReturnChecklist({
        items,
        conferred,
        receivedQty,
        pendentes: pedidosVolta,
        pedidoConferred,
      });

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
          // Spread condicional, não `?? null`: `returnFacilityId` é @IsUUID() no
          // backend, então null ou string vazia derrubaria a conclusão com 400.
          ...(cdDaDevolucao ? { returnFacilityId: cdDaDevolucao } : {}),
          ...(recebedor.trim() ? { receivedBy: recebedor.trim() } : {}),
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
  }, [submitting, isCompleting, items, conferred, receivedQty, pedidosVolta, pedidoConferred, cdDaDevolucao, recebedor, photos, serviceId, othersDone, routeId, completeServiceWithDetailsAsync, completeRouting, router, showToast]);

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

          {/* Trava visual: a conferência só fica clicável após o check-in.
              A dica é âmbar, não laranja: em rota de serviço o laranja é a cor da
              própria rota (ver `serviceTheme`) e ela se perderia no fundo. */}
          {!hasArrived && (items.length > 0 || pedidosVolta.length > 0) ? (
            <Box flexDirection="row" alignItems="center" gap="x8" backgroundColor="yellow40" p="y12" borderRadius="s12">
              <LocalIcon iconName="location" size={measure.m20} color="gray800" />
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
              {/* Pendências de devolução da rota: card check-only, sem quantidade. */}
              {pedidosVolta.map((p) => {
                const pedidoChecked = !!pedidoConferred[p.serviceId];
                return (
                  <TouchableOpacityBox
                    key={p.serviceId}
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
                    onPress={() => togglePedido(p.serviceId)}
                  >
                    <Icon
                      name={pedidoChecked ? 'check-circle' : 'inventory-2'}
                      size={measure.m20}
                      color={pedidoChecked ? 'primary100' : 'gray400'}
                    />
                    <Box flex={1}>
                      <Text preset="text14" fontWeightPreset="semibold" color="colorTextPrimary">
                        {p.serviceCode || p.title || 'Pedido'}
                      </Text>
                      <Text preset="text12" color="colorTextError">
                        {p.sideEffect === 'CANCEL_ORDER' ? 'Cancelado — devolver ao CD' : 'Não recebido no CD'}
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

        {/* Onde a carga ficou: CD da devolução (sugerido = CD de retorno da rota)
            e quem recebeu. Os dois são opcionais — sem CD o backend fecha a
            tentativa sem custódia; sem recebedor, assina o nome do motorista. */}
        {hasArrived ? (
          <Box gap="y8">
            <Text preset="text14" fontWeightPreset="bold" color="gray600">
              Onde a carga foi deixada
            </Text>
            {distributionCenters.length > 0 ? (
              <Box flexDirection="row" flexWrap="wrap" gap="x8">
                {distributionCenters.map((cd) => {
                  const selecionado = cdDaDevolucao === cd.id;
                  return (
                    <TouchableOpacityBox
                      key={cd.id}
                      paddingHorizontal="x12"
                      paddingVertical="y8"
                      borderRadius="s8"
                      borderWidth={1}
                      borderColor={selecionado ? 'primary100' : 'gray200'}
                      backgroundColor={selecionado ? 'primary10' : 'white'}
                      onPress={() => setCdEscolhido(cd.id)}
                    >
                      <Text preset="text12" color={selecionado ? 'primary100' : 'gray600'}>
                        {cd.name}
                      </Text>
                    </TouchableOpacityBox>
                  );
                })}
              </Box>
            ) : null}
            <Text preset="text12" color="gray500">
              Quem recebeu no CD (opcional)
            </Text>
            <Box
              borderWidth={1}
              borderColor="gray200"
              borderRadius="s8"
              paddingHorizontal="x12"
              backgroundColor="white"
            >
              <TextInput
                value={recebedor}
                onChangeText={setRecebedor}
                placeholder="Nome de quem recebeu"
                style={{ paddingVertical: 10, color: '#111827' }}
              />
            </Box>
          </Box>
        ) : null}

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
                onPress={() => { void handleStartAttendance(); }}
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

/**
 * A parada de retorno é `RETURN`, então quem manda na cor aqui é a ROTA:
 * numa rota de serviço em campo a tela sai laranja como as demais.
 * Ver `ServiceFlowTheme`.
 */
export default function RetornoScreen() {
  const { id } = useLocalSearchParams<{ id: string; pid: string }>();
  const isFieldService = useIsFieldServiceRoute(id as string);

  return (
    <ServiceFlowTheme isFieldService={isFieldService}>
      <RetornoContent />
    </ServiceFlowTheme>
  );
}

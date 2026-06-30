import { useCallback, useMemo, useState } from 'react';

import { useLocalSearchParams } from 'expo-router';

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
import { formatAddress } from '@/domain/agility/address/dto/response/address.response';
import { useReturnManifest } from '@/domain/agility/routing/useCase';
import { useFindOneService } from '@/domain/agility/service/useCase';
import { formatHHmm } from '@/functions';
import { measure } from '@/theme';

import { useStopActions } from '../_hooks';

/**
 * Tela da parada de RETORNO (CD/origem).
 *
 * Fluxo: "Cheguei no retorno" (start-attendance → IN_ATTENDANCE) → conferência
 * das devoluções/itens não entregues (checklist do manifesto) → "Concluir
 * retorno" (complete). Concluir a rota fica liberado só depois disso (gate no
 * backend + a parada de retorno segura o "nenhum andamento" na lista).
 */
export default function RetornoScreen() {
  const params = useLocalSearchParams<{ id: string; pid: string }>();
  const routeId = params.id as string;
  const serviceId = params.pid as string;

  const { service, isLoading } = useFindOneService(serviceId || '');
  const { items, isLoading: isLoadingManifest } = useReturnManifest(routeId || '');

  const { handleStartAttendance, handleCompleteService, isStartingAttendance, isCompleting } =
    useStopActions({
      serviceId,
      routeId,
      serviceStatus: service?.status,
    });

  const hasArrived = !!(service?.isInAttendance || service?.status === 'IN_ATTENDANCE');

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

  const address =
    formatAddress(service?.address) ??
    service?.address?.formattedAddress ??
    'Retorno ao CD/origem';
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
      <Box flex={1} backgroundColor="white" pt="y8" px="x16" gap="y16">
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

        {/* Conferência de devoluções */}
        <Box gap="y8">
          <Text preset="text14" fontWeightPreset="bold" color="gray600">
            Conferência de devoluções
          </Text>

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
                      {item.origin === 'PICKUP' ? 'Devolução/coleta' : 'Não entregue'}
                      {item.serviceCode ? ` · #${item.serviceCode}` : ''}
                    </Text>
                  </Box>
                </TouchableOpacityBox>
              );
            })
          )}
        </Box>

        {/* Ações */}
        <Box gap="y12" pb="y24">
          {!hasArrived ? (
            <Button
              title={isStartingAttendance ? 'Confirmando...' : 'Cheguei no retorno'}
              onPress={handleStartAttendance}
              disabled={isStartingAttendance}
            />
          ) : (
            <Button
              title={isCompleting ? 'Concluindo...' : 'Concluir retorno'}
              onPress={handleCompleteService}
              disabled={isCompleting || !allConferred}
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

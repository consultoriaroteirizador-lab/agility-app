import { useState } from 'react';

import { ActivityIndicator, Box, Button, ScreenBase, Text } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';

import { useRota } from '../_context/RotaContext';

import { TransferComprovanteStep } from './TransferComprovanteStep';
import { TransferOverviewStep } from './TransferOverviewStep';

type TransferStep = 'overview' | 'comprovante';

/**
 * Tela de execução de um trecho de TRANSFERÊNCIA (malha de cross-docking).
 *
 * Diferente da parada comum (ParadaContext, escopada a um serviço), aqui a
 * routing inteira é um único "trecho" CD origem → CD destino: não há
 * paradas individuais para o motorista concluir, apenas a entrega em bloco
 * do lote de carga no CD de destino. Por isso o estado é local (não usa
 * ParadaContext).
 *
 * Wizard de 2 etapas:
 *  - overview: cards de CD origem/destino + mapa + lote de carga.
 *  - comprovante: quem recebeu + foto/assinatura + handoff (POST /routings/:id/handoff).
 */
export function TransferLegExecution() {
  const { routing } = useRota();

  const [step, setStep] = useState<TransferStep>('overview');

  if (!routing) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" px="x16" py="y32">
        <ActivityIndicator />
        <Text mt="y16">Carregando trecho...</Text>
      </Box>
    );
  }

  return (
    <ScreenBase
      scrollable
      buttonLeft={<ButtonBack />}
      title={
        <Text preset="text16" fontWeightPreset="semibold" color="colorTextPrimary" textAlign="center">
          Transferência
        </Text>
      }
    >
      <Box flex={1} pt="y8" gap="y16">
        {step === 'overview' ? (
          <>
            <TransferOverviewStep />
            <Box pb="y24">
              <Button title="Cheguei no CD de destino" onPress={() => setStep('comprovante')} />
            </Box>
          </>
        ) : (
          <TransferComprovanteStep routingId={routing.id} onBack={() => setStep('overview')} />
        )}
      </Box>
    </ScreenBase>
  );
}

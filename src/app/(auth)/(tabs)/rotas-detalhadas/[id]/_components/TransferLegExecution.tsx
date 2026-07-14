import { useEffect, useState } from 'react';

import { router } from 'expo-router';

import { ActivityIndicator, Box, Button, LocalIcon, ScreenBase, Text } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { measure } from '@/theme';

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
  const [done, setDone] = useState(false);

  // Sucesso full-screen (trecho SEM retorno): mostra 2s e volta pra home.
  // Com retorno, o TransferComprovanteStep navega pro fluxo de retorno e nunca
  // chama onDone — então esta tela só aparece quando não há retorno.
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => router.replace('/(auth)/(tabs)'), 2000);
    return () => clearTimeout(t);
  }, [done]);

  if (!routing) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" px="x16" py="y32">
        <ActivityIndicator />
        <Text mt="y16">Carregando trecho...</Text>
      </Box>
    );
  }

  // Tela de sucesso ocupa a tela INTEIRA (fora do ScreenBase, sem header nem
  // padding do wizard) — igual ao EtapaConcluida do last-mile, que é retornado
  // no topo da tela. Antes ficava aninhada dentro do ScreenBase → vinha cortada.
  if (done) {
    return (
      <Box flex={1} backgroundColor="primary100" justifyContent="center" alignItems="center" px="x24">
        <LocalIcon iconName="check" size={measure.m40} color="white" />
        <Text preset="text18" color="white" textAlign="center" mt="y16">
          Transferência concluída{'\n'}com sucesso
        </Text>
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
          <TransferComprovanteStep routingId={routing.id} onBack={() => setStep('overview')} onDone={() => setDone(true)} />
        )}
      </Box>
    </ScreenBase>
  );
}

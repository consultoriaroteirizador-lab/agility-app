import { useState } from 'react';
import { TextInput } from 'react-native';

import { Box, Text, TouchableOpacityBox } from '@/components';
import { measure } from '@/theme';

import { useParada } from '../../_context/ParadaContext';

interface PickupCodeCardProps {
  /** Se a empresa permite bypass do código (motivo em vez de código). */
  allowBypass: boolean;
}

const BYPASS_REASONS = [
  { value: 'CLIENTE_SEM_CODIGO', label: 'Cliente não tem o código' },
  { value: 'CLIENTE_AUSENTE', label: 'Cliente ausente' },
  { value: 'OUTRO', label: 'Outro motivo' },
] as const;

/**
 * Card de código de confirmação de RETIRADA (T4) — exibido no "Cheguei/Estou aqui"
 * da coleta (ColetaEtapaInicial) e da perna de coleta do TRANSFER (TransferEtapaInicial)
 * quando `resolveCodeRequirement(service, 'PICKUP').required` é true.
 *
 * Espelha o card de código de ENTREGA (T3) em SharedEtapaFinalizacao.tsx, mas lê/escreve
 * o estado de retirada do contexto (pickupCode/pickupBypassReasonCode/pickupBypassReasonText),
 * que é separado do estado de entrega para não conflitar em serviços que passam pelos dois
 * checkpoints (ex.: TRANSFER).
 */
export function PickupCodeCard({ allowBypass }: PickupCodeCardProps) {
  const {
    pickupCode,
    setPickupCode,
    pickupBypassReasonCode,
    setPickupBypassReasonCode,
    pickupBypassReasonText,
    setPickupBypassReasonText,
  } = useParada();
  const [showBypassReasons, setShowBypassReasons] = useState(false);

  return (
    <Box
      marginBottom="y12"
      padding="y12"
      borderRadius="s12"
      borderWidth={measure.m1}
      borderColor="primary100"
      backgroundColor="primary10"
    >
      <Text preset="text14" fontWeightPreset="bold" color="primary100">
        Código de confirmação de retirada
      </Text>
      <Text preset="text12" color="colorTextPrimary" marginTop="t4" marginBottom="b8">
        Peça ao cliente o código de retirada para confirmar a chegada.
      </Text>

      <Box
        borderWidth={measure.m1}
        borderColor="borderColor"
        borderRadius="s8"
        paddingHorizontal="x12"
        paddingVertical="y8"
      >
        <TextInput
          value={pickupCode}
          onChangeText={(text) => setPickupCode(text.replace(/\D/g, '').slice(0, 4))}
          keyboardType="numeric"
          maxLength={4}
          placeholder="Código de retirada"
          placeholderTextColor="#999"
          style={{ fontSize: 16, color: '#333' }}
        />
      </Box>

      {allowBypass && (
        <Box marginTop="t8">
          <TouchableOpacityBox onPress={() => setShowBypassReasons((prev) => !prev)}>
            <Text preset="text12" color="primary100" fontWeightPreset="bold">
              Não tenho o código
            </Text>
          </TouchableOpacityBox>

          {showBypassReasons && (
            <Box marginTop="t8" gap="y8">
              {BYPASS_REASONS.map((reason) => (
                <TouchableOpacityBox
                  key={reason.value}
                  onPress={() => setPickupBypassReasonCode(reason.value)}
                  flexDirection="row"
                  alignItems="center"
                  gap="x12"
                  p="y12"
                  borderWidth={measure.m2}
                  borderColor={pickupBypassReasonCode === reason.value ? 'primary100' : 'gray200'}
                  borderRadius="s12"
                  backgroundColor={pickupBypassReasonCode === reason.value ? 'primary10' : 'white'}
                >
                  <Box
                    width={measure.x20}
                    height={measure.y20}
                    borderRadius="s10"
                    borderWidth={measure.m2}
                    borderColor={pickupBypassReasonCode === reason.value ? 'primary100' : 'gray400'}
                    backgroundColor={pickupBypassReasonCode === reason.value ? 'primary100' : 'transparent'}
                    justifyContent="center"
                    alignItems="center"
                  >
                    {pickupBypassReasonCode === reason.value && (
                      <Box width={measure.x10} height={measure.y10} borderRadius="s5" backgroundColor="white" />
                    )}
                  </Box>
                  <Text
                    preset="text14"
                    color={pickupBypassReasonCode === reason.value ? 'primary100' : 'colorTextPrimary'}
                    fontWeightPreset={pickupBypassReasonCode === reason.value ? 'bold' : 'regular'}
                  >
                    {reason.label}
                  </Text>
                </TouchableOpacityBox>
              ))}

              {pickupBypassReasonCode === 'OUTRO' && (
                <Box
                  borderWidth={measure.m1}
                  borderColor="borderColor"
                  borderRadius="s8"
                  paddingHorizontal="x12"
                  paddingVertical="y8"
                >
                  <TextInput
                    value={pickupBypassReasonText}
                    onChangeText={setPickupBypassReasonText}
                    placeholder="Descreva o motivo"
                    placeholderTextColor="#999"
                    style={{ fontSize: 16, color: '#333' }}
                  />
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

import React from 'react';

import type { WorkPeriod } from '@/domain/agility/jornada/types';
import { WORK_PERIOD_OPTIONS } from '@/domain/agility/jornada/types';

// Import direto (não pelo barrel `@/components`), que arrasta serviços nativos para o teste.
import { Box } from '../BoxBackGround/BoxBackGround';
import { TouchableOpacityBox } from '../RestyleComponent/RestyleComponent';
import { Text } from '../Text/Text';

interface PeriodSelectorProps {
  selectedPeriod?: WorkPeriod;
  onPeriodSelect: (period: WorkPeriod) => void;
  disabled?: boolean;
  /** Motorista própria: o regime é da empresa, ela só vê. O terceirizado edita. */
  somenteLeitura?: boolean;
}

export default function PeriodSelector({
  selectedPeriod,
  onPeriodSelect,
  disabled = false,
  somenteLeitura = false,
}: PeriodSelectorProps) {
  if (somenteLeitura) {
    const rotulo = WORK_PERIOD_OPTIONS.find((p) => p.value === selectedPeriod)?.label;
    return (
      <Box marginHorizontal='x10'>
        <Text preset="text14" color="colorTextPrimary" fontWeight="bold" marginBottom="y12">
          Regime de trabalho
        </Text>
        <Text preset="text14" color="colorTextPrimary">
          {rotulo ?? 'Não informado'}
        </Text>
        <Text preset="text12" color="secondaryTextColor" marginTop="y4">
          Definido pela empresa.
        </Text>
      </Box>
    );
  }

  return (
    <Box marginHorizontal='x10'>
      <Text preset="text14" color="colorTextPrimary" fontWeight="bold" marginBottom="y12">
        Regime de trabalho
      </Text>
      <Box flexDirection="row" flexWrap="wrap" gap="y8">
        {WORK_PERIOD_OPTIONS.map((period) => (
          <TouchableOpacityBox
            key={period.value}
            onPress={() => onPeriodSelect(period.value)}
            disabled={disabled}
            backgroundColor={selectedPeriod === period.value ? 'primary100' : 'backgroundColor'}
            borderRadius="s12"
            paddingHorizontal="x12"
            paddingVertical="y8"
            opacity={disabled ? 0.5 : 1}
          >
            <Text
              preset="text14"
              color={selectedPeriod === period.value ? 'white' : 'colorTextPrimary'}
              fontWeight={selectedPeriod === period.value ? 'bold' : 'normal'}
            >
              {period.label}
            </Text>
          </TouchableOpacityBox>
        ))}
      </Box>
    </Box>
  );
}

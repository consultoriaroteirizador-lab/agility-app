import React from 'react';

import { TouchableOpacityBox, Box, Text } from '@/components';
import type {
  PeriodoTrabalho,
  PERIODOS_TRABALHO,
} from '@/domain/agility/jornada/types';

interface PeriodoSelectorProps {
  selectedPeriod?: PeriodoTrabalho;
  onPeriodSelect: (period: PeriodoTrabalho) => void;
  disabled?: boolean;
}

export default function PeriodoSelector({
  selectedPeriod,
  onPeriodSelect,
  disabled = false,
}: PeriodoSelectorProps) {
  return (
    <Box>
      <Text preset="text14" color="colorTextPrimary" fontWeight="bold" marginBottom="y12">
        Período de trabalho
      </Text>
      <Box flexDirection="row" flexWrap="wrap" gap="y8">
        {PERIODOS_TRABALHO.map((period) => (
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

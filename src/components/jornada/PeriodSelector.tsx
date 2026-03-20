import React from 'react';

import { TouchableOpacityBox, Box, Text } from '@/components';
import type { WorkPeriod } from '@/domain/agility/jornada/types';
import { WORK_PERIOD_OPTIONS } from '@/domain/agility/jornada/types';

interface PeriodSelectorProps {
  selectedPeriod?: WorkPeriod;
  onPeriodSelect: (period: WorkPeriod) => void;
  disabled?: boolean;
}

export default function PeriodSelector({
  selectedPeriod,
  onPeriodSelect,
  disabled = false,
}: PeriodSelectorProps) {
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

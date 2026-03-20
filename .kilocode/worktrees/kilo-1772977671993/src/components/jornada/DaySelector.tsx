import React from 'react';

import { TouchableOpacityBox, Box, Text } from '@/components';
import type { DiaSemana, getDiaLabel, DIAS_SEMANA } from '@/domain/agility/jornada/types';

interface DaySelectorProps {
  selectedDays: DiaSemana[];
  onDayToggle: (day: DiaSemana) => void;
  disabled?: boolean;
}

export default function DaySelector({
  selectedDays,
  onDayToggle,
  disabled = false,
}: DaySelectorProps) {
  const isDaySelected = (day: DiaSemana) => {
    return selectedDays.includes(day);
  };

  return (
    <Box>
      <Text preset="text14" color="colorTextPrimary" fontWeight="bold" marginBottom="y12">
        Dias de trabalho
      </Text>
      <Box flexDirection="row" flexWrap="wrap" gap="y8">
        {DIAS_SEMANA.map((dia) => (
          <TouchableOpacityBox
            key={dia}
            onPress={() => onDayToggle(dia)}
            disabled={disabled}
            backgroundColor={isDaySelected(dia) ? 'primary100' : 'backgroundColor'}
            borderRadius="s12"
            paddingHorizontal="x12"
            paddingVertical="y8"
            opacity={disabled ? 0.5 : 1}
          >
            <Text
              preset="text14"
              color={isDaySelected(dia) ? 'white' : 'colorTextPrimary'}
              fontWeight={isDaySelected(dia) ? 'bold' : 'normal'}
            >
              {getDiaLabel(dia)}
            </Text>
          </TouchableOpacityBox>
        ))}
      </Box>
    </Box>
  );
}

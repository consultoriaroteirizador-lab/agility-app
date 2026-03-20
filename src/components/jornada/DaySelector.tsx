import React from 'react';

import { TouchableOpacityBox, Box, Text } from '@/components';
import type { WeekDay } from '@/domain/agility/jornada/types';
import { getWeekDayLabel, WEEK_DAYS } from '@/domain/agility/jornada/types';

interface DaySelectorProps {
  selectedDays: WeekDay[];
  onDayToggle: (day: WeekDay) => void;
  disabled?: boolean;
}

export default function DaySelector({
  selectedDays,
  onDayToggle,
  disabled = false,
}: DaySelectorProps) {
  const isDaySelected = (day: WeekDay) => {
    return selectedDays.includes(day);
  };

  return (
    <Box marginHorizontal='x10'>
      <Text preset="text14" color="colorTextPrimary" fontWeight="bold" marginBottom="y12">
        Dias de trabalho
      </Text>
      <Box flexDirection="row" flexWrap="wrap" gap="y8">
        {WEEK_DAYS.map((dia) => (
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
              {getWeekDayLabel(dia)}
            </Text>
          </TouchableOpacityBox>
        ))}
      </Box>
    </Box>
  );
}

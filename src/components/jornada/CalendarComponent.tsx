import React from 'react';

import { Calendar } from 'react-native-calendars';

import { Box, Text } from '@/components';

interface DateData {
  dateString: string;
  day: number;
  month: number;
  year: number;
  timestamp: number;
}

interface CalendarComponentProps {
  markedDates?: Record<string, any>;
  selectedDate?: string;
  onDateSelect?: (date: Date) => void;
  disabledDates?: string[];
  minDate?: Date;
  maxDate?: Date;
}

export default function CalendarComponent({
  markedDates,
  selectedDate,
  onDateSelect,
  disabledDates = [],
  minDate,
  maxDate,
}: CalendarComponentProps) {
  const marked: Record<string, any> = {
    [selectedDate || '']: {
      selected: true,
      marked: true,
      selectedColor: '#2D9CDB',
      dotColor: '#2D9CDB',
    },
    ...Object.fromEntries(
      disabledDates.map(date => [
        date,
        {
          disabled: true,
          disableTouchEvent: true,
        },
      ])
    ),
    ...markedDates,
  };

  const theme = {
    backgroundColor: 'white',
    calendarBackground: 'white',
    textSectionTitleColor: '#333',
    textSectionTitleDisabledColor: '#ccc',
    selectedDayBackgroundColor: '#2D9CDB',
    selectedDayTextColor: 'white',
    todayTextColor: '#2D9CDB',
    dayTextColor: '#333',
    textDisabledColor: '#ccc',
    dotColor: '#2D9CDB',
    selectedDotColor: 'white',
    disabledDotColor: '#ccc',
    arrowColor: '#333',
    monthTextColor: '#333',
    indicatorColor: '#2D9CDB',
    textDayFontFamily: 'Montserrat',
    textMonthFontFamily: 'Montserrat',
    textDayHeaderFontFamily: 'Montserrat',
    textDayFontSize: 16,
    textMonthFontSize: 16,
    textDayHeaderFontSize: 14,
  };

  const handleDayPress = (day: DateData) => {
    if (!day || !onDateSelect) return;

    // Verificar se a data está desabilitada
    const dateStr = day.dateString;
    if (disabledDates.includes(dateStr)) return;

    onDateSelect(new Date(dateStr));
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  return (
    <Box>
      <Text ml='l10' preset="text14" color="colorTextPrimary" fontWeight="bold" marginBottom="y12">
        Selecione os dias de disponibilidade
      </Text>
      <Box backgroundColor="white" borderRadius="s12" padding="y12">
        <Calendar
          markedDates={marked}
          theme={theme}
          enableSwipeMonths={true}
          hideExtraDays={true}
          firstDay={1} // Segunda como primeiro dia
          onDayPress={handleDayPress}
          minDate={minDate ? formatDate(minDate) : undefined}
          maxDate={maxDate ? formatDate(maxDate) : undefined}
        />
      </Box>
    </Box>
  );
}

import React from 'react';

import { Calendar, DateObject } from 'react-native-calendars';

import { Box, Text, TouchableOpacityBox } from '@/components';
import { measure } from '@/theme';

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
  const marked = {
    [selectedDate || '']: {
      selected: true,
      marked: true,
      selectedColor: 'primary100',
      dotColor: 'primary100',
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
    textSectionTitleColor: 'colorTextPrimary',
    textSectionTitleDisabledColor: 'gray400',
    selectedDayBackgroundColor: 'primary100',
    selectedDayTextColor: 'white',
    todayTextColor: 'primary100',
    dayTextColor: 'colorTextPrimary',
    textDisabledColor: 'gray400',
    dotColor: 'primary100',
    selectedDotColor: 'white',
    disabledDotColor: 'gray400',
    arrowColor: 'colorTextPrimary',
    monthTextColor: 'colorTextPrimary',
    indicatorColor: 'primary100',
    textDayFontFamily: 'Montserrat',
    textMonthFontFamily: 'Montserrat',
    textDayHeaderFontFamily: 'Montserrat',
    textDayFontSize: 16,
    textMonthFontSize: 16,
    textDayHeaderFontSize: 14,
  };

  const handleDayPress = (day: DateObject) => {
    if (!day || !onDateSelect) return;

    // Verificar se a data está desabilitada
    const dateStr = day.dateString;
    if (disabledDates.includes(dateStr)) return;

    onDateSelect(new Date(dateStr));
  };

  const isDayDisabled = (date: DateObject) => {
    return disabledDates.includes(date.dateString);
  };

  const getMarkedDatesForDay = (date: DateObject) => {
    const dateStr = date.dateString;
    return marked[dateStr];
  };

  return (
    <Box>
      <Text preset="text14" color="colorTextPrimary" fontWeight="bold" marginBottom="y12">
        Selecione os dias de disponibilidade
      </Text>
      <Box backgroundColor="white" borderRadius="s12" padding="y12">
        <Calendar
          markedDates={marked}
          markingType={'custom'}
          theme={theme}
          enableSwipeMonths={true}
          hideExtraDays={true}
          firstDay={1} // Segunda como primeiro dia
          onDayPress={handleDayPress}
          disabledDaysIndexes={disabledDates.map(date => {
            const dayDate = new Date(date);
            return dayDate.getDay();
          })}
          minDate={minDate}
          maxDate={maxDate}
          renderDay={(day, item) => {
            const marked = getMarkedDatesForDay(day);
            const isDisabled = isDayDisabled(day);

            return (
              <TouchableOpacityBox
                key={day.dateString}
                width={measure.x32}
                height={measure.y32}
                justifyContent="center"
                alignItems="center"
                backgroundColor={
                  marked?.selected
                    ? 'primary100'
                    : marked?.disabled
                      ? 'gray50'
                      : 'transparent'
                }
                borderRadius="s16"
                disabled={isDisabled}
                onPress={() => handleDayPress(day)}
              >
                <Text
                  preset="text14"
                  color={
                    marked?.selected
                      ? 'white'
                      : marked?.disabled
                        ? 'gray400'
                        : 'colorTextPrimary'
                  }
                  fontWeight={marked?.selected ? 'bold' : 'normal'}
                >
                  {item}
                </Text>
              </TouchableOpacityBox>
            );
          }}
          renderHeader={(date) => {
            return (
              <Box flexDirection="row" justifyContent="space-between" alignItems="center" paddingVertical="y8">
                <TouchableOpacityBox onPress={() => console.log('previous month')}>
                  <Text preset="text14" color="primary100" fontWeight="bold">
                    {'<'}
                  </Text>
                </TouchableOpacityBox>
                <Text preset="text16" color="colorTextPrimary" fontWeight="bold">
                  {date.toString('MMMM yyyy')}
                </Text>
                <TouchableOpacityBox onPress={() => console.log('next month')}>
                  <Text preset="text14" color="primary100" fontWeight="bold">
                    {'>'}
                  </Text>
                </TouchableOpacityBox>
              </Box>
            );
          }}
        />
      </Box>
    </Box>
  );
}

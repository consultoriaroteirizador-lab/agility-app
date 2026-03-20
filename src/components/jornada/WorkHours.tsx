import React, { useState } from 'react';

import { TouchableOpacityBox, Box, Text, Input } from '@/components';
import type { ScheduleType, SpecificWorkHours, WeekDay } from '@/domain/agility/jornada/types';
import { getWeekDayLabel, WEEK_DAYS, SCHEDULE_TYPE_OPTIONS } from '@/domain/agility/jornada/types';
import { measure } from '@/theme';

interface WorkHoursProps {
  tipoHorario: ScheduleType;
  workStartTime?: string;
  workEndTime?: string;
  specificHours?: SpecificWorkHours[];
  onChangeTipoHorario: (tipo: ScheduleType) => void;
  onChangeWorkHours: (startTime: string, endTime: string) => void;
  onChangeSpecificHours: (hours: SpecificWorkHours[]) => void;
  disabled?: boolean;
}

export default function WorkHours({
  tipoHorario,
  workStartTime,
  workEndTime,
  specificHours,
  onChangeTipoHorario,
  onChangeWorkHours,
  onChangeSpecificHours,
  disabled = false,
}: WorkHoursProps) {
  const [addingSpecific, setAddingSpecific] = useState(false);
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [selectedDay, setSelectedDay] = useState<WeekDay>('MON');

  const addSpecificHour = () => {
    if (!newStartTime || !newEndTime) return;

    const newEntry: SpecificWorkHours = {
      weekDay: selectedDay,
      hours: [{ from: newStartTime, until: newEndTime }],
    };

    const updatedHours = [...(specificHours || []), newEntry];
    onChangeSpecificHours(updatedHours);

    setNewStartTime('');
    setNewEndTime('');
    setAddingSpecific(false);
  };

  const removeSpecificHour = (index: number) => {
    const updatedHours = [...(specificHours || [])];
    updatedHours.splice(index, 1);
    onChangeSpecificHours(updatedHours);
  };

  return (
    <Box marginHorizontal='x10'>
      <Text preset="text14" color="colorTextPrimary" fontWeight="bold" marginBottom="y12">
        Tipo de horário
      </Text>
      <Box flexDirection="row" flexWrap="wrap" gap="y8" marginBottom="y16">
        {SCHEDULE_TYPE_OPTIONS.map((tipo) => (
          <TouchableOpacityBox
            key={tipo.value}
            onPress={() => onChangeTipoHorario(tipo.value)}
            disabled={disabled}
            backgroundColor={tipoHorario === tipo.value ? 'primary100' : 'backgroundColor'}
            borderRadius="s12"
            paddingHorizontal="x12"
            paddingVertical="y8"
            opacity={disabled ? 0.5 : 1}
          >
            <Text
              preset="text14"
              color={tipoHorario === tipo.value ? 'white' : 'colorTextPrimary'}
              fontWeight={tipoHorario === tipo.value ? 'bold' : 'normal'}
            >
              {tipo.label}
            </Text>
          </TouchableOpacityBox>
        ))}
      </Box>

      {/* Horário Geral */}
      {(tipoHorario === 'full' || tipoHorario === 'flexible' || tipoHorario === 'shift') && (
        <Box backgroundColor="white" borderRadius="s12" padding="y12" marginBottom="y12">
          <Text preset="text14" color="colorTextPrimary" marginBottom="y8">
            Horário geral de trabalho
          </Text>
          <Box flexDirection="row" gap="y12" justifyContent="space-between">
            <Box flex={1}>
              <Input
                title="Início"
                value={workStartTime}
                onChangeText={(value) => onChangeWorkHours(value, workEndTime || '')}
                placeholder="08:00"
                editable={!disabled}
                padding="y12"
                width={measure.x150}
                borderType='all'
              />
            </Box>
            <Box flex={1}>
              <Input
                borderType='all'
                title="Fim"
                value={workEndTime}
                onChangeText={(value) => onChangeWorkHours(workStartTime || '', value)}
                placeholder="18:00"
                editable={!disabled}
                padding="y12"
                width={measure.x150}
              />
            </Box>
          </Box>
        </Box>
      )}

      {tipoHorario === 'specific' && (
        <Box backgroundColor="white" borderRadius="s12" padding="y12">
          <Text preset="text14" color="colorTextPrimary" marginBottom="y12">
            Horários específicos por dia da semana
          </Text>

          {/* Seletor de dia para adicionar */}
          {!addingSpecific && (
            <Box flexDirection="row" gap="y8" marginBottom="y12">
              <Box flex={1}>
                <Text preset="text12" color="secondaryTextColor" marginBottom="y4">
                  Dia
                </Text>
                <TouchableOpacityBox
                  backgroundColor="backgroundColor"
                  borderWidth={measure.m1}
                  borderColor="borderColor"
                  borderRadius="s8"
                  padding="y8"
                  onPress={() => setAddingSpecific(true)}
                  disabled={disabled}
                >
                  <Text preset="text14" color="colorTextPrimary">
                    {getWeekDayLabel(selectedDay)}
                  </Text>
                </TouchableOpacityBox>
              </Box>
              <Box flex={2}>
                <Text preset="text12" color="secondaryTextColor" marginBottom="y4">
                  Início
                </Text>
                <Input
                  title="Início"
                  value={newStartTime}
                  onChangeText={setNewStartTime}
                  placeholder="08:00"
                  editable={!disabled}
                  borderWidth={measure.m1}
                  borderColor="borderColor"
                  borderRadius="s8"
                  padding="y12"
                />
              </Box>
              <Box flex={2}>
                <Text preset="text12" color="secondaryTextColor" marginBottom="y4">
                  Fim
                </Text>
                <Input
                  title="Fim"
                  value={newEndTime}
                  onChangeText={setNewEndTime}
                  placeholder="18:00"
                  editable={!disabled}
                  borderWidth={measure.m1}
                  borderColor="borderColor"
                  borderRadius="s8"
                  padding="y12"
                />
              </Box>
              <TouchableOpacityBox
                backgroundColor="primary100"
                borderRadius="s8"
                paddingHorizontal="x12"
                paddingVertical="y8"
                onPress={addSpecificHour}
                disabled={disabled || !newStartTime || !newEndTime}
              >
                <Text preset="text14" color="white" fontWeight="bold">
                  Adicionar
                </Text>
              </TouchableOpacityBox>
            </Box>
          )}

          {addingSpecific && (
            <Box flexDirection="row" gap="y8" marginBottom="y12">
              <Box flex={1}>
                <Text preset="text12" color="secondaryTextColor" marginBottom="y4">
                  Dia
                </Text>
                {WEEK_DAYS.map((dia) => (
                  <TouchableOpacityBox
                    key={dia}
                    onPress={() => setSelectedDay(dia)}
                    disabled={disabled}
                    backgroundColor={selectedDay === dia ? 'primary100' : 'backgroundColor'}
                    borderWidth={measure.m1}
                    borderColor={selectedDay === dia ? 'primary100' : 'borderColor'}
                    borderRadius="s8"
                    paddingHorizontal="x8"
                    paddingVertical="y4"
                    opacity={disabled ? 0.5 : 1}
                  >
                    <Text
                      preset="text12"
                      color={selectedDay === dia ? 'white' : 'colorTextPrimary'}
                    >
                      {getWeekDayLabel(dia)}
                    </Text>
                  </TouchableOpacityBox>
                ))}
              </Box>
            </Box>
          )}

          {/* Lista de horários específicos */}
          {!addingSpecific && specificHours && specificHours.length > 0 && (
            <Box gap="y8">
              {specificHours.map((entry, index) => (
                <Box
                  key={index}
                  backgroundColor="backgroundColor"
                  borderWidth={measure.m1}
                  borderColor="borderColor"
                  borderRadius="s8"
                  padding="y8"
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box flex={1}>
                    <Text preset="text14" color="colorTextPrimary" fontWeight="bold">
                      {getWeekDayLabel(entry.weekDay)}
                    </Text>
                    <Text preset="text12" color="secondaryTextColor">
                      {entry.hours.map(h => `${h.from} - ${h.until}`).join(', ')}
                    </Text>
                  </Box>
                  <TouchableOpacityBox
                    backgroundColor="redError"
                    borderRadius="s8"
                    paddingHorizontal="x12"
                    paddingVertical="y8"
                    onPress={() => removeSpecificHour(index)}
                    disabled={disabled}
                  >
                    <Text preset="text14" color="white" fontWeight="bold">
                      Remover
                    </Text>
                  </TouchableOpacityBox>
                </Box>
              ))}
            </Box>
          )}

          {specificHours && specificHours.length === 0 && (
            <Text preset="text12" color="mutedElementsColor" textAlign="center">
              Nenhum horário específico adicionado. Toque em "Adicionar" para configurar.
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
}

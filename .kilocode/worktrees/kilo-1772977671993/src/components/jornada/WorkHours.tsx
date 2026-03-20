import React, { useState } from 'react';

import { TouchableOpacityBox, Box, Text, TextInput } from '@/components';
import type {
  TipoHorario,
  HorarioEspecifico,
  DiaSemana,
  getDiaLabel,
} from '@/domain/agility/jornada/types';

interface WorkHoursProps {
  tipoHorario: TipoHorario;
  workStartTime?: string;
  workEndTime?: string;
  specificHours?: HorarioEspecifico[];
  onChangeTipoHorario: (tipo: TipoHorario) => void;
  onChangeWorkHours: (startTime: string, endTime: string) => void;
  onChangeSpecificHours: (hours: HorarioEspecifico[]) => void;
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
  const [selectedDay, setSelectedDay] = useState<DiaSemana>('SEG');

  const tiposHorario: { value: TipoHorario; label: string }[] = [
    { value: 'completo', label: 'Horário Completo' },
    { value: 'flexivel', label: 'Horário Flexível' },
    { value: 'por_turno', label: 'Por Turno' },
    { value: 'especifico', label: 'Horários Específicos' },
  ];

  const addSpecificHour = () => {
    if (!newStartTime || !newEndTime) return;

    const newEntry: HorarioEspecifico = {
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
    <Box>
      <Text preset="text14" color="colorTextPrimary" fontWeight="bold" marginBottom="y12">
        Tipo de horário
      </Text>
      <Box flexDirection="row" flexWrap="wrap" gap="y8" marginBottom="y16">
        {tiposHorario.map((tipo) => (
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
      {(tipoHorario === 'completo' || tipoHorario === 'flexivel' || tipoHorario === 'por_turno') && (
        <Box backgroundColor="white" borderRadius="s12" padding="y12" marginBottom="y12">
          <Text preset="text14" color="colorTextPrimary" marginBottom="y8">
            Horário geral de trabalho
          </Text>
          <Box flexDirection="row" gap="y12" justifyContent="space-between">
            <Box flex={1}>
              <Text preset="text12" color="secondaryTextColor" marginBottom="y4">
                Início
              </Text>
              <TextInput
                value={workStartTime}
                onChangeText={(value) => onChangeWorkHours(value, workEndTime || '')}
                placeholder="08:00"
                editable={!disabled}
                borderWidth={measure.m1}
                borderColor="borderColor"
                borderRadius="s8"
                padding="y12"
              />
            </Box>
            <Box flex={1}>
              <Text preset="text12" color="secondaryTextColor" marginBottom="y4">
                Fim
              </Text>
              <TextInput
                value={workEndTime}
                onChangeText={(value) => onChangeWorkHours(workStartTime || '', value)}
                placeholder="18:00"
                editable={!disabled}
                borderWidth={measure.m1}
                borderColor="borderColor"
                borderRadius="s8"
                padding="y12"
              />
            </Box>
          </Box>
        </Box>
      )}

      {/* Horários Específicos */}
      {tipoHorario === 'especifico' && (
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
                    {getDiaLabel(selectedDay)}
                  </Text>
                </TouchableOpacityBox>
              </Box>
              <Box flex={2}>
                <Text preset="text12" color="secondaryTextColor" marginBottom="y4">
                  Início
                </Text>
                <TextInput
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
                <TextInput
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
                {(['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'] as DiaSemana[]).map((dia) => (
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
                      {getDiaLabel(dia)}
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
                      {getDiaLabel(entry.weekDay)}
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

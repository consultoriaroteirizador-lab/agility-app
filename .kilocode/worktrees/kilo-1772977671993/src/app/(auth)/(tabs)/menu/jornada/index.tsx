import React, { useState, useEffect } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { ActivityIndicator, Box, Text, TouchableOpacityBox, Button } from '@/components';
import {
  DaySelector,
  PeriodSelector,
  WorkHours,
  CalendarComponent,
} from '@/components/jornada';
import type {
  DiaSemana,
  PeriodoTrabalho,
  TipoHorario,
  HorarioEspecifico,
  JornadaTrabalho,
  UpdateJornadaRequest,
} from '@/domain/agility/jornada/types';
import { useGetMyJourney, useUpdateMyJourney } from '@/domain/agility/jornada/useCase';
import { KEY_JOURNEY } from '@/domain/queryKeys';

export default function JornadaScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [aba, setAba] = useState<'configuracao' | 'calendario'>('configuracao');

  // Buscar jornada do backend
  const { jornada: jornadaData, isLoading: isLoadingJourney } = useGetMyJourney();

  // Mutation para salvar jornada
  const { updateJourney, isLoading: isSaving } = useUpdateMyJourney({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY_JOURNEY, 'my'] });
      alert('Jornada salva com sucesso!');
    },
    onError: (error: any) => {
      setError(error?.error?.message || 'Erro ao salvar jornada');
    },
  });

  // Estados da jornada
  const [jornada, setJornada] = useState<JornadaTrabalho>({});
  const [error, setError] = useState<string | undefined>();

  // Carregar dados da jornada quando receber do backend
  useEffect(() => {
    if (jornadaData) {
      setJornada({
        id: jornadaData.id,
        tipo: jornadaData.tipo,
        tipoHorario: jornadaData.tipoHorario,
        workDays: jornadaData.workDays,
        workStartTime: jornadaData.workStartTime,
        workEndTime: jornadaData.workEndTime,
        specificHours: jornadaData.specificHours,
        daysOff: jornadaData.daysOff,
        intervaloPausa: jornadaData.intervaloPausa ? {
          intervaloPausa: jornadaData.intervaloPausa,
          intervaloDescanso: jornadaData.intervaloDescanso,
        } : undefined,
      });
    }
  }, [jornadaData]);

  // Estados do calendário
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [disabledDates, setDisabledDates] = useState<string[]>([]);

  const toggleDay = (day: DiaSemana) => {
    const currentWorkDays = jornada.workDays || [];
    if (currentWorkDays.includes(day)) {
      setJornada({
        ...jornada,
        workDays: currentWorkDays.filter(d => d !== day),
      });
    } else {
      setJornada({
        ...jornada,
        workDays: [...currentWorkDays, day],
      });
    }
  };

  const handlePeriodSelect = (period: PeriodoTrabalho) => {
    setJornada({
      ...jornada,
      tipo: period,
    });
  };

  const handleTipoHorarioChange = (tipo: TipoHorario) => {
    setJornada({
      ...jornada,
      tipoHorario: tipo,
    });
  };

  const handleWorkHoursChange = (workStartTime?: string, workEndTime?: string) => {
    setJornada({
      ...jornada,
      workStartTime,
      workEndTime,
    });
  };

  const handleSpecificHoursChange = (hours: HorarioEspecifico[]) => {
    setJornada({
      ...jornada,
      specificHours: hours,
    });
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    console.log('Data selecionada:', date);
  };

  const handleSalvar = async () => {
    if (!jornada.workDays || jornada.workDays.length === 0) {
      setError('Selecione pelo menos um dia de trabalho');
      return;
    }

    setError(undefined);

    const payload: UpdateJornadaRequest = {
      tipo: jornada.tipo,
      tipoHorario: jornada.tipoHorario,
      workDays: jornada.workDays,
      workStartTime: jornada.workStartTime,
      workEndTime: jornada.workEndTime,
      specificHours: jornada.specificHours,
      daysOff: jornada.daysOff,
      intervaloPausa: jornada.intervaloPausa?.intervaloPausa,
      intervaloDescanso: jornada.intervaloPausa?.intervaloDescanso,
    };

    updateJourney(payload);
  };

  if (isLoadingJourney) {
    return (
      <Box flex={1} backgroundColor="backgroundColor" justifyContent="center" alignItems="center">
        <ActivityIndicator />
        <Text preset="text14" marginTop="y12">Carregando jornada...</Text>
      </Box>
    );
  }

  return (
    <Box flex={1} backgroundColor="backgroundColor">
      {/* Header */}
      <Box backgroundColor="white" paddingHorizontal="x16" paddingTop="y12" paddingBottom="y16" marginBottom="y16">
        <Box flexDirection="row" alignItems="center" justifyContent="center" width="100%">
          <TouchableOpacityBox onPress={() => router.back()} marginRight="x12">
            <Text preset="text18" color="primary100">←</Text>
          </TouchableOpacityBox>
          <Box flex={1}>
            <Text preset="text20" fontWeight="bold" color="colorTextPrimary">
              Jornada de Trabalho
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Tabs */}
      <Box flexDirection="row" gap="x16" marginBottom="y24" paddingHorizontal="x16">
        <TouchableOpacityBox
          flex={1}
          backgroundColor={aba === 'configuracao' ? 'primary100' : 'white'}
          borderRadius="s12"
          paddingVertical="y8"
          onPress={() => setAba('configuracao')}
        >
          <Text
            preset="text14"
            color={aba === 'configuracao' ? 'white' : 'colorTextPrimary'}
            fontWeight={aba === 'configuracao' ? 'bold' : 'normal'}
            textAlign="center"
          >
            Configuração
          </Text>
        </TouchableOpacityBox>
        <TouchableOpacityBox
          flex={1}
          backgroundColor={aba === 'calendario' ? 'primary100' : 'white'}
          borderRadius="s12"
          paddingVertical="y8"
          onPress={() => setAba('calendario')}
        >
          <Text
            preset="text14"
            color={aba === 'calendario' ? 'white' : 'colorTextPrimary'}
            fontWeight={aba === 'calendario' ? 'bold' : 'normal'}
            textAlign="center"
          >
            Calendário
          </Text>
        </TouchableOpacityBox>
      </Box>

      {/* Conteúdo */}
      <Box paddingHorizontal="x16">
        {aba === 'configuracao' ? (
          <Box gap="y16">
            {/* Seletor de Período */}
            <PeriodSelector
              selectedPeriod={jornada.tipo}
              onPeriodSelect={handlePeriodSelect}
              disabled={isSaving}
            />

            {/* Seletor de Dias de Trabalho */}
            <DaySelector
              selectedDays={jornada.workDays || []}
              onDayToggle={toggleDay}
              disabled={isSaving}
            />

            {/* Horários de Trabalho */}
            <WorkHours
              tipoHorario={jornada.tipoHorario || 'completo'}
              workStartTime={jornada.workStartTime}
              workEndTime={jornada.workEndTime}
              specificHours={jornada.specificHours}
              onChangeTipoHorario={handleTipoHorarioChange}
              onChangeWorkHours={handleWorkHoursChange}
              onChangeSpecificHours={handleSpecificHoursChange}
              disabled={isSaving}
            />

            {/* Mensagem de erro */}
            {error && (
              <Box
                backgroundColor="redError"
                borderRadius="s12"
                padding="y12"
                marginTop="y16"
              >
                <Text preset="text14" color="white">
                  {error}
                </Text>
              </Box>
            )}

            {/* Botão de salvar */}
            <Box marginTop="y24">
              <Button
                title={isSaving ? 'Salvando...' : 'Salvar'}
                onPress={handleSalvar}
                disabled={isSaving}
              />
            </Box>
          </Box>
        ) : (
          <Box>
            {/* Calendário */}
            <CalendarComponent
              selectedDate={selectedDate?.toISOString().split('T')[0]}
              onDateSelect={handleDateSelect}
              disabledDates={disabledDates}
            />

            {/* Informações da data selecionada */}
            {selectedDate && (
              <Box
                backgroundColor="white"
                borderRadius="s12"
                padding="y12"
                marginTop="y16"
              >
                <Text preset="text14" color="colorTextPrimary" fontWeight="bold" marginBottom="y4">
                  Data selecionada
                </Text>
                <Text preset="text16" color="colorTextPrimary">
                  {new Date(selectedDate).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
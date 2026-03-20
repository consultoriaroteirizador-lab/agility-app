import React, { useState, useEffect } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { ActivityIndicator, Box, Text, TouchableOpacityBox, Button, ScreenBase } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
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
import { parseWorkDaysFromBackend } from '@/domain/agility/jornada/types';
import { useGetMyJourney, useUpdateMyJourney } from '@/domain/agility/jornada/useCase';
import { KEY_JOURNEY } from '@/domain/queryKeys';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';

export default function JornadaScreen() {
  const queryClient = useQueryClient();
  const [aba, setAba] = useState<'configuracao' | 'calendario'>('configuracao');
  const { showToast } = useToastService();
  // Buscar jornada do backend
  const { jornada: jornadaData, isLoading: isLoadingJourney } = useGetMyJourney();

  // Mutation para salvar jornada
  const { updateJourney, isLoading: isSaving } = useUpdateMyJourney({
    onSuccess: () => {
      showToast({ message: "Jornada atualizado com sucesso", type: 'success', position: 'center' })
      queryClient.invalidateQueries({ queryKey: [KEY_JOURNEY, 'my'] });
    }
  });

  // Estados da jornada
  const [jornada, setJornada] = useState<JornadaTrabalho>({});
  const [error, setError] = useState<string | undefined>();

  // Carregar dados da jornada quando receber do backend
  useEffect(() => {
    if (jornadaData) {
      // Extrair datas de daysOff (formato DayOff[] do backend)
      const daysOffDates = jornadaData.daysOffArray?.map(d => d.startDate) ?? []

      setJornada({
        id: jornadaData.id,
        tipo: jornadaData.tipoContrato, // Agora carregamos do backend
        tipoHorario: jornadaData.specificWorkHours ? 'specific' : 'full',
        workDays: parseWorkDaysFromBackend(jornadaData.workDays),
        workStartTime: jornadaData.workStartTime,
        workEndTime: jornadaData.workEndTime ?? undefined,
        specificHours: jornadaData.specificWorkHours,
        daysOff: daysOffDates.length > 0 ? daysOffDates : undefined,
        intervaloPausa: jornadaData.breakInterval || jornadaData.restInterval ? {
          breakInterval: jornadaData.breakInterval,
          restInterval: jornadaData.restInterval,
        } : undefined,
      });

      // Carregar dias de folga no estado do calendário
      setDisabledDates(daysOffDates)
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
    const dateStr = date.toISOString().split('T')[0]
    const currentDaysOff = jornada.daysOff || []

    // Toggle: adiciona ou remove a data como dia de folga
    if (currentDaysOff.includes(dateStr)) {
      // Remover folga
      setJornada({
        ...jornada,
        daysOff: currentDaysOff.filter(d => d !== dateStr)
      })
      setDisabledDates(disabledDates.filter(d => d !== dateStr))
    } else {
      // Adicionar folga
      setJornada({
        ...jornada,
        daysOff: [...currentDaysOff, dateStr]
      })
      setDisabledDates([...disabledDates, dateStr])
    }

    setSelectedDate(date)
  }

  const handleSalvar = async () => {
    if (!jornada.workDays || jornada.workDays.length === 0) {
      setError('Selecione pelo menos um dia de trabalho');
      return;
    }

    setError(undefined);

    const payload: UpdateJornadaRequest = {
      workDays: jornada.workDays,
      workStartTime: jornada.workStartTime,
      workEndTime: jornada.workEndTime,
      specificWorkHours: jornada.specificHours,
      daysOff: jornada.daysOff, // Datas de folga no formato "YYYY-MM-DD"
      breakInterval: jornada.intervaloPausa?.breakInterval,
      restInterval: jornada.intervaloPausa?.restInterval,
      tipoContrato: jornada.tipo, // Envia o tipo de contrato (CLT, PJ, etc.)
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
    <ScreenBase buttonLeft={<ButtonBack />} title={
      <Text preset="text20" fontWeightPreset="bold" color="colorTextPrimary">
        Jornada de trabalho
      </Text>
    }>
      <Box flex={1} scrollable>

        <Box flexDirection="row" gap="x16" marginBottom="y24" >
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

        <Box alignItems='center' >
          {aba === 'configuracao' ? (
            <Box gap="y16">
              <PeriodSelector
                selectedPeriod={jornada.tipo}
                onPeriodSelect={handlePeriodSelect}
                disabled={isSaving}
              />

              <DaySelector
                selectedDays={jornada.workDays || []}
                onDayToggle={toggleDay}
                disabled={isSaving}
              />

              <WorkHours
                tipoHorario={jornada.tipoHorario || 'full'}
                workStartTime={jornada.workStartTime}
                workEndTime={jornada.workEndTime}
                specificHours={jornada.specificHours}
                onChangeTipoHorario={handleTipoHorarioChange}
                onChangeWorkHours={handleWorkHoursChange}
                onChangeSpecificHours={handleSpecificHoursChange}
                disabled={isSaving}
              />

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

              <Box marginTop="y12">
                <Button
                  title={isSaving ? 'Salvando...' : 'Salvar'}
                  onPress={handleSalvar}
                  disabled={isSaving}
                  alignSelf='center'
                />
              </Box>
            </Box>
          ) : (
            <Box gap="y16">
              <CalendarComponent
                selectedDate={selectedDate?.toISOString().split('T')[0]}
                onDateSelect={handleDateSelect}
                disabledDates={disabledDates}
              />

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

              <Box marginTop="y12">
                <Button
                  preset='main'
                  title={isSaving ? 'Salvando...' : 'Salvar'}
                  onPress={handleSalvar}
                  disabled={isSaving}
                  width={measure.x330}
                />
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </ScreenBase>

  );
}
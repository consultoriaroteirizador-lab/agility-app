import { useState, useMemo } from 'react';

import { useRouter } from 'expo-router';

import {
  ActivityIndicator,
  Box,
  Text,
  Input,
  TouchableOpacityBox,
  ScreenBase

} from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { TicketStatus } from '@/domain/agility/ticket/dto/types';
import { useFindTicketsByDriver } from '@/domain/agility/ticket/useCase';
import { useAuthCredentialsService } from '@/services';
import { measure } from '@/theme';

function mapStatus(status: TicketStatus): string {
  const map: Record<TicketStatus, string> = {
    [TicketStatus.OPEN]: 'Aberto',
    [TicketStatus.ASSIGNED]: 'Atribuído',
    [TicketStatus.IN_PROGRESS]: 'Em andamento',
    [TicketStatus.RESOLVED]: 'Resolvido',
    [TicketStatus.TRANSFERRED]: 'Transferido',
    [TicketStatus.CLOSED]: 'Fechado',
  };
  return map[status] ?? status;
}

function getStatusColor(status: TicketStatus): string {
  switch (status) {
    case TicketStatus.OPEN:
      return 'blue500';
    case TicketStatus.ASSIGNED:
      return 'purple500';
    case TicketStatus.IN_PROGRESS:
      return 'orange500';
    case TicketStatus.RESOLVED:
      return 'greenSuccess';
    case TicketStatus.TRANSFERRED:
      return 'orange500';
    case TicketStatus.CLOSED:
      return 'gray500';
    default:
      return 'gray500';
  }
}

export default function HistoricoProtocolosScreen() {
  const router = useRouter();
  const { userAuth } = useAuthCredentialsService();
  const [busca, setBusca] = useState('');

  // Obter driverId do usuario autenticado (ID interno do driver, não keycloakUserId)
  const driverId = userAuth?.driverId;

  const { tickets, isLoading, isError, refetch } = useFindTicketsByDriver(driverId);

  // Filtrar tickets pela busca
  const ticketsFiltrados = useMemo(() => {
    if (!tickets) return [];
    if (!busca.trim()) return tickets;

    const buscaLower = busca.toLowerCase();
    return tickets.filter((ticket: any) => {
      const ticketNumber = ticket.ticketNumber?.toLowerCase() || '';
      const subject = ticket.subject?.toLowerCase() || '';
      const description = ticket.description?.toLowerCase() || '';
      const statusLabel = mapStatus(ticket.status).toLowerCase();

      return (
        ticketNumber.includes(buscaLower) ||
        subject.includes(buscaLower) ||
        description.includes(buscaLower) ||
        statusLabel.includes(buscaLower)
      );
    });
  }, [tickets, busca]);

  function formatarData(data: string | Date | null | undefined): string {
    if (!data) return '-';
    const date = typeof data === 'string' ? new Date(data) : data;
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function handleTicketPress(ticket: any) {
    router.push({
      pathname: '/(auth)/(tabs)/menu/protocolos/[id]',
      params: { id: ticket.id },
    });
  }

  function handleViewChat(chatId: string) {
    router.push({
      pathname: '/(auth)/(tabs)/menu/suporte/[id]',
      params: { id: chatId },
    });
  }

  function handleRetry() {
    refetch();
  }

  return (
    <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset="textTitleScreen" fontWeightPreset="bold" color="colorTextPrimary">
      Histórico de Protocolos
    </Text>}>
      <Box flex={1} backgroundColor="white" pt="y12" pb="y24">

        <Text preset="text15" color="gray500" mb="y16">
          Veja todos os seus protocolos de atendimento e suas resoluções.
        </Text>

        {/* Barra de Busca */}
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent='center'
          gap="x12"
          mb="y24"
        >
          <Box
            flex={1}
            flexDirection="row"
            alignItems="center"
            gap="x8"
            backgroundColor="white"

            px="x16"
            py="y12"
          >
            <Input
              title='Protocolos'
              placeholder="Buscar protocolo..."
              value={busca}
              onChangeText={setBusca}
              style={{ flex: 1 }}
              width={measure.x320}
            />
          </Box>

        </Box>

        {/* Loading */}
        {isLoading && (
          <Box py="y32" alignItems="center">
            <ActivityIndicator />
            <Text preset="text14" color="gray500" mt="y16">
              Carregando...
            </Text>
          </Box>
        )}

        {/* Erro */}
        {isError && !isLoading && (
          <Box py="y32" alignItems="center" >
            <Text preset="text14" color="colorTextError" textAlign="center" mb="y16">
              Erro ao carregar dados. Por favor, tente novamente.
            </Text>
            <TouchableOpacityBox
              backgroundColor="primary100"
              px="x24"
              py="y12"
              borderRadius="s8"
              onPress={handleRetry}
            >
              <Text preset="text14" fontWeightPreset='bold' color="white">
                Tentar novamente
              </Text>
            </TouchableOpacityBox>
          </Box>
        )}

        {/* Sem protocolos */}
        {!isLoading && !isError && ticketsFiltrados.length === 0 && (
          <Box py="y32" alignItems="center">
            <Text preset="text14" color="gray400" textAlign="center">
              {busca.trim()
                ? 'Nenhum protocolo encontrado com essa busca.'
                : 'Nenhum protocolo encontrado.'}
            </Text>
          </Box>
        )}

        {/* Lista de protocolos */}
        {!isLoading && !isError && ticketsFiltrados.length > 0 && (
          <Box scrollable>
            <Box gap="y16">
              {ticketsFiltrados.map((ticket: any) => {
                const status = mapStatus(ticket.status);
                const statusColor = getStatusColor(ticket.status);
                const dataAbertura = formatarData(ticket.openedAt || ticket.createdAt);

                return (
                  <TouchableOpacityBox
                    key={ticket.id}
                    backgroundColor="white"
                    borderRadius="s16"
                    p="y16"
                    borderWidth={measure.m1}
                    borderColor="gray200"
                    onPress={() => handleTicketPress(ticket)}
                  >
                    <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="y12">
                      <Box flex={1}>
                        <Text preset="text14" fontWeightPreset='bold' color="primary100" mb="y4">
                          {ticket.ticketNumber}
                        </Text>
                        {ticket.subject && (
                          <Text preset="text14" color="gray600" numberOfLines={1}>
                            {ticket.subject}
                          </Text>
                        )}
                      </Box>
                      <Box
                        backgroundColor="alertColor"
                        px="x12"
                        py="y4"
                        borderRadius="s8"
                        ml="x12"
                      >
                        <Text preset="text12" color="white" fontWeightPreset='semibold'>
                          {status}
                        </Text>
                      </Box>
                    </Box>

                    <Box flexDirection="row" flexWrap="wrap" gap="x12" mb="y8">
                      <Text preset="text13" color="gray600">
                        Aberto em: {dataAbertura}
                      </Text>
                    </Box>

                    {ticket.transferDescription && (
                      <Box
                        backgroundColor="secondary100"
                        borderRadius="s8"
                        p="y8"
                        mb="y8"
                        borderWidth={measure.m1}
                        borderColor="secondary100"
                      >
                        <Text preset="text13" fontWeightPreset='bold' color="secondary100" mb="y4">
                          Transferência:
                        </Text>
                        <Text preset="text13" color="gray700" numberOfLines={2}>
                          {ticket.transferDescription}
                        </Text>
                      </Box>
                    )}

                    {ticket.resolutionDescription && (
                      <Box
                        backgroundColor="primary10"
                        borderRadius="s12"
                        p="y12"
                        mt="y8"
                      >
                        <Text preset="text13" fontWeightPreset='semibold' color="colorTextPrimary" mb="y4">
                          Resolução:
                        </Text>
                        <Text preset="text13" color="gray700" numberOfLines={3}>
                          {ticket.resolutionDescription}
                        </Text>
                      </Box>
                    )}

                    {/* Link funcional para chat */}
                    {ticket.chatId && (
                      <TouchableOpacityBox
                        mt="y12"
                        flexDirection="row"
                        alignItems="center"
                        onPress={(e) => {
                          e?.stopPropagation?.();
                          handleViewChat(ticket.chatId);
                        }}
                      >
                        <Text preset="text13" color="primary100" fontWeightPreset='semibold'>
                          Ver histórico de chat →
                        </Text>
                      </TouchableOpacityBox>
                    )}
                  </TouchableOpacityBox>
                );
              })}
            </Box>
          </Box>
        )}
      </Box>
    </ScreenBase>

  );
}

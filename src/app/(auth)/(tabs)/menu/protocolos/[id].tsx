import { ScrollView } from 'react-native';

import { useRouter, useLocalSearchParams } from 'expo-router';

import { ActivityIndicator, Box, Text, Button, ScreenBase } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { TicketStatus } from '@/domain/agility/ticket/dto/types';
import { useGetTicket } from '@/domain/agility/ticket/useCase';
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

export default function ProtocoloDetalhesScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const ticketId = id ? String(id) : undefined;


  const { ticket, isLoading, isError, refetch } = useGetTicket(ticketId);

  function handleViewChat() {
    if (ticket?.chatId) {
      router.push({
        pathname: '/(auth)/(tabs)/menu/suporte/[id]',
        params: { id: ticket.chatId },
      });
    }
  }

  if (isLoading) {
    return (
      <Box flex={1} backgroundColor="white" alignItems="center" justifyContent="center">
        <ActivityIndicator />
        <Text preset="text14" color="gray500" mt="y16">
          Carregando...
        </Text>
      </Box>
    );
  }

  if (isError || !ticket) {
    return (
      <Box flex={1} backgroundColor="white" alignItems="center" justifyContent="center" px="x16">
        <Text preset="text16" color="gray500" textAlign="center">
          Protocolo não encontrado.
        </Text>
        <Button
          title="Voltar"
          onPress={() => router.back()}
          mt="y24"
        />
      </Box>
    );
  }

  if (!ticket) {
    return (
      <Box flex={1} backgroundColor="white" alignItems="center" justifyContent="center" px="x16">
        <Text preset="text16" color="gray500" textAlign="center">
          Protocolo não encontrado.
        </Text>
        <Button
          title="Tentar novamente"
          onPress={() => refetch()}
          mt="y24"
        />
      </Box>
    );
  }

  const status = mapStatus(ticket.status);
  const statusColor = getStatusColor(ticket.status);

  return (
    <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset="textTitleScreen" alignItems='center'>
      Protocolo {ticket.ticketNumber}
    </Text>}>
      <Box flex={1} backgroundColor="white" px="x16" pt="y12" pb="y24">


        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Status */}
          <Box
            backgroundColor="alertColor"
            px="x16"
            py="y8"
            borderRadius="s8"
            mb="y24"
            alignSelf="flex-start"
          >
            <Text preset="text14" color="white" fontWeight="600">
              {status}
            </Text>
          </Box>

          {/* Informações do Protocolo */}
          <Box gap="y16" mb="y24">
            {ticket.subject && (
              <Box>
                <Text preset="text13" color="gray600" mb="y4">
                  Assunto:
                </Text>
                <Text preset="text15" color="colorTextPrimary" fontWeight="500">
                  {ticket.subject}
                </Text>
              </Box>
            )}

            {ticket.description && (
              <Box>
                <Text preset="text13" color="gray600" mb="y4">
                  Descrição:
                </Text>
                <Text preset="text14" color="colorTextPrimary">
                  {ticket.description}
                </Text>
              </Box>
            )}

            <Box>
              <Text preset="text13" color="gray600" mb="y4">
                Data de abertura:
              </Text>
              <Text preset="text14" color="colorTextPrimary">
                {formatarData(ticket.openedAt || ticket.createdAt)}
              </Text>
            </Box>

            {ticket.resolvedAt && (
              <Box>
                <Text preset="text13" color="gray600" mb="y4">
                  Data de resolução:
                </Text>
                <Text preset="text14" color="colorTextPrimary">
                  {formatarData(ticket.resolvedAt)}
                </Text>
              </Box>
            )}

            {ticket.closedAt && (
              <Box>
                <Text preset="text13" color="gray600" mb="y4">
                  Data de fechamento:
                </Text>
                <Text preset="text14" color="colorTextPrimary">
                  {formatarData(ticket.closedAt)}
                </Text>
              </Box>
            )}
          </Box>

          {/* Transferência */}
          {ticket.transferDescription && (
            <Box
              backgroundColor="primary100"
              borderRadius="s12"
              p="y16"
              mb="y24"
              borderWidth={measure.m1}
              borderColor="primary100"
            >
              <Text preset="text16" fontWeight="600" color="primary100" mb="y8">
                Transferência do Protocolo
              </Text>
              <Text preset="text14" color="gray700">
                {ticket.transferDescription}
              </Text>
            </Box>
          )}

          {/* Resolução */}
          {ticket.resolutionDescription && (
            <Box
              backgroundColor="primary10"
              borderRadius="s12"
              p="y16"
              mb="y24"
              borderWidth={measure.m1}
              borderColor="primary100"
            >
              <Text preset="text16" fontWeightPreset='semibold' mb="y8">
                Resolução do Protocolo:
              </Text>
              <Text preset="text14" color="gray700">
                {ticket.resolutionDescription}
              </Text>
            </Box>
          )}

          {/* Botão para ver histórico de chat */}
          {ticket.chatId && (
            <Button
              title="Ver Histórico de Chat"
              onPress={handleViewChat}
              mb="y16"
            />
          )}

          {!ticket.resolutionDescription && (
            <Box
              backgroundColor="gray100"
              borderRadius="s12"
              p="y16"
              mb="y24"
            >
              <Text preset="text14" color="gray600" textAlign="center">
                Este protocolo ainda não foi resolvido.
              </Text>
            </Box>
          )}
        </ScrollView>
      </Box>
    </ScreenBase>


  );
}


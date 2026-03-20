import { useState, useEffect } from 'react';
import { ScrollView } from 'react-native';

import { useRouter, useLocalSearchParams } from 'expo-router';

import { ActivityIndicator, Box, Text, TouchableOpacityBox, Button } from '@/components';
import { TicketStatus } from '@/domain/agility/ticket/dto/types';
import { getTicketService } from '@/domain/agility/ticket/ticketService';

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
  const map: Record<TicketStatus, string> = {
    [TicketStatus.OPEN]: 'blue500',
    [TicketStatus.ASSIGNED]: 'purple500',
    [TicketStatus.IN_PROGRESS]: 'orange500',
    [TicketStatus.RESOLVED]: 'greenSuccess',
    [TicketStatus.TRANSFERRED]: 'orange500',
    [TicketStatus.CLOSED]: 'gray500',
  };
  return map[status] ?? 'gray500';
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
  
  const [ticket, setTicket] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTicket = async () => {
      if (!ticketId) return;
      
      setIsLoading(true);
      try {
        const result = await getTicketService(ticketId);
        if (result.success && result.result) {
          setTicket(result.result);
        }
      } catch (error) {
        console.error('Error loading ticket:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTicket();
  }, [ticketId]);

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
      <Box flex={1} bg="white" alignItems="center" justifyContent="center">
        <ActivityIndicator />
        <Text preset="text14" color="gray500" mt="y16">
          Carregando...
        </Text>
      </Box>
    );
  }

  if (!ticket) {
    return (
      <Box flex={1} bg="white" alignItems="center" justifyContent="center" px="x16">
        <Text preset="text16" color="gray500" textAlign="center">
          Protocolo não encontrado.
        </Text>
        <Button
          label="Voltar"
          onPress={() => router.back()}
          mt="y24"
        />
      </Box>
    );
  }

  const status = mapStatus(ticket.status);
  const statusColor = getStatusColor(ticket.status);

  return (
    <Box flex={1} bg="white" px="x16" pt="y12" pb="y24">
      {/* Header */}
      <Box flexDirection="row" alignItems="center" justifyContent="space-between" mb="y24">
        <TouchableOpacityBox onPress={() => router.back()} mr="x12">
          <Text preset="text18" color="primary100">←</Text>
        </TouchableOpacityBox>
        <Box flex={1}>
          <Text preset="text20" fontWeight="600" color="colorTextPrimary">
            Protocolo {ticket.ticketNumber}
          </Text>
        </Box>
      </Box>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Status */}
        <Box
          bg={statusColor}
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
            bg="orange100"
            borderRadius="s12"
            p="y16"
            mb="y24"
            borderWidth={measure.m1}
            borderColor="orange300"
          >
            <Text preset="text16" fontWeight="600" color="orange700" mb="y8">
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
            bg="green100"
            borderRadius="s12"
            p="y16"
            mb="y24"
            borderWidth={measure.m1}
            borderColor="green300"
          >
            <Text preset="text16" fontWeight="600" color="green700" mb="y8">
              Resolução do Protocolo
            </Text>
            <Text preset="text14" color="gray700">
              {ticket.resolutionDescription}
            </Text>
          </Box>
        )}

        {/* Botão para ver histórico de chat */}
        {ticket.chatId && (
          <Button
            label="Ver Histórico de Chat"
            onPress={handleViewChat}
            mb="y16"
          />
        )}

        {!ticket.resolutionDescription && (
          <Box
            bg="gray100"
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
  );
}

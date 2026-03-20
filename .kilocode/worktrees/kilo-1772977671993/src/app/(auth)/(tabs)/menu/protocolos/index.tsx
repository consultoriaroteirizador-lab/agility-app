import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';

import { 
  ActivityIndicator, 
  Box, 
  Text, 
  TouchableOpacityBox, 
  ScrollView, 
  TextInput 
} from '@/components';
import { TicketStatus } from '@/domain/agility/ticket/dto/types';
import { useFindTicketsByDriver } from '@/domain/agility/ticket/useCase';
import { useAuthCredentialsService } from '@/services';
import { measure } from '@/theme';

function mapStatus(status: TicketStatus): string {
  const map: Record<TicketStatus, string> = {
    [TicketStatus.OPEN]: 'Aberto',
    [TicketStatus.ASSIGNED]: 'Atribuido',
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

export default function HistoricoProtocolosScreen() {
  const router = useRouter();
  const { userAuth } = useAuthCredentialsService();
  const [busca, setBusca] = useState('');
  
  // Obter driverId do usuario autenticado
  // O backend aceita keycloakUserId e converte internamente
  const driverId = userAuth?.id;
  
  const { tickets, isLoading } = useFindTicketsByDriver(driverId);

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

  return (
    <Box flex={1} bg="white" px="x16" pt="y12" pb="y24">
      {/* Header */}
      <Box flexDirection="row" alignItems="center" justifyContent="space-between" mb="y24">
        <TouchableOpacityBox onPress={() => router.back()} mr="x12">
          <Text preset="text18" color="primary100">←</Text>
        </TouchableOpacityBox>
        <Box flex={1}>
          <Text preset="text20" fontWeight="600" color="colorTextPrimary">
            Historico de Protocolos
          </Text>
        </Box>
      </Box>

      <Text preset="text15" color="gray500" mb="y16">
        Veja todos os seus protocolos de atendimento e suas resolucoes.
      </Text>

      {/* Barra de Busca */}
      <Box 
        flexDirection="row" 
        alignItems="center" 
        gap="x12" 
        mb="y24"
      >
        <Box
          flex={1}
          flexDirection="row"
          alignItems="center"
          gap="x8"
          bg="white"
          borderWidth={measure.m1}
          borderColor="gray300"
          borderRadius="s12"
          px="x16"
          py="y12"
        >
          <Text preset="text16">🔍</Text>
          <TextInput
            placeholder="Buscar protocolo..."
            value={busca}
            onChangeText={setBusca}
            style={{ flex: 1 }}
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

      {/* Sem protocolos */}
      {!isLoading && ticketsFiltrados.length === 0 && (
        <Box py="y32" alignItems="center">
          <Text preset="text14" color="gray400" textAlign="center">
            {busca.trim() 
              ? 'Nenhum protocolo encontrado com essa busca.'
              : 'Nenhum protocolo encontrado.'}
          </Text>
        </Box>
      )}

      {/* Lista de protocolos */}
      {!isLoading && ticketsFiltrados.length > 0 && (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Box gap="y16">
            {ticketsFiltrados.map((ticket: any) => {
              const status = mapStatus(ticket.status);
              const statusColor = getStatusColor(ticket.status);
              const dataAbertura = formatarData(ticket.openedAt || ticket.createdAt);

              return (
                <TouchableOpacityBox
                  key={ticket.id}
                  bg="white"
                  borderRadius="s16"
                  p="y16"
                  borderWidth={measure.m1}
                  borderColor="gray200"
                  onPress={() => handleTicketPress(ticket)}
                >
                  <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="y12">
                    <Box flex={1}>
                      <Text preset="text16" fontWeight="600" color="colorTextPrimary" mb="y4">
                        {ticket.ticketNumber}
                      </Text>
                      {ticket.subject && (
                        <Text preset="text14" color="gray600" numberOfLines={2}>
                          {ticket.subject}
                        </Text>
                      )}
                    </Box>
                    <Box
                      bg={statusColor}
                      px="x12"
                      py="y4"
                      borderRadius="s8"
                      ml="x12"
                    >
                      <Text preset="text12" color="white" fontWeight="500">
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
                      bg="orange100"
                      borderRadius="s8"
                      p="y8"
                      mb="y8"
                      borderWidth={measure.m1}
                      borderColor="orange300"
                    >
                      <Text preset="text13" fontWeight="600" color="orange700" mb="y4">
                        Transferencia:
                      </Text>
                      <Text preset="text13" color="gray700" numberOfLines={2}>
                        {ticket.transferDescription}
                      </Text>
                    </Box>
                  )}
                  
                  {ticket.resolutionDescription && (
                    <Box
                      bg="green100"
                      borderRadius="s8"
                      p="y12"
                      mt="y8"
                    >
                      <Text preset="text13" fontWeight="500" color="colorTextPrimary" mb="y4">
                        Resolucao:
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
                      <Text preset="text13" color="primary100" fontWeight="500">
                        Ver historico de chat →
                      </Text>
                    </TouchableOpacityBox>
                  )}
                </TouchableOpacityBox>
              );
            })}
          </Box>
        </ScrollView>
      )}
    </Box>
  );
}

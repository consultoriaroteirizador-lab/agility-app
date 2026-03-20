import { useEffect, useMemo, useState } from 'react';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { ActivityIndicator, Box, Button, Text, TouchableOpacityBox } from '@/components';
import { LocationTrackingProvider } from '@/components/LocationTrackingProvider';
import { useFindOneRouting, useCompleteRouting } from '@/domain/agility/routing/useCase';
import { ServiceType } from '@/domain/agility/service/dto/types';
import { useFindServicesByRoutingId } from '@/domain/agility/service/useCase';
import { measure } from '@/theme';

interface Parada {
  numero: number;
  serviceId: string;
  nome: string;
  endereco: string;
  horarioInicio: string;
  horarioFim: string;
  tipo: string;
  status: 'pendente' | 'em-andamento' | 'concluida-sucesso' | 'concluida-insucesso';
}

/**
 * Mapeia ServiceResponse para Parada
 * IMPORTANTE: Usa APENAS os dados do backend sem transformações desnecessárias
 * Os campos booleanos (isPending, isInProgress, isCompleted, isCanceled) são a fonte da verdade
 */
function mapServiceToParada(service: any, index: number): Parada {
  // Usar posição na lista ordenada para numero (evita duplicados quando backend repete sequenceOrder)
  const numero = index + 1;
  // Usar endereço completo se disponível, senão mostrar apenas o ID
  const endereco = service.address?.formattedAddress 
    ?? (service.addressId ? `Endereço ID: ${service.addressId}` : 'Endereço não disponível');
  const horarioInicio = service.scheduledStartTime ?? '--:--';
  const horarioFim = service.estimatedCompletionTime ?? '--:--';
  
  // Mapear tipo de serviço
  let tipo = 'Serviço';
  if (service.serviceType) {
    const typeMap: Record<ServiceType, string> = {
      [ServiceType.INSTALLATION]: 'Instalação',
      [ServiceType.DELIVERY]: 'Entrega',
      [ServiceType.MAINTENANCE]: 'Manutenção',
      [ServiceType.EXCHANGE]: 'Troca',
      [ServiceType.PICKUP]: 'Coleta',
    };
    tipo = typeMap[service.serviceType as ServiceType] ?? service.serviceType;
  }
  
  // VALIDAÇÃO CRÍTICA: Usar APENAS os campos booleanos do backend
  // Não fazer fallback para enum status, pois os booleanos são calculados pelo backend
  let status: Parada['status'] = 'pendente';
  if (service.isCompleted === true) {
    status = 'concluida-sucesso';
  } else if (service.isCanceled === true || service.isFailed === true) {
    // Serviço marcado como cancelado ou falha = insucesso
    status = 'concluida-insucesso';
  } else if (service.isInProgress === true) {
    status = 'em-andamento';
  } else if (service.isPending === true) {
    status = 'pendente';
  }

  return {
    numero,
    serviceId: service.id,
    nome: service.fantasyName ?? service.responsible ?? 'Cliente',
    endereco,
    horarioInicio,
    horarioFim,
    tipo,
    status,
  };
}

export default function RotaDetalhadaScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const rotaId = id as string;

  const { routing, isLoading: isLoadingRouting } = useFindOneRouting(rotaId);
  const { services, isLoading: isLoadingServices } = useFindServicesByRoutingId(rotaId);
  
  // Logs para debug
  useEffect(() => {
    console.log('[RotaDetalhadaScreen] ===== DEBUG =====');
    console.log('[RotaDetalhadaScreen] rotaId:', rotaId);
    console.log('[RotaDetalhadaScreen] routing:', routing);
    console.log('[RotaDetalhadaScreen] services count:', services?.length || 0);
    console.log('[RotaDetalhadaScreen] services:', JSON.stringify(services, null, 2));
    console.log('[RotaDetalhadaScreen] isLoadingRouting:', isLoadingRouting);
    console.log('[RotaDetalhadaScreen] isLoadingServices:', isLoadingServices);
    console.log('[RotaDetalhadaScreen] =================');
  }, [rotaId, routing, services, isLoadingRouting, isLoadingServices]);
  
  const { completeRouting, isLoading: isCompletingRouting } = useCompleteRouting({
    onSuccess: () => {
      setPopupConcluirRota(false);
      // TODO: Mostrar mensagem de sucesso e navegar
      setTimeout(() => router.back(), 1500);
    },
    onError: (error) => {
      console.error('Erro ao concluir rota:', error);
    },
  });

  const [aba, setAba] = useState<'andamento' | 'concluido'>('andamento');
  const [popupConcluirRota, setPopupConcluirRota] = useState(false);

  // Ordenar serviços por sequenceOrder
  const sortedServices = useMemo(() => {
    return [...services].sort((a, b) => {
      const orderA = a.sequenceOrder ?? 999;
      const orderB = b.sequenceOrder ?? 999;
      return orderA - orderB;
    });
  }, [services]);

  const paradas = useMemo(() => {
    const mapped = sortedServices.map((s, i) => mapServiceToParada(s, i));
    console.log('[RotaDetalhadaScreen] sortedServices:', sortedServices.length);
    console.log('[RotaDetalhadaScreen] paradas mapeadas:', mapped.length);
    console.log('[RotaDetalhadaScreen] paradas:', JSON.stringify(mapped, null, 2));
    return mapped;
  }, [sortedServices]);

  // Encontrar próxima parada: primeira parada pendente OU primeira em andamento
  // Prioridade: em-andamento > pendente
  const proximaParada = paradas.find((p) => p.status === 'em-andamento') 
    ?? paradas.find((p) => p.status === 'pendente') 
    ?? null;

  // Outras paradas: todas as outras que estão pendentes ou em andamento (exceto a próxima)
  const outrasParadas = paradas.filter((p) => 
    p !== proximaParada && (p.status === 'pendente' || p.status === 'em-andamento')
  );
  
  // Validação: Verificar se há mais de uma parada em andamento (não deveria acontecer)
  const paradasEmAndamento = paradas.filter((p) => p.status === 'em-andamento');
  if (paradasEmAndamento.length > 1) {
    console.warn('[RotaDetalhadaScreen] ⚠️ AVISO: Múltiplas paradas em andamento detectadas:', paradasEmAndamento.length);
  }

  const paradasConcluidas = paradas.filter((p) =>
    ['concluida-sucesso', 'concluida-insucesso'].includes(p.status)
  );

  const nenhumAndamento = !proximaParada && outrasParadas.length === 0;
  const isLoading = isLoadingRouting || isLoadingServices;
  
  // Logs adicionais
  useEffect(() => {
    console.log('[RotaDetalhadaScreen] proximaParada:', proximaParada);
    console.log('[RotaDetalhadaScreen] outrasParadas:', outrasParadas.length);
    console.log('[RotaDetalhadaScreen] paradasConcluidas:', paradasConcluidas.length);
    console.log('[RotaDetalhadaScreen] nenhumAndamento:', nenhumAndamento);
  }, [proximaParada, outrasParadas, paradasConcluidas, nenhumAndamento]);

  if (isLoading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" px="x16" py="y32">
        <ActivityIndicator />
        <Text mt="y16">Carregando rota...</Text>
      </Box>
    );
  }

  if (!routing) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" px="x16" py="y32">
        <Text preset="text16" color="gray600">
          Rota não encontrada
        </Text>
        <Button title="Voltar" onPress={() => router.back()} mt="y16" />
      </Box>
    );
  }

  return (
    <LocationTrackingProvider>
      <Box flex={1} px="x16" pt="y12" pb="y24">
        {/* Header */}
      <Box flexDirection="row" alignItems="center" justifyContent="space-between" mb="y16">
        <TouchableOpacityBox onPress={() => router.back()} mr="x12">
          <Text preset="text18" color="primary100">←</Text>
        </TouchableOpacityBox>
        <Box flex={1} flexDirection="row" alignItems="center" gap="x8">
          <Text preset="text18" fontWeight="500" color="colorTextPrimary">
            {routing.name || `Rota ${routing.code || rotaId}`}
          </Text>
          {proximaParada && (
            <Box bg="primary10" px="x12" py="y2" borderRadius="s20">
              <Text preset="text13" color="primary100">
                {proximaParada.numero}/{paradas.length}
              </Text>
            </Box>
          )}
        </Box>
      </Box>

      {/* Tabs */}
      <Box flexDirection="row" gap="x8" mb="y24" borderBottomWidth={1} borderBottomColor="gray200">
        <TouchableOpacityBox
          pb="y8"
          borderBottomWidth={aba === 'andamento' ? 2 : 0}
          borderBottomColor={aba === 'andamento' ? 'primary100' : 'transparent'}
          onPress={() => setAba('andamento')}
        >
          <Text 
            preset="text15" 
            color={aba === 'andamento' ? 'primary100' : 'gray400'}
            fontWeight={aba === 'andamento' ? '600' : '400'}
          >
            Em andamento
          </Text>
        </TouchableOpacityBox>
        <TouchableOpacityBox
          pb="y8"
          borderBottomWidth={aba === 'concluido' ? 2 : 0}
          borderBottomColor={aba === 'concluido' ? 'primary100' : 'transparent'}
          onPress={() => setAba('concluido')}
        >
          <Text 
            preset="text15" 
            color={aba === 'concluido' ? 'primary100' : 'gray400'}
            fontWeight={aba === 'concluido' ? '600' : '400'}
          >
            Concluído
          </Text>
        </TouchableOpacityBox>
      </Box>

      {/* ABA EM ANDAMENTO */}
      {aba === 'andamento' && (
        <Box gap="y16">
          {proximaParada && (
            <Box>
              <Text preset="text14" color="gray600" mb="y8">
                Próxima parada
              </Text>
              <TouchableOpacityBox
                bg="white"
                borderRadius="s12"
                p="y16"
                borderWidth={measure.m1}
                borderColor="primary100"
                onPress={() => {
                  if (!proximaParada.serviceId) {
                    console.error('[RotaDetalhadaScreen] serviceId não encontrado para próxima parada:', proximaParada);
                    return;
                  }
                  console.log('[RotaDetalhadaScreen] Navegando para parada em andamento', {
                    rotaId,
                    serviceId: proximaParada.serviceId,
                  });
                  router.push({
                    pathname: '/rotas-detalhadas/[id]/parada/[pid]',
                    params: { id: rotaId, pid: proximaParada.serviceId },
                  });
                }}
              >
                <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="y8">
                  <Text preset="text16" fontWeight="500" color="colorTextPrimary">
                    Parada {proximaParada.numero}
                  </Text>
                  <Text preset="text13" color="primary100">
                    {proximaParada.status === 'em-andamento' ? 'Em andamento' : 'Pendente'}
                  </Text>
                </Box>
                <Text preset="text14" color="gray600" mb="y4">
                  {proximaParada.nome}
                </Text>
                <Text preset="text13" color="gray400">
                  {proximaParada.endereco}
                </Text>
                <Text preset="text12" color="gray400" mt="y8">
                  {proximaParada.horarioInicio} - {proximaParada.horarioFim}
                </Text>
              </TouchableOpacityBox>
            </Box>
          )}

          {outrasParadas.length > 0 && (
            <Box>
              <Text preset="text14" color="gray600" mb="y8">
                Outras paradas
              </Text>
              <Box gap="y12">
                {outrasParadas.map((p) => (
                  <TouchableOpacityBox
                    key={p.serviceId}
                    bg="white"
                    borderRadius="s12"
                    p="y16"
                    borderWidth={measure.m1}
                    borderColor="gray200"
                    onPress={() => {
                      if (!p.serviceId) {
                        console.error('[RotaDetalhadaScreen] serviceId não encontrado para parada:', p);
                        return;
                      }
                      console.log('[RotaDetalhadaScreen] Navegando para outra parada', {
                        rotaId,
                        serviceId: p.serviceId,
                      });
                      router.push({
                        pathname: '/rotas-detalhadas/[id]/parada/[pid]',
                        params: { id: rotaId, pid: p.serviceId },
                      });
                    }}
                  >
                    <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="y8">
                      <Text preset="text16" fontWeight="500" color="colorTextPrimary">
                        Parada {p.numero}
                      </Text>
                      <Text preset="text13" color="gray400">
                        {p.status === 'em-andamento' ? 'Em andamento' : 'Pendente'}
                      </Text>
                    </Box>
                    <Text preset="text14" color="gray600" mb="y4">
                      {p.nome}
                    </Text>
                    <Text preset="text13" color="gray400">
                      {p.endereco}
                    </Text>
                  </TouchableOpacityBox>
                ))}
              </Box>
            </Box>
          )}

          {nenhumAndamento && (
            <Button
              title="Concluir rota"
              onPress={() => setPopupConcluirRota(true)}
              mt="y16"
            />
          )}
        </Box>
      )}

      {/* ABA CONCLUÍDO */}
      {aba === 'concluido' && (
        <Box gap="y24">
          <Box>
            <Text preset="text15" fontWeight="600" color="gray500" mb="y8">
              Concluídas com sucesso
            </Text>
            {paradasConcluidas.filter((p) => p.status === 'concluida-sucesso').length === 0 && (
              <Text preset="text14" color="gray400">
                Nenhuma parada concluída com sucesso.
              </Text>
            )}
            <Box gap="y12">
              {paradasConcluidas
                .filter((p) => p.status === 'concluida-sucesso')
                .map((p) => (
                  <Box
                    key={p.serviceId}
                    bg="white"
                    borderRadius="s12"
                    p="y16"
                    borderWidth={measure.m1}
                    borderColor="gray200"
                    opacity={0.6}
                  >
                    <Text preset="text16" fontWeight="500" color="colorTextPrimary" mb="y4">
                      Parada {p.numero} - {p.nome}
                    </Text>
                    <Text preset="text13" color="gray400">
                      {p.endereco}
                    </Text>
                  </Box>
                ))}
            </Box>
          </Box>

          <Box>
            <Text preset="text15" fontWeight="600" color="gray500" mb="y8">
              Concluídas com insucesso
            </Text>
            {paradasConcluidas.filter((p) => p.status === 'concluida-insucesso').length === 0 && (
              <Text preset="text14" color="gray400">
                Nenhuma parada marcada como insucesso.
              </Text>
            )}
            <Box gap="y12">
              {paradasConcluidas
                .filter((p) => p.status === 'concluida-insucesso')
                .map((p) => (
                  <Box
                    key={p.serviceId}
                    bg="white"
                    borderRadius="s12"
                    p="y16"
                    borderWidth={measure.m1}
                    borderColor="redError"
                    opacity={0.6}
                  >
                    <Text preset="text16" fontWeight="500" color="redError" mb="y4">
                      Parada {p.numero} - {p.nome}
                    </Text>
                    <Text preset="text13" color="gray400">
                      {p.endereco}
                    </Text>
                  </Box>
                ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* TODO: Adicionar modal de confirmação de conclusão */}
      {popupConcluirRota && (
        <Box
          position="absolute"
          top={measure.t0}
          left={measure.l0}
          right={measure.r0}
          bottom={measure.b0}
          bg="blackOpaque"
          justifyContent="center"
          alignItems="center"
          zIndex={1000}
        >
          <Box bg="white" borderRadius="s16" p="y24" width="85%" maxWidth={measure.x340}>
            <Text preset="text18" fontWeight="600" color="colorTextPrimary" mb="y8">
              Concluir rota
            </Text>
            <Text preset="text14" color="gray600" mb="y24">
              Deseja realmente concluir esta rota?
            </Text>
            <Box flexDirection="row" gap="x16">
              <Button
                title="Cancelar"
                preset="outline"
                onPress={() => setPopupConcluirRota(false)}
                flex={1}
              />
              <Button
                title={isCompletingRouting ? 'Concluindo...' : 'Concluir'}
                onPress={() => completeRouting(rotaId)}
                flex={1}
              />
            </Box>
          </Box>
        </Box>
      )}
      </Box>
    </LocationTrackingProvider>
  );
}
import { useMemo, useState } from 'react';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { ActivityIndicator, Box, Text, Button, Image, ScreenBase } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { Icon } from '@/components/Icon/Icon';
import Modal from '@/components/Modal/Modal';
import { formatAddress } from '@/domain/agility/address/dto';
import { useFindOneRouting, useAcceptRouting } from '@/domain/agility/routing/useCase';
import { ServiceType } from '@/domain/agility/service/dto/types';
import { useFindServicesByRoutingId } from '@/domain/agility/service/useCase';
import { useAppSafeArea } from '@/hooks';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';
import { formatDateOnly } from '@/utils/formatDate';

import { MapaParadasModal } from '../../rotas-detalhadas/[id]/_components/MapaParadasModal';
import { useUserLocation } from '../../rotas-detalhadas/[id]/parada/[pid]/_hooks/useUserLocation';
import { distanciaLinhaReta, resumirCarga } from '../_utils/cargaOferta';

const SERVICE_TYPE_LABEL: Record<ServiceType, string> = {
  [ServiceType.DELIVERY]: 'Entrega',
  [ServiceType.PICKUP]: 'Coleta',
  [ServiceType.SERVICE]: 'Serviço',
  [ServiceType.TRANSFER]: 'Transferência',
  [ServiceType.RETURN]: 'Retorno',
};

function formatarDistancia(km: number | null | undefined): string {
  if (!km) return '0 km';
  return `${km.toFixed(1).replace('.', ',')} km`;
}

function formatarTempo(minutos: number | null | undefined): string {
  if (!minutos) return '0h';
  if (minutos < 60) return `${Math.round(minutos)}min`;
  const horas = Math.floor(minutos / 60);
  const mins = Math.round(minutos % 60);
  return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
}

function formatarPreco(valor: number | null | undefined): string {
  if (!valor) return 'R$ 0,00';
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

function formatarPeso(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1).replace('.', ',')} t`;
  // Peso fracionado só ajuda em carga leve; acima de 100 kg o decimal é ruído.
  return kg >= 100 ? `${Math.round(kg)} kg` : `${kg.toFixed(1).replace('.', ',')} kg`;
}

function formatarVolume(m3: number): string {
  return `${m3.toFixed(2).replace('.', ',')} m³`;
}

/**
 * Distância até a origem em linha reta. Abaixo de 1 km o número em km vira
 * "0,3 km" e parece longe; em metros o motorista entende que é ali.
 */
function formatarDistanciaAproximada(km: number): string {
  if (km < 1) return `~${Math.round(km * 1000)} m`;
  return `~${km.toFixed(1).replace('.', ',')} km`;
}

export default function OfertaDetalhadaScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const routingId = id as string;

  const { userLocation } = useUserLocation();
  const { routing, isLoading: isLoadingRouting } = useFindOneRouting(routingId);
  const { services, isLoading: isLoadingServices } = useFindServicesByRoutingId(routingId);
  const { showToast } = useToastService();
  const safeArea = useAppSafeArea();
  const [mostrarPopup, setMostrarPopup] = useState(false);
  const [mostrarMapa, setMostrarMapa] = useState(false);

  const { acceptRouting, isLoading: isAccepting } = useAcceptRouting({
    onSuccess: () => {
      showToast({ message: 'Rota aceita com sucesso', type: 'success' });
      router.push('/(auth)/(tabs)');
    },
    onError: (error: any) => {
      // Backend retorna { error: { message } } (ex.: rejeição de capacidade
      // do veículo) — priorizar essa mensagem sobre um texto genérico.
      const errorMessage = error?.error?.message || error?.message || 'Erro ao aceitar rota';
      showToast({ message: errorMessage, type: 'error' });
    },
  });

  // O RETURN (retorno à origem) NÃO é uma parada de pedido — é o trecho de volta.
  // Não pode contar como parada nem aparecer como "Endereço não disponível".
  // Ele é renderizado à parte (linha "Retorno à origem"), fora desta lista.
  const paradas = useMemo(() => {
    if (!services || services.length === 0) return [];

    return [...services]
      .filter((service) => service.serviceType !== ServiceType.RETURN)
      .sort((a, b) => (a.sequenceOrder ?? 999) - (b.sequenceOrder ?? 999))
      .map((service) => {
        const isTransfer = service.serviceType === ServiceType.TRANSFER
          && (!!service.pickupAddress || !!service.deliveryAddress);

        return {
          tipo: service.serviceType
            ? (SERVICE_TYPE_LABEL[service.serviceType as ServiceType] ?? service.serviceType)
            : 'Serviço',
          endereco: service.address
            ? formatAddress(service.address)
            : 'Endereço não disponível',
          isTransfer,
          enderecoColeta: isTransfer ? formatAddress(service.pickupAddress) : null,
          enderecoEntrega: isTransfer ? formatAddress(service.deliveryAddress) : null,
        };
      });
  }, [services]);

  // Mostra o retorno à origem quando a rota volta (returnToOrigin/hasReturn),
  // como um marcador — não como uma parada.
  const retorno = useMemo(() => {
    if (!routing?.returnToOrigin && !routing?.hasReturn) return null;
    return {
      endereco: routing?.returnAddress || routing?.originAddress || 'Retorno ao ponto de origem',
    };
  }, [routing]);

  const resumo = useMemo(() => ({
    totalParadas: paradas.length,
    preco: formatarPreco(routing?.totalValue),
    distancia: formatarDistancia(routing?.totalDistanceKm),
    tempoTotal: formatarTempo(routing?.totalDurationMinutes),
    // `routing.date` é dia-calendário gravado como meia-noite UTC — `formatDateOnly`
    // extrai o dia sem deslocar pelo fuso (getters locais voltavam 1 dia em UTC-3).
    data: routing?.date ? formatDateOnly(routing.date) : '',
  }), [routing, paradas]);

  // Peso, cubagem, itens e cobrança na entrega vêm dos serviços: a rota não
  // carrega totais de carga no seu próprio contrato.
  const carga = useMemo(() => resumirCarga(services), [services]);

  // Quanto o motorista roda até o ponto de partida, antes mesmo de começar a
  // ganhar. Linha reta — é estimativa de ordem de grandeza, não rota.
  const distanciaAteOrigem = useMemo(() => distanciaLinhaReta(
    userLocation?.coords,
    { latitude: routing?.originLatitude, longitude: routing?.originLongitude },
  ), [userLocation, routing?.originLatitude, routing?.originLongitude]);

  const composicaoTexto = useMemo(() => carga.composicao
    .map(({ tipo, quantidade }) => `${quantidade} ${SERVICE_TYPE_LABEL[tipo] ?? tipo}${quantidade > 1 ? 's' : ''}`)
    .join(' · '), [carga.composicao]);

  const handleAcceptRouting = () => {
    setMostrarPopup(false);
    acceptRouting({
      routingId,
      payload: {
        driverLatitude: userLocation?.coords.latitude,
        driverLongitude: userLocation?.coords.longitude,
      },
    });
  };

  const isLoading = isLoadingRouting || isLoadingServices;

  if (isLoading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" px="x16" py="y32">
        <ActivityIndicator />
        <Text mt="y16">Carregando oferta...</Text>
      </Box>
    );
  }

  if (!routing) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" px="x16" py="y32">
        <Text preset="text16" color="gray600">Oferta não encontrada</Text>
        <Button title="Voltar" onPress={() => router.back()} mt="y16" />
      </Box>
    );
  }

  return (
    <ScreenBase
      buttonLeft={<ButtonBack />}
      title={<Text preset="textTitleScreen">Rota</Text>}
    >
      {/*
        O espaço para livrar a tab bar tem de ir em `contentContainerStyle`, NÃO em
        `style`. Com `scrollable`, o Box vira ScrollView: padding no `style` encolhe
        a janela visível, enquanto o conteúdo rolável continua terminando onde
        terminava — então Recusar/Aceitar seguiam cortados ao rolar até o fim. É o
        `contentContainerStyle` que estende o conteúdo e deixa os botões subirem
        acima da barra.

        O valor já era folgado (tab bar ~64pt + safe-area); o defeito era a prop.
      */}
      <Box
        flex={1}
        pt="y12"
        scrollable
        contentContainerStyle={{ paddingBottom: safeArea.bottom + 96 }}
      >

        {/* Tags de Resumo */}
        <Box flexDirection="row" flexWrap="wrap" gap="x12" mb="y24">
          <TagResumo icon={<Image source={require('@/assets/images/agility/cards/map-pin.png')} width={measure.x16} height={measure.y16} resizeMode="contain" />}>
            {resumo.totalParadas} paradas
          </TagResumo>
          <TagResumo icon={<Icon name="attach-money" />}>
            Frete: {resumo.preco}
          </TagResumo>
          <TagResumo icon={<Icon name="straighten" />}>
            {resumo.distancia}
          </TagResumo>
          <TagResumo icon={<Icon name="av-timer" />} variant="neutral">
            {resumo.tempoTotal}
          </TagResumo>
          {!!resumo.data && (
            <TagResumo icon={<Icon name="event" />} variant="neutral">
              {resumo.data}
            </TagResumo>
          )}
        </Box>

        {/*
          Card de carga — o que o motorista vai levar. Cada linha só aparece se
          houver número: rota de serviço em campo não tem peso nem cubagem, e
          mostrar "0 kg / 0,00 m³" faria a tela afirmar algo falso sobre a carga.
        */}
        <CardCarga
          peso={carga.pesoKg > 0 ? formatarPeso(carga.pesoKg) : null}
          volume={carga.volumeM3 > 0 ? formatarVolume(carga.volumeM3) : null}
          itens={carga.itens > 0 ? String(carga.itens) : null}
          composicao={composicaoTexto || null}
          valorCarga={carga.valorCarga > 0 ? formatarPreco(carga.valorCarga) : null}
          cobranca={carga.cobranca.paradas > 0 ? carga.cobranca : null}
        />

        {/* Ver rota no mapa */}
        <Button
          title="Ver rota no mapa"
          preset="outline"
          iconName="map"
          onPress={() => setMostrarMapa(true)}
          mb="y24"
        />

        {/* Timeline de Paradas */}
        <Box gap="y16" mb="y24">
          {/* Origem — de onde o motorista sai */}
          <Box flexDirection="row" alignItems="flex-start" gap="x12">
            <Box alignItems="center" width={measure.x24}>
              <Box
                width={measure.x24}
                height={measure.y24}
                borderRadius="s12"
                borderWidth={measure.m2}
                borderColor="primary100"
                backgroundColor="white"
                justifyContent="center"
                alignItems="center"
              >
                <Icon name="home" size={12} color="primary100" />
              </Box>
              {(paradas.length > 0 || retorno) && (
                <Box width={measure.x2} flex={1} backgroundColor="gray200" mt="y4" />
              )}
            </Box>
            <Box flex={1} backgroundColor="white" borderRadius="s12" p="y16" borderWidth={measure.m1} borderColor="gray200">
              <Text preset="text14" fontWeightPreset='semibold' color="colorTextPrimary" mb="y4">
                Origem
              </Text>
              <Text preset="text13" color="gray400">
                {routing.originAddress || 'Ponto de partida'}
              </Text>
              {/*
                Só aparece com localização concedida E origem geocodificada. É
                distância em linha reta: o texto diz isso, porque o motorista não
                pode confundir com o trajeto que vai de fato dirigir.
              */}
              {distanciaAteOrigem !== null && (
                <Box flexDirection="row" alignItems="center" gap="x4" mt="y8">
                  <Icon name="near-me" size={12} color="gray400" />
                  <Text preset="text12" color="gray400">
                    {formatarDistanciaAproximada(distanciaAteOrigem)} de você, em linha reta
                  </Text>
                </Box>
              )}
            </Box>
          </Box>

          {paradas.map((parada, index) => (
            <Box key={index} flexDirection="row" alignItems="flex-start" gap="x12">
              <Box alignItems="center" width={measure.x24}>
                <Box width={measure.x16} height={measure.y16} borderRadius="s8" backgroundColor="primary100" />
                {(index < paradas.length - 1 || retorno) && (
                  <Box width={measure.x2} flex={1} backgroundColor="gray200" mt="y4" />
                )}
              </Box>
              <Box flex={1} backgroundColor="white" borderRadius="s12" p="y16" borderWidth={measure.m1} borderColor="gray200">
                <Text preset="text14" fontWeightPreset='semibold' color="colorTextPrimary" mb="y4">
                  {parada.tipo}
                </Text>
                {parada.isTransfer ? (
                  <Box gap="y8">
                    <Box>
                      <Text preset="text12" color="gray600">Coleta</Text>
                      <Text preset="text13" color="gray400">
                        {parada.enderecoColeta}
                      </Text>
                    </Box>
                    <Box>
                      <Text preset="text12" color="gray600">Entrega</Text>
                      <Text preset="text13" color="gray400">
                        {parada.enderecoEntrega}
                      </Text>
                    </Box>
                  </Box>
                ) : (
                  <Text preset="text13" color="gray400">
                    {parada.endereco}
                  </Text>
                )}
              </Box>
            </Box>
          ))}

          {/* Retorno à origem — marcador, NÃO é uma parada de pedido */}
          {retorno && (
            <Box flexDirection="row" alignItems="flex-start" gap="x12">
              <Box alignItems="center" width={measure.x24}>
                <Box
                  width={measure.x16}
                  height={measure.y16}
                  borderRadius="s8"
                  borderWidth={measure.m2}
                  borderColor="primary100"
                  backgroundColor="white"
                />
              </Box>
              <Box flex={1} backgroundColor="gray50" borderRadius="s12" p="y16" borderWidth={measure.m1} borderColor="gray200">
                <Text preset="text14" fontWeightPreset='semibold' color="gray600" mb="y4">
                  Retorno à origem
                </Text>
                <Text preset="text13" color="gray400">
                  {retorno.endereco}
                </Text>
              </Box>
            </Box>
          )}
        </Box>

        {/* Botões */}
        <Box flexDirection="row" gap="x16" mt="y16">
          <Button title="Recusar" preset="outline" onPress={() => router.back()} flex={1} />
          <Button
            title={isAccepting ? 'Aceitando...' : 'Aceitar'}
            onPress={() => setMostrarPopup(true)}
            flex={1}
            disabled={isAccepting}
          />
        </Box>

        <Modal
          preset="action"
          buttonActionTitle="Aceitar"
          title="Aceitar oferta"
          onPress={handleAcceptRouting}
          isVisible={mostrarPopup}
          onClose={() => setMostrarPopup(false)}
        />

        <MapaParadasModal
          visible={mostrarMapa}
          onClose={() => setMostrarMapa(false)}
          routeId={routingId}
        />
      </Box>
    </ScreenBase>
  );
}

// Card de carga — some inteiro quando a rota não tem nada de carga a declarar.
type CardCargaProps = {
  peso: string | null;
  volume: string | null;
  itens: string | null;
  composicao: string | null;
  valorCarga: string | null;
  cobranca: { valor: number; paradas: number } | null;
};

function CardCarga({ peso, volume, itens, composicao, valorCarga, cobranca }: CardCargaProps) {
  const linhas = [
    { rotulo: 'Peso', valor: peso },
    { rotulo: 'Cubagem', valor: volume },
    { rotulo: 'Volumes', valor: itens },
    { rotulo: 'Composição', valor: composicao },
    { rotulo: 'Valor da carga', valor: valorCarga },
  ].filter((linha): linha is { rotulo: string; valor: string } => !!linha.valor);

  if (linhas.length === 0 && !cobranca) return null;

  return (
    <Box
      backgroundColor="white"
      borderRadius="s12"
      borderWidth={measure.m1}
      borderColor="gray200"
      p="y16"
      mb="y24"
      gap="y8"
    >
      <Text preset="text14" fontWeightPreset="semibold" color="colorTextPrimary" mb="y4">
        Carga
      </Text>

      {linhas.map(({ rotulo, valor }) => (
        <Box key={rotulo} flexDirection="row" justifyContent="space-between" alignItems="center" gap="x12">
          <Text preset="text13" color="gray400">{rotulo}</Text>
          <Text preset="text13" fontWeightPreset="semibold" color="colorTextPrimary" textAlign="right" flexShrink={1}>
            {valor}
          </Text>
        </Box>
      ))}

      {/*
        COD muda a responsabilidade que o motorista assume ao aceitar — ele vai
        manusear dinheiro do cliente. Destacado, não como mais uma linha da lista.
      */}
      {!!cobranca && (
        <Box flexDirection="row" alignItems="center" gap="x8" mt="y8" p="y12" backgroundColor="gray50" borderRadius="s8">
          <Icon name="payments" size={16} color="gray600" />
          <Text preset="text12" color="gray600" flexShrink={1}>
            Receber {formatarPreco(cobranca.valor)} do cliente
            {cobranca.paradas > 1 ? ` em ${cobranca.paradas} paradas` : ' em 1 parada'}
          </Text>
        </Box>
      )}
    </Box>
  );
}

// Componente auxiliar para as tags de resumo
type TagResumoProps = {
  icon: React.ReactNode;
  children: React.ReactNode;
  variant?: 'primary' | 'neutral';
};

function TagResumo({ icon, children, variant = 'primary' }: TagResumoProps) {
  const isPrimary = variant === 'primary';
  return (
    <Box
      flexDirection="row"
      alignItems="center"
      gap="x8"
      px="x16"
      py="y6"
      backgroundColor={isPrimary ? 'primary10' : 'gray50'}
      borderRadius="s20"
      borderWidth={measure.m1}
      borderColor={isPrimary ? 'primary20' : 'gray200'}
    >
      {icon}
      <Text preset="text14" color="gray600">{children}</Text>
    </Box>
  );
}
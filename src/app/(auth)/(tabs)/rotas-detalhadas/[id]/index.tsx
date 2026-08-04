/**
 * Tela de Detalhes da Rota - Versão Refatorada com FlatList/SectionList
 *
 * @module rotas-detalhadas
 */

import { useState, useCallback, useMemo } from 'react'
import { FlatList, SectionList } from 'react-native'

import { Redirect, useLocalSearchParams } from 'expo-router'

import { ActivityIndicator, Box, Button, ScreenBase, Text, TouchableOpacityBox } from '@/components'
import { ButtonBack } from '@/components/Button/ButtonBack'
import Modal from '@/components/Modal/Modal'
import { measure } from '@/theme'

import {
  RouteProgress,
  AjudantesDaRota,
  ParadaListItem,
  EmptyParadasList,
  RouteActions,
  InsucessoRowItem,
} from './_components'
import { MapaParadasModal } from './_components/MapaParadasModal'
import { TransferLegExecution } from './_components/TransferLegExecution'
import { RotaProvider, useRota } from './_context/RotaContext'
import type { RotaTabType, Parada } from './_types/rota.types'
import type { InsucessoRow } from './_utils'

// ============================================
// COMPONENTE DE TABS
// ============================================

interface RotaTabsProps {
  aba: RotaTabType
  setAba: (aba: RotaTabType) => void
}

function RotaTabs({ aba, setAba }: RotaTabsProps) {
  return (
    <Box
      flexDirection="row"
      justifyContent="space-around"
      marginBottom="y24"
      borderBottomWidth={1}
      borderBottomColor="gray200"
    >
      <TouchableOpacityBox
        paddingBottom="y8"
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
        paddingBottom="y8"
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
  )
}

// ============================================
// SEPARADOR DE ITENS
// ============================================

function ItemSeparator() {
  return <Box height={12} />
}

// ============================================
// HEADER COMPARTILHADO DAS LISTAS
// ============================================

interface ListHeaderProps {
  aba: RotaTabType
  setAba: (aba: RotaTabType) => void
  proximaParada: Parada | null | undefined
}

function ListHeader({ aba, setAba, proximaParada }: ListHeaderProps) {
  const { routing } = useRota()

  return (
    <>
      <RouteProgress />
      <AjudantesDaRota ajudantes={routing?.helpers} />
      <RotaTabs aba={aba} setAba={setAba} />
      {aba === 'andamento' && proximaParada && (
        <Text preset="text14" color="gray600" marginBottom="y8">
          Próxima parada
        </Text>
      )}
    </>
  )
}

// ============================================
// LISTA DE ANDAMENTO (FlatList)
// ============================================

interface AndamentoListProps {
  aba: RotaTabType
  setAba: (aba: RotaTabType) => void
  proximaParada: Parada | null | undefined
  outrasParadas: Parada[]
  nenhumAndamento: boolean
  onPressParada: (parada: Parada) => void
}

function AndamentoList({
  aba,
  setAba,
  proximaParada,
  outrasParadas,
  nenhumAndamento,
  onPressParada,
}: AndamentoListProps) {
  const dados = useMemo<Parada[]>(() => {
    if (proximaParada) return [proximaParada, ...outrasParadas]
    return outrasParadas
  }, [proximaParada, outrasParadas])

  const renderItem = useCallback(
    ({ item }: { item: Parada }) => (
      <ParadaListItem
        parada={item}
        isProximaParada={item.serviceId === proximaParada?.serviceId}
        onPress={onPressParada}
      />
    ),
    [proximaParada, onPressParada],
  )

  const keyExtractor = useCallback((item: Parada) => item.serviceId, [])

  return (
    <FlatList
      data={dados}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListHeaderComponent={
        <ListHeader aba={aba} setAba={setAba} proximaParada={proximaParada} />
      }
      ListEmptyComponent={
        <EmptyParadasList message="Todas as paradas foram concluídas" />
      }
      ListFooterComponent={nenhumAndamento ? <RouteActions /> : null}
      ItemSeparatorComponent={ItemSeparator}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    />
  )
}

// ============================================
// LISTA DE CONCLUÍDAS (SectionList)
// ============================================

// Item de uma seção de "Concluídas": parada ao vivo (sucesso) OU linha de
// insucesso unificada (ledger de não-entregues). Ambas expõem `serviceId`.
type ConcluidaItem = Parada | InsucessoRow

// Discriminador: só a Parada tem `numero`; a InsucessoRow tem `outcome`.
function isParada(item: ConcluidaItem): item is Parada {
  return 'numero' in item
}

interface ConcluidasListProps {
  aba: RotaTabType
  setAba: (aba: RotaTabType) => void
  paradasSucesso: Parada[]
  insucessoRows: InsucessoRow[]
  // paradas de insucesso AO VIVO (ainda na rota, ex. FAILED) — usadas p/ restaurar
  // a navegação (tap → parada em leitura) só das linhas que têm parada ao vivo.
  paradasInsucessoLive: Parada[]
  onPressParada: (parada: Parada) => void
}

function ConcluidasList({
  aba,
  setAba,
  paradasSucesso,
  insucessoRows,
  paradasInsucessoLive,
  onPressParada,
}: ConcluidasListProps) {
  const liveInsucessoById = useMemo(
    () => new Map(paradasInsucessoLive.map((p) => [p.serviceId, p])),
    [paradasInsucessoLive],
  )
  const sections = useMemo(
    () => [
      {
        title: 'Concluídas com sucesso',
        data: paradasSucesso as ConcluidaItem[],
        empty: 'Nenhuma parada concluída com sucesso.',
      },
      {
        title: 'Concluídas com insucesso',
        data: insucessoRows as ConcluidaItem[],
        empty: 'Nenhuma parada marcada como insucesso.',
      },
    ],
    [paradasSucesso, insucessoRows],
  )

  const renderItem = useCallback(
    ({ item }: { item: ConcluidaItem }) => {
      if (isParada(item)) {
        return (
          <ParadaListItem
            parada={item}
            onPress={onPressParada}
            showNavigationButton={false}
          />
        )
      }
      // Linha só-ledger (cancelado/devolvido) não tem parada ao vivo → sem navegação.
      const live = liveInsucessoById.get(item.serviceId)
      return (
        <InsucessoRowItem
          row={item}
          onPress={live ? () => onPressParada(live) : undefined}
        />
      )
    },
    [onPressParada, liveInsucessoById],
  )

  const renderSectionHeader = useCallback(
    ({ section }: { section: (typeof sections)[number] }) => (
      <Box marginBottom="y8" marginTop="y16">
        <Text preset="text15" fontWeightPreset='bold' color="gray500">
          {section.title}
        </Text>
        {section.data.length === 0 && (
          <Text preset="text14" color="gray400" marginTop="y4">
            {section.empty}
          </Text>
        )}
      </Box>
    ),
    [],
  )

  const keyExtractor = useCallback((item: ConcluidaItem) => item.serviceId, [])

  return (
    <SectionList
      sections={sections}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      ListHeaderComponent={
        <ListHeader aba={aba} setAba={setAba} proximaParada={null} />
      }
      ItemSeparatorComponent={ItemSeparator}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    />
  )
}

// ============================================
// ESTADOS DE LOADING E ERRO
// ============================================

function LoadingState() {
  return (
    <Box
      flex={1}
      justifyContent="center"
      alignItems="center"
      paddingHorizontal="x16"
      paddingVertical="y32"
    >
      <ActivityIndicator />
      <Text marginTop="y16">Carregando rota...</Text>
    </Box>
  )
}

interface ErrorStateProps {
  onBack: () => void
}

function ErrorState({ onBack }: ErrorStateProps) {
  return (
    <Box
      flex={1}
      justifyContent="center"
      alignItems="center"
      paddingHorizontal="x16"
      paddingVertical="y32"
    >
      <Text preset="text16" color="gray600">
        Rota não encontrada
      </Text>
      <Button title="Voltar" onPress={onBack} marginTop="y16" width={measure.x330} />
    </Box>
  )
}

// ============================================
// TÍTULO DA TELA
// ============================================

interface RotaTitleProps {
  routing: NonNullable<ReturnType<typeof useRota>['routing']>
  proximaParada: Parada | null | undefined
  totalParadas: number
}

function RotaTitle({ routing, proximaParada, totalParadas }: RotaTitleProps) {
  return (
    <Box flexDirection="row" alignItems="center" justifyContent='center' gap='x10' mb='b14'>
      <Text preset="text16" fontWeightPreset='semibold'>
        {routing.name || `Rota ${routing.code || ''}`}
      </Text>
      {proximaParada?.numero && (
        <Box
          backgroundColor="primary10"
          paddingHorizontal="x12"
          paddingVertical="y2"
          borderRadius="s20"
        >
          <Text preset="text13" color="primary100">
            {proximaParada.numero}/{totalParadas}
          </Text>
        </Box>
      )}
    </Box>
  )
}

// ============================================
// CONTEÚDO PRINCIPAL (DENTRO DO CONTEXT)
// ============================================

function RotaDetalhadaContent() {
  const {
    rotaId,
    loading,
    error,
    routing,
    paradas,
    proximaParada,
    outrasParadas,
    paradasConcluidasSucesso,
    paradasConcluidasInsucesso,
    insucessoRows,
    nenhumAndamento,
    isCompleting,
    popupConcluirRota,
    setPopupConcluirRota,
    concluirRota,
    navegarParaParada,
  } = useRota()

  const [aba, setAba] = useState<RotaTabType>('andamento')
  const [mapaVisible, setMapaVisible] = useState(false)

  // Título dinâmico baseado no tipo de serviço
  const tituloTela = useMemo(() => {
    const tipoServico = proximaParada?.tipo || paradas[0]?.tipo || 'Rota'
    return tipoServico
  }, [proximaParada?.tipo, paradas])

  if (loading) return <LoadingState />
  if (error || !routing) return <ErrorState onBack={() => { }} />

  if (routing.legType === 'TRANSFER') {
    // Pós-handoff: o RETURN foi materializado (returnServiceId) e o trecho segue
    // em retorno. Ao reabrir o trecho (sair/voltar do app), ir pro fluxo de
    // retorno em vez de repetir a entrega da transferência — a navegação do
    // onSuccess é imperativa e não sobrevive a sair/voltar. Redirect declarativo
    // resolve o estado a partir do dado (returnServiceId + em andamento).
    if (routing.returnServiceId && routing.isInProgress) {
      return (
        <Redirect
          href={{
            pathname: '/rotas-detalhadas/[id]/parada/[pid]/retorno' as never,
            params: { id: routing.id, pid: routing.returnServiceId } as never,
          }}
        />
      )
    }
    return <TransferLegExecution />
  }

  return (
    <ScreenBase
      scrollable={false}
      buttonLeft={<ButtonBack />}
      title={
        <Text preset='textTitleScreen'>{tituloTela}</Text>
      }
    >
      <RotaTitle
        routing={routing}
        proximaParada={proximaParada}
        totalParadas={paradas.length}
      />
      <Box alignItems="center" marginBottom="y16">
        <Button
          title="Ver no mapa"
          iconName="map"
          preset="outline"
          onPress={() => setMapaVisible(true)}
        />
      </Box>
      {aba === 'andamento' ? (
        <AndamentoList
          aba={aba}
          setAba={setAba}
          proximaParada={proximaParada}
          outrasParadas={outrasParadas}
          nenhumAndamento={nenhumAndamento}
          onPressParada={navegarParaParada}
        />
      ) : (
        <ConcluidasList
          aba={aba}
          setAba={setAba}
          paradasSucesso={paradasConcluidasSucesso}
          insucessoRows={insucessoRows}
          paradasInsucessoLive={paradasConcluidasInsucesso}
          onPressParada={navegarParaParada}
        />
      )}
      <Modal
        isVisible={popupConcluirRota}
        preset="action"
        title="Concluir rota"
        text="Deseja realmente concluir esta rota? Esta ação não pode ser desfeita."
        buttonActionTitle={isCompleting ? 'Concluindo...' : 'Concluir'}
        buttonCloseTitle="Cancelar"
        onPress={concluirRota}
        onClose={() => setPopupConcluirRota(false)}
      />
      <MapaParadasModal
        visible={mapaVisible}
        onClose={() => setMapaVisible(false)}
        routeId={rotaId}
      />
    </ScreenBase>
  )
}

// ============================================
// COMPONENTE PRINCIPAL (COM PROVIDER)
// ============================================

export default function RotaDetalhadaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  return (
    // O tracking é gerido globalmente pelo LocationTrackingProvider em (auth)/_layout.
    <RotaProvider routeId={id}>
      <RotaDetalhadaContent />
    </RotaProvider>
  )
}

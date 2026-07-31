import { useState } from 'react';

import { ActivityIndicator, Box, Text, TouchableOpacityBox } from '@/components';
import { Icon } from '@/components/Icon/Icon';
import { useGetMaterials } from '@/domain/agility/service/useCase/useGetMaterials';
import { measure } from '@/theme';

import type { Parada, ParadaStatus } from '../_types/rota.types';
import { PARADA_STATUS_CHIP } from '../_utils/statusMappers';

/** Outcome de conferência de um pedido do lote (marcado pelo motorista na Tela 2). */
export type TransferOrderOutcome = {
    outcome: 'RECEIVED' | 'NOT_RECEIVED';
    occurrenceReasonId?: string;
    reasonName?: string;
    notes?: string;
};

/**
 * Card de um pedido do lote de transferência. Toca pra expandir e ver os itens
 * (materiais) daquele pedido — read-only, sem conferência (o check de item real
 * acontece no last-mile, não na transferência). A busca dos itens é LAZY: só
 * dispara `useGetMaterials` quando o card é expandido, evitando N requisições de
 * cara num lote grande.
 *
 * Conferência (Tela 2, comprovante) é ADITIVA e OPCIONAL: quando `onMarkNotReceived`
 * é passado, o card ganha uma ação pra marcar o pedido como não recebido. Sem essas
 * props (Tela 1, overview) o card permanece read-only, inalterado.
 */
export function TransferOrderCard({
    parada,
    outcome,
    onMarkNotReceived,
    onMarkReceived,
    titulo,
    subtitulo,
    notaFiscal,
    status,
    onOpen,
    openLabel = 'Abrir',
}: {
    parada: Parada;
    outcome?: TransferOrderOutcome;
    onMarkNotReceived?: () => void;
    onMarkReceived?: () => void;
    /** Sobrescreve o título (lote da transferência). */
    titulo?: string;
    /** Linha de apoio (na parada agrupada: "Nota 1 de 2 · Janela 08:00–12:00"). */
    subtitulo?: string;
    /** Número da nota fiscal — o que o motorista tem no papel na mão. */
    notaFiscal?: string | null;
    /** Status da nota; pinta o selo com a MESMA paleta do card da lista da rota. */
    status?: ParadaStatus;
    /** CTA que abre o fluxo daquele pedido. Sem ela o card permanece como era. */
    onOpen?: () => void;
    openLabel?: string;
}) {
    const [expanded, setExpanded] = useState(false);
    const { materials, isLoading, isError } = useGetMaterials(expanded ? parada.serviceId : undefined);
    const isNotReceived = outcome?.outcome === 'NOT_RECEIVED';

    // Cabeçalho de NOTA: status à esquerda e nota fiscal à direita na MESMA linha,
    // resumo embaixo ocupando a largura toda. Só entra quando a tela passa nota
    // fiscal ou status — sem isso o card do lote de transferência segue idêntico.
    const ehCabecalhoDeNota = !!(notaFiscal || status);
    const chip = status ? PARADA_STATUS_CHIP[status] : null;

    return (
        <Box backgroundColor="white" borderRadius="s12" borderWidth={1} borderColor={isNotReceived ? 'redError' : 'gray200'} overflow="hidden">
            {ehCabecalhoDeNota ? (
                <TouchableOpacityBox p="y12" gap="y4" onPress={() => setExpanded((v) => !v)}>
                    <Box flexDirection="row" alignItems="center" gap="x8">
                        {chip ? (
                            <Box backgroundColor={chip.bgColor} px="x8" py="y2" borderRadius="s4" flexShrink={0}>
                                <Text preset="text12" color={chip.textColor}>{chip.label}</Text>
                            </Box>
                        ) : null}
                        <Box flex={1} />
                        {notaFiscal ? (
                            <Text
                                preset="text16"
                                fontWeightPreset="bold"
                                color="colorTextPrimary"
                                numberOfLines={1}
                            >
                                {notaFiscal}
                            </Text>
                        ) : null}
                        <Icon name={expanded ? 'expand-less' : 'expand-more'} size={measure.m20} color="gray400" />
                    </Box>
                    {subtitulo ? <Text preset="text12" color="gray600">{subtitulo}</Text> : null}
                </TouchableOpacityBox>
            ) : (
                <TouchableOpacityBox flexDirection="row" alignItems="center" gap="x12" p="y12" onPress={() => setExpanded((v) => !v)}>
                    <Icon name="inventory-2" size={measure.m20} color="gray400" />
                    <Box flex={1}>
                        <Text preset="text14" fontWeightPreset="semibold" color="colorTextPrimary">{titulo ?? parada.nome}</Text>
                        <Text preset="text12" color="gray600">{subtitulo ?? parada.endereco}</Text>
                    </Box>
                    <Icon name={expanded ? 'expand-less' : 'expand-more'} size={measure.m20} color="gray400" />
                </TouchableOpacityBox>
            )}

            {onMarkNotReceived ? (
                <Box borderTopWidth={1} borderColor="gray100" px="x12" py="y8">
                    {isNotReceived ? (
                        <Box flexDirection="row" alignItems="center" justifyContent="space-between" gap="x8">
                            <Box flex={1}>
                                <Text preset="text12" fontWeightPreset="semibold" color="redError">
                                    Não recebido{outcome?.reasonName ? ` — ${outcome.reasonName}` : ''}
                                </Text>
                            </Box>
                            <TouchableOpacityBox onPress={onMarkReceived}>
                                <Text preset="text12" fontWeightPreset="semibold" color="primary100">Desfazer</Text>
                            </TouchableOpacityBox>
                        </Box>
                    ) : (
                        <TouchableOpacityBox onPress={onMarkNotReceived} alignSelf="flex-start">
                            <Text preset="text12" color="gray600" style={{ textDecorationLine: 'underline' }}>Não recebido</Text>
                        </TouchableOpacityBox>
                    )}
                </Box>
            ) : null}

            {onOpen ? (
                <Box borderTopWidth={1} borderColor="gray100" px="x12" py="y8">
                    <TouchableOpacityBox onPress={onOpen} alignSelf="flex-start">
                        <Text preset="text13" fontWeightPreset="semibold" color="primary100">{openLabel}</Text>
                    </TouchableOpacityBox>
                </Box>
            ) : null}

            {expanded ? (
                <Box borderTopWidth={1} borderColor="gray100" px="x12" py="y8" gap="y8">
                    {isLoading ? (
                        <Box flexDirection="row" alignItems="center" gap="x8" py="y4">
                            <ActivityIndicator />
                            <Text preset="text12" color="gray600">Carregando itens...</Text>
                        </Box>
                    ) : isError ? (
                        <Text preset="text12" color="gray500">Não foi possível carregar os itens deste pedido.</Text>
                    ) : materials.length === 0 ? (
                        <Text preset="text12" color="gray500">Nenhum item cadastrado neste pedido.</Text>
                    ) : (
                        materials.map((m) => (
                            <Box key={m.id} flexDirection="row" alignItems="center" gap="x8">
                                <Text preset="text13" color="colorTextPrimary" numberOfLines={2} style={{ flex: 1 }}>{m.material}</Text>
                                <Text preset="text12" color="gray600">x{m.quantity} {m.unit || 'un'}</Text>
                            </Box>
                        ))
                    )}
                </Box>
            ) : null}
        </Box>
    );
}

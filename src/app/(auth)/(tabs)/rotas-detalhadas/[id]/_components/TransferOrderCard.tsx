import { useState } from 'react';

import { ActivityIndicator, Box, Text, TouchableOpacityBox } from '@/components';
import { Icon } from '@/components/Icon/Icon';
import { useGetMaterials } from '@/domain/agility/service/useCase/useGetMaterials';
import { measure } from '@/theme';

import type { Parada } from '../_types/rota.types';

/**
 * Card de um pedido do lote de transferência. Toca pra expandir e ver os itens
 * (materiais) daquele pedido — read-only, sem conferência (o check de item real
 * acontece no last-mile, não na transferência). A busca dos itens é LAZY: só
 * dispara `useGetMaterials` quando o card é expandido, evitando N requisições de
 * cara num lote grande.
 */
export function TransferOrderCard({ parada }: { parada: Parada }) {
    const [expanded, setExpanded] = useState(false);
    const { materials, isLoading, isError } = useGetMaterials(expanded ? parada.serviceId : undefined);

    return (
        <Box backgroundColor="white" borderRadius="s12" borderWidth={1} borderColor="gray200" overflow="hidden">
            <TouchableOpacityBox flexDirection="row" alignItems="center" gap="x12" p="y12" onPress={() => setExpanded((v) => !v)}>
                <Icon name="inventory-2" size={measure.m20} color="gray400" />
                <Box flex={1}>
                    <Text preset="text14" fontWeightPreset="semibold" color="colorTextPrimary">{parada.nome}</Text>
                    <Text preset="text12" color="gray600">{parada.endereco}</Text>
                </Box>
                <Icon name={expanded ? 'expand-less' : 'expand-more'} size={measure.m20} color="gray400" />
            </TouchableOpacityBox>

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

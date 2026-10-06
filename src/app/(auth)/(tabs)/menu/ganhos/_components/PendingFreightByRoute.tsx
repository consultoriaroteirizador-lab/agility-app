// src/app/(auth)/(tabs)/menu/ganhos/_components/PendingFreightByRoute.tsx
import React from 'react';

import { ActivityIndicator, Box, Text, TouchableOpacityBox } from '@/components';
import { useDriverFreightShares } from '@/domain/agility/wallet';
import { FreightShareStatus } from '@/domain/agility/wallet/dto/types';
import { measure } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

import { describeFreightShare } from '../_utils/freightShareDisplay';

/** De quais rotas vem o "Frete a liberar" (F6, R10 da F5c). Não depende do período: é o bloqueado agora. */
export function PendingFreightByRoute() {
    const { page, isLoading, isError, refetch } = useDriverFreightShares({ status: FreightShareStatus.A_LIBERAR });
    const total = page?.meta.total ?? 0;

    return (
        <Box marginTop="y24">
            <Text preset="text16" color="colorTextPrimary" fontWeight="bold" marginBottom="y12">
                Fretes a liberar por rota
            </Text>
            {isError ? (
                <TouchableOpacityBox testID="a-liberar-erro" p="m12" borderRadius="s12" backgroundColor="gray50" onPress={() => void refetch()} accessibilityRole="button">
                    <Text fontSize={measure.m13} color="colorTextError">
                        Não foi possível carregar os fretes a liberar. Toque para tentar de novo.
                    </Text>
                </TouchableOpacityBox>
            ) : isLoading || !page ? (
                <ActivityIndicator />
            ) : page.data.length === 0 ? (
                <Text preset="text14" color="secondaryTextColor">
                    Nenhum frete esperando liberação.
                </Text>
            ) : (
                <>
                    {page.data.map((s) => {
                        const d = describeFreightShare(s);
                        return (
                            <Box key={s.id} flexDirection="row" justifyContent="space-between" alignItems="center" padding="m12" marginBottom="y10" borderRadius="s12" borderWidth={measure.m1} borderColor="borderColor">
                                <Box flex={1} marginRight="x8">
                                    <Text preset="text14" color="colorTextPrimary" numberOfLines={1}>
                                        {d.route}
                                    </Text>
                                    {d.stops && (
                                        <Text preset="text12" color="secondaryTextColor">
                                            {d.stops}
                                        </Text>
                                    )}
                                </Box>
                                <Text preset="text14" color="colorTextWarning" fontWeight="bold">
                                    {formatCurrency(d.amountCents ?? 0)}
                                </Text>
                            </Box>
                        );
                    })}
                    {total > page.data.length && (
                        <Text preset="text12" color="secondaryTextColor">
                            {`Mostrando ${page.data.length} de ${total}.`}
                        </Text>
                    )}
                </>
            )}
        </Box>
    );
}

// src/app/(auth)/(tabs)/menu/ganhos/index.tsx

import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { ActivityIndicator, Box, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { useFreightEarnings, useGetWallet } from '@/domain/agility/wallet';
import EarningsChart from '@/EarningsChart';
import { measure } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';

import { PendingFreightByRoute } from './_components/PendingFreightByRoute';
import { chartDataFor, Period, periodLabel, PERIODS, periodStart } from './_utils/period';

function StatCard({ title, value, subtitle, testID }: { title: string; value: string; subtitle?: string; testID: string }) {
    return (
        <Box flex={1} backgroundColor="white" borderRadius="s20" padding="m12" margin="m4" borderWidth={measure.m1} borderColor="borderColor">
            <Text preset="text12" color="secondaryTextColor" marginBottom="y4">
                {title}
            </Text>
            <Text testID={testID} preset="text20" color="primary100" fontWeight="bold" marginBottom="y2">
                {value}
            </Text>
            {!!subtitle && (
                <Text preset="text12" color="secondaryTextColor">
                    {subtitle}
                </Text>
            )}
        </Box>
    );
}

export default function GanhosScreen() {
    const router = useRouter();
    const [period, setPeriod] = useState<Period>('month');
    // `periodStart` chama `new Date()` por dentro quando `now` não é passado — o `useMemo`
    // só recomputava quando `period` mudava, então com o app aberto atravessando a
    // meia-noite (ou reaberto dias depois sem trocar o seletor), "Hoje"/"Semana"/etc.
    // continuavam calculados a partir do dia em que o período foi escolhido.
    //
    // A correção precisa passar `now` EXPLÍCITO e USADO dentro do `useMemo` — não basta
    // listar uma chave no array de deps sem lê-la no corpo. O React Compiler deste projeto
    // (`babel.config.js`) re-infere as dependências pela ANÁLISE ESTÁTICA de quem o
    // `useMemo` de fato LÊ, não pelo array escrito à mão: uma dependência só ali para forçar
    // recálculo (sem uso no corpo) é DESCARTADA do cache do compilador, mesmo que o array
    // a liste. `now` como `useState`, recalculado no foco da tela (`useFocusEffect` — o
    // motorista reabrindo "Ganhos" depois da meia-noite é exatamente o caso a cobrir), e
    // passado como argumento de `periodStart` resolve os dois lados: React "puro" respeita
    // o array, e o compilador respeita o uso real.
    const [now, setNow] = useState(() => new Date());
    useFocusEffect(
        useCallback(() => {
            setNow(new Date());
        }, []),
    );
    const startDate = useMemo(() => periodStart(period, now).toISOString(), [period, now]);
    const { wallet } = useGetWallet();
    const { earnings, isLoading, isError, refetch, isRefetching } = useFreightEarnings(startDate);
    const chartData = useMemo(() => chartDataFor(earnings?.items ?? [], period), [earnings, period]);

    return (
        <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset="textTitleScreen">Meus Ganhos</Text>}>
            <ScrollView refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}>
                <Text preset="text14" color="secondaryTextColor" marginBottom="y12">
                    Fretes que a empresa liberou para você. O que você recebeu de clientes fica em Cobranças.
                </Text>

                {wallet && (
                    <TouchableOpacityBox
                        marginBottom="b12"
                        backgroundColor="primary10"
                        borderRadius="s16"
                        padding="m16"
                        flexDirection="row"
                        alignItems="center"
                        justifyContent="space-between"
                        onPress={() => router.push('/menu/carteira')}
                    >
                        <Box>
                            <Text preset="text12" color="colorTextSecondary">
                                Disponível para saque
                            </Text>
                            <Text preset="text20" color="primary100" fontWeight="bold" marginTop="y4">
                                {formatCurrency(wallet.availableBalance)}
                            </Text>
                        </Box>
                        <Box flexDirection="row" alignItems="center">
                            <Text preset="text14" color="primary100" fontWeight="semibold">
                                Ver carteira
                            </Text>
                            <Ionicons name="chevron-forward" size={20} color="#4A90E2" />
                        </Box>
                    </TouchableOpacityBox>
                )}

                <Box flexDirection="row" justifyContent="space-between" paddingVertical="y12">
                    {PERIODS.map((option) => (
                        <TouchableOpacityBox
                            key={option.value}
                            flex={1}
                            backgroundColor={period === option.value ? 'primary100' : 'gray50'}
                            borderRadius="s10"
                            padding="m12"
                            marginHorizontal="x4"
                            onPress={() => setPeriod(option.value)}
                        >
                            <Text
                                preset="text12"
                                color={period === option.value ? 'white' : 'secondaryTextColor'}
                                fontWeight={period === option.value ? 'bold' : 'normal'}
                                textAlign="center"
                            >
                                {option.label}
                            </Text>
                        </TouchableOpacityBox>
                    ))}
                </Box>

                {isLoading ? (
                    <Box padding="y32" alignItems="center">
                        <ActivityIndicator />
                    </Box>
                ) : isError && !earnings ? (
                    <Box padding="y32" alignItems="center">
                        <Text preset="text14" color="secondaryTextColor" textAlign="center">
                            Não foi possível carregar seus ganhos.
                        </Text>
                        <TouchableOpacityBox mt="t16" onPress={() => void refetch()} accessibilityRole="button">
                            <Text color="colorTextPrimary">Tentar novamente</Text>
                        </TouchableOpacityBox>
                    </Box>
                ) : earnings ? (
                    <>
                        <EarningsChart data={chartData} period={period} />

                        {earnings.truncated && (
                            <Text preset="text12" color="colorTextWarning" marginTop="y8">
                                Valores parciais: há lançamentos demais neste período. Escolha um período menor.
                            </Text>
                        )}

                        <Box flexDirection="row" marginTop="y12">
                            <StatCard
                                testID="frete-liberado"
                                title={`Frete liberado · ${periodLabel(period)}`}
                                value={formatCurrency(earnings.totalCents)}
                                subtitle={`${earnings.items.length} frete(s)`}
                            />
                            <StatCard
                                testID="frete-a-liberar"
                                title="Frete a liberar"
                                // Sem carteira (carregando ou erro) mostra "—": R$ 0,00 diria "nada a liberar".
                                value={wallet ? formatCurrency(wallet.freightPendingBalance) : '—'}
                                subtitle="Agora, esperando a empresa liberar"
                            />
                        </Box>

                        <Text preset="text16" color="colorTextPrimary" fontWeight="bold" marginTop="y24" marginBottom="y12">
                            {`Fretes liberados · ${periodLabel(period)}`}
                        </Text>
                        {earnings.items.length === 0 ? (
                            <Text preset="text14" color="secondaryTextColor">
                                Nenhum frete liberado neste período.
                            </Text>
                        ) : (
                            earnings.items.map((item) => (
                                <Box
                                    key={item.shareId}
                                    flexDirection="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    padding="m12"
                                    marginBottom="y10"
                                    borderRadius="s12"
                                    borderWidth={measure.m1}
                                    borderColor="borderColor"
                                >
                                    <Box flex={1} marginRight="x8">
                                        <Text preset="text14" color="colorTextPrimary" numberOfLines={2}>
                                            {item.description}
                                        </Text>
                                        <Text preset="text12" color="secondaryTextColor">
                                            {formatDate(item.releasedAt)}
                                        </Text>
                                    </Box>
                                    <Text preset="text14" color="colorTextSuccess" fontWeight="bold">
                                        {formatCurrency(item.releasedCents)}
                                    </Text>
                                </Box>
                            ))
                        )}
                    </>
                ) : null}

                <PendingFreightByRoute />

                <TouchableOpacityBox
                    marginTop="y24"
                    marginBottom="y20"
                    padding="m16"
                    borderRadius="s12"
                    borderWidth={measure.m1}
                    borderColor="primary100"
                    alignItems="center"
                    onPress={() => router.push('/menu/ganhos/cobrancas')}
                >
                    <Text preset="text14" color="primary100" fontWeight="semibold">
                        Ver cobranças recebidas de clientes
                    </Text>
                </TouchableOpacityBox>
            </ScrollView>
        </ScreenBase>
    );
}

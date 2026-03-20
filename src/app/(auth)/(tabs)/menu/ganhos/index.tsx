import React, { useState, useMemo } from 'react';

import { format, startOfDay, startOfWeek, startOfMonth, startOfYear, isAfter } from 'date-fns';
import { useRouter } from 'expo-router';

import { Box, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import Modal from '@/components/Modal/Modal';
import { useGetPayments } from '@/domain/agility/finance';
import type { Payment } from '@/domain/agility/finance';
import EarningsChart from '@/EarningsChart';
import { measure } from '@/theme';

type Period = 'today' | 'week' | 'month' | 'year';

interface StatCardProps {
    title: string;
    value: string;
    subtitle?: string;
}

function StatCard({ title, value, subtitle }: StatCardProps) {
    return (
        <Box
            flex={1}
            backgroundColor="white"
            borderRadius="s20"
            padding="m12"
            margin="m4"
            borderWidth={measure.m1}
            borderColor="borderColor">
            <Text preset="text12" color="secondaryTextColor" marginBottom="y4">
                {title}
            </Text>
            <Text preset="text20" color="primary100" fontWeight="bold" marginBottom="y2">
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
    const [selectedPeriod, setSelectedPeriod] = useState<Period>('month');
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [showPaymentDetail, setShowPaymentDetail] = useState(false);
    const { payments, isLoading: paymentsLoading } = useGetPayments();

    const filteredPayments = useMemo(() => {
        if (!payments || payments.length === 0) return [];

        const now = new Date();
        let startDate: Date;

        switch (selectedPeriod) {
            case 'today':
                startDate = startOfDay(now);
                break;
            case 'week':
                startDate = startOfWeek(now, { weekStartsOn: 1 });
                break;
            case 'month':
                startDate = startOfMonth(now);
                break;
            case 'year':
                startDate = startOfYear(now);
                break;
            default:
                startDate = startOfMonth(now);
        }

        return payments.filter(payment => {
            const paymentDate = new Date(payment.createdAt);
            return (
                isAfter(paymentDate, startDate) ||
                paymentDate.getTime() === startDate.getTime()
            );
        });
    }, [payments, selectedPeriod]);

    const stats = useMemo(() => {
        if (!filteredPayments || filteredPayments.length === 0) {
            return {
                totalReceived: 0,
                totalTrips: 0,
                pendingAmount: 0,
            };
        }

        const approvedPayments = filteredPayments.filter(p => p.status === 'APPROVED');
        const pendingPayments = filteredPayments.filter(p => p.status === 'PENDING');

        const totalReceived = approvedPayments.reduce(
            (sum, p) => sum + (p.receivedValue || 0),
            0,
        );

        const pendingAmount = pendingPayments.reduce(
            (sum, p) => {
                const pending = p.expectedValue - (p.receivedValue || 0);
                return sum + Math.max(pending, 0);
            },
            0,
        );

        return {
            totalReceived,
            totalTrips: filteredPayments.length,
            pendingAmount,
        };
    }, [filteredPayments]);

    const chartData = useMemo(() => {
        if (!filteredPayments || filteredPayments.length === 0) {
            return {
                labels: ['Sem dados'],
                datasets: [{ data: [0] }],
            };
        }

        const groupedData: Record<string, number> = {};

        filteredPayments.forEach(payment => {
            const paymentDate = new Date(payment.createdAt);
            let key: string;

            switch (selectedPeriod) {
                case 'today':
                    key = `${paymentDate.getHours()}h`;
                    break;
                case 'week':
                    key = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][paymentDate.getDay()];
                    break;
                case 'month':
                    key = paymentDate.getDate().toString();
                    break;
                case 'year':
                    key = [
                        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
                    ][paymentDate.getMonth()];
                    break;
                default:
                    key = paymentDate.getDate().toString();
            }

            if (payment.status === 'APPROVED' && payment.receivedValue) {
                groupedData[key] = (groupedData[key] || 0) + (payment.receivedValue / 100);
            }
        });

        const sortedKeys = Object.keys(groupedData).sort((a, b) => {
            if (selectedPeriod === 'today') {
                return parseInt(a) - parseInt(b);
            }
            if (selectedPeriod === 'week') {
                const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                return days.indexOf(a) - days.indexOf(b);
            }
            if (selectedPeriod === 'month') {
                return parseInt(a) - parseInt(b);
            }
            if (selectedPeriod === 'year') {
                const months = [
                    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
                ];
                return months.indexOf(a) - months.indexOf(b);
            }
            return 0;
        });

        return {
            labels: sortedKeys.length > 0 ? sortedKeys : ['Sem dados'],
            datasets: [
                {
                    data: sortedKeys.length > 0 ? sortedKeys.map(key => groupedData[key]) : [0],
                },
            ],
        };
    }, [filteredPayments, selectedPeriod]);

    const formatCurrency = (valueInCents: number): string => {
        const value = valueInCents / 100;
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const periods: { value: Period; label: string }[] = [
        { value: 'today', label: 'Hoje' },
        { value: 'week', label: 'Semana' },
        { value: 'month', label: 'Mês' },
        { value: 'year', label: 'Ano' },
    ];

    const getPeriodLabel = (period: Period): string => {
        return periods.find(p => p.value === period)?.label || 'Mês';
    };

    const getStatusLabel = (status: string): string => {
        if (status === 'APPROVED') return 'Aprovado';
        if (status === 'PENDING') return 'Pendente';
        return 'Rejeitado';
    };

    const getStatusColor = (status: string) => {
        if (status === 'APPROVED') return 'colorTextSuccess' as const;
        if (status === 'PENDING') return 'colorTextWarning' as const;
        return 'colorTextError' as const;
    };

    return (
        <ScreenBase buttonLeft={<ButtonBack />} title={
            <Text preset="textTitleScreen">
                Meus Ganhos
            </Text>
        }>
            <Box backgroundColor="white" padding="m12" paddingBottom="y24">
                <Box flexDirection="row" alignItems="center" justifyContent="space-between">
                    <Box>
                        <Text preset="text14" color="secondaryTextColor">
                            Visualize suas estatísticas e histórico de pagamentos
                        </Text>
                    </Box>
                </Box>
            </Box>

            <Box scrollable>
                <Box margin="m4" borderRadius="s20" paddingVertical="y12">
                    <Box flexDirection="row" justifyContent="space-between">
                        {periods.map(period => (
                            <TouchableOpacityBox
                                key={period.value}
                                flex={1}
                                backgroundColor={selectedPeriod === period.value ? 'primary100' : 'gray50'}
                                borderRadius="s10"
                                padding="m12"
                                marginHorizontal="x4"
                                onPress={() => setSelectedPeriod(period.value)}>
                                <Text
                                    preset="text12"
                                    color={selectedPeriod === period.value ? 'white' : 'secondaryTextColor'}
                                    fontWeight={selectedPeriod === period.value ? 'bold' : 'normal'}
                                    textAlign="center">
                                    {period.label}
                                </Text>
                            </TouchableOpacityBox>
                        ))}
                    </Box>
                </Box>

                <EarningsChart data={chartData} period={selectedPeriod} />

                <Box >
                    <Text preset="text16" color="colorTextPrimary" fontWeight="bold" marginBottom="y12">
                        Estatísticas - {getPeriodLabel(selectedPeriod)}
                    </Text>

                    <Box flexDirection="row">
                        <StatCard
                            title="Total Recebido"
                            value={formatCurrency(stats.totalReceived)}
                            subtitle={`${stats.totalTrips} viagens`}
                        />
                    </Box>

                    <Box flexDirection="row">
                        <StatCard
                            title="Pendente"
                            value={formatCurrency(stats.pendingAmount)}
                        />
                    </Box>

                    <Box flexDirection="row">
                        <StatCard
                            title="Total de Viagens"
                            value={stats.totalTrips.toString()}
                        />
                    </Box>
                </Box>

                <Box marginTop="y32" >
                    <Text preset="text16" color="colorTextPrimary" fontWeight="bold" marginBottom="y12">
                        Pagamentos - {getPeriodLabel(selectedPeriod)}
                    </Text>

                    {paymentsLoading ? (
                        <Box padding="y32" alignItems="center">
                            <Text preset="text14" color="secondaryTextColor">
                                Carregando pagamentos...
                            </Text>
                        </Box>
                    ) : filteredPayments.length === 0 ? (
                        <Box padding="y32" alignItems="center">
                            <Text preset="text14" color="secondaryTextColor">
                                Nenhum pagamento encontrado para este período
                            </Text>
                        </Box>
                    ) : (
                        filteredPayments.map(payment => (
                            <TouchableOpacityBox
                                key={payment.id}
                                backgroundColor="white"
                                borderRadius="s20"
                                padding="m12"
                                marginBottom="y10"
                                borderWidth={measure.m1}
                                borderColor="borderColor"
                                onPress={() => {
                                    setSelectedPayment(payment);
                                    setShowPaymentDetail(true);
                                }}>
                                <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="y4">
                                    <Text
                                        preset="text14"
                                        color="colorTextPrimary"
                                        fontWeight="bold"
                                        numberOfLines={1}
                                        style={{ flex: 1, marginRight: 8 }}>
                                        {payment.customerName}
                                    </Text>
                                    <Text preset="text12" color={getStatusColor(payment.status)}>
                                        {getStatusLabel(payment.status)}
                                    </Text>
                                </Box>

                                <Box flexDirection="row" justifyContent="space-between" marginBottom="y2">
                                    <Text preset="text12" color="secondaryTextColor">
                                        Valor: {formatCurrency(payment.expectedValue)}
                                    </Text>
                                    {payment.receivedValue != null && payment.receivedValue > 0 && (
                                        <Text preset="text12" color="primary100" fontWeight="bold">
                                            Recebido: {formatCurrency(payment.receivedValue)}
                                        </Text>
                                    )}
                                </Box>

                                {!!payment.routingId && (
                                    <Text preset="text12" color="secondaryTextColor" marginBottom="y2">
                                        Rota: {payment.routingId}
                                    </Text>
                                )}

                                {!!payment.paymentDate && (
                                    <Text preset="text12" color="secondaryTextColor">
                                        {format(new Date(payment.paymentDate), 'dd/MM/yyyy')}
                                    </Text>
                                )}

                                <Text preset="text12" color="primary100">
                                    Toque para detalhes
                                </Text>
                            </TouchableOpacityBox>
                        ))
                    )}
                </Box>

                <Modal
                    title="Detalhes do Pagamento"
                    isVisible={showPaymentDetail && !!selectedPayment}
                    onClose={() => {
                        setShowPaymentDetail(false);
                        setSelectedPayment(null);
                    }}>
                    <>
                        {selectedPayment != null && (
                            <Box backgroundColor="white" padding="m12">
                                <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="y12">
                                    <Text preset="text20" color="colorTextPrimary" fontWeight="bold">
                                        Detalhes do Pagamento
                                    </Text>
                                    <TouchableOpacityBox
                                        backgroundColor="gray50"
                                        borderRadius="s10"
                                        width={measure.x32}
                                        height={measure.y32}
                                        alignItems="center"
                                        justifyContent="center"
                                        onPress={() => {
                                            setShowPaymentDetail(false);
                                            setSelectedPayment(null);
                                        }}>
                                        <Text preset="text18" color="secondaryTextColor">
                                            ×
                                        </Text>
                                    </TouchableOpacityBox>
                                </Box>

                                <Box marginBottom="y12">
                                    <Text preset="text12" color="secondaryTextColor">
                                        ID: {selectedPayment.id}
                                    </Text>
                                    <Text preset="text14" color="colorTextPrimary" fontWeight="bold" marginTop="y4">
                                        Cliente: {selectedPayment.customerName}
                                    </Text>
                                </Box>

                                <Box marginBottom="y12">
                                    <Text preset="text12" color="secondaryTextColor" marginBottom="y4">
                                        Valores
                                    </Text>
                                    <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="y2">
                                        <Text preset="text14" color="secondaryTextColor">
                                            Esperado:
                                        </Text>
                                        <Text preset="text14" color="colorTextPrimary" fontWeight="bold">
                                            {formatCurrency(selectedPayment.expectedValue)}
                                        </Text>
                                    </Box>
                                    {selectedPayment.receivedValue != null && selectedPayment.receivedValue > 0 && (
                                        <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="y2">
                                            <Text preset="text14" color="secondaryTextColor">
                                                Recebido:
                                            </Text>
                                            <Text preset="text14" color="primary100" fontWeight="bold">
                                                {formatCurrency(selectedPayment.receivedValue)}
                                            </Text>
                                        </Box>
                                    )}
                                </Box>

                                <Box marginBottom="y12">
                                    <Text preset="text12" color="secondaryTextColor" marginBottom="y4">
                                        Status
                                    </Text>
                                    <Box
                                        backgroundColor={getStatusColor(selectedPayment.status)}
                                        borderRadius="s10"
                                        padding="y4"
                                        alignSelf="flex-start">
                                        <Text preset="text12" color="white" fontWeight="bold">
                                            {getStatusLabel(selectedPayment.status)}
                                        </Text>
                                    </Box>
                                </Box>

                                {!!selectedPayment.routingId && (
                                    <Box marginBottom="y12">
                                        <Text preset="text12" color="secondaryTextColor" marginBottom="y4">
                                            Rota
                                        </Text>
                                        <Text preset="text14" color="colorTextPrimary">
                                            {selectedPayment.routingId}
                                        </Text>
                                    </Box>
                                )}

                                {!!selectedPayment.serviceId && (
                                    <Box marginBottom="y12">
                                        <Text preset="text12" color="secondaryTextColor" marginBottom="y4">
                                            Serviço
                                        </Text>
                                        <Text preset="text14" color="colorTextPrimary">
                                            {selectedPayment.serviceId}
                                        </Text>
                                    </Box>
                                )}

                                {!!selectedPayment.paymentDate && (
                                    <Box marginBottom="y12">
                                        <Text preset="text12" color="secondaryTextColor" marginBottom="y4">
                                            Data do Pagamento
                                        </Text>
                                        <Text preset="text14" color="colorTextPrimary">
                                            {format(new Date(selectedPayment.paymentDate), "dd/MM/yyyy 'às' HH:mm")}
                                        </Text>
                                    </Box>
                                )}

                                {!!selectedPayment.createdAt && (
                                    <Box marginBottom="y12">
                                        <Text preset="text12" color="secondaryTextColor" marginBottom="y4">
                                            Criado em
                                        </Text>
                                        <Text preset="text14" color="colorTextPrimary">
                                            {format(new Date(selectedPayment.createdAt), "dd/MM/yyyy 'às' HH:mm")}
                                        </Text>
                                    </Box>
                                )}

                                {!!selectedPayment.updatedAt && (
                                    <Box marginBottom="y12">
                                        <Text preset="text12" color="secondaryTextColor" marginBottom="y4">
                                            Última atualização
                                        </Text>
                                        <Text preset="text14" color="colorTextPrimary">
                                            {format(new Date(selectedPayment.updatedAt), "dd/MM/yyyy 'às' HH:mm")}
                                        </Text>
                                    </Box>
                                )}

                                {!!selectedPayment.notes && (
                                    <Box marginBottom="y12">
                                        <Text preset="text12" color="secondaryTextColor" marginBottom="y4">
                                            Observações
                                        </Text>
                                        <Text preset="text14" color="colorTextPrimary">
                                            {selectedPayment.notes}
                                        </Text>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </>
                </Modal>

                <Box height={measure.y20} />
            </Box>
        </ScreenBase>
    );
}
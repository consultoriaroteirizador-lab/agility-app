import React, { useMemo } from 'react';
import { Dimensions } from 'react-native';

import { LineChart } from 'react-native-chart-kit';

import { Box, Text } from '@/components';
import { colors, measure } from '@/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface EarningsChartProps {
    data: {
        labels: string[];
        datasets: {
            data: number[];
        }[];
    };
    height?: number;
    width?: number;
    period?: 'today' | 'week' | 'month' | 'year';
}

export default function EarningsChart({
    data,
    height = 220,
    width = SCREEN_WIDTH - 32,
    period = 'month',
}: EarningsChartProps) {
    const chartConfig = useMemo(
        () => ({
            backgroundColor: colors.white,
            backgroundGradientFrom: colors.white,
            backgroundGradientTo: colors.white,
            decimalPlaces: 0,
            color: (opacity = 1) => colors.primary100,
            labelColor: (opacity = 1) => colors.gray700,
            style: {
                borderRadius: 16,
            },
            propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: colors.primary100,
            },
            propsForBackgroundLines: {
                strokeDasharray: '',
                stroke: colors.gray100,
                strokeWidth: 1,
            },
        }),
        [],
    );

    const formatCurrency = (value: number): string => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0,
        }).format(value);
    };

    const getPeriodLabel = () => {
        switch (period) {
            case 'today':
                return 'Evolução Hoje';
            case 'week':
                return 'Evolução Semanal';
            case 'month':
                return 'Evolução Mensal';
            case 'year':
                return 'Evolução Anual';
            default:
                return 'Evolução';
        }
    };

    return (
        <Box backgroundColor="white" borderRadius="s20" >
            <Text preset="text16" color="colorTextPrimary" fontWeight="bold" marginBottom="y12">
                {getPeriodLabel()}
            </Text>

            {data.labels.length > 0 && data.datasets[0]?.data?.length > 0 ? (
                <LineChart
                    data={data}
                    width={width}
                    height={height}
                    chartConfig={chartConfig}
                    bezier
                    style={{
                        borderRadius: 16,
                    }}
                    withInnerLines={false}
                    withOuterLines={true}
                    withVerticalLines={false}
                    withHorizontalLines={true}
                    withDots={true}
                    withShadow={false}
                    segments={5}
                    formatYLabel={(value) => formatCurrency(parseFloat(value))}
                />
            ) : (
                <Box
                    height={height}
                    alignItems="center"
                    justifyContent="center"
                    borderWidth={measure.m1}
                    borderColor="borderColor"
                    borderRadius="s16">
                    <Text preset="text14" color="secondaryTextColor">
                        Dados insuficientes para exibir gráfico
                    </Text>
                </Box>
            )}
        </Box>
    );
}

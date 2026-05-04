import React, { useMemo } from 'react';
import { Dimensions } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';

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
    const values = data.datasets[0]?.data ?? [];
    const labels = data.labels;

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

    const padding = { top: 20, right: 16, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const { points, xStep, yMin, yMax, yLabels } = useMemo(() => {
        if (values.length === 0) {
            return { points: [], xStep: 0, yMin: 0, yMax: 0, yLabels: [] };
        }

        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;
        const yPadding = range * 0.1;
        const yMinCalc = Math.max(0, min - yPadding);
        const yMaxCalc = max + yPadding;
        const yRange = yMaxCalc - yMinCalc || 1;

        const step = values.length > 1 ? chartWidth / (values.length - 1) : chartWidth;

        const pts = values.map((v, i) => ({
            x: padding.left + i * step,
            y: padding.top + chartHeight - ((v - yMinCalc) / yRange) * chartHeight,
            value: v,
        }));

        const numLabels = 5;
        const yLabs: number[] = [];
        for (let i = 0; i <= numLabels; i++) {
            yLabs.push(yMinCalc + (yRange * i) / numLabels);
        }

        return { points: pts, xStep: step, yMin: yMinCalc, yMax: yMaxCalc, yLabels: yLabs };
    }, [values, chartWidth, chartHeight]);

    const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

    const hasData = values.length > 0 && values.some(v => v > 0);

    return (
        <Box backgroundColor="white" borderRadius="s20">
            <Text preset="text16" color="colorTextPrimary" fontWeight="bold" marginBottom="y12">
                {getPeriodLabel()}
            </Text>

            {hasData ? (
                <Svg width={width} height={height}>
                    {/* Horizontal grid lines */}
                    {yLabels.map((label, i) => {
                        const y = padding.top + chartHeight - (i / (yLabels.length - 1)) * chartHeight;
                        return (
                            <React.Fragment key={`grid-${i}`}>
                                <Line
                                    x1={padding.left}
                                    y1={y}
                                    x2={width - padding.right}
                                    y2={y}
                                    stroke={colors.gray100}
                                    strokeWidth={1}
                                />
                                <SvgText
                                    x={padding.left - 6}
                                    y={y + 4}
                                    textAnchor="end"
                                    fontSize={10}
                                    fill={colors.gray500}
                                >
                                    {formatCurrency(label)}
                                </SvgText>
                            </React.Fragment>
                        );
                    })}

                    {/* Line */}
                    {points.length > 1 && (
                        <Polyline
                            points={polylinePoints}
                            fill="none"
                            stroke={colors.primary100}
                            strokeWidth={2}
                        />
                    )}

                    {/* Dots + Labels */}
                    {points.map((p, i) => (
                        <React.Fragment key={`dot-${i}`}>
                            <Circle cx={p.x} cy={p.y} r={4} fill={colors.white} stroke={colors.primary100} strokeWidth={2} />
                            {labels[i] && (
                                <SvgText
                                    x={p.x}
                                    y={height - 8}
                                    textAnchor="middle"
                                    fontSize={10}
                                    fill={colors.gray700}
                                >
                                    {labels[i]}
                                </SvgText>
                            )}
                        </React.Fragment>
                    ))}
                </Svg>
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

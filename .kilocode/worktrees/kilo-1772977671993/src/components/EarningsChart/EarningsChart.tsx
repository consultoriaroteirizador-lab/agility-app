import React from 'react';
import { Dimensions } from 'react-native';

import { LineChart } from 'react-native-chart-kit';

import { Box, Text } from '@/components';
import { colors, measure } from '@/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface EarningsDataPoint {
  date: string;
  value: number; // in cents
}

export interface EarningsChartProps {
  data: EarningsDataPoint[];
}

export function EarningsChart({ data }: EarningsChartProps) {
  const formatCurrency = (valueInCents: number): string => {
    const value = valueInCents / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDateLabel = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  if (!data || data.length === 0) {
    return (
      <Box
        backgroundColor="white"
        borderRadius="s16"
        padding="y16"
        margin="y12"
        alignItems="center"
        justifyContent="center"
        minHeight={measure.y220}>
        <Text preset="text14" color="gray700" textAlign="center">
          Sem dados para exibir o gráfico
        </Text>
      </Box>
    );
  }

  const chartData = {
    labels: data.map(d => formatDateLabel(d.date)),
    datasets: [
      {
        data: data.map(d => d.value / 100), // Convert to reais for display
        color: (opacity = 1) => colors.primary100,
        strokeWidth: 3,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: colors.white,
    backgroundGradientTo: colors.white,
    decimalPlaces: 0,
    color: (opacity = 1) => colors.gray700,
    labelColor: (opacity = 1) => colors.gray700,

    propsForDots: {
      r: '6',
      strokeWidth: '3',
      stroke: colors.primary100,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: 'gray200',
      strokeWidth: 1,
    },
  };

  const chartWidth = SCREEN_WIDTH - 48; // 24px padding left + 24px right

  return (
    <Box
      backgroundColor="white"
      borderRadius="s16"
      padding="y12"
      margin="y12"
    >
      <Text preset="text14" color="colorTextPrimary" fontWeight="bold" marginBottom="y12">
        Tendência de Ganhos
      </Text>

      <Box
        alignItems="center"
        marginVertical="y8"
      >
        <LineChart
          data={chartData}
          width={chartWidth}
          height={200}
          chartConfig={chartConfig}
          bezier
          withDots
          withInnerLines={false}
          withOuterLines={false}
          withVerticalLines={false}
        />
      </Box>

      {data.length > 0 && (
        <Box
          flexDirection="row"
          justifyContent="center"
          marginTop="y8"
          paddingTop="y8"
          borderTopWidth={measure.m1}
          borderTopColor="gray200"
          paddingVertical="y8"
        >
          <Box
            flexDirection="row"
            alignItems="center"
            marginHorizontal="x16"
          >
            <Box
              width={measure.x12}
              height={measure.y12}
              borderRadius="s6"
              backgroundColor="primary100"
            />
            <Text preset="text12" color="gray700">
              Total: {formatCurrency(data[data.length - 1].value)}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}

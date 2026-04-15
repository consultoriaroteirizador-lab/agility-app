import React from 'react';

import { Box, Text } from '@/components';
import { Icon } from '@/components/Icon/Icon';

interface EventoCardProps {
  titulo: string;
  status?: string;
}

export default function EventoCard({ titulo, status = 'offline' }: EventoCardProps) {
  const badgeColor = status === 'online' ? 'greenSuccess' : 'primary100';

  return (
    <Box
      backgroundColor="white"
      borderWidth={1}
      borderColor="borderColor"
      borderRadius="s12"
      padding="y12"
    >
      <Box flexDirection="row" alignItems="center" gap="x8">
        <Icon name="event" color="colorTextPrimary" size={20} />
        <Text preset="text14" color="colorTextPrimary" fontWeight="bold">
          {titulo}
        </Text>
      </Box>

      <Box
        backgroundColor={badgeColor}
        paddingHorizontal="x16"
        paddingVertical="y4"
        borderRadius="s16"
        alignSelf="flex-start"
        marginTop="y8"
      >
        <Text preset="text12" color="white" fontWeight="bold">
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Text>
      </Box>
    </Box>
  );
}

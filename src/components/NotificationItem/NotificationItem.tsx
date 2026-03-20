import React from 'react';

import type { NotificationResponse } from '@/domain/agility/notification/dto';
import { ThemeColors, measure } from '@/theme';

import { Box } from '../BoxBackGround/BoxBackGround';
import { Icon, IconNameMaterial } from '../Icon/Icon';
import { TouchableOpacityBox } from '../RestyleComponent/RestyleComponent';
import { Text, TextProps } from '../Text/Text';

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'agora mesmo';
  } else if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minuto atrás' : `${diffMinutes} minutos atrás`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 hora atrás' : `${diffHours} horas atrás`;
  } else if (diffDays < 7) {
    return diffDays === 1 ? '1 dia atrás' : `${diffDays} dias atrás`;
  } else {
    return date.toLocaleDateString('pt-BR');
  }
}

interface NotificationItemProps {
  notification: NotificationResponse;
  onPress?: () => void;
  onRead?: () => void;
  preset?: TextProps['preset'];
  backgroundColor?: ThemeColors;
  borderColor?: ThemeColors;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
  onRead: _onRead,
  preset: _variant = 'textParagraph',
  backgroundColor = 'white',
  borderColor = "gray200",
}) => {
  const isUnread = notification.status === 'UNREAD';

  const getIcon = (): IconNameMaterial => {
    switch (notification.type) {
      case 'ROUTE_REPLANNED':
        return 'alt-route';
      case 'ROUTE_OFFER':
        return 'map';
      case 'ROUTE_STARTED':
        return 'play-arrow';
      case 'ROUTE_COMPLETED':
        return 'check-circle';
      case 'SERVICE_ADDED':
        return 'add-circle';
      case 'SERVICE_REMOVED':
        return 'remove-circle';
      case 'SERVICE_COMPLETED':
        return 'done';
      case 'PAYMENT_RECEIVED':
        return 'payments';
      case 'SYSTEM_ALERT':
        return 'notifications';
      default:
        return 'info';
    }
  };

  const handlePress = () => {
    try {
      if (isUnread && notification.id && _onRead) {
        try {
          _onRead();
        } catch (error) {
          console.error('Erro ao marcar notificação como lida:', error);
        }
      }

      if (onPress) {
        try {
          onPress();
        } catch (error) {
          console.error('Erro no callback onPress:', error);
        }
      }
    } catch (error) {
      console.error('Erro ao processar clique na notificação:', error);
    }
  };

  const timeAgo = formatTimeAgo(notification.createdAt);

  return (
    <TouchableOpacityBox
      onPress={handlePress}
      backgroundColor={backgroundColor}
      padding="y12"
      borderWidth={measure.m1}
      borderColor={isUnread ? 'primary100' : borderColor}
      borderRadius="s12"
      activeOpacity={0.7}
      width={"100%"}
    >
      <Box
        width={measure.x4}
        borderTopLeftRadius="s8"
        borderBottomLeftRadius="s8"
        backgroundColor={isUnread ? 'primary100' : 'transparent'}
      />

      <Box
        width={measure.x48}
        height={measure.y48}
        borderRadius="s24"
        justifyContent="center"
        alignItems="center"
        marginRight="x12"
        backgroundColor="gray50"
      >
        <Icon name={getIcon()} size={24} color="primary100" />
      </Box>

      <Box flex={1}>
        <Text
          preset="textParagraph"
          color="colorTextPrimary"
          fontWeight="bold"
          numberOfLines={2}
          marginBottom="y4"
        >
          {notification.title}
        </Text>

        <Text
          preset="textParagraph"
          color="gray700"
          numberOfLines={3}
          marginBottom="y4"
        >
          {notification.description}
          {notification.linkLabel && (
            <Text color="primary100" fontWeight="600">
              {' '}
              {notification.linkLabel}
            </Text>
          )}
        </Text>

        <Text preset="text12" color="gray500">
          {timeAgo}
        </Text>
      </Box>

      {isUnread && (
        <Box
          width={measure.x8}
          height={measure.y8}
          borderRadius="s4"
          marginTop="y8"
          backgroundColor="primary100"
        />
      )}
    </TouchableOpacityBox>
  );
};
import React from 'react';
import { FlatList } from 'react-native';

import type { NotificationResponse } from '@/domain/agility/notification/dto';
import { measure } from '@/theme';

import { ActivityIndicator } from '../ActivityIndicator/ActivityIndicator';
import { Box } from '../BoxBackGround/BoxBackGround';
import { Text } from '../Text/Text';

import { NotificationItem } from './NotificationItem';

interface ListaDeNotificacoesProps {
    notifications: NotificationResponse[];
    isLoading?: boolean;
    isError?: boolean;
    onRefresh?: () => void;
    isRefetching?: boolean;
    onNotificationPress?: (notification: NotificationResponse) => void;
    onMarkAsRead?: (id: string) => void;
}

export const ListaDeNotificacoes: React.FC<ListaDeNotificacoesProps> = ({
    notifications,
    isLoading = false,
    isError = false,
    onRefresh,
    isRefetching = false,
    onNotificationPress,
    onMarkAsRead,
}) => {
    if (isLoading) {
        return (
            <Box flex={1} justifyContent="center" alignItems="center">
                <ActivityIndicator size="large" />
            </Box>
        );
    }

    if (isError) {
        return (
            <Box flex={1} justifyContent="center" alignItems="center" padding="x20">
                <Text preset="textParagraph" color="gray700" textAlign="center">
                    Erro ao carregar notificações. Arraste para baixo para tentar novamente.
                </Text>
            </Box>
        );
    }

    if (notifications.length === 0) {
        return (
            <Box flex={1} justifyContent="center" alignItems="center" padding="x20">
                <Text preset="textParagraph" color="gray700" textAlign="center">
                    Nenhuma notificação encontrada.
                </Text>
            </Box>
        );
    }

    return (
        <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
                <NotificationItem
                    notification={item}
                    onPress={() => onNotificationPress?.(item)}
                    onRead={() => onMarkAsRead?.(item.id)}
                />
            )}
            contentContainerStyle={{
                paddingTop: measure.m16,
                paddingBottom: measure.m24,
                gap: measure.m12,
            }}
            refreshing={isRefetching}
            onRefresh={onRefresh}
        />
    );
};
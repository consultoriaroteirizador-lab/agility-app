// src/app/(auth)/(tabs)/menu/carteira/_components/PolicyNoticeBox.tsx

import React from 'react';

import { Box, Text, TouchableOpacityBox } from '@/components';
import { measure } from '@/theme';

import { policyNoticeColor, type PolicyNotice } from '../_utils/debtPolicy';

interface Props {
    notice: PolicyNotice;
    /** Com `onPress`, o aviso vira botão e mostra `linkText` (saque -> tela de dívidas). */
    onPress?: () => void;
    linkText?: string;
}

/** Aviso da política de saque com dívida: o mesmo bloco no modal de saque e na tela de dívidas. */
export function PolicyNoticeBox({ notice, onPress, linkText }: Props) {
    const content = (
        <>
            <Text testID="aviso-politica-divida-texto" fontSize={measure.m13} color={policyNoticeColor(notice.tone)}>
                {notice.text}
            </Text>
            {onPress && linkText && (
                <Text mt="t4" fontSize={measure.m12} color="colorTextPrimary">
                    {linkText}
                </Text>
            )}
        </>
    );

    if (onPress) {
        return (
            <TouchableOpacityBox testID="aviso-politica-divida" mt="t16" p="m16" borderRadius="s12" backgroundColor="gray50" onPress={onPress} accessibilityRole="button">
                {content}
            </TouchableOpacityBox>
        );
    }
    return (
        <Box testID="aviso-politica-divida" mt="t16" p="m16" borderRadius="s12" backgroundColor="gray50">
            {content}
        </Box>
    );
}

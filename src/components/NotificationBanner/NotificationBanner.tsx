import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder, StyleSheet } from 'react-native';

import type { NotificationResponse } from '@/domain/agility/notification/dto';
import { iconeDaNotificacao } from '@/domain/agility/notification/notificationTarget';
import { measure } from '@/theme';

import { Box } from '../BoxBackGround/BoxBackGround';
import { Icon } from '../Icon/Icon';
import { TouchableOpacityBox } from '../RestyleComponent/RestyleComponent';
import { Text } from '../Text/Text';

/** Quanto o banner fica na tela antes de sair sozinho. */
export const DURACAO_BANNER_MS = 5000;
/** Duração da entrada e da saída (deslize vertical). */
export const ANIMACAO_BANNER_MS = 220;
/** Arrastar para cima além disto dispensa o banner. */
const LIMIAR_ARRASTE = 40;
/** Fora da tela: o banner nasce e some acima do topo. */
const FORA_DA_TELA = -240;

/** Soltar o arraste com o banner puxado para cima além do limiar dispensa; menos que isso, ele volta. */
export function arrasteDispensa(dy: number): boolean {
    return dy < -LIMIAR_ARRASTE;
}

export interface NotificationBannerProps {
    notificacao: NotificationResponse;
    /** Quantas chegaram por cima desta sem o motorista dispensar ("+N novas"). */
    novas: number;
    /** Inset superior (área segura) — o banner desce até logo abaixo dele. */
    topo: number;
    onAbrir: () => void;
    /** Chamado depois da animação de saída (tempo esgotado, X ou arraste para cima). */
    onDispensar: () => void;
    duracaoMs?: number;
}

/**
 * Banner que desce do topo quando chega uma notificação com o app aberto. Mesma ideia do
 * alerta de oferta (entra deslizando, sai deslizando), mas não é modal: não escurece a tela
 * nem prende o foco — o motorista continua usando o app por baixo.
 */
export function NotificationBanner({
    notificacao,
    novas,
    topo,
    onAbrir,
    onDispensar,
    duracaoMs = DURACAO_BANNER_MS,
}: NotificationBannerProps) {
    const translateY = useRef(new Animated.Value(FORA_DA_TELA)).current;
    const saindo = useRef(false);
    const onDispensarRef = useRef(onDispensar);
    onDispensarRef.current = onDispensar;

    const sair = useCallback(() => {
        if (saindo.current) return;
        saindo.current = true;
        Animated.timing(translateY, {
            toValue: FORA_DA_TELA,
            duration: ANIMACAO_BANNER_MS,
            useNativeDriver: true,
        }).start(() => onDispensarRef.current());
    }, [translateY]);

    // Entrada, e o relógio de 5 s. Uma notificação nova por cima (id muda) reinicia o relógio:
    // o motorista ganha os 5 s inteiros para ler a mais nova.
    useEffect(() => {
        saindo.current = false;
        Animated.timing(translateY, {
            toValue: 0,
            duration: ANIMACAO_BANNER_MS,
            useNativeDriver: true,
        }).start();
        const timer = setTimeout(sair, duracaoMs);
        return () => clearTimeout(timer);
    }, [notificacao.id, duracaoMs, sair, translateY]);

    const panResponder = useMemo(
        () =>
            PanResponder.create({
                // Só captura arraste vertical para cima; toque simples continua sendo do botão.
                onMoveShouldSetPanResponder: (_e, g) => g.dy < -8 && Math.abs(g.dy) > Math.abs(g.dx),
                onPanResponderMove: (_e, g) => {
                    if (g.dy < 0) translateY.setValue(g.dy);
                },
                onPanResponderRelease: (_e, g) => {
                    if (arrasteDispensa(g.dy)) {
                        sair();
                        return;
                    }
                    Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
                },
            }),
        [sair, translateY],
    );

    const rotuloAcessivel = `${notificacao.title}. ${notificacao.description ?? ''}`.trim();

    return (
        <Animated.View
            testID="notification-banner"
            style={[styles.container, { top: topo + 8, transform: [{ translateY }] }]}
            {...panResponder.panHandlers}
        >
            <Box
                flexDirection="row"
                alignItems="center"
                backgroundColor="white"
                borderRadius="s12"
                borderWidth={measure.m1}
                borderColor="primary100"
                style={styles.sombra}
            >
                <TouchableOpacityBox
                    testID="notification-banner-abrir"
                    flex={1}
                    flexDirection="row"
                    alignItems="center"
                    padding="y12"
                    activeOpacity={0.8}
                    onPress={onAbrir}
                    accessibilityRole="button"
                    accessibilityLabel={rotuloAcessivel}
                    accessibilityHint="Abre a notificação"
                >
                    <Box
                        width={measure.x40}
                        height={measure.y40}
                        borderRadius="s20"
                        justifyContent="center"
                        alignItems="center"
                        marginRight="x12"
                        backgroundColor="gray50"
                    >
                        <Icon name={iconeDaNotificacao(notificacao.type)} size={measure.m24} color="primary100" />
                    </Box>
                    <Box flex={1}>
                        <Box flexDirection="row" alignItems="center">
                            <Text
                                preset="textParagraph"
                                color="colorTextPrimary"
                                fontWeight="bold"
                                numberOfLines={1}
                                flexShrink={1}
                            >
                                {notificacao.title}
                            </Text>
                            {novas > 0 && (
                                <Box
                                    testID="notification-banner-novas"
                                    backgroundColor="primary100"
                                    borderRadius="s12"
                                    paddingHorizontal="x8"
                                    marginLeft="x8"
                                >
                                    <Text preset="text12" color="white">
                                        +{novas} {novas === 1 ? 'nova' : 'novas'}
                                    </Text>
                                </Box>
                            )}
                        </Box>
                        {!!notificacao.description && (
                            <Text preset="text13" color="gray600" numberOfLines={2} marginTop="y4">
                                {notificacao.description}
                            </Text>
                        )}
                    </Box>
                </TouchableOpacityBox>
                <TouchableOpacityBox
                    testID="notification-banner-fechar"
                    padding="y12"
                    onPress={sair}
                    accessibilityRole="button"
                    accessibilityLabel="Fechar aviso"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Icon name="close" size={measure.m20} color="gray600" />
                </TouchableOpacityBox>
            </Box>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 1000,
        elevation: 8,
    },
    sombra: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
    },
});

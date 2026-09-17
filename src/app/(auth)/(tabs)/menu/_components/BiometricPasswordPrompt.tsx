import { Modal as RNModal } from 'react-native';

import { ActivityIndicator, Box, Button, Text, TextInputLogin, TextButton } from '@/components';
import { useAppSafeArea } from '@/hooks';
import { measure } from '@/theme';

interface BiometricPasswordPromptProps {
    visible: boolean;
    password: string;
    setPassword: (value: string) => void;
    errorMessage?: string;
    isLoading: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Pede a senha para ligar o login por digital.
 *
 * NÃO reusa o `PasswordModal` de `@/components`: aquele é um teclado numérico de
 * 4 dígitos com o texto "senha do seu cartão convênio", herdado de outro produto.
 * Aqui a senha é a de login, alfanumérica.
 */
export function BiometricPasswordPrompt({
    visible,
    password,
    setPassword,
    errorMessage,
    isLoading,
    onConfirm,
    onCancel,
}: BiometricPasswordPromptProps) {
    const { top, bottom } = useAppSafeArea();

    return (
        <RNModal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
            <Box flex={1} justifyContent="flex-end" style={{ paddingTop: top }}>
                <Box
                    backgroundColor="white"
                    borderTopLeftRadius="s16"
                    borderTopRightRadius="s16"
                    px="x16"
                    pt="y24"
                    style={{ paddingBottom: bottom + measure.y24 }}
                >
                    <Text preset="text18" fontWeightPreset="bold" color="colorTextPrimary" mb="y8">
                        Confirme sua senha
                    </Text>
                    <Text preset="text14" color="secondaryTextColor" mb="y16">
                        Para entrar com a digital, o app precisa guardar sua senha neste aparelho.
                        Confirme ela uma vez e a digital passa a valer no próximo login.
                    </Text>

                    <TextInputLogin
                        title="Senha"
                        isPassword
                        iconName="lock"
                        placeholder="Digite sua senha"
                        value={password}
                        onChangeText={setPassword}
                        messageError={errorMessage}
                        autoCapitalize="none"
                        autoFocus
                        onSubmitEditing={onConfirm}
                        style={{ marginBottom: measure.b16 }}
                    />

                    {isLoading ? (
                        <Box py="y12" alignItems="center">
                            <ActivityIndicator />
                        </Box>
                    ) : (
                        <Button
                            title="Ativar biometria"
                            onPress={onConfirm}
                            disabled={password.length === 0}
                        />
                    )}

                    <TextButton
                        title="Agora não"
                        preset="textPrimaryUnderline"
                        alignSelf="center"
                        fontSize={measure.m14}
                        onPress={onCancel}
                    />
                </Box>
            </Box>
        </RNModal>
    );
}

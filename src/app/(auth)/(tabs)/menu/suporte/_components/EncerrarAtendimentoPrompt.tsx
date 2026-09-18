import { Modal as RNModal } from 'react-native';

import { ActivityIndicator, Box, Button, Input, Text, TextButton } from '@/components';
import { useAppSafeArea } from '@/hooks';
import { measure } from '@/theme';

interface EncerrarAtendimentoPromptProps {
    visible: boolean;
    motivo: string;
    setMotivo: (value: string) => void;
    errorMessage?: string;
    isLoading: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Confirmação de "Encerrar atendimento" pelo próprio motorista.
 *
 * O motivo é opcional de propósito: quem está na rua não vai digitar, e obrigar
 * texto só faria o motorista escrever ponto para passar. O protocolo fica
 * RESOLVIDO e o operador dá o fechamento final.
 */
export function EncerrarAtendimentoPrompt({
    visible,
    motivo,
    setMotivo,
    errorMessage,
    isLoading,
    onConfirm,
    onCancel,
}: EncerrarAtendimentoPromptProps) {
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
                        Encerrar atendimento?
                    </Text>
                    <Text preset="text14" color="secondaryTextColor" mb="y16">
                        A conversa será finalizada e o protocolo vai para a central conferir. Se
                        precisar de novo, é só abrir outro atendimento.
                    </Text>

                    <Input
                        title="Motivo (opcional)"
                        placeholder="Ex.: resolvi com o cliente"
                        value={motivo}
                        onChangeText={setMotivo}
                        multiline
                        maxLength={500}
                        editable={!isLoading}
                    />

                    {!!errorMessage && (
                        <Text preset="text13" color="colorTextError" mt="y8" accessibilityRole="alert">
                            {errorMessage}
                        </Text>
                    )}

                    {isLoading ? (
                        <Box alignItems="center" py="y16">
                            <ActivityIndicator />
                        </Box>
                    ) : (
                        <Button title="Encerrar atendimento" onPress={onConfirm} mt="y16" />
                    )}

                    <Box alignItems="center" mt="y12">
                        <TextButton title="Voltar para a conversa" onPress={onCancel} preset="primary" />
                    </Box>
                </Box>
            </Box>
        </RNModal>
    );
}

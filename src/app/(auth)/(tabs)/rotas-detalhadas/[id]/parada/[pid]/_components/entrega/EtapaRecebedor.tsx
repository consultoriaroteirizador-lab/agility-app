import { Box, Button, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { measure } from '@/theme';

import { useParada, RecipientType } from '../../_context/ParadaContext';


const RECIPIENT_OPTIONS: { type: RecipientType; label: string }[] = [
    { type: 'cliente', label: 'Cliente' },
    { type: 'porteiro', label: 'Porteiro' },
    { type: 'vizinho', label: 'Vizinho' },
    { type: 'familiar', label: 'Familiar' },
    { type: 'outro', label: 'Outro' },
];

/**
 * Etapa 3: Seleção de recipient
 * Layout unificado com dados-servico
 */
export function EtapaRecebedor() {
    const { service, recipient, updateRecipient, setEtapa, setDelivered } = useParada();

    const nomeCliente = service?.fantasyName || service?.responsible || 'Cliente';

    const getLabel = (type: RecipientType) => {
        if (type === 'cliente') return nomeCliente;
        return RECIPIENT_OPTIONS.find(o => o.type === type)?.label || type;
    };

    const handleBack = () => {
        setEtapa(2);
        setDelivered(false);
    };

    return (
        <ScreenBase
            buttonLeft={<ButtonBack onPress={handleBack} />}
            title={
                <Text preset="textTitleScreen" fontWeightPreset="bold" color="colorTextPrimary">
                    Dados do recipient
                </Text>
            }
        >
            <Box flex={1} backgroundColor="white">
                <Box scrollable>
                    <Box paddingTop="y24" paddingBottom="y4">




                        <Text preset="text14" color="gray600" marginBottom="y12">
                            Escolha para quem foi entregue:
                        </Text>

                        {/* Opções de recipient */}
                        <Box gap="y8" marginBottom="y12">
                            {RECIPIENT_OPTIONS.map((option) => (
                                <TouchableOpacityBox
                                    key={option.type}
                                    onPress={() => updateRecipient({ tipo: option.type })}
                                    flexDirection="row"
                                    alignItems="center"
                                    gap="x12"
                                    padding="y12"
                                    borderWidth={measure.m2}
                                    borderColor={recipient.tipo === option.type ? 'primary100' : 'gray200'}
                                    borderRadius="s12"
                                    backgroundColor={recipient.tipo === option.type ? 'primary10' : 'white'}
                                >
                                    <Box
                                        width={measure.x24}
                                        height={measure.y24}
                                        borderRadius="s4"
                                        borderWidth={measure.m2}
                                        borderColor={recipient.tipo === option.type ? 'primary100' : 'mutedElementsColor'}
                                        backgroundColor={recipient.tipo === option.type ? 'primary100' : 'transparent'}
                                        justifyContent="center"
                                        alignItems="center"
                                    >
                                        {recipient.tipo === option.type && (
                                            <Box width={measure.x12} height={measure.y12} borderRadius="s4" backgroundColor="white" />
                                        )}
                                    </Box>
                                    <Text
                                        preset="text16"
                                        color="colorTextPrimary"
                                        fontWeightPreset={recipient.tipo === option.type ? 'bold' : 'regular'}
                                    >
                                        {getLabel(option.type)}
                                    </Text>
                                </TouchableOpacityBox>
                            ))}
                        </Box>

                        <Box paddingBottom="y24" alignItems='center'>
                            <Button
                                width={measure.x330}
                                title="Próximo"
                                onPress={() => setEtapa(4)}
                                disabled={!recipient.tipo}
                            />
                        </Box>
                    </Box>
                </Box>
            </Box>

        </ScreenBase>

    );
}

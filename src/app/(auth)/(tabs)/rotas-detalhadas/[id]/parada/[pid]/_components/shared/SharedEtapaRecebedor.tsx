import { Box, Button, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { measure, ThemeColors } from '@/theme';

import { useParada, RecipientType } from '../../_context/ParadaContext';

type ServiceType = 'entrega' | 'servico' | 'coleta';

interface SharedEtapaRecebedorProps {
    serviceType?: ServiceType;
}

const RECIPIENT_OPTIONS: { type: RecipientType; label: string }[] = [
    { type: 'cliente', label: 'Cliente' },
    { type: 'porteiro', label: 'Porteiro' },
    { type: 'vizinho', label: 'Vizinho' },
    { type: 'familiar', label: 'Familiar' },
    { type: 'outro', label: 'Outro' },
];

const CONFIG: Record<ServiceType, {
    title: string;
    description: string;
    selectedColor: ThemeColors;
    selectedBg: ThemeColors;
}> = {
    coleta: {
        title: 'Quem entregou?',
        description: 'Escolha quem entregou os itens para coleta:',
        selectedColor: 'secondary100',
        selectedBg: 'secondary10',
    },
    entrega: {
        title: 'Quem recebeu?',
        description: 'Escolha para quem foi entregue:',
        selectedColor: 'primary100',
        selectedBg: 'primary10',
    },
    servico: {
        title: 'Quem recebeu?',
        description: 'Escolha para quem foi realizado o serviço:',
        selectedColor: 'primary100',
        selectedBg: 'primary10',
    },
};

export function SharedEtapaRecebedor({ serviceType = 'servico' }: SharedEtapaRecebedorProps) {
    const { service, recipient, updateRecipient, setEtapa, setDelivered } = useParada();

    const customerName = service?.fantasyName || service?.responsible || 'Cliente';
    const config = CONFIG[serviceType];

    const getLabel = (type: RecipientType) => {
        if (type === 'cliente') return customerName;
        return RECIPIENT_OPTIONS.find(o => o.type === type)?.label || type;
    };

    const handleBack = () => {
        setEtapa(2);
        setDelivered(false);
    };

    const isSelected = (type: RecipientType) => recipient.tipo === type;

    return (
        <ScreenBase
            buttonLeft={<ButtonBack onPress={handleBack} />}
            title={
                <Text preset="textTitleScreen" fontWeightPreset="bold" color="colorTextPrimary">
                    {config.title}
                </Text>
            }
        >
            <Box flex={1} backgroundColor="white">
                <Box scrollable>
                    <Box paddingTop="y24" paddingBottom="y4">

                        <Text preset="text14" color="gray600" marginBottom="y12">
                            {config.description}
                        </Text>

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
                                    borderColor={isSelected(option.type) ? config.selectedColor : 'gray200'}
                                    borderRadius="s12"
                                    backgroundColor={isSelected(option.type) ? config.selectedBg : 'white'}
                                >
                                    <Box
                                        width={measure.x24}
                                        height={measure.y24}
                                        borderRadius="s4"
                                        borderWidth={measure.m2}
                                        borderColor={isSelected(option.type) ? config.selectedColor : 'mutedElementsColor'}
                                        backgroundColor={isSelected(option.type) ? config.selectedColor : 'transparent'}
                                        justifyContent="center"
                                        alignItems="center"
                                    >
                                        {isSelected(option.type) && (
                                            <Box width={measure.x12} height={measure.y12} borderRadius="s4" backgroundColor="white" />
                                        )}
                                    </Box>
                                    <Text
                                        preset="text16"
                                        color="colorTextPrimary"
                                        fontWeightPreset={isSelected(option.type) ? 'bold' : 'regular'}
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

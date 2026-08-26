import { Box, Button, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { requirementsForServiceType } from '@/domain/agility/company/completionRequirements';
import { relationsForServiceType, RECIPIENT_STEP_TITLES, ServiceFlowType } from '@/domain/agility/company/recipientRelations';
import { measure, ThemeColors } from '@/theme';

import { useParada } from '../../_context/ParadaContext';

interface SharedEtapaRecebedorProps {
    serviceType?: ServiceFlowType;
}

// Cores por fluxo — coleta usa a paleta secundaria, entrega/servico a primaria.
const SELECTED_COLORS: Record<ServiceFlowType, { selectedColor: ThemeColors; selectedBg: ThemeColors }> = {
    coleta: { selectedColor: 'secondary100', selectedBg: 'secondary10' },
    entrega: { selectedColor: 'primary100', selectedBg: 'primary10' },
    servico: { selectedColor: 'primary100', selectedBg: 'primary10' },
};

export function SharedEtapaRecebedor({ serviceType = 'servico' }: SharedEtapaRecebedorProps) {
    const { service, recipient, updateRecipient, setEtapa, setDelivered, completionRequirements, recipientRelations } = useParada();

    const customerName = service?.fantasyName || service?.responsible || 'Cliente';
    const titles = RECIPIENT_STEP_TITLES[serviceType];
    const { selectedColor, selectedBg } = SELECTED_COLORS[serviceType];
    const options = relationsForServiceType(recipientRelations, serviceType);

    // OPTIONAL nao pode virar REQUIRED na pratica: com a config opcional o
    // motorista tem que poder seguir sem escolher um tipo.
    const requirements = requirementsForServiceType(completionRequirements, serviceType);
    const isOptional = requirements.recipientType === 'OPTIONAL';
    // Lista vazia (empresa configurou assim de proposito) nunca trava o motorista
    // em campo, mesmo com a etapa REQUIRED — nao ha opcao nenhuma para escolher.
    const nextDisabled = requirements.recipientType === 'REQUIRED' && !recipient.relationCode && options.length > 0;

    const getLabel = (code: string, label: string) => {
        if (code === 'CLIENTE') return customerName;
        return label;
    };

    const handleBack = () => {
        setEtapa(2);
        setDelivered(false);
    };

    const handleSelect = (code: string, label: string) => {
        // `tipo` (minusculo) continua sendo o que destrava o gate de
        // validateCompletion — nao pode parar de ser gravado.
        updateRecipient({ tipo: code.toLowerCase(), relationCode: code, relationLabel: label });
    };

    const isSelected = (code: string) => recipient.relationCode === code;

    return (
        <ScreenBase
            buttonLeft={<ButtonBack onPress={handleBack} />}
            title={
                <Text preset="textTitleScreen" fontWeightPreset="bold" color="colorTextPrimary">
                    {titles.title}
                </Text>
            }
        >
            <Box flex={1} backgroundColor="white">
                <Box scrollable>
                    <Box paddingTop="y24" paddingBottom="y4">

                        <Text preset="text14" color="gray600" marginBottom="y12">
                            {titles.description}
                        </Text>

                        {isOptional && (
                            <Text preset="text12" color="gray600" marginBottom="y12">
                                Opcional — você pode seguir sem selecionar.
                            </Text>
                        )}

                        <Box gap="y8" marginBottom="y12">
                            {options.length === 0 && (
                                <Text preset="text14" color="gray600">
                                    Nenhuma opção cadastrada
                                </Text>
                            )}
                            {options.map((option) => (
                                <TouchableOpacityBox
                                    key={option.code}
                                    onPress={() => handleSelect(option.code, option.label)}
                                    flexDirection="row"
                                    alignItems="center"
                                    gap="x12"
                                    padding="y12"
                                    borderWidth={measure.m2}
                                    borderColor={isSelected(option.code) ? selectedColor : 'gray200'}
                                    borderRadius="s12"
                                    backgroundColor={isSelected(option.code) ? selectedBg : 'white'}
                                >
                                    <Box
                                        width={measure.x24}
                                        height={measure.y24}
                                        borderRadius="s4"
                                        borderWidth={measure.m2}
                                        borderColor={isSelected(option.code) ? selectedColor : 'mutedElementsColor'}
                                        backgroundColor={isSelected(option.code) ? selectedColor : 'transparent'}
                                        justifyContent="center"
                                        alignItems="center"
                                    >
                                        {isSelected(option.code) && (
                                            <Box width={measure.x12} height={measure.y12} borderRadius="s4" backgroundColor="white" />
                                        )}
                                    </Box>
                                    <Text
                                        preset="text16"
                                        color="colorTextPrimary"
                                        fontWeightPreset={isSelected(option.code) ? 'bold' : 'regular'}
                                    >
                                        {getLabel(option.code, option.label)}
                                    </Text>
                                </TouchableOpacityBox>
                            ))}
                        </Box>

                        <Box paddingBottom="y24" alignItems='center'>
                            <Button
                                width={measure.x330}
                                title="Próximo"
                                onPress={() => setEtapa(4)}
                                disabled={nextDisabled}
                            />
                        </Box>
                    </Box>
                </Box>
            </Box>

        </ScreenBase>

    );
}

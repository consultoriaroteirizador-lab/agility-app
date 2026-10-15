import { useState } from 'react';

import { Box, Text } from '@/components';
import { TouchableOpacityBox } from '@/components/RestyleComponent/RestyleComponent';
import type { ServiceResponse } from '@/domain/agility/service/dto';
import { ServiceType } from '@/domain/agility/service/dto/types';
import { linesTitle, serviceLines } from '@/domain/agility/service/serviceLines';

import { ServiceLinesModal } from './ServiceLinesModal';

/**
 * A etiqueta "📦 Itens (n)" ou "🔧 Equipamentos (n)" das etapas da parada; o toque abre a lista.
 * Some quando a resposta não traz linha.
 */
export function ServiceLinesTag({ service }: { service: ServiceResponse | null | undefined }) {
    const [aberto, setAberto] = useState(false);
    const lines = serviceLines(service) ?? [];
    if (lines.length === 0) return null;
    const serviceType = service?.serviceType;

    return (
        <>
            <Box flexDirection="row" gap="x8" marginTop="y8">
                <TouchableOpacityBox
                    flexDirection="row"
                    alignItems="center"
                    gap="x4"
                    paddingHorizontal="x12"
                    paddingVertical="y6"
                    backgroundColor="gray100"
                    borderRadius="s20"
                    onPress={() => setAberto(true)}
                >
                    <Text preset="text13">{serviceType === ServiceType.SERVICE ? '🔧' : '📦'}</Text>
                    <Text preset="text13" color="gray700">{linesTitle(serviceType, lines.length)}</Text>
                    <Text preset="text13" color="primary100">({lines.length})</Text>
                </TouchableOpacityBox>
            </Box>
            <ServiceLinesModal
                isVisible={aberto}
                onClose={() => setAberto(false)}
                lines={lines}
                serviceType={serviceType}
            />
        </>
    );
}

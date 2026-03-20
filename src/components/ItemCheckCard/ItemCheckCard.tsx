import { Box, Text, TouchableOpacityBox } from '@/components';
import type { ServiceMaterialResponse, MaterialStatus } from '@/domain/agility/service/dto/response/service-material.response';
import { measure } from '@/theme';

const statusConfig: Record<MaterialStatus, { bg: string; text: string; label: string }> = {
    PENDING: { bg: 'gray100', text: 'gray400', label: 'Pendente' },
    CHECKED: { bg: 'primary10', text: 'primary100', label: 'Checado' },
    PARTIAL: { bg: 'secondary100', text: 'secondary80', label: 'Parcial' },
    MISSING: { bg: 'redErrorLight', text: 'redError', label: 'Não encontrado' },
    DAMAGED: { bg: 'redErrorLight', text: 'redError', label: 'Danificado' },
    REFUSED: { bg: 'redErrorLight', text: 'redError', label: 'Recusado' },
};

export interface ItemCheckCardProps {
    item: ServiceMaterialResponse;
    onCheck: () => void;
}

export function ItemCheckCard({ item, onCheck }: ItemCheckCardProps) {
    const config = statusConfig[item.status];
    const isChecked = item.status !== 'PENDING';

    const quantityLabel = item.status === 'PARTIAL' && item.actualQuantity
        ? `${item.actualQuantity}/${item.quantity}`
        : `x${item.quantity}`;

    return (
        <Box
            flexDirection="row"
            alignItems="center"
            padding="y12"
            paddingHorizontal="x12"
            borderWidth={measure.m1}
            borderColor={isChecked ? 'primary100' : 'gray200'}
            borderRadius="s12"
            backgroundColor={isChecked ? 'primary10' : 'white'}
            marginBottom="y12"
        >
            {/* Info do item — flex={1} para ocupar o espaço disponível */}
            <Box flex={1} gap="y4" marginRight="x12">

                {/* Nome + quantidade na mesma linha */}
                <Box flexDirection="row" alignItems="center" gap="x6" flexWrap="wrap">
                    <Text
                        preset="text14"
                        color="colorTextPrimary"
                        fontWeightPreset={isChecked ? 'bold' : 'regular'}
                        numberOfLines={2}
                        style={{ flexShrink: 1 }}
                    >
                        {item.material}
                    </Text>
                    <Text preset="text12" color="gray400" flexShrink={0}>
                        {quantityLabel} {item.unit || 'un'}
                    </Text>
                </Box>

                {item.sku && (
                    <Text preset="text12" color="gray400" numberOfLines={1}>
                        SKU: {item.sku}
                    </Text>
                )}

                {item.checkNotes && (
                    <Text preset="text12" color="gray400" marginTop="y4" numberOfLines={2}>
                        {item.checkNotes}
                    </Text>
                )}
            </Box>

            {/* Lado direito — flexShrink={0} para nunca encolher */}
            <Box
                flexDirection="row"
                alignItems="center"
                gap="x8"
                flexShrink={0}
            >
                {/* Badge de status */}
                <Box
                    paddingHorizontal="x8"
                    paddingVertical="y4"
                    borderRadius="s8"
                    backgroundColor={config.bg as any}
                >
                    <Text
                        preset="text12"
                        color={config.text as any}
                        fontWeightPreset="semibold"
                        numberOfLines={1}
                    >
                        {config.label}
                    </Text>
                </Box>

                {/* Botão check ou ícone confirmado */}
                {item.status === 'PENDING' ? (
                    <TouchableOpacityBox
                        onPress={onCheck}
                        paddingHorizontal="x12"
                        paddingVertical="y8"
                        borderRadius="s8"
                        backgroundColor="primary100"
                    >
                        <Text preset="text14" color="white" fontWeightPreset="semibold">
                            Check
                        </Text>
                    </TouchableOpacityBox>
                ) : (
                    <Box
                        width={measure.x32}
                        height={measure.y32}
                        borderRadius="s16"
                        backgroundColor="primary100"
                        justifyContent="center"
                        alignItems="center"
                        flexShrink={0}
                    >
                        <Text preset="text16" color="white" fontWeightPreset="bold">
                            ✓
                        </Text>
                    </Box>
                )}
            </Box>
        </Box>
    );
}
import { Box, Text, TextButton } from '@/components';
import { getInitialsName } from '@/functions';
import { measure, $shadowProps } from '@/theme';


interface Props {
    name: string;
    onSelectNewAccount: () => void;
}

export function UserCard({ name, onSelectNewAccount }: Props) {
    return (
        <Box
            mb="b10"
            gap="y14"
            pt="t14"
            alignItems="center"
            height={measure.y200}
            width={measure.x320}
            style={$shadowProps}
            backgroundColor="white"
            borderRadius="s14"
        >
            <Box
                alignItems="center"
                justifyContent="center"
                width={measure.m80}
                height={measure.m80}
                borderRadius="s40"
                backgroundColor="gray100"
            >
                <Text preset="text28" fontWeightPreset="semibold" color="gray600">
                    {getInitialsName(name)}
                </Text>
            </Box>

            <Text preset="text17" fontWeightPreset="semibold" color="gray700">
                {name}
            </Text>

            <TextButton
                preset="textPrimaryUnderline"
                title="Acessar outra conta"
                onPress={onSelectNewAccount}
            />
        </Box>
    );
}

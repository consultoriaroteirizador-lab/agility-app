
import { Box, Button, Image, Text } from "@/components";
import { goHomeScreen } from "@/routes/routesService";
import { useAuthCredentialsService } from "@/services";
import { $shadowProps, measure } from "@/theme";

export default function RegisterAllowsBiometricScreen() {
    const {
        userCredentialsCurrent,
        saveUserCredentials,
    } = useAuthCredentialsService();

    function handleActivateBiometric() {
        if (userCredentialsCurrent) {
            saveUserCredentials({ ...userCredentialsCurrent, allowsBiometrics: true })
        }
        goHomeScreen()
    }

    function handleDisableBiometric() {
        // Salvar allowsBiometrics: false para não perguntar novamente
        if (userCredentialsCurrent) {
            saveUserCredentials({ ...userCredentialsCurrent, allowsBiometrics: false })
        }
        goHomeScreen()
    }

    return (
        <Box
            paddingTop="t18"
            paddingHorizontal="x10"
            borderRadius="s12"
            width={"100%"}
            mt="y12Negative"
            style={$shadowProps}
            borderWidth={measure.m1}
            borderColor="gray100"
            height={measure.y90}
            backgroundColor="white"
            alignItems="center"
            paddingBottom="b32"
            flex={1}
        >
            <Box flex={1} width={'100%'} mt="t10" justifyContent="center" alignItems="center">
                <Image
                    resizeMode="contain"
                    height={measure.y140}
                    width={measure.x120}
                    source={require("@/assets/icons/auth/icons8-fingerprint2.png")}
                />
                <Text mt="t20" mb="y10" preset="text22" fontWeightPreset="semibold">Deseja ativar a biometria?</Text>
                <Text textAlign="center">Com a biometria ativada, o acesso ao app se torna mais rápido e seguro, sem a necessidade de digitar senhas.</Text>

            </Box>
            <Box alignItems="center" mt="t20" flexDirection="row" gap="x12">
                <Button presetText="text17" height={measure.y50} title="Ativar" onPress={handleActivateBiometric} width={measure.x160} />
                <Button presetText="text17" preset="outline" height={measure.y50} title="Agora não" onPress={handleDisableBiometric} width={measure.x160} />
            </Box>
        </Box>
    )
}
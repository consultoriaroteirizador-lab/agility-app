import { Linking, Platform } from 'react-native';

import { router } from 'expo-router';

import {
    Box,
    Button,
    Image,
    ScreenBase,
    Text,
} from '@/components';
import { LogoColor } from '@/components/Logo';
import { measure } from '@/theme';


export default function UpdateVersionScreen() {

    function goLoginScreen() {
        router.replace('/(public)/LoginScreen');
    }

    async function submitForm() {
        try {
            if (Platform.OS === 'android') {
                const packageName = '';
                const marketUrl = `market://details?id=${packageName}`;
                const playStoreUrl = `https://play.google.com/store/apps/details?id=${packageName}`;
                const supported = await Linking.canOpenURL(marketUrl);
                await Linking.openURL(supported ? marketUrl : playStoreUrl);
            } else if (Platform.OS === 'ios') {
                const appStoreUrl = 'itms-apps://apps.apple.com/app/id1528974628';
                await Linking.openURL(appStoreUrl);
            } else {
                const fallbackUrl = 'https://play.google.com/store/apps/details?id=';
                await Linking.openURL(fallbackUrl);
            }
        } catch (error) {
        }
    }


    return (
        <ScreenBase title={<LogoColor />}>
            <Box flex={1} alignItems='center'>
                <Image
                    resizeMode='contain'
                    source={require('../../../assets/images/update/update.png')}
                    height={measure.y400}
                    width={measure.x340} />

                <Text preset='text18' textAlign='center'>
                    Tem novidade no ar! Atualize o aplicativo para aproveitar melhorias e seguir usando.{"\n\n"}É rapidinho. Toque em “Atualizar” para continuar.
                </Text>
            </Box>
            <Box justifyContent='center' alignItems='center'>
                <Button
                    title='Atualizar'
                    onPress={submitForm}
                />
            </Box>
        </ScreenBase>
    );
}

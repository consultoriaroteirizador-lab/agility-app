import { Linking, Platform } from 'react-native';

import { router } from 'expo-router';

import {
    Box,
    Button,
    ScreenBase,
    Text,
} from '@/components';
import { LogoColor } from '@/components/Logo';
import { colors, measure } from '@/theme';

import ImgUpdate from '../../../assets/images/update/app-update.svg'
// Package Name do lab-app (configurado no app.config.ts)
const PACKAGE_NAME = 'br.com.agility.agilityapp';

// TODO: Substituir pelo App Store ID quando o app for publicado
const APP_STORE_ID = '1528974628';


export default function UpdateVersionScreen() {

    function goLoginScreen() {
        router.replace('/(public)/LoginScreen');
    }

    async function submitForm() {
        try {
            if (Platform.OS === 'android') {
                const marketUrl = `market://details?id=${PACKAGE_NAME}`;
                const playStoreUrl = `https://play.google.com/store/apps/details?id=${PACKAGE_NAME}`;
                const supported = await Linking.canOpenURL(marketUrl);
                await Linking.openURL(supported ? marketUrl : playStoreUrl);
            } else if (Platform.OS === 'ios') {
                const appStoreUrl = `itms-apps://apps.apple.com/app/id${APP_STORE_ID}`;
                await Linking.openURL(appStoreUrl);
            } else {
                const fallbackUrl = `https://play.google.com/store/apps/details?id=${PACKAGE_NAME}`;
                await Linking.openURL(fallbackUrl);
            }
        } catch (error) {
            // Handle error silently
        }
    }


    return (
        <ScreenBase title={<LogoColor />}>
            <Box flex={1} alignItems='center' mt='t32'>
                <ImgUpdate color={colors.primary100} height={measure.y220} />

                <Text preset='text17' textAlign='center' mt='t20'>
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

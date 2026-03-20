import { router } from "expo-router";


export function goUpdateVersionScreen() {
    router.navigate('/(public)/UpdateVersionScreen');
}

export function goForgotPasswordScreen() {
    router.navigate('/(public)/(forgotPassword)/ForgotPasswordScreen');
}

export function goLoginScreen() {
    try {
        router.replace('/(public)/LoginScreen')
    } catch (error) {
        router.push('/(public)/LoginScreen')
    }
}

export function goHomeScreen() {
    try {
        router.replace('/(auth)/(tabs)');
    } catch (error) {
        router.push('/(auth)/(tabs)');
    }
}



export function goSuccessScreen() {
    router.replace('/(auth)/SuccessScreen')
}


export function goChanceTemporaryPasswordScreen() {
    try {
        router.replace('/(auth)/ChanceTemporaryPasswordScreen')
    } catch (error) {
        router.push('/(auth)/ChanceTemporaryPasswordScreen')
    }
}

export function goTermAndConditionsScreen() {
    router.navigate('/(auth)/TermAndConditionsScreen')
}

export function goWebViewExternalProductScreen(url: string, title: string) {
    router.navigate({
        pathname: '/(auth)/WebViewExternalProductScreen',
        params: { url, title }
    });
}


export function goMenuScreen() {
    router.navigate('/(auth)/MenuScreen');
}

export function goServiceChannelScreen() {
    router.navigate('/(auth)/MenuScreen/ServiceChannelScreen');
}

export function goChangePasswordScreen() {
    router.navigate('/(auth)/MenuScreen/ChangePasswordScreen');
}

export function goTermsMenuScreen() {
    router.navigate('/(auth)/MenuScreen/Terms');
}

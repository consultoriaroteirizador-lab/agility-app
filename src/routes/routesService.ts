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





export function goChanceTemporaryPasswordScreen() {
    try {
        router.replace('/(auth)/ChanceTemporaryPasswordScreen')
    } catch (error) {
        router.push('/(auth)/ChanceTemporaryPasswordScreen')
    }
}

export function goRegisterAllowsBiometricScreen() {
    try {
        router.replace('/(auth)/RegisterAllowsBiometricScreen')
    } catch (error) {
        router.push('/(auth)/RegisterAllowsBiometricScreen')
    }
}



export function goMenuScreen() {
    router.navigate('/(auth)/(tabs)/menu');
}



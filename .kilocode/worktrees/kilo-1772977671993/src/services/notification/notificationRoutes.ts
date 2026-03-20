// src/navigation/notificationRoutes.ts
import { router } from "expo-router";

export type NotificationRoute =
    | "home"
    | "membership"
    | "shopping"
    | "withdrawal"
    | "invoice"
    | "giftCard"
    | "recharge"
    | "privateLabel"
    | "menu"
    | string; // Para rotas customizadas

export const notificationRoutes: Record<string, (params?: any) => void> = {
    // Home
    home: () => router.replace('/(auth)/HomeScreen' as any),

    // Membership
    membership: () => router.navigate('/(auth)/Membership/HomeScreenMembership' as any),
    withdrawal: () => router.navigate('/(auth)/Membership/WithDrawal/WithDrawalOnboardingScreen' as any),
    withdrawalResume: () => router.navigate('/(auth)/Membership/WithDrawal/WithDrawalResumeScreen' as any),
    withdrawalPIX: () => router.navigate('/(auth)/Membership/WithDrawal/WithDrawalPIXReceiptMethodScreen' as any),
    withdrawalConfirmation: () => router.navigate('/(auth)/Membership/WithDrawal/WithDrawalConfirmationDataScreen' as any),
    withdrawalRequest: () => router.navigate('/(auth)/Membership/WithDrawal/WithdrawalRequestScreen' as any),
    invoice: () => router.navigate('/(auth)/Membership/Invoice' as any),
    establishment: () => router.navigate('/(auth)/Membership/EstablishmentScreen' as any),
    indicateCompany: () => router.navigate('/(auth)/Membership/IndicateCompanyScreen' as any),
    presentationMembership: () => router.navigate('/(auth)/Membership/PresentationMembershipScreen' as any),
    changePasswordMember: () => router.navigate('/(auth)/Membership/Card/Password' as any),
    membershipCards: () => router.navigate('/(auth)/Membership/MembershipCardsScreen' as any),

    // Shopping
    shopping: () => router.navigate('/(auth)/Shopping/GiftCard/HomeScreenShopping' as any),
    giftCard: () => router.navigate('/(auth)/Shopping/GiftCard/HomeScreenShopping' as any),
    giftCardDetail: () => router.navigate('/(auth)/Shopping/GiftCard/GiftCardDetailScreen' as any),
    isGift: () => router.navigate('/(auth)/Shopping/GiftCard/IsGiftScreen' as any),
    sendTo: () => router.navigate('/(auth)/Shopping/GiftCard/SendToScreen' as any),
    resendEmail: () => router.navigate('/(auth)/Shopping/GiftCard/ResendEmailScreen' as any),
    receipt: () => router.navigate('/(auth)/Shopping/ReceiptScreen' as any),
    qrCode: () => router.navigate('/(auth)/Shopping/QrCodeScreen' as any),
    paymentForm: () => router.navigate('/(auth)/Shopping/PaymentFormScreen' as any),
    resumeBuyProduct: () => router.navigate('/(auth)/Shopping/ResumeBuyProductScreen' as any),

    // Recharge
    recharge: () => router.navigate('/(auth)/Shopping/Recharge/HomeScreenShoppingRecharge' as any),
    rechargePhoneNumber: () => router.navigate('/(auth)/Shopping/Recharge/RechargePhoneNumberScreen' as any),
    rechargeDetail: () => router.navigate('/(auth)/Shopping/Recharge/RechargeDetailScreen' as any),

    // Private Label
    privateLabel: () => router.navigate('/(auth)/PrivateLabel/HomeScreenPrivateLabel' as any),
    vipCardOffers: () => router.navigate('/(auth)/PrivateLabel/VipCardOffersScreen' as any),
    invoicePrivateLabel: () => router.navigate('/(auth)/PrivateLabel/Invoice' as any),
    validationPinPrivateLabel: () => router.navigate('/(auth)/PrivateLabel/ValidationPInPrivateLabelScreen' as any),

    // Menu
    menu: () => router.navigate('/(auth)/MenuScreen' as any),
    serviceChannel: () => router.navigate('/(auth)/MenuScreen/ServiceChannelScreen' as any),
    changePassword: () => router.navigate('/(auth)/MenuScreen/ChangePasswordScreen' as any),
    termsMenu: () => router.navigate('/(auth)/MenuScreen/Terms' as any),

    // Auth
    success: () => router.replace('/(auth)/SuccessScreen' as any),
    chanceTemporaryPassword: () => router.replace('/(auth)/ChanceTemporaryPasswordScreen' as any),
    termAndConditions: () => router.navigate('/(auth)/TermAndConditionsScreen' as any),
    registerAllowsBiometric: () => router.replace('/(auth)/RegisterAllowsBiometricScreen' as any),

    // Public
    login: () => router.replace('/(public)/LoginScreen' as any),
    onboarding: () => router.replace('/(public)/OnboardingScreen' as any),

    // Rotas com parâmetros
    cardData: (params?: any) => router.navigate({
        pathname: '/(auth)/Membership/CardDataScreen' as any,
        params: params || {}
    }),
};

export function navigateToNotificationRoute(
    route: string,
    params?: Record<string, any>
) {
    const navigationFn = notificationRoutes[route];

    if (navigationFn) {
        console.log(`Navegando para rota mapeada: ${route}`);
        navigationFn(params);
    } else {
        // Se não encontrar a rota no mapeamento, tenta navegar diretamente
        console.warn(`⚠️ Rota não mapeada: ${route}. Tentando navegação direta...`);
        try {
            if (params) {
                router.navigate({ pathname: route as any, params });
            } else {
                router.navigate(route as any);
            }
        } catch (err) {
            console.error(`Erro ao navegar para: ${route}`, err);
        }
    }
}
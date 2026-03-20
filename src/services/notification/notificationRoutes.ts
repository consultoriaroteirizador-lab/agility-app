// src/navigation/notificationRoutes.ts
import { router, Href } from "expo-router";

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
    home: () => router.replace('/(auth)/(tabs)' as Href),

    // Membership
    membership: () => router.navigate('/(auth)/Membership/HomeScreenMembership' as Href),
    withdrawal: () => router.navigate('/(auth)/Membership/WithDrawal/WithDrawalOnboardingScreen' as Href),
    withdrawalResume: () => router.navigate('/(auth)/Membership/WithDrawal/WithDrawalResumeScreen' as Href),
    withdrawalPIX: () => router.navigate('/(auth)/Membership/WithDrawal/WithDrawalPIXReceiptMethodScreen' as Href),
    withdrawalConfirmation: () => router.navigate('/(auth)/Membership/WithDrawal/WithDrawalConfirmationDataScreen' as Href),
    withdrawalRequest: () => router.navigate('/(auth)/Membership/WithDrawal/WithdrawalRequestScreen' as Href),
    invoice: () => router.navigate('/(auth)/Membership/Invoice' as Href),
    establishment: () => router.navigate('/(auth)/Membership/EstablishmentScreen' as Href),
    indicateCompany: () => router.navigate('/(auth)/Membership/IndicateCompanyScreen' as Href),
    presentationMembership: () => router.navigate('/(auth)/Membership/PresentationMembershipScreen' as Href),
    changePasswordMember: () => router.navigate('/(auth)/Membership/Card/Password' as Href),
    membershipCards: () => router.navigate('/(auth)/Membership/MembershipCardsScreen' as Href),

    // Shopping
    shopping: () => router.navigate('/(auth)/Shopping/GiftCard/HomeScreenShopping' as Href),
    giftCard: () => router.navigate('/(auth)/Shopping/GiftCard/HomeScreenShopping' as Href),
    giftCardDetail: () => router.navigate('/(auth)/Shopping/GiftCard/GiftCardDetailScreen' as Href),
    isGift: () => router.navigate('/(auth)/Shopping/GiftCard/IsGiftScreen' as Href),
    sendTo: () => router.navigate('/(auth)/Shopping/GiftCard/SendToScreen' as Href),
    resendEmail: () => router.navigate('/(auth)/Shopping/GiftCard/ResendEmailScreen' as Href),
    receipt: () => router.navigate('/(auth)/Shopping/ReceiptScreen' as Href),
    qrCode: () => router.navigate('/(auth)/Shopping/QrCodeScreen' as Href),
    paymentForm: () => router.navigate('/(auth)/Shopping/PaymentFormScreen' as Href),
    resumeBuyProduct: () => router.navigate('/(auth)/Shopping/ResumeBuyProductScreen' as Href),

    // Recharge
    recharge: () => router.navigate('/(auth)/Shopping/Recharge/HomeScreenShoppingRecharge' as Href),
    rechargePhoneNumber: () => router.navigate('/(auth)/Shopping/Recharge/RechargePhoneNumberScreen' as Href),
    rechargeDetail: () => router.navigate('/(auth)/Shopping/Recharge/RechargeDetailScreen' as Href),

    // Private Label
    privateLabel: () => router.navigate('/(auth)/PrivateLabel/HomeScreenPrivateLabel' as Href),
    vipCardOffers: () => router.navigate('/(auth)/PrivateLabel/VipCardOffersScreen' as Href),
    invoicePrivateLabel: () => router.navigate('/(auth)/PrivateLabel/Invoice' as Href),
    validationPinPrivateLabel: () => router.navigate('/(auth)/PrivateLabel/ValidationPInPrivateLabelScreen' as Href),

    // Menu
    menu: () => router.navigate('/(auth)/(tabs)/menu' as Href),
    serviceChannel: () => router.navigate('/(auth)/MenuScreen/ServiceChannelScreen' as Href),
    changePassword: () => router.navigate('/(auth)/MenuScreen/ChangePasswordScreen' as Href),
    termsMenu: () => router.navigate('/(auth)/MenuScreen/Terms' as Href),

    // Auth
    success: () => router.replace('/(auth)/SuccessScreen' as Href),
    chanceTemporaryPassword: () => router.replace('/(auth)/ChanceTemporaryPasswordScreen' as Href),
    termAndConditions: () => router.navigate('/(auth)/TermAndConditionsScreen' as Href),
    registerAllowsBiometric: () => router.replace('/(auth)/RegisterAllowsBiometricScreen' as Href),

    // Public
    login: () => router.replace('/(public)/LoginScreen' as Href),
    onboarding: () => router.replace('/(public)/OnboardingScreen' as Href),


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

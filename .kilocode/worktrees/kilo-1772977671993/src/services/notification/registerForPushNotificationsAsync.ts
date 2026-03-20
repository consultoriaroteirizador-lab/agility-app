import { Platform } from "react-native";

import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  // 1. Configurar canal de notificação para Android (obrigatório para Android 8.0+)
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  // 2. Se não for um dispositivo físico, retornar null silenciosamente
  if (!Device.isDevice) {
    console.log("[PushNotifications] Notificações push requerem dispositivo físico");
    return null;
  }

  // 3. Obter status da permissão existente
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // 4. Se a permissão não foi concedida, solicitá-la
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  // 5. Se a permissão ainda não foi concedida, retornar null
  if (finalStatus !== "granted") {
    console.log("[PushNotifications] Permissão de notificação negada");
    return null;
  }

  // 6. Obter o Project ID para o Expo Push Token
  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ||
    Constants?.easConfig?.projectId;

  // 7. Se não houver projectId, retornar null (projeto não configurado no EAS)
  if (!projectId) {
    console.log("[PushNotifications] Project ID não configurado - notificações push desabilitadas");
    return null;
  }

  // 8. Obter o Expo Push Token
  try {
    const pushTokenObject = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    token = pushTokenObject.data;
    console.log("[PushNotifications] Token obtido:", token);
  } catch (e: unknown) {
    console.log("[PushNotifications] Erro ao obter token:", e instanceof Error ? e.message : String(e));
    return null;
  }

  return token;
}

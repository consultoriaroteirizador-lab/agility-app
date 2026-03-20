import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
  useCallback,
} from "react";
import { Platform } from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

import { isDevelopment } from "@/config/environment";
import { useRegisterUserNotification } from "@/domain/notificationService/useCase/useRegisterUserNotification";
import { getDeviceFingerprint } from "@/functions/getDeviceFingerprint";

import { useAuthCredentialsService } from "../authCredentials/useAuthCredentialsService";

import { navigateToNotificationRoute } from "./notificationRoutes";
import { registerForPushNotificationsAsync } from "./registerForPushNotificationsAsync";


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});


interface NotificationData {
  route?: string;
  screen?: string;
  params?: Record<string, any>;
  requiresAuth?: boolean;
  action?: string;
  userId?: string;
  [key: string]: any;
}

interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  error: Error | null;
  isLoading: boolean;
  isRegistering: boolean;
  deviceId: string | null;
  clearNotification: () => void;
  schedulePushNotification: (
    title: string,
    body: string,
    data?: NotificationData,
    trigger?: Notifications.NotificationTriggerInput
  ) => Promise<string>;
  cancelNotification: (notificationId: string) => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
  getBadgeCount: () => Promise<number>;
  setBadgeCount: (count: number) => Promise<void>;
  retryRegisterToken: () => Promise<void>; // Novo: retry manual
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
  onNotificationReceived?: (notification: Notifications.Notification) => void;
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void;
}

const PENDING_NAVIGATION_KEY = "@app:pending_notification_navigation";
const TOKEN_REGISTERED_KEY = "@app:token_registered";

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  onNotificationReceived,
  onNotificationResponse,
}) => {
  const {
    authCredentials,
    userAuth,
    isLoading: authLoading
  } = useAuthCredentialsService();

  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<NotificationData | null>(null);
  const [tokenRegistered, setTokenRegistered] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const hasProcessedPendingNav = useRef(false);
  const registrationAttempted = useRef(false);
  const previousStatusRef = useRef<string | undefined>(undefined);

  const isAuthenticated = !!authCredentials && !!userAuth;

  // Seu hook de registro
  const { registerUserNotification } = useRegisterUserNotification({
    onSuccess: (response) => {
      if (isDevelopment) console.log('NotificationProvider: token registrado com sucesso:', response);
      setTokenRegistered(true);
      setIsRegistering(false);
      // Salva no AsyncStorage que o token foi registrado
      AsyncStorage.setItem(TOKEN_REGISTERED_KEY, 'true').catch((e) => isDevelopment && console.error(e));
    },
    onError: (error) => {
      if (isDevelopment) console.error('NotificationProvider: erro ao registrar token:', error);
      setIsRegistering(false);
      setTokenRegistered(false);
    }
  });

  // Salvar navegação pendente no AsyncStorage
  const savePendingNavigation = useCallback(async (data: NotificationData) => {
    try {
      await AsyncStorage.setItem(PENDING_NAVIGATION_KEY, JSON.stringify(data));
      setPendingNavigation(data);
    } catch (err) {
      if (isDevelopment) console.error("Erro ao salvar navegação pendente:", err);
    }
  }, []);

  // Carregar navegação pendente do AsyncStorage
  const loadPendingNavigation = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(PENDING_NAVIGATION_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        setPendingNavigation(data);
        return data;
      }
    } catch (err) {
      if (isDevelopment) console.error("Erro ao carregar navegação pendente:", err);
    }
    return null;
  }, []);

  // Limpar navegação pendente
  const clearPendingNavigation = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(PENDING_NAVIGATION_KEY);
      setPendingNavigation(null);
      hasProcessedPendingNav.current = false;
    } catch (err) {
      if (isDevelopment) console.error("Erro ao limpar navegação pendente:", err);
    }
  }, []);

  // Verificar se token já foi registrado
  const checkTokenRegistration = useCallback(async () => {
    try {
      const registered = await AsyncStorage.getItem(TOKEN_REGISTERED_KEY);
      setTokenRegistered(registered === 'true');
      return registered === 'true';
    } catch (err) {
      if (isDevelopment) console.error("Erro ao verificar registro do token:", err);
      return false;
    }
  }, []);

  // Registrar token no backend usando seu hook
  const registerTokenToBackend = useCallback(
    async (token: string) => {
      if (!isAuthenticated) {
        if (isDevelopment) console.warn("Usuário não autenticado. Token não será registrado.");
        return;
      }

      // Prevenir registro se o usuário tem senha temporária
      if (userAuth?.status === 'ACTIVE_WITH_TEMPORARY_PASSWORD') {
        if (isDevelopment) console.warn("Usuário com senha temporária. Token não será registrado até alterar a senha.");
        return;
      }

      if (isRegistering) {
        if (isDevelopment) console.log("Registro já em andamento...");
        return;
      }

      // Verifica se já foi registrado
      const alreadyRegistered = await checkTokenRegistration();
      if (alreadyRegistered && tokenRegistered) {
        if (isDevelopment) console.log("NotificationProvider: token já registrado anteriormente");
        return;
      }

      try {
        setIsRegistering(true);
        if (isDevelopment) console.log("Registrando token no backend...");

        await registerUserNotification({
          pushToken: token,
          platform: Platform.OS === 'android' ? "ANDROID" : "IOS"
        });

        registrationAttempted.current = true;
      } catch (err) {
        if (isDevelopment) console.error("NotificationProvider: erro ao registrar token:", err);
        setIsRegistering(false);
      }
    },
    [isAuthenticated, isRegistering, registerUserNotification, tokenRegistered, checkTokenRegistration, userAuth?.status]
  );

  // Retry manual do registro
  const retryRegisterToken = useCallback(async () => {
    if (expoPushToken) {
      registrationAttempted.current = false;
      setTokenRegistered(false);
      await AsyncStorage.removeItem(TOKEN_REGISTERED_KEY);
      await registerTokenToBackend(expoPushToken);
    }
  }, [expoPushToken, registerTokenToBackend]);

  // Função para lidar com navegação baseada nos dados da notificação
  const handleNotificationNavigation = useCallback(
    async (data: NotificationData) => {
      // Prioriza 'route' sobre 'screen'
      const targetRoute = data.route || data.screen;

      if (!targetRoute) {
        if (isDevelopment) console.warn("Notificação sem rota definida");
        return;
      }

      if (isDevelopment) console.log("Tentando navegar para:", targetRoute);

      // if (data.userId && userAuth?.id && data.userId !== userAuth.id) {
      //   console.warn("⚠️ Notificação não é para o usuário atual");
      //   return;
      // }

      if (data.requiresAuth !== false && !isAuthenticated) {
        if (isDevelopment) console.log("Navegação requer autenticação. Salvando para depois do login...");
        await savePendingNavigation(data);
        router.replace("/(public)/LoginScreen");
        return;
      }

      try {
        if (isDevelopment) console.log("Navegando para:", targetRoute);

        navigateToNotificationRoute(targetRoute, data.params);

        await clearPendingNavigation();
      } catch (err) {
        if (isDevelopment) console.error("Erro ao navegar:", err);
      }
    },
    [isAuthenticated, savePendingNavigation, clearPendingNavigation]
  );

  // Processar navegação pendente após login
  useEffect(() => {
    const processPendingNavigation = async () => {
      if (
        isAuthenticated &&
        !authLoading &&
        pendingNavigation &&
        !hasProcessedPendingNav.current
      ) {
        if (isDevelopment) console.log("Processando navegação pendente após login...");
        hasProcessedPendingNav.current = true;

        setTimeout(() => {
          handleNotificationNavigation(pendingNavigation);
        }, 500);
      }
    };

    processPendingNavigation();
  }, [isAuthenticated, authLoading, pendingNavigation, handleNotificationNavigation]);

  // Carregar navegação pendente ao iniciar
  useEffect(() => {
    loadPendingNavigation();
    checkTokenRegistration();
  }, [loadPendingNavigation, checkTokenRegistration]);

  // Inicializar deviceId no início do app
  useEffect(() => {
    const initDeviceId = async () => {
      try {
        const fingerprint = await getDeviceFingerprint();
        if (fingerprint?.deviceId) {
          setDeviceId(fingerprint.deviceId);
          if (isDevelopment) console.log("NotificationProvider: deviceId inicializado:", fingerprint.deviceId);
        }
      } catch (error) {
        if (isDevelopment) console.error("NotificationProvider: erro ao obter deviceId:", error);
      }
    };
    initDeviceId();
  }, []);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const schedulePushNotification = useCallback(
    async (
      title: string,
      body: string,
      data?: NotificationData,
      trigger?: Notifications.NotificationTriggerInput
    ): Promise<string> => {
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: data || {},
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: trigger || null,
        });
        return id;
      } catch (err) {
        if (isDevelopment) console.error("Erro ao agendar notificação:", err);
        throw err;
      }
    },
    []
  );

  const cancelNotification = useCallback(
    async (notificationId: string): Promise<void> => {
      try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      } catch (err) {
        if (isDevelopment) console.error("Erro ao cancelar notificação:", err);
        throw err;
      }
    },
    []
  );

  const cancelAllNotifications = useCallback(async (): Promise<void> => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (err) {
      if (isDevelopment) console.error("Erro ao cancelar todas as notificações:", err);
      throw err;
    }
  }, []);

  const getBadgeCount = useCallback(async (): Promise<number> => {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (err) {
      if (isDevelopment) console.error("Erro ao obter badge count:", err);
      return 0;
    }
  }, []);

  const setBadgeCount = useCallback(async (count: number): Promise<void> => {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (err) {
      if (isDevelopment) console.error("Erro ao definir badge count:", err);
      throw err;
    }
  }, []);

  // Setup de notificações
  useEffect(() => {
    let isMounted = true;

    const setupNotifications = async () => {
      if (authLoading) {
        return;
      }

      try {
        const token = await registerForPushNotificationsAsync();
        if (isMounted) {
          setExpoPushToken(token);
          if (isDevelopment) console.log("NotificationProvider: push token obtido:", token);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err);
          if (isDevelopment) console.error("NotificationProvider: erro ao registrar notificações:", err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    setupNotifications();

    notificationListener.current =
      Notifications.addNotificationReceivedListener(
        (receivedNotification) => {
          if (isDevelopment) console.log("Notificação Recebida (foreground):", receivedNotification);

          if (isMounted) {
            setNotification(receivedNotification);
          }

          onNotificationReceived?.(receivedNotification);
        }
      );

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        if (isDevelopment) console.log("Notificação Tocada:", response);

        const data = response.notification.request.content.data as NotificationData;

        handleNotificationNavigation(data);
        onNotificationResponse?.(response);

        if (data.clearBadge) {
          setBadgeCount(0);
        }
      });

    return () => {
      isMounted = false;
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [
    authLoading,
    handleNotificationNavigation,
    onNotificationReceived,
    onNotificationResponse,
    setBadgeCount,
  ]);

  // Resetar flags de registro quando status muda de temporário para ACTIVE
  useEffect(() => {
    const currentStatus = userAuth?.status;
    const previousStatus = previousStatusRef.current;
    
    // Se o status mudou de ACTIVE_WITH_TEMPORARY_PASSWORD para ACTIVE, resetar flags
    if (previousStatus === 'ACTIVE_WITH_TEMPORARY_PASSWORD' && currentStatus === 'ACTIVE') {
      if (isDevelopment) console.log("Status mudou para ACTIVE (após mudar senha). Resetando flags de registro do token...");
      registrationAttempted.current = false;
      setTokenRegistered(false);
      AsyncStorage.removeItem(TOKEN_REGISTERED_KEY).catch(() => {});
    }
    
    previousStatusRef.current = currentStatus;
  }, [userAuth?.status]);

  // Registrar token quando autenticado e token disponível
  // Inclui userAuth?.status nas dependências para registrar quando status muda para ACTIVE
  useEffect(() => {
    if (
      isAuthenticated &&
      expoPushToken &&
      !authLoading &&
      !registrationAttempted.current &&
      !tokenRegistered &&
      userAuth?.status === 'ACTIVE'
    ) {
      if (isDevelopment) console.log("Usuário autenticado com status ACTIVE. Registrando token...");
      registerTokenToBackend(expoPushToken);
    }
  }, [isAuthenticated, expoPushToken, authLoading, tokenRegistered, registerTokenToBackend, userAuth?.status]);

  // Limpar dados ao fazer logout
  useEffect(() => {
    if (!isAuthenticated && tokenRegistered) {
      if (isDevelopment) console.log("Logout detectado. Limpando dados de notificação...");
      setTokenRegistered(false);
      registrationAttempted.current = false;
      AsyncStorage.removeItem(TOKEN_REGISTERED_KEY).catch((e) => isDevelopment && console.error(e));
      clearPendingNavigation();
    }
  }, [isAuthenticated, tokenRegistered, clearPendingNavigation]);

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        notification,
        error,
        isLoading,
        isRegistering,
        deviceId,
        clearNotification,
        schedulePushNotification,
        cancelNotification,
        cancelAllNotifications,
        getBadgeCount,
        setBadgeCount,
        retryRegisterToken,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

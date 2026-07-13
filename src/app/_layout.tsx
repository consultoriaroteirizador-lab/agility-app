
import React, { ReactNode, useEffect, useRef, useState } from 'react';

import { ThemeProvider } from '@shopify/restyle';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityIndicator, Box } from '@/components';
import { ModalError } from '@/components/ModalError/ModalError';
import { Toast } from '@/components/Toast/Toast';
import { useCheckVersion } from '@/domain/mobileVersion/useCase';
import { useLoadFonts, useInvalidQueryLogout } from '@/hooks';
import { goChanceTemporaryPasswordScreen, goHomeScreen, goLoginScreen, goRegisterAllowsBiometricScreen, goUpdateVersionScreen } from '@/routes/routesService';
import { NotificationProvider, useAuthCredentialsService } from '@/services';
import { AuthCredentialsProvider } from '@/services/authCredentials/Providers/AuthCredentialsProvider';
import { TenantProvider } from '@/services/tenantStorage/Providers/TenantProvider';
import { theme } from '@/theme';



function InitialLayout() {
  const { isLoading: isLoadingAuthStart, authCredentials, userAuth, userCredentialsCurrent } = useAuthCredentialsService();
  const { checkVersion } = useCheckVersion();
  const [forceUpdate, setForceUpdate] = useState(false);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const clearQueryCache = useInvalidQueryLogout();

  // Rastrear se já fez a navegação inicial
  const hasDoneInitialNavigation = useRef(false);
  // Rastrear o estado anterior de authCredentials (para navegação)
  const prevAuthCredentialsRef = useRef<typeof authCredentials>(undefined);
  // Rastrear o estado anterior de authCredentials (para logout/cache clearing)
  const prevAuthForLogoutRef = useRef<typeof authCredentials>(undefined);

  // Atualizar estados de versão baseado na resposta do checkVersion
  useEffect(() => {
    if (checkVersion?.forceUpdate) {
      setForceUpdate(true);
    } else if (checkVersion?.needsUpdate) {
      setNeedsUpdate(true);
    }
  }, [checkVersion]);

  // Limpar o cache do React Query nas TRANSIÇÕES de auth (logout E login).
  // (Storage é limpo dentro de removeCredentials no AuthCredentialsProvider)
  //
  // Por que também no LOGIN: sem fechar o app, a Home pode continuar montada.
  // Durante o logout o token é removido e a query de rotas (active observer)
  // refetcha sem Authorization -> 401 -> fica em estado de erro/vazio no cache.
  // No re-login o token volta, mas nada força o refetch dessa query travada
  // (staleTime de 5min), então a lista de rotas não carregava até fechar e
  // reabrir o app (que cria um QueryClient novo). Limpar no login força a busca
  // fresh com o token novo.
  useEffect(() => {
    const hadCredentials = prevAuthForLogoutRef.current !== null && prevAuthForLogoutRef.current !== undefined;
    const hasCredentials = authCredentials !== null;

    const isLogout = hadCredentials && !hasCredentials;
    const isLogin = !hadCredentials && hasCredentials;

    if (isLogout || isLogin) {
      clearQueryCache();
      if (__DEV__) console.log(`[Auth] Cache do React Query limpo (${isLogout ? 'logout' : 'login'})`);
    }

    prevAuthForLogoutRef.current = authCredentials;
  }, [authCredentials, clearQueryCache]);

  useEffect(() => {
    // Não fazer nada enquanto está carregando
    if (isLoadingAuthStart) return;

    const handleRouting = () => {
      // Detectar mudança de estado: login (null -> credentials) ou logout (credentials -> null)
      const hadCredentials = prevAuthCredentialsRef.current !== null && prevAuthCredentialsRef.current !== undefined;
      const hasCredentials = authCredentials !== null;

      // Se já fez navegação inicial E não houve mudança de estado de auth, não fazer nada
      if (hasDoneInitialNavigation.current && hadCredentials === hasCredentials) {
        return;
      }

      if (forceUpdate) {
        goUpdateVersionScreen()
        return
      }
      else if (needsUpdate) {
        goUpdateVersionScreen()
        return
      } else if (authCredentials) {
        if (userAuth?.status === 'ACTIVE_WITH_TEMPORARY_PASSWORD') {
          goChanceTemporaryPasswordScreen()
          return
        }
        // Navegar baseado no estado da biometria
        // Se userCredentialsCurrent existe E allowsBiometrics não é undefined → já decidiu sobre biometria
        if (userCredentialsCurrent && userCredentialsCurrent.allowsBiometrics !== undefined) {
          goHomeScreen()
        } else {
          // Primeiro login (sem userCredentialsCurrent) OU ainda não decidiu sobre biometria
          goRegisterAllowsBiometricScreen()
        }
      } else {
        goLoginScreen()
      }

      // Marcar que já fez navegação
      hasDoneInitialNavigation.current = true;
    };

    handleRouting();

    // Atualizar ref após navegação
    prevAuthCredentialsRef.current = authCredentials;
  }, [authCredentials, userAuth, isLoadingAuthStart, forceUpdate, needsUpdate, userCredentialsCurrent]);

  if (isLoadingAuthStart) {
    return <Box flex={1} alignItems='center' justifyContent='center'><ActivityIndicator /></Box>;
  }
  return (
    <Slot />
  );
}

export default function LayoutRoot() {
  const { fontsLoaded } = useLoadFonts();

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.grayTopoHomeScreen }}>
      <AppProviders>
        <InitialLayout />
      </AppProviders>
    </SafeAreaView>
  );
}


interface AppProvidersProps {
  children: ReactNode;
}
export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  }));

  return (
    <AuthCredentialsProvider>
      <TenantProvider>
        <QueryClientProvider client={queryClient}>
          <NotificationProvider>
            <ThemeProvider theme={theme}>
              <PaperProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <StatusBar style="light" />

                  {children}

                  <ModalError />
                  <Toast />
                </GestureHandlerRootView>
              </PaperProvider>
            </ThemeProvider>
          </NotificationProvider>
        </QueryClientProvider>
      </TenantProvider>
    </AuthCredentialsProvider>
  );
}

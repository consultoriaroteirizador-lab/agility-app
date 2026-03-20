
import React, { ReactNode, useEffect, useState } from 'react';

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
import { useLoadFonts } from '@/hooks';
import { goChanceTemporaryPasswordScreen, goHomeScreen, goLoginScreen, goUpdateVersionScreen } from '@/routes/routesService';
import { useAuthCredentialsService, NotificationProvider } from '@/services';
import { AuthCredentialsProvider } from '@/services/authCredentials/Providers/AuthCredentialsProvider';
import { TenantProvider } from '@/services/tenantStorage/Providers/TenantProvider';
import { theme } from '@/theme';

// import { useCheckVersion } from '@/domain/Profile/useCase/useCheckVersion';


function InitialLayout() {
  const { isLoading: isLoadingAuthStart, authCredentials, userAuth } = useAuthCredentialsService();
  const [forceUpdate, _setForceUpdate] = useState(false);
  const [needsUpdate, _setNeedsUpdate] = useState(false);

  // useEffect(() => {
  //   if(checkVersion?.forceUpdate){
  //     setForceUpdate(true);
  //   }
  //   else if(checkVersion?.needsUpdate){
  //     setNeedsUpdate(true);
  //   } 
  // }, [checkVersion]);



  useEffect(() => {
    // Garantir que só faz redirect quando não está mais carregando
    if (isLoadingAuthStart) {
      return;
    }

    const handleRouting = async () => {
      // Pequeno delay para garantir que as rotas estão prontas
      await new Promise(resolve => setTimeout(resolve, 100));

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
        goHomeScreen()
      } else {
        goLoginScreen()
      }
    };

    handleRouting().catch((error) => {
      console.error('Error in handleRouting:', error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authCredentials, userAuth, isLoadingAuthStart, forceUpdate, needsUpdate]);


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

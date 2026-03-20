// src/screens/Login/Login.tsx
import { Box, ActivityIndicator, ScreenBase } from '@/components';
import { useImageBackground, useNavigationNotActionOnBack } from '@/hooks';
import { measure } from '@/theme';

import { LoginBody } from './components/LoginBody';
import { LoginFooter } from './components/LoginFooter';
import { useLoginController } from './hooks/useLoginController';

export default function Login() {
  const backgroundImage = useImageBackground();
  useNavigationNotActionOnBack();
  const controller = useLoginController();

  if (controller.isLoadingCredentials || controller.isLoadingSignIn) {
    return (
      <Box flex={1} alignItems="center" justifyContent="center">
        <ActivityIndicator />
      </Box>
    );
  }

  return (
    <ScreenBase scrollable mtScreenBase='t0' mbScreenBase='b0' marginHorizontalScreenBase='x0' >
      <Box backgroundColor='white' flexDirection='row' justifyContent='space-between' width={"100%"}>
        <Box borderBottomRightRadius='s40' width={measure.x140} height={measure.y160} borderBottomWidth={measure.m1} borderRightWidth={measure.m1} borderColor='primary100' />
        <Box borderBottomLeftRadius='s40' borderBottomRightRadius='s10' width={measure.x200} height={measure.y160} borderBottomWidth={measure.m1} borderLeftWidth={measure.m1} borderColor='primary100' />
      </Box>
      <Box
        backgroundColor='white'
        height='100%'
        width='100%'
        paddingHorizontal='x20'
        pt='t20'
      >

        <Box justifyContent="space-around" mt='t48'>
          <LoginBody controller={controller} />
          <LoginFooter />
        </Box>

      </Box>
    </ScreenBase>
  );
}


import { Stack } from 'expo-router';

import { ChatProvider } from '@/domain/agility/chat/context';

export default function LayoutStack() {
  return (
    <ChatProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        <Stack.Screen name="ChanceTemporaryPasswordScreen/index" />
        <Stack.Screen name="RegisterAllowsBiometricScreen/index" />
      </Stack>
    </ChatProvider>
  );
}


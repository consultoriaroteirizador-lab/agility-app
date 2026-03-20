import { Stack } from 'expo-router';

export default function LayoutStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  
      <Stack.Screen name="ChanceTemporaryPasswordScreen/index" />
      <Stack.Screen name="RegisterAllowsBiometricScreen/index" />
    </Stack>
  );
}

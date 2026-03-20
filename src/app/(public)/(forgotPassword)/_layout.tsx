import { Stack } from 'expo-router';

type PublicStackParamList = {
  PinValidateScreen: undefined;
};

export default function LayoutForgotPassword() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ForgotPasswordScreen/index" />
    </Stack>
  );
}

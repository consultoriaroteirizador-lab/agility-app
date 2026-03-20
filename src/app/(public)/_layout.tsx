import { Stack } from 'expo-router';


export default function LayoutPublic() {

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LoginScreen/index" />
      <Stack.Screen name="UpdateVersionScreen/index" />
      <Stack.Screen name="(forgotPassword)" />
    </Stack>
  );
}

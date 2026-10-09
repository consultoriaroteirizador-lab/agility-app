import { Stack } from 'expo-router';

// A conversa aberta pela notificação entra com `withAnchor` e ganha a tela do Suporte por baixo.
export const unstable_settings = { anchor: 'index' };

export default function SuporteLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="[id]" 
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

import { Stack } from 'expo-router';

// A oferta aberta pela notificação entra com `withAnchor` e ganha a lista por baixo.
export const unstable_settings = { anchor: 'index' };

export default function OfertasLayout() {
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

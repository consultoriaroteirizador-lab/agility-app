import { Stack } from 'expo-router';

// Quem chega por link (notificação → Carteira, Suporte...) entra com `withAnchor` e ganha a home
// do Menu por baixo. Sem âncora, a pilha nascia só com a tela do link e a aba ficava presa nela.
export const unstable_settings = { anchor: 'index' };

export default function MenuLayout() {
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
        name="suporte"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

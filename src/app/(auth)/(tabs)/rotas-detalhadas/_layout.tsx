import { Stack } from 'expo-router';

export default function RotasDetalhadasLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/parada/[pid]/index" />
      <Stack.Screen name="[id]/parada/[pid]/dados-servico" />
      <Stack.Screen name="[id]/parada/[pid]/entrega" />
      <Stack.Screen name="[id]/parada/[pid]/dados-entrega" />
      <Stack.Screen name="[id]/parada/[pid]/insucesso" />
      <Stack.Screen name="[id]/parada/[pid]/nao-realizado" />
    </Stack>
  );
}
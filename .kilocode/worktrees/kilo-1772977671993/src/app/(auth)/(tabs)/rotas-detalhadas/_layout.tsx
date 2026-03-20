import { Stack } from 'expo-router';

export default function RotasDetalhadasLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/parada/[pid]/index" />
      <Stack.Screen name="[id]/parada/[pid]/dados-servico" />
    </Stack>
  );
}
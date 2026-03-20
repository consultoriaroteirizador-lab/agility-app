import { Stack } from 'expo-router';

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
        name="historico" 
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="ganhos" 
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
      <Stack.Screen 
        name="jornada" 
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="perfil" 
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

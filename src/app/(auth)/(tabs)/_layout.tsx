import { Tabs } from 'expo-router';

import { CustomTabBar } from '@/components/CustomTabBar/CustomTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Rotas',
          tabBarLabel: 'Rotas',
        }}
      />
      <Tabs.Screen
        name="ofertas"
        options={{
          title: 'Ofertas',
          tabBarLabel: 'Ofertas',
        }}
      />
      <Tabs.Screen
        name="notificacoes"
        options={{
          title: 'Notificações',
          tabBarLabel: 'Notificações',
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menu',
          tabBarLabel: 'Menu',
        }}
      />
      <Tabs.Screen
        name="rotas-detalhadas"
        options={{
          href: null, 
        }}
      />
    </Tabs>
  );
}
import { useCallback } from 'react';


import {
  Montserrat_700Bold,
  Montserrat_700Bold_Italic,
  Montserrat_500Medium,
  Montserrat_500Medium_Italic,
  Montserrat_400Regular,
  Montserrat_400Regular_Italic,
  Montserrat_300Light,
  Montserrat_300Light_Italic
} from '@expo-google-fonts/montserrat';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
const useLoadFonts = () => {
  const [fontsLoaded] = useFonts({
    Montserrat_700Bold: Montserrat_700Bold,
    Montserrat_700Bold_Italic: Montserrat_700Bold_Italic,
    Montserrat_500Medium: Montserrat_500Medium,
    Montserrat_500Medium_Italic: Montserrat_500Medium_Italic,
    Montserrat_400Regular: Montserrat_400Regular,
    Montserrat_400Regular_Italic: Montserrat_400Regular_Italic,
    Montserrat_300Light: Montserrat_300Light,
    Montserrat_300Light_Italic: Montserrat_300Light_Italic,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  return { fontsLoaded, onLayoutRootView };
};

export { useLoadFonts };

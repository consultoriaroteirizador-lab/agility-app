import React, { useEffect } from 'react';

import { useEvent } from 'expo';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import { useVideoPlayer, VideoView } from 'expo-video';

import { Box } from '@/components';

const SplashScreenComponent = ({ onAnimationEnd }: any) => {


  // Cria um player de vídeo
  const player = useVideoPlayer(
    { uri: 'https://agility-email-images.s3.sa-east-1.amazonaws.com/splash.mp4' },
    (player) => {

      player.loop = false; // Repetir o vídeo em loop
      player.play();
    }
  );

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  function renderVideoEnd() {
    return (
      isPlaying && (
        <VideoView
          player={player}
          style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}

        />
      )
    )
  }



  useEffect(() => {
    const hideSplashScreen = async () => {
      await SplashScreen.hideAsync();
      onAnimationEnd();
    };

    const timer = setTimeout(() => {
      hideSplashScreen();
    }, 4000);

    return () => clearTimeout(timer);
  }, [onAnimationEnd]);



  return (
    <LinearGradient {...gradientObject}>
      <Box
        alignItems="center"
        overflow="hidden"
        justifyContent="space-around"
        paddingBottom="b36"
        style={{
          height: '100%',
        }}>
        {renderVideoEnd()}
      </Box>
    </LinearGradient>

  );
};



export default SplashScreenComponent;



type GradientObject = {
  colors: readonly [string, string, ...string[]];
  start?: {
    x: number;
    y: number;
  };
  end?: {
    x: number;
    y: number;
  };
};

const gradientObject: GradientObject = {
  colors: ['grayBackground', 'grayBackground', 'grayBackground', 'grayBackground', 'grayBackground', 'gray700', 'gray500'],

  start: {
    x: 0.5,
    y: 0,
  },
  end: {
    x: 0.5,
    y: 1,
  },
}
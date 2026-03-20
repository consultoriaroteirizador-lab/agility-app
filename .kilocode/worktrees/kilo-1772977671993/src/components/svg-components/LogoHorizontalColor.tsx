// import Logo from '@/assets/images/logo-agility-color-black.svg';

import { Box, Image } from "..";

interface LogoHorizontalProps {
  width: number;
  height: number;
  color: string;
  opacity?: number;
}

export function LogoHorizontalColor({
  width,
  height,
  color,
  opacity = 1,
}: LogoHorizontalProps) {
  return (
    // <Logo
    //   width={width}
    //   height={height}
    //   fill="red"
    //   color={color}
    //   opacity={opacity}
    // />
    <Box>
      <Image height={height} width={width} source={require('@/assets/agility_logo.png')} />
    </Box>
  );
}

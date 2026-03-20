import { measure } from '@/theme';

import { LogoHorizontal } from '..';

// import Logo from '@/assets/images/logo-agility-color-black.svg';

interface LogoColorProps {
    width?: number,
    height?: number
}

export function LogoColor({ width = measure.x150, height = measure.y50 }: LogoColorProps) {
    return (<LogoHorizontal color="" width={width} height={height} />)
} 
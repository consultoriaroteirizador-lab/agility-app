import React from 'react';

import { measure, ThemeColors } from '@/theme';

import { Box, BoxBackGroundProps } from '../BoxBackGround/BoxBackGround';






interface VerticalLineProps extends BoxBackGroundProps {
    color: ThemeColors
}


const VerticalLine = ({ color, height, ...BoxBackGroundProps }: VerticalLineProps) => (
    <Box height={height} backgroundColor={color} width={measure.x1} {...BoxBackGroundProps} />
);

export default VerticalLine;

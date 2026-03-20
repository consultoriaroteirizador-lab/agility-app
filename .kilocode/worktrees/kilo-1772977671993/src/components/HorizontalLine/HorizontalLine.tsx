import React from 'react';

import { measure, ThemeColors } from '@/theme';

import { Box, BoxBackGroundProps } from '../BoxBackGround/BoxBackGround';



interface HorizontalLineProps extends BoxBackGroundProps {
    color: ThemeColors
}


const HorizontalLine = ({ color, width, ...BoxBackGroundProps }: HorizontalLineProps) => (
    <Box height={measure.y1} width={width} backgroundColor={color} {...BoxBackGroundProps} />
);

export default HorizontalLine;

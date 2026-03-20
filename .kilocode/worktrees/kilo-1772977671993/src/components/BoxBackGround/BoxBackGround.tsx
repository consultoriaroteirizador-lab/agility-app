import React, { forwardRef } from 'react';
import { ImageBackground, ImageSourcePropType, ScrollView, ScrollViewProps, View, ViewProps } from 'react-native';

import { BoxProps, createBox } from '@shopify/restyle';

import { Theme } from '@/theme';

const BaseBox = createBox<Theme, ViewProps>(View);
const ScrollableBox = createBox<Theme, ScrollViewProps>(ScrollView);

export interface BoxBackGroundProps extends BoxProps<Theme>, ViewProps {
  backgroundImage?: ImageSourcePropType;
  children?: React.ReactNode;
  scrollable?: boolean;
  borderRadii?: number;
}

export const Box = forwardRef<View, BoxBackGroundProps>(function Box(
  { backgroundImage, children, scrollable = false, borderRadii = 0, ...rest },
  ref
) {
  const RNBox = scrollable ? ScrollableBox : BaseBox;

  return backgroundImage ? (
    <ImageBackground
      source={backgroundImage}
      // resizeMode="contain"
      borderRadius={borderRadii}
      style={rest.style}
    >
      <RNBox {...rest} ref={ref}>
        {children}
      </RNBox>
    </ImageBackground>
  ) : (
    <RNBox {...rest} ref={ref}>
      {children}
    </RNBox>
  );
});

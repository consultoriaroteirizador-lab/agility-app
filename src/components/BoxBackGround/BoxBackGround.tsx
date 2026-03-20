import React, { forwardRef } from 'react';
import { ImageBackground, ImageSourcePropType, Platform, ScrollView, ScrollViewProps, View, ViewProps } from 'react-native';

import { BoxProps, createBox } from '@shopify/restyle';

import { useScrollViewContext } from '@/components/ScrollViewContext';
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
  const { isInsideScrollView } = useScrollViewContext();

  // Se está dentro de um ScrollView e scrollable=true, usa View para evitar nested ScrollViews
  const shouldUseScrollView = scrollable && !isInsideScrollView;
  const RNBox = shouldUseScrollView ? ScrollableBox : BaseBox;

  // Props de otimização para o ScrollableBox
  const scrollableProps = shouldUseScrollView
    ? {
      nestedScrollEnabled: true,
      scrollEventThrottle: 16,
      removeClippedSubviews: Platform.OS === 'android',
      showsVerticalScrollIndicator: false,
      showsHorizontalScrollIndicator: false,
    }
    : {};

  return backgroundImage ? (
    <ImageBackground
      source={backgroundImage}
      borderRadius={borderRadii}
      style={rest.style}
    >
      <RNBox {...scrollableProps} {...rest} ref={ref}>
        {children}
      </RNBox>
    </ImageBackground>
  ) : (
    <RNBox {...scrollableProps} {...rest} ref={ref}>
      {children}
    </RNBox>
  );
});

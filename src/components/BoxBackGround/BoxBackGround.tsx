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
  refreshControl?: ScrollViewProps['refreshControl'];
  /**
   * Estilo do CONTEÚDO rolável — só tem efeito com `scrollable`.
   *
   * Não confundir com `style`: em ScrollView, padding no `style` encolhe a janela
   * visível e o conteúdo continua terminando onde terminava; é o
   * `contentContainerStyle` que ESTENDE o conteúdo. Para o último elemento subir
   * acima da tab bar (botões de ação no fim da tela, por exemplo), o espaço
   * precisa vir por aqui.
   */
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
}

export const Box = forwardRef<View, BoxBackGroundProps>(function Box(
  { backgroundImage, children, scrollable = false, borderRadii = 0, contentContainerStyle, refreshControl, ...rest },
  ref
) {
  const { isInsideScrollView } = useScrollViewContext();

  // Se está dentro de um ScrollView e scrollable=true, usa View para evitar nested ScrollViews
  const shouldUseScrollView = scrollable && !isInsideScrollView;
  const RNBox = shouldUseScrollView ? ScrollableBox : BaseBox;

  // Props de otimização para o ScrollableBox
  // `contentContainerStyle` e `refreshControl` só existem em ScrollView. Quando o
  // Box cai no BaseBox (View) — por não ser scrollable, ou por já estar dentro de
  // outro ScrollView — repassá-los levaria prop desconhecida para a View, que a
  // ignora em silêncio: o padding some sem erro nenhum e o motivo fica invisível.
  const scrollableProps = shouldUseScrollView
    ? {
      nestedScrollEnabled: true,
      scrollEventThrottle: 16,
      removeClippedSubviews: Platform.OS === 'android',
      showsVerticalScrollIndicator: false,
      showsHorizontalScrollIndicator: false,
      contentContainerStyle,
      refreshControl,
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

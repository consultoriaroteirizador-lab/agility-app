import { ViewStyle } from 'react-native';

import { createTheme } from '@shopify/restyle';

import { borderRadii } from './borderRadii';
import { colors } from './colors';
import { measure } from './spacing';
import { textVariants } from './textVariants';

export const theme = createTheme({
  colors,
  spacing: measure,
  borderRadii,
  borderWidths: {
    m0: measure.m0,
    m1: measure.m1,
    m1Dot5: measure.m1Dot5,
    m2: measure.m2,
    m3: measure.m3,
    m4: measure.m4,
    m5: measure.m5,
    m6: measure.m6,
  },
  textVariants: {
    ...textVariants,
    defaults: {
      color: 'colorTextPrimary',
      fontSize: measure.f16,
      fontFamily: 'Ubuntu_400Regular'
    },
  }
});

export type Theme = typeof theme;
export type ThemeColors = keyof Theme['colors'];
export type ThemeSpace = keyof Theme['spacing'];

/**
 * Configuração de cores para status de componentes
 * Usado para tipar objetos STATUS_CONFIG em cards de paradas e rotas
 */
export interface StatusColorConfig {
  label: string;
  bgColor: ThemeColors;
  textColor: ThemeColors;
  borderColor?: ThemeColors;
}



export const $shadowProps: ViewStyle = {
  elevation: measure.m6,
  shadowColor: '#000',
  shadowOpacity: measure.m005,
  shadowOffset: { width: 0, height: measure.y3Negative },
  shadowRadius: measure.m4,
};

export const $shadowPropsButton: ViewStyle = {
  elevation: measure.m2,
  shadowColor: '#fff',
  shadowOpacity: measure.m005,
  shadowOffset: { width: 0, height: measure.y3Negative },
  shadowRadius: measure.m4,
};

/**
 * Tema do fluxo de SERVIÇO (field service).
 *
 * É o mesmo tema, com um único token trocado: a cor de ação dos botões passa a
 * ser o laranja `secondary100` — o mesmo que a lista de rotas já usa na etiqueta
 * "Serviço" (`getRoutingTypeBadge`, em `_rotas/components/RouteItem.tsx`). A
 * ideia é que o motorista reconheça pela cor, sem ler, que está numa nota de
 * serviço e não de entrega/coleta.
 *
 * Trocar o TOKEN em vez da cor em cada `<Button>` é o que faz isso valer para os
 * componentes compartilhados (`SharedEtapa*`), que são os mesmos do fluxo de
 * entrega e não podem receber cor fixa. Quem aplica é o `ServiceFlowTheme`.
 *
 * A rampa `primary*` inteira é remapeada para a `secondary*` correspondente,
 * então TUDO que é destaque no fluxo acompanha: botões, etiquetas, seleção de
 * rádio, checkbox, ícones e fundos claros de card.
 *
 * Vale para quem lê a cor pelo tema — prop de Restyle (`color="primary100"`) ou
 * `useTheme()`, que é o caso de tudo que o fluxo renderiza hoje. Componente que
 * importasse `colors` direto do módulo ficaria roxo, porque nem passa pelo
 * provider; os que fazem isso (`CheckboxBox`, `DropDown`, `BiometricToggle`) não
 * aparecem nestas telas.
 */
export const serviceTheme: Theme = {
  ...theme,
  colors: {
    ...theme.colors,
    primary100: colors.secondary100,
    primary80: colors.secondary80,
    primary60: colors.secondary60,
    primary40: colors.secondary40,
    primary20: colors.secondary20,
    primary10: colors.secondary10,
    primaryActionColor: colors.secondary100,
    colorBackgroundMainButton: colors.secondary100,
  },
};

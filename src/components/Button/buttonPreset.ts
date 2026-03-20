import {ThemeColors} from '@/theme';

import {TouchableOpacityBoxProps} from '../RestyleComponent/RestyleComponent';

import {ButtonPreset} from './Button';

interface ButtonUI {
  container: TouchableOpacityBoxProps;
  content: ThemeColors;
}

export const buttonPresets: Record<
  ButtonPreset,
  {default: ButtonUI; disabled: ButtonUI}
> = {
  main: {
    default: {
      container: {
        backgroundColor: 'colorBackgroundMainButton',
      },
      content: 'colorTextButtonPrimary',
    },
    disabled: {
      container: {
        backgroundColor: 'colorBackgroundDisableButton',
      },
      content: 'white',
    },
  },
  outline: {
    default: {
      container: {
        borderWidth: 1,
        borderColor: 'colorBackgroundMainButton',
      },
      content: 'colorBackgroundMainButton',
    },
    disabled: {
      container: {
        borderWidth: 1,
        borderColor: 'colorBackgroundDisableButton',
      },
      content: 'colorBackgroundDisableButton',
    },
  },
};

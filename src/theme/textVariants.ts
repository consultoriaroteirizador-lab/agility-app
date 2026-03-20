import { TextStyle } from "react-native";

import { measure } from "./spacing";

export type TextVariantsPreset =
  | 'text10'
  | 'text12'
  | 'text13'
  | 'text14'
  | 'text15'
  | 'text16'
  | 'text17'
  | 'text18'
  | 'text20'
  | 'text22'
  | 'text24'
  | 'text26'
  | 'text28'
  | 'text30'
  | 'text32'
  | 'text40'
  | 'textCheckBox'
  | 'textFinePrint'
  | 'textLabelButton'
  | 'textLabelTextButton'
  | 'textLabelTextButtonBold'
  | 'textParagraph'
  | 'textParagraph14'
  | 'textParagraphBold14'
  | 'textParagraphSmall'
  | 'textParagraphSuperSmall'
  | 'textPlaceholder'
  | 'textSubTitle'
  | 'textSubTitleOrange'
  | 'textTitle'
  | 'textTitleCheckBox'
  | 'textTitleOnboarding'
  | 'textTitleScreen'
  | 'textValidateError'
  ;


export const textVariants: Record<TextVariantsPreset, TextStyle> = {
  text10: {
    color: 'colorTextPrimary',
    fontSize: measure.m10,
    fontFamily: 'Montserrat_400Regular',
  },
  text12: {
    color: 'colorTextPrimary',
    fontSize: measure.m12,
    fontFamily: 'Montserrat_400Regular',
  },
  text13: {
    color: 'colorTextPrimary',
    fontSize: measure.m13,
    fontFamily: 'Montserrat_400Regular',
  },
  text14: {
    color: 'colorTextPrimary',
    fontSize: measure.m14,
    fontFamily: 'Montserrat_400Regular',
  },
  text15: {
    color: 'colorTextPrimary',
    fontSize: measure.m15,
    fontFamily: 'Montserrat_400Regular',
  },
  text16: {
    color: 'colorTextPrimary',
    fontSize: measure.m16,
    fontFamily: 'Montserrat_400Regular',
  },
  text17: {
    color: 'colorTextPrimary',
    fontSize: measure.m17,
    fontFamily: 'Montserrat_400Regular',
  },
  text18: {
    color: 'colorTextPrimary',
    fontSize: measure.m18,
    fontFamily: 'Montserrat_400Regular',
  },
  text20: {
    color: 'colorTextPrimary',
    fontSize: measure.m20,
    fontFamily: 'Montserrat_400Regular',
  },
  text22: {
    color: 'colorTextPrimary',
    fontSize: measure.m22,
    fontFamily: 'Montserrat_400Regular',
  },
  text24: {
    color: 'colorTextPrimary',
    fontSize: measure.m24,
    fontFamily: 'Montserrat_400Regular',
  },
  text26: {
    color: 'colorTextPrimary',
    fontSize: measure.m26,
    fontFamily: 'Montserrat_400Regular',
  },
  text28: {
    color: 'colorTextPrimary',
    fontSize: measure.m28,
    fontFamily: 'Montserrat_400Regular',
  },
  text30: {
    color: 'colorTextPrimary',
    fontSize: measure.m30,
    fontFamily: 'Montserrat_400Regular',
  },
  text32: {
    color: 'colorTextPrimary',
    fontSize: measure.m32,
    fontFamily: 'Montserrat_400Regular',
  },
  text40: {
    color: 'colorTextPrimary',
    fontSize: measure.m40,
    fontFamily: 'Montserrat_400Regular',
  },
  textCheckBox: {
    color: 'colorTextPrimary',
    fontSize: measure.m14,
    fontFamily: 'Montserrat_400Regular',
  },
  textFinePrint: {
    color: 'colorTextFinePrint',
    fontSize: measure.m10,
    fontFamily: 'Montserrat_400Regular',
  },
  textLabelButton: {
    fontSize: measure.m14,
    fontFamily: 'Montserrat_700Bold',
  },
  textLabelTextButton: {
    fontSize: measure.m13,
    fontFamily: 'Montserrat_400Regular',
  },
  textLabelTextButtonBold: {
    fontSize: measure.m12,
    fontFamily: 'Montserrat_500Medium',
  },
  textParagraph: {
    color: 'colorTextPrimary',
    fontSize: measure.m16,
    fontFamily: 'Montserrat_400Regular',
  },
  textParagraph14: {
    color: 'colorTextPrimary',
    fontSize: measure.m14,
    fontFamily: 'Montserrat_400Regular',
  },
  textParagraphBold14: {
    color: 'colorTextPrimary',
    fontSize: measure.m14,
    fontFamily: 'Montserrat_700Bold',
  },
  textParagraphSmall: {
    color: 'colorTextPrimary',
    fontSize: measure.m12,
    fontFamily: 'Montserrat_400Regular',
  },
  textParagraphSuperSmall: {
    color: 'colorTextPrimary',
    fontSize: measure.m10,
    fontFamily: 'Montserrat_400Regular',
  },
  textPlaceholder: {
    color: 'colorTextPlaceHolder',
    fontSize: measure.m14,
    fontFamily: 'Montserrat_400Regular',
  },
  textSubTitle: {
    color: 'colorTextSubTitle',
    fontSize: measure.m20,
    fontFamily: 'Montserrat_400Regular',
  },
  textSubTitleOrange: {
    color: 'colorTextOrange',
    fontSize: measure.m16,
    fontFamily: 'Montserrat_400Regular',
  },
  textTitle: {
    color: 'colorTextPrimary',
    fontSize: measure.m24,
    fontFamily: 'Montserrat_700Bold',
  },
  textTitleCheckBox: {
    color: 'colorTextPrimary',
    fontSize: measure.m14,
    fontFamily: 'Montserrat_400Regular',
  },
  textTitleOnboarding: {
    color: 'colorTextPrimary',
    fontSize: measure.m32,
    fontFamily: 'Montserrat_500Medium',
  },
  textTitleScreen: {
    color: 'colorTextPrimary',
    fontSize: measure.m18,
    fontFamily: 'Montserrat_500Medium',
  },
  textValidateError: {
    color: 'colorTextError',
    fontSize: measure.m12,
    fontFamily: 'Montserrat_400Regular',
  },
};

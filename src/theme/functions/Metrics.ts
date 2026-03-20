import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

const horizontalScale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (horizontalScale(size) - size) * factor;

const fontScale = (size: number) => {
  const baseWidth = Platform.OS === 'ios' ? 375 : 360;

  const platformBoost = Platform.OS === 'ios' ? 1.05 : 0.9;

  const scale = width / baseWidth;

  const minScale = 0.90;
  const maxScale = 1.20;
  const clampedScale = Math.min(Math.max(scale, minScale), maxScale);

  const smoothFactor = 0.5;
  const smoothedScale = 1 + (clampedScale - 1) * smoothFactor;

  const finalScale = smoothedScale * platformBoost;

  return Math.round(PixelRatio.roundToNearestPixel(size * finalScale));
};

export function get(num: number) { return num }

export { horizontalScale, verticalScale, moderateScale, fontScale };

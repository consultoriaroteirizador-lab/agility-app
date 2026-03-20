import { DimensionValue, Image as ImageReact, ImageProps as ImageReactProps } from 'react-native';

export interface ImageProps extends Pick<ImageReactProps, 'source' | 'resizeMode'> {
    height: DimensionValue;
    width: DimensionValue;
    borderRadius?: number;
}

export function Image({ height, width, borderRadius = 0, ...imageReactProps }: ImageProps) {
    return (
        <ImageReact
            style={{ height, width, borderRadius }}
            {...imageReactProps}
        />
    );
}

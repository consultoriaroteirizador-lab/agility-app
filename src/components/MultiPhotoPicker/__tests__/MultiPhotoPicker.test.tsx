import React from 'react';

import { ThemeProvider } from '@shopify/restyle';
import TestRenderer, { act } from 'react-test-renderer';

import { theme } from '@/theme';

import { MultiPhotoPicker } from '..';

jest.mock('expo-image-picker', () => ({
    MediaTypeOptions: { Images: 'Images' },
    requestCameraPermissionsAsync: jest.fn(),
    requestMediaLibraryPermissionsAsync: jest.fn(),
    launchCameraAsync: jest.fn(),
    launchImageLibraryAsync: jest.fn(),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null, MaterialIcons: () => null }));

/**
 * Ícones dos botões de adicionar: "add" é a galeria, "photo-camera" a câmera. Contar nós com onPress não serve:
 * cada TouchableOpacity aparece duas vezes na árvore do test-renderer.
 */
function icones(allowGallery?: boolean) {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <MultiPhotoPicker photos={[]} onPhotosChange={jest.fn()} maxPhotos={1} {...(allowGallery === undefined ? {} : { allowGallery })} />
            </ThemeProvider>,
        );
    });
    return tree.root.findAll((n) => typeof n.type !== 'string' && typeof n.props.name === 'string').map((n) => n.props.name as string);
}

it('padrão: câmera e galeria', () => {
    const nomes = icones();
    expect(nomes).toContain('add');
    expect(nomes).toContain('photo-camera');
});

it('allowGallery=false: só a câmera', () => {
    const nomes = icones(false);
    expect(nomes).not.toContain('add');
    expect(nomes).toContain('photo-camera');
});

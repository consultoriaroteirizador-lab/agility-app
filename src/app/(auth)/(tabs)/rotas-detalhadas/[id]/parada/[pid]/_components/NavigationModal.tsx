import { Platform } from 'react-native';

import { Box, Button, Text, TouchableOpacityBox } from '@/components';
import Modal from '@/components/Modal/Modal';
import { measure } from '@/theme';

import { NavigationModalProps } from '../_types/stop.types';

/**
 * Modal for selecting navigation app
 */
export const NavigationModal = ({
    isVisible,
    onClose,
    onSelectApp,
    showAppleMaps,
}: NavigationModalProps) => {
    return (
        <Modal
            isVisible={isVisible}
            onClose={onClose}
            title="Como você quer navegar?"
        >
            <Box padding="y10" alignItems="center">
                <Text preset="text14" color="gray600" mb="y20" textAlign="center">
                    Escolha o aplicativo de navegação para ir até o endereço da parada.
                </Text>

                <Box flexDirection="row" justifyContent="space-around" width="100%" mb="y16">
                    {/* Waze */}
                    <TouchableOpacityBox
                        alignItems="center"
                        flex={1}
                        onPress={() => onSelectApp('waze')}
                    >
                        <Box
                            borderRadius="s8"
                            justifyContent="center"
                            alignItems="center"
                            width={measure.x48}
                            height={measure.y48}
                            backgroundColor="primary10"
                            mb="y4"
                        >
                            <Text preset="text18" color="primary100">
                                W
                            </Text>
                        </Box>
                        <Text preset="text13" color="gray700">
                            Waze
                        </Text>
                    </TouchableOpacityBox>

                    {/* Google Maps */}
                    <TouchableOpacityBox
                        alignItems="center"
                        flex={1}
                        onPress={() => onSelectApp('googleMaps')}
                    >
                        <Box
                            borderRadius="s8"
                            justifyContent="center"
                            alignItems="center"
                            width={measure.x48}
                            height={measure.y48}
                            backgroundColor="primary10"
                            mb="y4"
                        >
                            <Text preset="text18" color="primary100">
                                G
                            </Text>
                        </Box>
                        <Text preset="text13" color="gray700">
                            Google Maps
                        </Text>
                    </TouchableOpacityBox>

                    {/* Apple Maps - iOS only */}
                    {showAppleMaps && Platform.OS === 'ios' && (
                        <TouchableOpacityBox
                            alignItems="center"
                            flex={1}
                            onPress={() => onSelectApp('appleMaps')}
                        >
                            <Box
                                borderRadius="s8"
                                justifyContent="center"
                                alignItems="center"
                                width={measure.x48}
                                height={measure.y48}
                                backgroundColor="primary10"
                                mb="y4"
                            >
                                <Text preset="text18" color="primary100">
                                    A
                                </Text>
                            </Box>
                            <Text preset="text13" color="gray700">
                                Apple Maps
                            </Text>
                        </TouchableOpacityBox>
                    )}
                </Box>

                <Button
                    preset="outline"
                    title="Fechar"
                    onPress={onClose}
                />
            </Box>
        </Modal>
    );
};

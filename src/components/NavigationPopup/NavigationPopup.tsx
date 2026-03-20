import { Linking, Modal, Platform } from "react-native";

import { Box, LocalIcon, Text, TextButton, TouchableOpacityBox } from "@/components";
import { Icon } from "@/components/Icon/Icon";
import { useAppSafeArea } from "@/hooks";
import { useToastService } from "@/services/Toast/useToast";
import { measure } from "@/theme";

type AppMap = 'waze' | 'googleMaps' | 'appleMaps';

export interface NavigationDestination {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
    type?: string;
}

export interface NavigationPopupProps {
    /** Controla a visibilidade do modal */
    visible: boolean;
    /** Callback para fechar o modal */
    onClose: () => void;
    /** Destino da navegação */
    destination: NavigationDestination | null;
}

async function handleOpenDeviceMap(app: AppMap, destination: NavigationDestination) {
    const latLgn = `${destination.latitude},${destination.longitude}`;
    const label = destination.name || 'Destino';
    let url: string | null = null;

    switch (app) {
        case 'waze':
            url = `waze://?ll=${latLgn}&navigate=yes`;
            if (!(await Linking.canOpenURL(url))) {
                url = `https://waze.com/ul?ll=${latLgn}&navigate=yes`;
            }
            break;
        case "googleMaps":
            url = Platform.OS === 'ios'
                ? `comgooglemaps://?q=${latLgn}`
                : `https://www.google.com/maps/search/?api=1&query=${latLgn}`;
            break;
        case "appleMaps":
            url = `maps://?q=${latLgn}(${label})`;
            break;
    }

    if (url) {
        Linking.openURL(url);
    }
}

export function NavigationPopup({ visible, onClose, destination }: NavigationPopupProps) {
    const { bottom } = useAppSafeArea();
    const { showToast } = useToastService();

    const handleSelectApp = async (app: AppMap) => {
        if (!destination) {
            showToast({ message: "Destino não disponível", type: "error" });
            return;
        }
        await handleOpenDeviceMap(app, destination);
        onClose();
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <Box flex={1} justifyContent="flex-end" backgroundColor="blackOpaque">
                <Box
                    backgroundColor="white"
                    borderTopStartRadius="s20"
                    borderTopEndRadius="s20"
                    padding="y10"
                    style={{ paddingBottom: bottom }}
                >
                    {destination ? (
                        <>
                            <Box mt="t10" alignSelf="center">
                                <Text textAlign="center" color="gray700" preset="text20">
                                    {destination.name || 'Como você quer navegar?'}
                                </Text>
                            </Box>

                            {(destination.address || destination.type) && (
                                <Box marginVertical="y20" gap="y2" alignItems="center">
                                    {destination.address && (
                                        <Box flexDirection="row" gap="x4" alignItems="flex-start">
                                            <Icon name="location-on" size={measure.m24} />
                                            <Text textAlign="center" color="gray700">{destination.address}</Text>
                                        </Box>
                                    )}
                                    {destination.type && (
                                        <Text preset="text15" color="gray500">{destination.type}</Text>
                                    )}
                                </Box>
                            )}

                            <Box marginVertical="y14" justifyContent="space-around" flexDirection="row" alignItems="flex-end">
                                <TouchableOpacityBox onPress={() => handleSelectApp('waze')} alignItems="center" flex={1} gap="y4">
                                    <Box borderRadius="s8" justifyContent="center" alignItems="center" width={measure.x50} height={measure.y50} backgroundColor="wazeBlue">
                                        <LocalIcon color="black" size={measure.m40} iconName="waze" />
                                    </Box>
                                    <Text preset="textParagraph14">Waze</Text>
                                </TouchableOpacityBox>

                                <TouchableOpacityBox justifyContent="center" alignItems="center" onPress={() => handleSelectApp('googleMaps')} flex={1} gap="y4">
                                    <LocalIcon iconName="googleMaps" size={measure.m44} />
                                    <Text preset="textParagraph14">Google Maps</Text>
                                </TouchableOpacityBox>

                                {Platform.OS === 'ios' && (
                                    <TouchableOpacityBox justifyContent="center" alignItems="center" onPress={() => handleSelectApp('appleMaps')} flex={1} gap="y4">
                                        <LocalIcon iconName="appleMaps" size={measure.m40} />
                                        <Text preset="textParagraph14">Apple Maps</Text>
                                    </TouchableOpacityBox>
                                )}
                            </Box>

                            <Box alignItems="center" marginVertical="y10">
                                <TextButton fontSize={measure.f14} preset="primary" title="Fechar" onPress={onClose} />
                            </Box>
                        </>
                    ) : (
                        <Box justifyContent="center" alignItems="center" padding="y20">
                            <Text color="gray500">Destino não disponível</Text>
                        </Box>
                    )}
                </Box>
            </Box>
        </Modal>
    );
}

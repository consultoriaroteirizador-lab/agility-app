import { Alert, Linking, Platform } from "react-native";

import { ActivityIndicator, Box, LocalIcon, Text, TextButton, TouchableOpacityBox } from "@/components";
import { Icon } from "@/components/Icon/Icon";
import ModalComponent from "@/components/ModalComponent/ModalComponent";
import { measure } from "@/theme";
type AppMap = 'waze' | 'googleMaps' | 'appleMaps';
interface ModalNavigationProps {
    selectedEstablishment: {latitude: number, longitude: number, name: string, address: string, type: string},
    setModalVisible: (value: boolean) => void,
    visible?: boolean,
}
export default function NavigationPopup({ selectedEstablishment, setModalVisible, visible = true }: ModalNavigationProps) {
    async function handleOpenDeviceMap(app: AppMap) {
        if (!selectedEstablishment) {
            return Alert.alert("Selecione um estabelecimento");
        }

        const latLgn = `${selectedEstablishment?.latitude},${selectedEstablishment.longitude}`;
        const label = selectedEstablishment?.name;
        let url

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
            case "appleMaps": url = `maps://?q=${latLgn}(${label})`; break;

        }
        Linking.openURL(url!)
    }



    return (
        <ModalComponent 
            backgroundColor="white" 
            visible={visible} 
            onRequestClose={() => setModalVisible(false)}
            dismissable={true}
        >
            {selectedEstablishment ?

                <Box padding="y10">
                    <Box mt="t10" alignSelf="center"><Text textAlign="center" color="gray700" preset="text20">{selectedEstablishment.name}</Text></Box>

                    <Box marginVertical="y40" gap="y2" alignItems="center">
                        <Box flexDirection="row" gap="x4" alignItems="flex-start"><Icon name="location-on" size={measure.m24} /><Text textAlign="center" color="gray700">{selectedEstablishment.address}</Text></Box>
                        <Text preset="text15" color="gray500">{selectedEstablishment.type}</Text>
                    </Box>
                    <Box marginVertical="y14" justifyContent="space-around" flexDirection="row" alignItems="flex-end">
                        {<TouchableOpacityBox onPress={() => handleOpenDeviceMap('waze')} alignItems="center" flex={1} gap="y4">
                            <Box borderRadius="s8" justifyContent="center" alignItems="center" width={measure.x50} height={measure.y50} backgroundColor="wazeBlue" >
                                <LocalIcon color="black" size={measure.m40} iconName="waze" />
                            </Box>
                            <Text preset="textParagraph14">Waze</Text>
                        </TouchableOpacityBox >}
                        {<TouchableOpacityBox justifyContent="center" alignItems="center" onPress={() => handleOpenDeviceMap('googleMaps')} flex={1} gap="y4">
                            <LocalIcon iconName="googleMaps" size={measure.m44} />
                            <Text preset="textParagraph14">Google Maps</Text>
                        </TouchableOpacityBox>}
                        {Platform.OS === 'ios' &&
                            <TouchableOpacityBox justifyContent="center" alignItems="center" onPress={() => handleOpenDeviceMap('appleMaps')} flex={1} gap="y4">
                                <LocalIcon iconName="appleMaps" size={measure.m40} />
                                <Text preset="textParagraph14">Apple Mapas</Text>
                            </TouchableOpacityBox>}
                    </Box>

                    <Box alignItems="center" marginVertical="y10">
                        <TextButton fontSize={measure.f14} preset="primary" title="Fechar" onPress={() => setModalVisible(false)} />
                    </Box>
                </Box>

                :
                <Box justifyContent="center" alignContent="center">
                    <ActivityIndicator />
                </Box>

            }
        </ModalComponent>
    );
}

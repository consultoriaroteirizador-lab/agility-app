import { Box, Text, TouchableOpacityBox } from '@/components';

import { StopTabsProps } from '../_types/stop.types';

/**
 * Tab component for switching between Local and Equipment views
 */
export const StopTabs = ({
    activeTab,
    onTabChange,
    localContent,
    equipmentContent,
}: StopTabsProps) => {
    return (
        <>
            {/* Tabs Local/Equipment */}
            <Box flexDirection="row" justifyContent="center" gap="x24" mb="y16" borderBottomWidth={1} borderBottomColor="gray200">
                <TouchableOpacityBox
                    pb="y8"
                    borderBottomWidth={activeTab === 'local' ? 2 : 0}
                    borderBottomColor={activeTab === 'local' ? 'primary100' : 'transparent'}
                    onPress={() => onTabChange('local')}
                >
                    <Text
                        preset="text15"
                        color={activeTab === 'local' ? 'primary100' : 'gray400'}
                        fontWeight={activeTab === 'local' ? '600' : '400'}
                    >
                        Local
                    </Text>
                </TouchableOpacityBox>
                <TouchableOpacityBox
                    pb="y8"
                    borderBottomWidth={activeTab === 'equipment' ? 2 : 0}
                    borderBottomColor={activeTab === 'equipment' ? 'primary100' : 'transparent'}
                    onPress={() => onTabChange('equipment')}
                >
                    <Text
                        preset="text15"
                        color={activeTab === 'equipment' ? 'primary100' : 'gray400'}
                        fontWeight={activeTab === 'equipment' ? '600' : '400'}
                    >
                        Equipamentos
                    </Text>
                </TouchableOpacityBox>
            </Box>

            {/* Tab Content */}
            {activeTab === 'local' && localContent}
            {activeTab === 'equipment' && equipmentContent}
        </>
    );
};

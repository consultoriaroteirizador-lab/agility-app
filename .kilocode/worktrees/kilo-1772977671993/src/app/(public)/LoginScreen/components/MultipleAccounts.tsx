import { Box, Text, TextButton } from '@/components';
import { UserCredentials } from '@/services/userAuthInfo/UserAuthInfoType';
import { measure } from '@/theme';

import ItemAccount from './ItemAccount';


interface Props {
    list: UserCredentials[];
    selectUser: (u: UserCredentials) => void;
    removeUser: (u: UserCredentials) => void;
    onNewAccount: () => void;
}

export function MultipleAccounts({ list, selectUser, removeUser, onNewAccount }: Props) {
    return (
        <Box
            justifyContent="center"
            alignItems="center"
            width={measure.x320}
            borderRadius="s10"
        >
            <Text color="white" preset="text17" fontWeightPreset="semibold" mb="b10">
                Qual conta deseja acessar?
            </Text>

            {list.map((user) => (
                <Box key={user.username} width={measure.x330}>
                    <ItemAccount
                        user={user}
                        selectUserCredentials={selectUser}
                        removeUser={removeUser}
                    />
                </Box>
            ))}

            <TextButton
                onPress={onNewAccount}
                mt="t18"
                color="white"
                preset="primary"
                title="Acessar outra conta"
            />
        </Box>
    );
}

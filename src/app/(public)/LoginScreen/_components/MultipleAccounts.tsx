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
            width={measure.x330}
            borderRadius="s10"
        >
            <Text color="gray700" preset="text17" fontWeightPreset="semibold" mb="b10">
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

            {/* Fundo da tela e branco: cor branca aqui deixava a acao invisivel
                e o unico caminho para cadastrar outra conta era remover a atual. */}
            <TextButton
                onPress={onNewAccount}
                mt="t18"
                preset="textPrimaryUnderline"
                title="Adicionar outra conta"
            />
        </Box>
    );
}

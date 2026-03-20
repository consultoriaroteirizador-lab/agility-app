import { Box, Button, Text } from "@/components";
import { IconButton } from "@/components/Button/IconButton";
import { Icon } from "@/components/Icon/Icon";
import { UserCredentials } from "@/services/userAuthInfo/UserAuthInfoType";
import { $shadowProps, measure } from "@/theme";

interface ItemAccountProps {
    user: UserCredentials,
    selectUserCredentials: (user: UserCredentials) => void;
    removeUser: (user: UserCredentials) => void

}

export default function ItemAccount({ user, selectUserCredentials, removeUser }: ItemAccountProps) {
    return (
        <Box mt="t10" borderRadius="s14" backgroundColor='white' style={$shadowProps} alignItems="center" height={measure.y140}>
            <Box alignSelf="flex-end" mr="r14" mt="t14">
                <IconButton size={measure.m24} iconName='close' color='redError' onPress={() => removeUser(user)} />
            </Box>
            <Box mb="b8" alignItems='center' flexDirection='row' justifyContent="center">
                <Icon color="gray500" name='person' size={measure.m30} />
                <Text>{user.name}</Text>
            </Box>
            <Button mt="t10" title='Acessar' width={measure.x300} height={measure.y40} onPress={() => selectUserCredentials(user)} />
        </Box>
    )
}
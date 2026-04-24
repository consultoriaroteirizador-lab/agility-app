import { Box } from '@/components';
import { measure } from '@/theme';

// import Logo from '@/assets/images/logo-agility-color.svg';

export function LoginHeader() {
    return (
        <Box alignItems="center" flexDirection='row' gap='x4' justifyContent='space-between'>
            <Box width={100} height={measure.y100} borderWidth={measure.m1} borderColor='primary100' />
            <Box width={100} height={measure.y100} borderWidth={measure.m1} borderColor='primary100' />
            <Box />
        </Box>
    );
}

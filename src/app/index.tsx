import { ActivityIndicator, Box } from "@/components";

export default function Index() {
    return (
        <Box flex={1} alignItems='center' justifyContent='center'>
            <ActivityIndicator />
        </Box>
    );
}
import { Skeleton, Box } from "@mui/material";

export default function OfferCardSkeleton() {
  return (
    <Box
      width={200}
      height={250}
      display="flex"
      flexDirection="column"
      justifyContent="space-between"
      borderRadius={2}
      overflow="hidden"
      boxShadow={1}
    >
      <Skeleton variant="rectangular" height="100%" width="100%" />
    </Box>
  );
}

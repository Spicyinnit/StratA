import { Box } from '@mui/material';

export default function BigImage({ part }: { part: { url: string } }) {
  return <Box component="img" src={part.url} sx={{ maxWidth: 280, borderRadius: 2, display: 'block' }} />;
}
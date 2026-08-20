import { useState } from 'react';
import { Box, Modal } from '@mui/material';

export default function BigImage({ part }: { part: any }) {
  const [open, setOpen] = useState(false);

  if (!part?.url) return null;
  // guard: only render actual images
  if (part.mediaType && !part.mediaType.startsWith('image/')) {
    return <a href={part.url} target="_blank" rel="noreferrer">{part.filename ?? 'file'}</a>;
  }

  return (
    <>
      <Box
        component="img"
        src={part.url}
        alt=""
        onClick={() => setOpen(true)}
        sx={{
          maxWidth: 280,
          maxHeight: 320,
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
          borderRadius: 2,
          display: 'block', 
          cursor: 'pointer',
          transition: 'opacity .15s',
          '&:hover': { opacity: 0.85 },
        }}
      />

      <Modal open={open} onClose={() => setOpen(false)}>
        <Box
          onClick={() => setOpen(false)}
          sx={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
            outline: 'none',
          }}
        >
          <Box
            component="img"
            src={part.url}
            alt=""
            onClick={(e) => e.stopPropagation()}
            sx={{
              maxWidth: '92vw',
              maxHeight: '92vh',
              objectFit: 'contain',
              borderRadius: 2,
              boxShadow: 24,
            }}
          />
        </Box>
      </Modal>
    </>
  );
}
import { useState } from 'react';
import { Box, Modal } from '@mui/material';

export default function BigImage({ part }: { part: any }) {
  const [open, setOpen] = useState(false);

  if (!part?.url) return null;

  const type = part.mediaType ?? '';

  if (type.startsWith('video/')) {
    return (
      <Box
        key={part.url}
        component="video"
        src={part.url}
        controls
        preload="metadata"
        sx={{
          maxWidth: 280,
          maxHeight: 320,
          borderRadius: 2,
          display: 'block',
          backgroundColor: '#000',
        }}
      />
    );
  }

  if (type.startsWith('audio/')) {
    return (
      <Box
        key={part.url}
        component="audio"
        src={part.url}
        controls
        preload="metadata"
        sx={{ width: 260, display: 'block' }}
      />
    );
  }

  if (!type.startsWith('image/')) {
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
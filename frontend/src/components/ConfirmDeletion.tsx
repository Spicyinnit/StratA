import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;  // new string beside the text
  cancelLabel?: string;   // just to look cool (ik im)
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDeletion({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Dialog 
    open={open}
     onClose={onCancel}fullWidth
      maxWidth="xs"
      slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} variant="outlined">
          {cancelLabel} 
        </Button> 
        <Button onClick={onConfirm} color="error" variant="contained">
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
// omg react is so cool i can add a string beside the text and it will just work 

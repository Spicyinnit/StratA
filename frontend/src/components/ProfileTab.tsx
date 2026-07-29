import * as React from 'react';
import { API_BASE, HANDLE_REGEX } from '../api';

type Props = { meId: number };

export function ProfileTab({ meId }: Props) {
  const [handle, setHandle] = React.useState('');
  const [bio, setBio] = React.useState('');
  const [saved, setSaved] = React.useState(false);
  const [handleError, setHandleError] = React.useState('');
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);

  const saveProfile = () => {
    if (!HANDLE_REGEX.test(handle)) {
      setHandleError('Handle must be 3-30 characters: letters, numbers, _ or . only');
      return;
    }
    setHandleError('');
    fetch(`${API_BASE}/api/users/${meId}/profile/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle, bio }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.handle?.[0] ?? 'Save failed, try a different handle');
        return data;
      })
      .then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      })
      .catch((err) => setHandleError(err.message));
  };

  const uploadAvatar = () => {
    if (!avatarFile) return;
    const formData = new FormData();
    formData.append('avatar', avatarFile);
    fetch(`${API_BASE}/api/users/${meId}/avatar/`, { method: 'PATCH', body: formData  })
      .then((res) => res.json())
      .then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label style={{ color: '#8a7854', fontSize: 12 }}>Handle</label>
      <input
        value={handle}
        onChange={(e) => {
          setHandle(e.target.value);
          setHandleError('');
        }}
        placeholder="yourhandle"
        style={{
          background: '#3a3a3a',
          border: handleError ? '1px solid #e05252' : '1px solid #444',
          borderRadius: 8,
          padding: '8px 12px',
          color: '#FAF3E1',
          fontSize: 14,
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
      {handleError && <span style={{ color: '#e05252', fontSize: 12 }}>{handleError}</span>}

      <label style={{ color: '#8a7854', fontSize: 12 }}>Avatar</label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
        style={{ color: '#FAF3E1', fontSize: 13 }}
      />
      <button
        onClick={uploadAvatar}
        disabled={!avatarFile}
        style={{
          padding: '8px 0',
          borderRadius: 8,
          border: 'none',
          background: avatarFile ? '#FF6D1F' : '#555',
          color: '#222222',
          fontWeight: 600,
          fontSize: 13,
          cursor: avatarFile ? 'pointer' : 'default',
        }}
      >
        Upload Avatar
      </button>

      <label style={{ color: '#8a7854', fontSize: 12 }}>Bio</label>
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="Write something about yourself..."
        rows={4}
        style={{
          background: '#3a3a3a',
          border: '1px solid #444',
          borderRadius: 8,
          padding: '8px 12px',
          color: '#FAF3E1',
          fontSize: 14,
          outline: 'none',
          resize: 'none',
          width: '100%',
          boxSizing: 'border-box',
          fontFamily: 'inherit',
        }}
      />
      <button
        onClick={saveProfile}
        style={{
          padding: '10px 0',
          borderRadius: 8,
          border: 'none',
          background: '#FF6D1F',
          color: '#222222',
          fontWeight: 600,
          fontSize: 14,
          cursor: 'pointer',
          marginTop: 4,
        }}
      >
        {saved ? 'Saved!' : 'Save Profile'}
      </button>
    </div>
  );
}
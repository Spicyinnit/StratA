import * as React from 'react';
import { apiFetch } from '../../api';
import { useAppTheme } from '../../Theme';

type Props = {
  onSelect: (u: { user_id: number; tag: string; avatar: string | null }) => void;
};

export function SearchBar({ onSelect }: Props) {
  const { mode } = useAppTheme();
  const light = mode === 'light';
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<any[]>([]);
  const [show, setShow] = React.useState(false);
  const boxRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (query.trim().length < 1) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      apiFetch(`/api/search-users/?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => {
          setResults(data);
          setShow(true);
        });
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setShow(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const surface = light ? '#FFFFFF' : '#2A2320';
  const textColor = light ? '#2A211A' : '#F5EDE2';

  return (
    <div ref={boxRef} style={{ position: 'relative', marginBottom: 12 }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setShow(true)}
        placeholder="Search @tag..."
        style={{
          background: surface,
          border: `1px solid ${light ? '#D9CBAE' : '#3A312C'}`,
          borderRadius: 8,
          padding: '8px 12px',
          color: textColor,
          fontSize: 14,
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
      {show && results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: surface,
            border: `1px solid ${light ? '#D9CBAE' : '#3A312C'}`,
            borderRadius: 8,
            overflow: 'hidden',
            zIndex: 10,
            boxShadow: light ? '0 4px 12px rgba(0,0,0,0.12)' : '0 4px 12px rgba(0,0,0,0.4)',
          }}
        >
          {results.map((u) => (
            <div
              key={u.user_id}
              onClick={() => {
                onSelect(u);
                setQuery('');
                setResults([]);
                setShow(false);
              }}
              style={{ padding: '8px 12px', cursor: 'pointer', color: textColor, fontSize: 14 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = light ? '#F1E8D4' : '#3A312C')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              @{u.tag}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
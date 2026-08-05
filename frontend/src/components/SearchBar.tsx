import * as React from 'react';
import { apiFetch } from '../api';

type Props = {
  meId: number;
  onSelect: (u: { user_id: number; tag: string; avatar: string | null }) => void;
};

export function SearchBar({ meId, onSelect }: Props) {
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

  return (
    <div ref={boxRef} style={{ position: 'relative', marginBottom: 12 }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setShow(true)}
        placeholder="Search @tag..."
        style={{
          background: '#3a3a3a',
          border: '1px solid #444',
          borderRadius: 8,
          padding: '8px 12px',
          color: '#FAF3E1',
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
            background: '#3a3a3a',
            borderRadius: 8,
            overflow: 'hidden',
            zIndex: 10,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
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
              style={{ padding: '8px 12px', cursor: 'pointer', color: '#FAF3E1', fontSize: 14 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#4a4a4a')}
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
import { useState, useCallback, useRef } from 'react';
import CodeEditor from './components/CodeEditor';
import OutputPanel from './components/OutputPanel';
import { useWebSocket } from './hooks/useWebSocket';
import { LANGUAGES } from './types';
import type { LanguageId, CodeChange, LanguageChange, UserPresence, RoomState } from './types';

const USER_COLORS = ['#cba6f7', '#f38ba8', '#a6e3a1', '#89b4fa', '#fab387', '#f9e2af', '#94e2d5', '#74c7ec'];

function generateUserId() {
  return 'user-' + Math.random().toString(36).substring(2, 10);
}

function Landing({ onCreateRoom, onJoinRoom }: { onCreateRoom: () => void; onJoinRoom: (id: string) => void }) {
  const [joinId, setJoinId] = useState('');

  return (
    <div className="landing">
      <h1>CodePad</h1>
      <p>Real-time collaborative code editor</p>
      <div className="landing-actions">
        <button className="btn btn-primary" onClick={onCreateRoom}>
          Create Room
        </button>
      </div>
      <div className="join-form">
        <input
          placeholder="Room code"
          value={joinId}
          onChange={(e) => setJoinId(e.target.value.toUpperCase())}
          maxLength={6}
          onKeyDown={(e) => e.key === 'Enter' && joinId.length === 6 && onJoinRoom(joinId)}
        />
        <button
          className="btn btn-secondary"
          onClick={() => onJoinRoom(joinId)}
          disabled={joinId.length !== 6}
        >
          Join
        </button>
      </div>
    </div>
  );
}

function EditorPage({ roomId, userId, username }: { roomId: string; userId: string; username: string }) {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<LanguageId>('javascript');
  const [users, setUsers] = useState<Record<string, string>>({});
  const codeRef = useRef(code);

  const onCodeChange = useCallback((change: CodeChange) => {
    codeRef.current = change.content;
    setCode(change.content);
  }, []);

  const onLanguageChange = useCallback((change: LanguageChange) => {
    setLanguage(change.language as LanguageId);
  }, []);

  const onPresenceChange = useCallback((presence: UserPresence) => {
    setUsers((prev) => {
      const next = { ...prev };
      if (presence.action === 'join') {
        next[presence.userId] = presence.username;
      } else {
        delete next[presence.userId];
      }
      return next;
    });
  }, []);

  const onStateSync = useCallback((state: RoomState) => {
    codeRef.current = state.code;
    setCode(state.code);
    setLanguage(state.language as LanguageId);
    setUsers(state.users);
  }, []);

  const { connected, sendCodeChange, sendLanguageChange } = useWebSocket({
    roomId,
    userId,
    username,
    onCodeChange,
    onLanguageChange,
    onPresenceChange,
    onStateSync,
  });

  const handleLocalCodeChange = useCallback(
    (newCode: string) => {
      codeRef.current = newCode;
      setCode(newCode);
      sendCodeChange(newCode);
    },
    [sendCodeChange]
  );

  const handleLanguageChange = useCallback(
    (newLang: LanguageId) => {
      setLanguage(newLang);
      sendLanguageChange(newLang);
    },
    [sendLanguageChange]
  );

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
  };

  const userEntries = Object.entries(users);

  return (
    <div className="editor-page">
      <div className="toolbar">
        <div className="toolbar-left">
          <span style={{ fontWeight: 700, color: '#cba6f7' }}>CodePad</span>
          <span className="room-id" onClick={copyRoomId} title="Click to copy">
            {roomId}
          </span>
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value as LanguageId)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 12, color: connected ? '#a6e3a1' : '#f38ba8' }}>
            {connected ? 'Connected' : 'Reconnecting...'}
          </span>
        </div>
        <div className="toolbar-right">
          <div className="users-list">
            {userEntries.map(([uid, uname], i) => (
              <div
                key={uid}
                className="user-badge"
                style={{ background: USER_COLORS[i % USER_COLORS.length] }}
                title={uname}
              >
                {uname.charAt(0).toUpperCase()}
              </div>
            ))}
            <span className="user-count">{userEntries.length} online</span>
          </div>
          <OutputPanel language={language} code={codeRef.current} />
        </div>
      </div>
      <div className="editor-container">
        <CodeEditor code={code} language={language} onChange={handleLocalCodeChange} />
      </div>
    </div>
  );
}

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [userId] = useState(generateUserId);
  const [username, setUsername] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);

  const promptName = (rid: string) => {
    setPendingRoomId(rid);
    setShowNameModal(true);
  };

  const confirmName = () => {
    const name = username.trim() || 'Anon';
    setUsername(name);
    setRoomId(pendingRoomId);
    setShowNameModal(false);
  };

  const handleCreate = async () => {
    const res = await fetch('/api/rooms', { method: 'POST' });
    const data = await res.json();
    promptName(data.id);
  };

  const handleJoin = (id: string) => {
    promptName(id);
  };

  if (showNameModal) {
    return (
      <div className="username-modal">
        <div className="username-modal-content">
          <h2>Enter your name</h2>
          <input
            autoFocus
            placeholder="Your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && confirmName()}
            maxLength={20}
          />
          <button className="btn btn-primary" onClick={confirmName}>
            Join Room
          </button>
        </div>
      </div>
    );
  }

  if (!roomId) {
    return (
      <div className="app">
        <Landing onCreateRoom={handleCreate} onJoinRoom={handleJoin} />
      </div>
    );
  }

  return (
    <div className="app">
      <EditorPage roomId={roomId} userId={userId} username={username} />
    </div>
  );
}

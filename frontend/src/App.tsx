import { useState, useCallback, useRef } from 'react';
import CodeEditor from './components/CodeEditor';
import OutputPanel from './components/OutputPanel';
import { useWebSocket } from './hooks/useWebSocket';
import { LANGUAGES } from './types';
import type { LanguageId, CodeChange, LanguageChange, UserPresence, RoomState } from './types';

const USER_COLORS = ['#6c5ce7', '#e84393', '#00b894', '#0984e3', '#fdcb6e', '#e17055', '#00cec9', '#a29bfe'];

function generateUserId() {
  return 'user-' + Math.random().toString(36).substring(2, 10);
}

function Landing({ onCreateRoom, onJoinRoom }: { onCreateRoom: () => void; onJoinRoom: (id: string) => void }) {
  const [joinId, setJoinId] = useState('');

  return (
    <div className="landing">
      <div className="landing-logo">
        <div className="landing-logo-icon">&lt;/&gt;</div>
        <h1>CodePad</h1>
      </div>
      <p className="landing-subtitle">Real-time collaborative code editor</p>
      <div className="landing-card">
        <button className="btn btn-primary" onClick={onCreateRoom}>
          Create New Room
        </button>
        <div className="landing-divider">
          <span>or join existing</span>
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
          <div className="toolbar-brand">
            <div className="toolbar-brand-icon">&lt;/&gt;</div>
            <span>CodePad</span>
          </div>
          <div className="toolbar-sep" />
          <span className="room-id" onClick={copyRoomId} title="Click to copy room code">
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
          <div className="connection-status">
            <div className={`connection-dot ${connected ? 'connected' : 'disconnected'}`} />
            <span style={{ color: connected ? 'var(--green)' : 'var(--red)' }}>
              {connected ? 'Connected' : 'Reconnecting...'}
            </span>
          </div>
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
          <h2>What should we call you?</h2>
          <p>Pick a display name for the room</p>
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

export interface RoomState {
  code: string;
  language: string;
  users: Record<string, string>;
}

export interface CodeChange {
  roomId: string;
  userId: string;
  content: string;
  timestamp: number;
}

export interface LanguageChange {
  roomId: string;
  userId: string;
  language: string;
}

export interface UserPresence {
  roomId: string;
  userId: string;
  username: string;
  action: 'join' | 'leave';
}

export interface RunResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

export const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'sql', label: 'SQL' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
] as const;

export type LanguageId = (typeof LANGUAGES)[number]['value'];

import { useState } from 'react';
import type { RunResponse } from '../types';

interface OutputPanelProps {
  language: string;
  code: string;
}

export default function OutputPanel({ language, code }: OutputPanelProps) {
  const [output, setOutput] = useState<RunResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [visible, setVisible] = useState(false);

  const canRun = language === 'python' || language === 'javascript';

  const handleRun = async () => {
    setRunning(true);
    setVisible(true);
    setOutput(null);

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });
      const data: RunResponse = await res.json();
      setOutput(data);
    } catch (err) {
      setOutput({ stdout: '', stderr: 'Failed to connect to server', exitCode: 1, timedOut: false });
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <div style={{ padding: '0 16px 0 0', display: 'flex', alignItems: 'center' }}>
        {canRun && (
          <button className="btn-run" onClick={handleRun} disabled={running}>
            {running ? 'Running...' : 'Run'}
          </button>
        )}
      </div>
      {visible && (
        <div className="output-panel">
          <div className="output-header">
            <span>Output</span>
            <button className="btn-close" onClick={() => setVisible(false)}>x</button>
          </div>
          <div className={`output-body ${output && output.exitCode !== 0 ? 'error' : 'success'}`}>
            {running && 'Running...'}
            {output && (output.stdout || output.stderr || (output.timedOut ? 'Execution timed out' : 'No output'))}
          </div>
        </div>
      )}
    </>
  );
}

import { useState, useEffect, useCallback } from 'react';
import type { RunResponse } from '../types';

interface OutputPanelProps {
  language: string;
  code: string;
  runTrigger: number;
}

export default function OutputPanel({ language, code, runTrigger }: OutputPanelProps) {
  const [output, setOutput] = useState<RunResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [visible, setVisible] = useState(false);

  const canRun = language === 'python' || language === 'javascript';

  const handleRun = useCallback(async () => {
    if (!canRun || running) return;
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
  }, [canRun, running, code, language]);

  // Trigger run from parent via Ctrl+Enter
  useEffect(() => {
    if (runTrigger > 0) {
      handleRun();
    }
  }, [runTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const getStatusLabel = () => {
    if (!output) return null;
    if (output.timedOut) return <span className="output-status output-status-error">Timed Out</span>;
    if (output.exitCode !== 0) return <span className="output-status output-status-error">Exit {output.exitCode}</span>;
    return <span className="output-status output-status-success">Success</span>;
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {canRun && (
          <button className="btn-run" onClick={handleRun} disabled={running} title="Run code (Ctrl+Enter)">
            {running ? (
              <>
                <span className="spinner" />
                Running...
              </>
            ) : (
              <>
                <span className="run-icon">&#9654;</span>
                Run
              </>
            )}
          </button>
        )}
      </div>
      {visible && (
        <div className="output-panel">
          <div className="output-header">
            <div className="output-header-left">
              <span>Output</span>
              {getStatusLabel()}
            </div>
            <button className="btn-close" onClick={() => setVisible(false)}>&times;</button>
          </div>
          <div className={`output-body ${output ? (output.exitCode !== 0 ? 'error' : 'success') : ''}`}>
            {running && <span className="output-running">Running your code...</span>}
            {output && (
              output.stdout || output.stderr || (output.timedOut ? 'Execution timed out' : 'No output')
            )}
          </div>
        </div>
      )}
    </>
  );
}

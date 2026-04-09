import { useEffect, useRef, useCallback } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { sql } from '@codemirror/lang-sql';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';
import type { LanguageId } from '../types';

function getLanguageExtension(lang: LanguageId) {
  switch (lang) {
    case 'python': return python();
    case 'javascript': return javascript();
    case 'typescript': return javascript({ typescript: true });
    case 'java': return java();
    case 'cpp':
    case 'c': return cpp();
    case 'sql': return sql();
    case 'html': return html();
    case 'css': return css();
    case 'rust': return rust();
    case 'go': return go();
    default: return javascript();
  }
}

interface CodeEditorProps {
  code: string;
  language: LanguageId;
  onChange: (code: string) => void;
}

export default function CodeEditor({ code, language, onChange }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isRemoteUpdate = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Create editor on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !isRemoteUpdate.current) {
        const newCode = update.state.doc.toString();
        onChangeRef.current(newCode);
      }
    });

    const state = EditorState.create({
      doc: code,
      extensions: [
        basicSetup,
        oneDark,
        getLanguageExtension(language),
        updateListener,
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto' },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, []); // mount once

  // Update language extension when language changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentDoc = view.state.doc.toString();

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !isRemoteUpdate.current) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    view.setState(
      EditorState.create({
        doc: currentDoc,
        extensions: [
          basicSetup,
          oneDark,
          getLanguageExtension(language),
          updateListener,
          EditorView.theme({
            '&': { height: '100%' },
            '.cm-scroller': { overflow: 'auto' },
          }),
        ],
      })
    );
  }, [language]);

  // Apply remote code changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc === code) return;

    isRemoteUpdate.current = true;
    view.dispatch({
      changes: {
        from: 0,
        to: currentDoc.length,
        insert: code,
      },
    });
    isRemoteUpdate.current = false;
  }, [code]);

  return <div ref={containerRef} style={{ height: '100%' }} />;
}

import Editor, { type BeforeMount } from '@monaco-editor/react'
import type { ProgrammingLanguage } from '@/types/enums'

const MONACO_LANG: Record<ProgrammingLanguage, string> = {
  CPP: 'cpp',
  JAVA: 'java',
  PYTHON: 'python',
  C: 'c',
}

interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  language: ProgrammingLanguage | null
  readOnly?: boolean
  onBlur?: () => void
  onAttemptEdit?: () => void
}

const EDIT_KEYS = new Set(['Backspace', 'Delete', 'Enter'])

const beforeMount: BeforeMount = (monaco) => {
  monaco.editor.defineTheme('app-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#fcfcfd',
      'editorGutter.background': '#f6f7f9',
      'editorLineNumber.foreground': '#c2c6cd',
      'editorLineNumber.activeForeground': '#8a8f99',
    },
  })
}

export function CodeEditor({ value, onChange, language, readOnly = false, onBlur, onAttemptEdit }: CodeEditorProps) {
  return (
    <Editor
      height="100%"
      theme="app-light"
      beforeMount={beforeMount}
      language={language ? MONACO_LANG[language] : 'plaintext'}
      value={value}
      onChange={(val) => onChange?.(val ?? '')}
      onMount={(editor) => {
        if (onBlur) editor.onDidBlurEditorWidget(onBlur)
        if (onAttemptEdit) {
          editor.onKeyDown((e) => {
            const { key, ctrlKey, metaKey } = e.browserEvent
            if (ctrlKey || metaKey) return
            if (key.length !== 1 && !EDIT_KEYS.has(key)) return
            onAttemptEdit()
          })
        }
      }}
      options={{
        readOnly,
        readOnlyMessage: { value: '' },
        fontSize: 13.5,
        lineHeight: 26,
        lineNumbersMinChars: 2,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        tabSize: 4,
        autoIndent: 'full',
        formatOnType: !readOnly,
        wordWrap: 'off',
        renderLineHighlight: readOnly ? 'none' : 'line',
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        scrollbar: { vertical: 'auto', horizontal: 'auto' },
        padding: { top: 14, bottom: 14},
        fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", Consolas, monospace',
        fontLigatures: true,
        contextmenu: false
      }}
    />
  )
}

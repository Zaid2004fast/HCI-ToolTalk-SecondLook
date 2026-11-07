import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

// Dark editor inside a light study frame. All text colours meet WCAG AA (4.5:1)
// against the editor background (#17191E), including the ghost suggestion text.
export const editorTheme = EditorView.theme(
  {
    '&': {
      color: '#E8E6E1',
      backgroundColor: '#17191E',
      fontSize: '15px',
      height: '100%',
    },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': {
      fontFamily: '"IBM Plex Mono", ui-monospace, Consolas, monospace',
      lineHeight: '1.65',
      padding: '14px 0 40px',
    },
    '.cm-content': { caretColor: '#F5C451' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#F5C451', borderLeftWidth: '2px' },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection':
      { backgroundColor: '#34405A !important' },
    '.cm-activeLine': { backgroundColor: '#1E2128' },
    '.cm-gutters': {
      backgroundColor: '#17191E',
      color: '#8A8F99',
      border: 'none',
      paddingLeft: '8px',
    },
    '.cm-activeLineGutter': { backgroundColor: '#1E2128', color: '#C9CCD2' },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 14px 0 6px', minWidth: '28px' },
    '.cm-matchingBracket': { backgroundColor: '#2E3442', outline: '1px solid #59627A' },
  },
  { dark: true },
);

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.definitionKeyword, t.moduleKeyword], color: '#E3A7F5' },
  { tag: [t.function(t.variableName), t.function(t.definition(t.variableName))], color: '#8FC8FF' },
  { tag: [t.definition(t.variableName)], color: '#F0D98C' },
  { tag: [t.variableName, t.propertyName], color: '#E8E6E1' },
  { tag: [t.string, t.special(t.string)], color: '#A8DBA0' },
  { tag: [t.number, t.bool, t.null], color: '#F7B07A' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: '#9AA0AA', fontStyle: 'italic' },
  { tag: [t.operator, t.punctuation, t.bracket], color: '#C3C7CF' },
]);

export const editorHighlight = syntaxHighlighting(highlight);

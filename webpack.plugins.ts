import type IForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ForkTsCheckerWebpackPlugin: typeof IForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

export const plugins = [
  new ForkTsCheckerWebpackPlugin({
    logger: 'webpack-infrastructure',
  }),
  new MonacoWebpackPlugin({
    languages: [
      'typescript', 'javascript', 'python', 'rust', 'go', 'cpp', 'c',
      'java', 'css', 'scss', 'less', 'html', 'xml', 'json', 'yaml',
      'markdown', 'shell', 'sql', 'php', 'ruby', 'swift', 'kotlin',
    ],
    features: [
      'bracketMatching', 'caretOperations', 'clipboard', 'codeAction',
      'codelens', 'colorPicker', 'comment', 'contextmenu', 'coreCommands',
      'cursorUndo', 'dnd', 'find', 'folding', 'fontZoom', 'format',
      'gotoError', 'gotoLine', 'gotoSymbol', 'hover', 'inPlaceReplace',
      'indentation', 'inlineCompletions', 'inlineHints', 'inspectTokens',
      'lineSelection', 'linesOperations', 'linkedEditing', 'links',
      'minimap', 'multicursor', 'parameterHints', 'quickCommand',
      'quickHelp', 'quickOutline', 'referenceSearch', 'rename',
      'smartSelect', 'snippets', 'suggest', 'toggleHighContrast',
      'toggleTabFocusMode', 'transpose', 'unusualLineTerminators',
      'viewportSemanticTokens', 'wordHighlighter', 'wordOperations',
      'wordPartOperations',
    ],
  }),
];

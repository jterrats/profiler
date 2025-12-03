module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'ci', 'build', 'revert'],
    ],
    'scope-enum': [
      2,
      'always',
      ['retrieve', 'compare', 'docs', 'commands', 'tests', 'ci', 'deps', 'config', 'messages', 'utils'],
    ],
    'scope-empty': [0],
    'subject-case': [0],
  },
};

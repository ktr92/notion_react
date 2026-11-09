export default {
  preset: 'ts-jest',
  testEnvironment: 'node', // или 'jsdom', если вы тестируете React-компоненты
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'ES2021',
          module: 'commonjs',
          lib: ['ES2021', 'DOM'],
          jsx: 'react-jsx',
          
          verbatimModuleSyntax: false,
          
          noUnusedLocals: false,
          noUnusedParameters: false,
          
          esModuleInterop: true,
          allowSyntheticDefaultImports: true
        }
      }
    ]
  }
};

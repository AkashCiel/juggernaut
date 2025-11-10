/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  verbose: true,
  collectCoverageFrom: [
    'library_builder/utils/stateManager.js'
  ],
  coverageDirectory: '<rootDir>/tests/coverage'
};


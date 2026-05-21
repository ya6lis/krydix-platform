/** @type {import('jest').Config} */
const config = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/src'],
	testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
	moduleFileExtensions: ['ts', 'js', 'json'],
	collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/index.ts'],
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov'],
	transform: {
		'^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
	},
	clearMocks: true,
};

module.exports = config;

/** @type {import('jest').Config} */
const config = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/src'],
	testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts', '**/*.spec.ts'],
	transform: {
		'^.+\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', useESM: false }],
	},
	moduleNameMapper: {
		'^(\.{1,2}/.*)\.js$': '$1',
	},
	clearMocks: true,
};
module.exports = config;

/** @type {import('jest').Config} */
const config = {
	preset: 'ts-jest',
	testEnvironment: 'jsdom',
	roots: ['<rootDir>/src'],
	testMatch: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
		'\\.(css|less|scss|sass)$': 'identity-obj-proxy',
		'^yet-another-react-lightbox/plugins/thumbnails$':
			'<rootDir>/src/__mocks__/yet-another-react-lightbox-plugins-thumbnails.ts',
		'^yet-another-react-lightbox$': '<rootDir>/src/__mocks__/yet-another-react-lightbox.tsx',
	},
	setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
	transform: {
		'^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
	},
	transformIgnorePatterns: ['/node_modules/(?!(yet-another-react-lightbox)/)'],
	clearMocks: true,
};

module.exports = config;

import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
	{
		files: ['src/**/*.{ts,tsx}'],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				ecmaVersion: 2022,
				sourceType: 'module',
				ecmaFeatures: { jsx: true },
			},
			globals: {
				window: 'readonly',
				document: 'readonly',
				localStorage: 'readonly',
				console: 'readonly',
			},
		},
		plugins: {
			'@typescript-eslint': tseslint,
			react: reactPlugin,
			'react-hooks': reactHooks,
		},
		settings: {
			react: { version: 'detect' },
		},
		rules: {
			...tseslint.configs.recommended.rules,
			...reactHooks.configs.recommended.rules,
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
			'@typescript-eslint/no-explicit-any': 'warn',
			'react/react-in-jsx-scope': 'off',
			'no-console': 'warn',
		},
	},
	{
		ignores: ['dist/', 'node_modules/', 'coverage/'],
	},
];

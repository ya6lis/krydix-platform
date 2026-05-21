import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@/constants/constants';

import enCommon from './locales/en/common.json';
import ukCommon from './locales/uk/common.json';

export const resources = {
	en: { common: enCommon },
	uk: { common: ukCommon },
} as const;

i18n.use(initReactI18next).init({
	resources,
	lng: localStorage.getItem('krydix_lang') ?? DEFAULT_LANGUAGE,
	fallbackLng: 'en',
	supportedLngs: SUPPORTED_LANGUAGES,
	defaultNS: 'common',
	interpolation: { escapeValue: false },
});

export default i18n;

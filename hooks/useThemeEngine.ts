import { useEffect } from 'react';
import { voiceService } from '../services/voiceService';

interface ThemeSettings {
    theme: string;
    highContrast: boolean;
    fontScale: number;
    reducedMotion: boolean;
    darkMode: boolean;
    voiceEnabled: boolean;
    locale: string;
}

/**
 * Custom hook to apply theme and accessibility settings to the document.
 * This "humanizes" the theme logic by centralizing side effects.
 */
export function useThemeEngine({
    theme,
    highContrast,
    fontScale,
    reducedMotion,
    darkMode,
    voiceEnabled,
    locale
}: ThemeSettings) {
    useEffect(() => {
        // Apply core theme attribute
        document.documentElement.setAttribute('data-theme', theme);

        // Apply accessibility attributes
        document.documentElement.setAttribute('data-high-contrast', highContrast ? '1' : '0');
        document.documentElement.setAttribute('data-reduced-motion', reducedMotion ? '1' : '0');
        document.documentElement.setAttribute('data-dark-mode', darkMode ? '1' : '0');

        // Update document language for screen readers
        document.documentElement.lang = locale;

        // Apply font scaling
        document.documentElement.style.setProperty('--font-scale', String(fontScale));
        document.body.style.fontSize = `${fontScale}rem`;

        // Handle motion reduction
        if (reducedMotion) {
            document.documentElement.style.setProperty('--animation-duration', '0s');
        } else {
            document.documentElement.style.removeProperty('--animation-duration');
        }

        // Voice service sync
        voiceService.setTTSEnabled(voiceEnabled);

    }, [theme, highContrast, fontScale, reducedMotion, darkMode, voiceEnabled, locale]);
}

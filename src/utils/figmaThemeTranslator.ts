import { FigmaThemeData } from '@/services/figmaService';
import { ThemeConfig, ThemeVariant } from '@/contexts/ThemeContext';

export class FigmaThemeTranslator {
  static translateToFigmaTheme(figmaData: FigmaThemeData): ThemeConfig {
    const themeId = this.generateThemeId(figmaData.name);
    
    return {
      id: themeId as ThemeVariant,
      name: figmaData.name,
      description: `Theme imported from Figma: ${figmaData.name}`,
      colors: this.translateColors(figmaData.colors),
      typography: this.translateTypography(figmaData.typography),
      spacing: this.translateSpacing(figmaData.spacing),
      borderRadius: this.generateBorderRadius(),
      shadows: this.translateEffects(figmaData.effects),
      animations: this.generateAnimations()
    };
  }

  private static generateThemeId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-(\w)/g, (_, char) => char.toUpperCase());
  }

  private static translateColors(figmaColors: Record<string, string>): ThemeConfig['colors'] {
    const defaultColors = {
      primary: 'hsl(224 71% 25%)',
      secondary: 'hsl(220 14% 96%)',
      accent: 'hsl(12 95% 62%)',
      background: 'hsl(220 25% 97%)',
      foreground: 'hsl(222 47% 11%)',
      muted: 'hsl(220 14% 96%)',
      border: 'hsl(220 13% 91%)',
      card: 'hsl(0 0% 100%)',
      sidebar: 'hsl(224 71% 20%)'
    };

    // Map Figma color names to theme color names
    const colorMapping: Record<string, keyof ThemeConfig['colors']> = {
      'primary': 'primary',
      'secondary': 'secondary',
      'accent': 'accent',
      'background': 'background',
      'foreground': 'foreground',
      'text': 'foreground',
      'muted': 'muted',
      'border': 'border',
      'card': 'card',
      'sidebar': 'sidebar',
      'surface': 'card',
      'main': 'primary',
      'highlight': 'accent'
    };

    const translatedColors = { ...defaultColors };

    Object.entries(figmaColors).forEach(([figmaName, color]) => {
      const themeColorName = colorMapping[figmaName.toLowerCase()];
      if (themeColorName) {
        translatedColors[themeColorName] = color;
      }
    });

    return translatedColors;
  }

  private static translateTypography(figmaTypography: FigmaThemeData['typography']): ThemeConfig['typography'] {
    return {
      fontFamily: figmaTypography.fontFamily || "'Inter', system-ui, sans-serif",
      headingFont: figmaTypography.headingFont || "'Space Grotesk', system-ui, sans-serif",
      scale: figmaTypography.scale || 1
    };
  }

  private static translateSpacing(figmaSpacing: Record<string, string>): ThemeConfig['spacing'] {
    const defaultSpacing = {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem'
    };

    const spacingMapping: Record<string, keyof ThemeConfig['spacing']> = {
      'xs': 'xs',
      'extra-small': 'xs',
      'sm': 'sm',
      'small': 'sm',
      'md': 'md',
      'medium': 'md',
      'lg': 'lg',
      'large': 'lg',
      'xl': 'xl',
      'extra-large': 'xl'
    };

    const translatedSpacing = { ...defaultSpacing };

    Object.entries(figmaSpacing).forEach(([figmaName, spacing]) => {
      const themeSpacingName = spacingMapping[figmaName.toLowerCase()];
      if (themeSpacingName) {
        translatedSpacing[themeSpacingName] = spacing;
      }
    });

    return translatedSpacing;
  }

  private static generateBorderRadius(): ThemeConfig['borderRadius'] {
    return {
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
      full: '9999px'
    };
  }

  private static translateEffects(figmaEffects: Record<string, any>): ThemeConfig['shadows'] {
    const defaultShadows = {
      sm: '0 1px 2px 0 hsl(220 13% 91% / 0.4)',
      md: '0 4px 6px -1px hsl(220 13% 91% / 0.4), 0 2px 4px -2px hsl(220 13% 91% / 0.3)',
      lg: '0 10px 15px -3px hsl(220 13% 91% / 0.5), 0 4px 6px -4px hsl(220 13% 91% / 0.3)',
      glow: '0 0 20px hsl(12 95% 62% / 0.3)'
    };

    const shadowMapping: Record<string, keyof ThemeConfig['shadows']> = {
      'shadow-sm': 'sm',
      'shadow-small': 'sm',
      'shadow-md': 'md',
      'shadow-medium': 'md',
      'shadow-lg': 'lg',
      'shadow-large': 'lg',
      'shadow-glow': 'glow',
      'glow': 'glow',
      'drop-shadow': 'md'
    };

    const translatedShadows = { ...defaultShadows };

    Object.entries(figmaEffects).forEach(([figmaName, effect]) => {
      const themeShadowName = shadowMapping[figmaName.toLowerCase()];
      if (themeShadowName && effect.value) {
        translatedShadows[themeShadowName] = effect.value;
      }
    });

    return translatedShadows;
  }

  private static generateAnimations(): ThemeConfig['animations'] {
    return {
      duration: '0.3s',
      easing: 'cubic-bezier(0.4, 0, 0.6, 1)',
      reduced: false
    };
  }

  static validateTheme(theme: ThemeConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required color properties
    const requiredColors = ['primary', 'secondary', 'accent', 'background', 'foreground'];
    requiredColors.forEach(color => {
      if (!theme.colors[color as keyof ThemeConfig['colors']]) {
        errors.push(`Missing required color: ${color}`);
      }
    });

    // Validate typography
    if (!theme.typography.fontFamily) {
      errors.push('Missing font family');
    }

    if (!theme.typography.headingFont) {
      errors.push('Missing heading font');
    }

    // Validate spacing
    const requiredSpacing = ['xs', 'sm', 'md', 'lg', 'xl'];
    requiredSpacing.forEach(spacing => {
      if (!theme.spacing[spacing as keyof ThemeConfig['spacing']]) {
        errors.push(`Missing required spacing: ${spacing}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static generateThemePreview(theme: ThemeConfig): {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  } {
    return {
      primary: theme.colors.primary,
      secondary: theme.colors.secondary,
      accent: theme.colors.accent,
      background: theme.colors.background
    };
  }
}

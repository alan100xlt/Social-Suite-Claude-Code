import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeVariant = 'professional' | 'modern' | 'minimal' | 'vibrant' | 'dark-pro' | 'aurora';

export interface ThemeConfig {
  id: ThemeVariant;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    border: string;
    card: string;
    sidebar: string;
  };
  typography: {
    fontFamily: string;
    headingFont: string;
    scale: number;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    glow: string;
  };
  animations: {
    duration: string;
    easing: string;
    reduced: boolean;
  };
}

// Predefined theme configurations
export const themeVariants: Record<ThemeVariant, ThemeConfig> = {
  professional: {
    id: 'professional',
    name: 'Professional Navy',
    description: 'Current production theme with deep navy colors and professional appearance',
    colors: {
      primary: 'hsl(224 71% 25%)',
      secondary: 'hsl(220 14% 96%)',
      accent: 'hsl(12 95% 62%)',
      background: 'hsl(220 25% 97%)',
      foreground: 'hsl(222 47% 11%)',
      muted: 'hsl(220 14% 96%)',
      border: 'hsl(220 13% 91%)',
      card: 'hsl(0 0% 100%)',
      sidebar: 'hsl(224 71% 20%)'
    },
    typography: {
      fontFamily: "'Inter', system-ui, sans-serif",
      headingFont: "'Space Grotesk', system-ui, sans-serif",
      scale: 1
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem'
    },
    borderRadius: {
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
      full: '9999px'
    },
    shadows: {
      sm: '0 1px 2px 0 hsl(220 13% 91% / 0.4)',
      md: '0 4px 6px -1px hsl(220 13% 91% / 0.4), 0 2px 4px -2px hsl(220 13% 91% / 0.3)',
      lg: '0 10px 15px -3px hsl(220 13% 91% / 0.5), 0 4px 6px -4px hsl(220 13% 91% / 0.3)',
      glow: '0 0 20px hsl(12 95% 62% / 0.3)'
    },
    animations: {
      duration: '0.3s',
      easing: 'cubic-bezier(0.4, 0, 0.6, 1)',
      reduced: false
    }
  },
  modern: {
    id: 'modern',
    name: 'Modern Gradient',
    description: 'Contemporary theme with gradients, rounded corners, and vibrant accents',
    colors: {
      primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      secondary: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      accent: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      foreground: '#2d3748',
      muted: 'rgba(45, 55, 72, 0.1)',
      border: 'rgba(45, 55, 72, 0.2)',
      card: 'rgba(255, 255, 255, 0.9)',
      sidebar: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)'
    },
    typography: {
      fontFamily: "'Inter', system-ui, sans-serif",
      headingFont: "'Poppins', system-ui, sans-serif",
      scale: 1.05
    },
    spacing: {
      xs: '0.375rem',
      sm: '0.75rem',
      md: '1.25rem',
      lg: '2rem',
      xl: '3rem'
    },
    borderRadius: {
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      full: '9999px'
    },
    shadows: {
      sm: '0 2px 8px rgba(102, 126, 234, 0.1)',
      md: '0 4px 16px rgba(102, 126, 234, 0.15)',
      lg: '0 8px 32px rgba(102, 126, 234, 0.2)',
      glow: '0 0 32px rgba(79, 172, 254, 0.4)'
    },
    animations: {
      duration: '0.4s',
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      reduced: false
    }
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal Light',
    description: 'Clean, minimal design with subtle colors and maximum whitespace',
    colors: {
      primary: '#000000',
      secondary: '#f8f9fa',
      accent: '#007bff',
      background: '#ffffff',
      foreground: '#212529',
      muted: '#6c757d',
      border: '#dee2e6',
      card: '#ffffff',
      sidebar: '#f8f9fa'
    },
    typography: {
      fontFamily: "'Inter', system-ui, sans-serif",
      headingFont: "'Inter', system-ui, sans-serif",
      scale: 0.95
    },
    spacing: {
      xs: '0.125rem',
      sm: '0.25rem',
      md: '0.5rem',
      lg: '1rem',
      xl: '1.5rem'
    },
    borderRadius: {
      sm: '0.125rem',
      md: '0.25rem',
      lg: '0.375rem',
      full: '4px'
    },
    shadows: {
      sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
      md: '0 2px 6px rgba(0, 0, 0, 0.1)',
      lg: '0 4px 12px rgba(0, 0, 0, 0.1)',
      glow: '0 0 16px rgba(0, 123, 255, 0.2)'
    },
    animations: {
      duration: '0.2s',
      easing: 'ease-out',
      reduced: true
    }
  },
  vibrant: {
    id: 'vibrant',
    name: 'Vibrant Colors',
    description: 'Bold, colorful theme with high contrast and energetic feel',
    colors: {
      primary: '#ff6b6b',
      secondary: '#4ecdc4',
      accent: '#45b7d1',
      background: '#f7f3e9',
      foreground: '#2d3436',
      muted: '#95a5a6',
      border: '#dfe6e9',
      card: '#ffffff',
      sidebar: '#ff6b6b'
    },
    typography: {
      fontFamily: "'Inter', system-ui, sans-serif',
      headingFont: "'Montserrat', system-ui, sans-serif",
      scale: 1.1
    },
    spacing: {
      xs: '0.5rem',
      sm: '1rem',
      md: '1.5rem',
      lg: '2.5rem',
      xl: '4rem'
    },
    borderRadius: {
      sm: '0.75rem',
      md: '1.25rem',
      lg: '2rem',
      full: '9999px'
    },
    shadows: {
      sm: '0 2px 8px rgba(255, 107, 107, 0.3)',
      md: '0 4px 16px rgba(255, 107, 107, 0.4)',
      lg: '0 8px 32px rgba(255, 107, 107, 0.5)',
      glow: '0 0 24px rgba(69, 183, 209, 0.6)'
    },
    animations: {
      duration: '0.5s',
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      reduced: false
    }
  },
  'dark-pro': {
    id: 'dark-pro',
    name: 'Dark Pro',
    description: 'Professional dark theme with high contrast and modern aesthetics',
    colors: {
      primary: '#8b5cf6',
      secondary: '#1e293b',
      accent: '#06b6d4',
      background: '#0f172a',
      foreground: '#f1f5f9',
      muted: '#64748b',
      border: '#334155',
      card: '#1e293b',
      sidebar: '#0f172a'
    },
    typography: {
      fontFamily: "'Inter', system-ui, sans-serif",
      headingFont: "'Space Grotesk', system-ui, sans-serif",
      scale: 1
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem'
    },
    borderRadius: {
      sm: '0.375rem',
      md: '0.75rem',
      lg: '1.125rem',
      full: '9999px'
    },
    shadows: {
      sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
      md: '0 4px 6px rgba(0, 0, 0, 0.4)',
      lg: '0 10px 15px rgba(0, 0, 0, 0.5)',
      glow: '0 0 20px rgba(139, 92, 246, 0.4)'
    },
    animations: {
      duration: '0.3s',
      easing: 'cubic-bezier(0.4, 0, 0.6, 1)',
      reduced: false
    }
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora Borealis',
    description: 'Ethereal theme with northern lights inspired gradients and glass morphism',
    colors: {
      primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
      secondary: 'rgba(255, 255, 255, 0.1)',
      accent: 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 50%, #45b7d1 100%)',
      background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      foreground: '#ffffff',
      muted: 'rgba(255, 255, 255, 0.6)',
      border: 'rgba(255, 255, 255, 0.2)',
      card: 'rgba(255, 255, 255, 0.05)',
      sidebar: 'linear-gradient(180deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
    },
    typography: {
      fontFamily: "'Inter', system-ui, sans-serif",
      headingFont: "'Poppins', system-ui, sans-serif",
      scale: 1.05
    },
    spacing: {
      xs: '0.375rem',
      sm: '0.75rem',
      md: '1.25rem',
      lg: '2rem',
      xl: '3rem'
    },
    borderRadius: {
      sm: '0.75rem',
      md: '1.25rem',
      lg: '1.875rem',
      full: '9999px'
    },
    shadows: {
      sm: '0 4px 20px rgba(102, 126, 234, 0.15)',
      md: '0 8px 32px rgba(102, 126, 234, 0.25)',
      lg: '0 16px 64px rgba(102, 126, 234, 0.35)',
      glow: '0 0 40px rgba(79, 172, 254, 0.6), 0 0 80px rgba(240, 147, 251, 0.4)'
    },
    animations: {
      duration: '0.6s',
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      reduced: false
    }
  }
};

interface ThemeContextType {
  currentTheme: ThemeVariant;
  themeConfig: ThemeConfig;
  setTheme: (theme: ThemeVariant) => void;
  toggleTheme: () => void;
  resetToDefault: () => void;
  availableThemes: ThemeConfig[];
  isPreviewMode: boolean;
  setPreviewMode: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeVariant;
}

export function ThemeProvider({ children, defaultTheme = 'professional' }: ThemeProviderProps) {
  const [currentTheme, setCurrentTheme] = useState<ThemeVariant>(defaultTheme);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<ThemeVariant | null>(null);

  // Load saved theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('social-suite-theme') as ThemeVariant;
    if (savedTheme && themeVariants[savedTheme]) {
      setCurrentTheme(savedTheme);
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    const activeTheme = isPreviewMode && previewTheme ? previewTheme : currentTheme;
    const theme = themeVariants[activeTheme];
    
    // Apply CSS custom properties
    const root = document.documentElement;
    
    // Apply colors
    Object.entries(theme.colors).forEach(([key, value]) => {
      if (key === 'primary' && value.includes('gradient')) {
        root.style.setProperty(`--theme-${key}`, value);
        root.style.setProperty(`--theme-${key}-rgb`, '102, 126, 234');
      } else if (value.startsWith('#')) {
        root.style.setProperty(`--theme-${key}`, value);
        // Convert hex to RGB for opacity usage
        const hex = value.slice(1);
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        root.style.setProperty(`--theme-${key}-rgb`, `${r}, ${g}, ${b}`);
      } else {
        root.style.setProperty(`--theme-${key}`, value);
      }
    });

    // Apply typography
    root.style.setProperty('--theme-font-family', theme.typography.fontFamily);
    root.style.setProperty('--theme-heading-font', theme.typography.headingFont);
    root.style.setProperty('--theme-font-scale', theme.typography.scale.toString());

    // Apply spacing
    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--theme-spacing-${key}`, value);
    });

    // Apply border radius
    Object.entries(theme.borderRadius).forEach(([key, value]) => {
      root.style.setProperty(`--theme-radius-${key}`, value);
    });

    // Apply shadows
    Object.entries(theme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--theme-shadow-${key}`, value);
    });

    // Apply animations
    root.style.setProperty('--theme-animation-duration', theme.animations.duration);
    root.style.setProperty('--theme-animation-easing', theme.animations.easing);
    root.style.setProperty('--theme-reduced-motion', theme.animations.reduced ? '1' : '0');

    // Apply theme class to body
    document.body.className = `theme-${activeTheme}`;
    
    // Save to localStorage (only if not in preview mode)
    if (!isPreviewMode) {
      localStorage.setItem('social-suite-theme', activeTheme);
    }
  }, [currentTheme, isPreviewMode, previewTheme]);

  const setTheme = (theme: ThemeVariant) => {
    setCurrentTheme(theme);
  };

  const toggleTheme = () => {
    const themes = Object.keys(themeVariants) as ThemeVariant[];
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setCurrentTheme(themes[nextIndex]);
  };

  const resetToDefault = () => {
    setCurrentTheme(defaultTheme);
    setIsPreviewMode(false);
    setPreviewTheme(null);
  };

  const setPreviewMode = (enabled: boolean) => {
    setIsPreviewMode(enabled);
    if (!enabled) {
      setPreviewTheme(null);
    }
  };

  const value: ThemeContextType = {
    currentTheme,
    themeConfig: themeVariants[currentTheme],
    setTheme,
    toggleTheme,
    resetToDefault,
    availableThemes: Object.values(themeVariants),
    isPreviewMode,
    setPreviewMode
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export { ThemeContext };

import { Client, FileResponse, StyleResponse } from 'figma-js';
import axios from 'axios';

export interface FigmaThemeData {
  name: string;
  colors: Record<string, string>;
  typography: {
    fontFamily: string;
    headingFont: string;
    scale: number;
  };
  spacing: Record<string, string>;
  effects: Record<string, any>;
}

export class FigmaService {
  private client: any;
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    this.client = Client({
      personalAccessToken: accessToken
    });
  }

  async getFile(fileId: string): Promise<FileResponse> {
    try {
      const response = await this.client.file(fileId);
      return response.data;
    } catch (error) {
      console.error('Error fetching Figma file:', error);
      throw error;
    }
  }

  async getStyles(fileId: string): Promise<StyleResponse> {
    try {
      const response = await this.client.fileStyles(fileId);
      return response.data;
    } catch (error) {
      console.error('Error fetching Figma styles:', error);
      throw error;
    }
  }

  async extractThemeData(fileId: string): Promise<FigmaThemeData> {
    try {
      const [file, styles] = await Promise.all([
        this.getFile(fileId),
        this.getStyles(fileId)
      ]);

      const themeData: FigmaThemeData = {
        name: file.name || 'Figma Theme',
        colors: this.extractColors(styles),
        typography: this.extractTypography(styles),
        spacing: this.extractSpacing(file),
        effects: this.extractEffects(styles)
      };

      return themeData;
    } catch (error) {
      console.error('Error extracting theme data:', error);
      throw error;
    }
  }

  private extractColors(styles: any): Record<string, string> {
    const colors: Record<string, string> = {};
    
    if (styles.meta?.styles) {
      Object.entries(styles.meta.styles).forEach(([key, style]: [string, any]) => {
        if (style.style_type === 'FILL') {
          const styleName = this.normalizeStyleName(style.name);
          if (style.style_type === 'FILL' && style.description) {
            // Extract color from style description or compute from fills
            colors[styleName] = this.extractColorFromStyle(style);
          }
        }
      });
    }

    return colors;
  }

  private extractTypography(styles: any): { fontFamily: string; headingFont: string; scale: number } {
    const typography: { fontFamily: string; headingFont: string; scale: number } = {
      fontFamily: 'Inter, system-ui, sans-serif',
      headingFont: 'Inter, system-ui, sans-serif',
      scale: 1
    };

    if (styles.meta?.styles) {
      Object.entries(styles.meta.styles).forEach(([key, style]: [string, any]) => {
        if (style.style_type === 'TEXT') {
          const styleName = this.normalizeStyleName(style.name);
          
          if (styleName.includes('heading') || styleName.includes('title')) {
            // Extract heading font information
            typography.headingFont = this.extractFontFromStyle(style);
          } else if (styleName.includes('body') || styleName.includes('paragraph')) {
            // Extract body font information
            typography.fontFamily = this.extractFontFromStyle(style);
          }
        }
      });
    }

    return typography;
  }

  private extractSpacing(file: any): Record<string, string> {
    const spacing: Record<string, string> = {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem'
    };

    // Extract spacing from layout grids and component dimensions
    if (file.document.children) {
      file.document.children.forEach((page: any) => {
        if (page.children) {
          page.children.forEach((node: any) => {
            if (node.type === 'FRAME' && node.layoutMode === 'VERTICAL') {
              // Extract item spacing from auto-layout frames
              if (node.itemSpacing && node.name.toLowerCase().includes('spacing')) {
                const spacingValue = `${node.itemSpacing / 16}rem`;
                const spacingName = this.normalizeStyleName(node.name);
                spacing[spacingName] = spacingValue;
              }
            }
          });
        }
      });
    }

    return spacing;
  }

  private extractEffects(styles: any): Record<string, any> {
    const effects: Record<string, any> = {};

    if (styles.meta?.styles) {
      Object.entries(styles.meta.styles).forEach(([key, style]: [string, any]) => {
        if (style.style_type === 'EFFECT') {
          const styleName = this.normalizeStyleName(style.name);
          effects[styleName] = this.extractEffectFromStyle(style);
        }
      });
    }

    return effects;
  }

  private normalizeStyleName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-(\w)/g, (_, char) => char.toUpperCase());
  }

  private extractColorFromStyle(style: any): string {
    // This is a simplified version - in practice you'd need to fetch style details
    // and extract actual color values from fills
    return `hsl(${Math.random() * 360}, 70%, 50%)`; // Placeholder
  }

  private extractFontFromStyle(style: any): string {
    // This is a simplified version - in practice you'd fetch style details
    return 'Inter, system-ui, sans-serif'; // Placeholder
  }

  private extractEffectFromStyle(style: any): any {
    // This is a simplified version - in practice you'd fetch style details
    return {
      type: 'shadow',
      value: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }; // Placeholder
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.me();
      return !!response.data;
    } catch (error) {
      console.error('Figma API connection failed:', error);
      return false;
    }
  }
}

export const figmaService = new FigmaService(import.meta.env.VITE_FIGMA_ACCESS_TOKEN || '');

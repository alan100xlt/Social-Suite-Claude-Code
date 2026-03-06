/** Input data passed to every OG template renderer */
export interface TemplateInput {
  title: string;
  description?: string;
  author?: string;
  imageBase64?: string;
  sourceName?: string;
  publishedAt?: string;
  brandColor?: string;
  brandColorSecondary?: string;
  logoBase64?: string;
  logoDarkBase64?: string;
  categoryTag?: string;
  stats?: Array<{ label: string; value: string; change?: string }>;
  visibility: OgVisibilitySettings;
  fontOverride?: OgFontOverride;
}

export interface OgFontOverride {
  fontFamily: 'sans' | 'serif' | 'mono';
  fontFamilyTitle?: 'sans' | 'serif' | 'mono';
}

export interface OgVisibilitySettings {
  showTitle: boolean;
  showDescription: boolean;
  showAuthor: boolean;
  showDate: boolean;
  showLogo: boolean;
  showCategoryTag: boolean;
  showSourceName: boolean;
}

export const DEFAULT_VISIBILITY: OgVisibilitySettings = {
  showTitle: true,
  showDescription: true,
  showAuthor: false,
  showDate: false,
  showLogo: true,
  showCategoryTag: false,
  showSourceName: true,
};

export type LayoutArchetype =
  | 'fullbleed' | 'split-lr' | 'split-tb' | 'centered'
  | 'text-forward' | 'card' | 'banner' | 'special';

export type OverlayType =
  | 'dark-gradient-bottom' | 'dark-gradient-top' | 'dark-gradient-radial'
  | 'solid-dim' | 'brand-duotone' | 'brand-tint' | 'vignette' | 'blur';

export type ImagePosition =
  | 'fullbleed' | 'left-panel' | 'right-panel'
  | 'top-panel' | 'bottom-panel' | 'framed';

export type LogoPosition =
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center-top';

export type BrandColorSlot =
  | 'background' | 'gradient-start' | 'gradient-end' | 'overlay'
  | 'accent-bar' | 'accent-dot' | 'badge-bg' | 'source-text'
  | 'stat-number' | 'quote-mark' | 'highlight-bg' | 'divider'
  | 'card-border' | 'banner-bg' | 'category-badge';

export type SourceNameStyle =
  | 'badge' | 'uppercase-label' | 'subtle-text'
  | 'monospace-path' | 'inline-banner' | 'none';

export interface TemplateConfig {
  id: string;
  name: string;
  category: 'photo' | 'gradient' | 'news' | 'stats' | 'editorial' | 'brand';
  tags: string[];
  requiresImage: boolean;

  layout: {
    archetype: LayoutArchetype;
    splitRatio?: [number, number];
    padding: number | [number, number, number, number];
    theme: 'dark' | 'light';
  };

  background: {
    type: 'solid' | 'linear-gradient' | 'radial-gradient' | 'image-fullbleed';
    colors: string[];
    gradientAngle?: number;
  };

  image?: {
    position: ImagePosition;
    panelPercent?: number;
    overlay?: { type: OverlayType; opacity?: number };
    filter?: string;
    borderRadius?: number;
    edgeBlend?: { side: 'left' | 'right' | 'top' | 'bottom'; width: number };
  };

  title: {
    fontSize: number;
    fontWeight: number;
    fontFamily?: 'sans' | 'serif' | 'mono';
    color: string;
    alignment: 'left' | 'center' | 'right';
    verticalAlign: 'top' | 'center' | 'bottom';
    lineHeight: number;
    maxLines: number;
    textShadow?: string;
    treatment?: 'plain' | 'highlight-segments' | 'gradient-text';
  };

  description?: {
    fontSize: number;
    fontWeight: number;
    color: string;
    lineHeight: number;
    maxLines: number;
    marginTop: number;
  };

  sourceName: {
    style: SourceNameStyle;
    position: 'above-title' | 'below-title' | 'top-left' | 'top-right' | 'bottom-bar';
    fontSize: number;
    fontWeight: number;
    color: string;
    letterSpacing?: number;
    textTransform?: 'uppercase' | 'none';
    badgeBg?: string;
  };

  author?: {
    position: 'below-title' | 'above-title' | 'bottom-left' | 'bottom-right' | 'below-description';
    fontSize: number;
    fontWeight: number;
    color: string;
    prefix?: string;
    letterSpacing?: number;
    textTransform?: 'uppercase' | 'none';
  };

  date?: {
    position: 'below-title' | 'below-author' | 'top-right' | 'bottom-bar' | 'inline-with-author';
    fontSize: number;
    fontWeight: number;
    color: string;
    format: 'relative' | 'short' | 'long' | 'calendar-block';
  };

  categoryTag?: {
    position: 'above-title' | 'top-left' | 'top-right' | 'inline-banner';
    fontSize: number;
    fontWeight: number;
    color: string;
    backgroundColor?: string;
    borderRadius?: number;
    padding?: string;
    textTransform?: 'uppercase' | 'none';
  };

  logo: {
    position: LogoPosition;
    maxHeight: number;
    margin: number;
    background?: 'none' | 'white-pill' | 'dark-pill' | 'frosted';
  };

  brandColorSlots: BrandColorSlot[];

  decorations: Array<{
    type: string;
    position: string;
    width?: number;
    height?: number;
    color?: string;
    borderRadius?: number;
    opacity?: number;
    gradient?: string;
    boxShadow?: string;
    condition?: string;
  }>;

  card?: {
    backgroundColor: string;
    borderRadius: number;
    border?: string;
    padding: number;
    gradientBorder?: { colors: string[]; angle: number; width: number };
    backdropFilter?: string;
    maxWidth?: number;
  };

  staticLabels?: Array<{
    text: string;
    position: string;
    fontSize: number;
    fontWeight: number;
    color: string;
    backgroundColor?: string;
    textTransform?: 'uppercase' | 'none';
  }>;

  behavior?: {
    detectBreaking?: boolean;
    showDate?: boolean;
    monospaceMeta?: boolean;
    categoryColorCoded?: boolean;
  };
}

/** Legacy render-function-based config -- DEPRECATED, use TemplateConfig */
export interface LegacyTemplateConfig {
  id: string;
  name: string;
  category: TemplateConfig['category'];
  requiresImage: boolean;
  render: (input: TemplateInput) => any;
}

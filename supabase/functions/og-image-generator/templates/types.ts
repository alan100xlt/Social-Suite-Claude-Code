/** Input data passed to every OG template renderer */
export interface TemplateInput {
  title: string;
  description?: string;
  imageBase64?: string;       // pre-fetched base64 data URI
  sourceName?: string;        // feed / publication name
  publishedAt?: string;       // ISO date string
  brandColor?: string;        // company accent color (hex)
}

/** Category of OG template */
export type TemplateCategory = 'photo' | 'gradient' | 'news' | 'stats' | 'editorial' | 'brand';

/** Configuration for a single OG template */
export interface TemplateConfig {
  id: string;
  name: string;
  category: TemplateCategory;
  requiresImage: boolean;     // AI won't pick this if no image available
  render: (input: TemplateInput) => any;  // Returns Satori-compatible JSX
}

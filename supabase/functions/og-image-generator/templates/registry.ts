import type { TemplateConfig, TemplateCategory } from './types.ts';

// Photo templates
import photoHero from './photo-hero.tsx';
import photoGlass from './photo-glass.tsx';
import photoCaption from './photo-caption.tsx';
import photoSplit from './photo-split.tsx';
import photoDuotone from './photo-duotone.tsx';
import photoFrame from './photo-frame.tsx';
import photoSidebar from './photo-sidebar.tsx';

// Gradient templates
import gradientClean from './gradient-clean.tsx';
import gradientModern from './gradient-modern.tsx';
import gradientBold from './gradient-bold.tsx';
import gradientMinimal from './gradient-minimal.tsx';
import gradientGlass from './gradient-glass.tsx';
import gradientStartup from './gradient-startup.tsx';

// News templates
import newsBanner from './news-banner.tsx';
import newsPhotoBanner from './news-photo-banner.tsx';
import newsTicker from './news-ticker.tsx';

// Stats templates
import statsBars from './stats-bars.tsx';
import statsCard from './stats-card.tsx';
import statsGrid from './stats-grid.tsx';

// Editorial templates
import quoteClassic from './quote-classic.tsx';
import quoteHighlight from './quote-highlight.tsx';
import editorialMagazine from './editorial-magazine.tsx';
import photoQuote from './photo-quote.tsx';

// Brand templates
import brandMinimal from './brand-minimal.tsx';
import brandAnnounce from './brand-announce.tsx';
import brandCode from './brand-code.tsx';
import brandEvent from './brand-event.tsx';

const allTemplates: TemplateConfig[] = [
  photoHero, photoGlass, photoCaption, photoSplit, photoDuotone, photoFrame, photoSidebar,
  gradientClean, gradientModern, gradientBold, gradientMinimal, gradientGlass, gradientStartup,
  newsBanner, newsPhotoBanner, newsTicker,
  statsBars, statsCard, statsGrid,
  quoteClassic, quoteHighlight, editorialMagazine, photoQuote,
  brandMinimal, brandAnnounce, brandCode, brandEvent,
];

const templateMap = new Map<string, TemplateConfig>();
for (const t of allTemplates) {
  templateMap.set(t.id, t);
}

export function getTemplate(id: string): TemplateConfig | undefined {
  return templateMap.get(id);
}

export function getAllTemplates(): TemplateConfig[] {
  return allTemplates;
}

export function getTemplatesByCategory(category: TemplateCategory): TemplateConfig[] {
  return allTemplates.filter(t => t.category === category);
}

export function getAvailableTemplates(hasImage: boolean): TemplateConfig[] {
  return allTemplates.filter(t => !t.requiresImage || hasImage);
}

/** Fallback template selection when AI is unavailable */
export function fallbackTemplateId(title: string, hasImage: boolean): string {
  const lower = title.toLowerCase();
  const hasNumbers = /\d+%|\d+\.\d|\$\d/.test(title);
  const isUrgent = /breaking|urgent|alert|just in|developing/i.test(lower);

  if (hasImage && isUrgent) return 'news-photo-banner';
  if (hasImage) return 'photo-hero';
  if (isUrgent) return 'news-banner';
  if (hasNumbers) return 'stats-card';
  return 'gradient-clean';
}

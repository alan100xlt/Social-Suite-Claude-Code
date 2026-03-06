import type { TemplateConfig } from './types.ts';
export { renderFromConfig } from './renderer.ts';

// Brand configs
import brandAnnounce from './configs/brand/brand-announce.ts';
import brandCode from './configs/brand/brand-code.ts';
import brandEvent from './configs/brand/brand-event.ts';
import brandLaunch from './configs/brand/brand-launch.ts';
import brandMilestone from './configs/brand/brand-milestone.ts';
import brandMinimal from './configs/brand/brand-minimal.ts';
import brandProduct from './configs/brand/brand-product.ts';
import brandSpotlight from './configs/brand/brand-spotlight.ts';
import brandStatement from './configs/brand/brand-statement.ts';
import brandStory from './configs/brand/brand-story.ts';
import brandUpdate from './configs/brand/brand-update.ts';

// Editorial configs
import editorialAnalysis from './configs/editorial/editorial-analysis.ts';
import editorialColumn from './configs/editorial/editorial-column.ts';
import editorialEssay from './configs/editorial/editorial-essay.ts';
import editorialFeature from './configs/editorial/editorial-feature.ts';
import editorialInterview from './configs/editorial/editorial-interview.ts';
import editorialLetter from './configs/editorial/editorial-letter.ts';
import editorialLongform from './configs/editorial/editorial-longform.ts';
import editorialMagazine from './configs/editorial/editorial-magazine.ts';
import editorialOpinion from './configs/editorial/editorial-opinion.ts';
import editorialProfile from './configs/editorial/editorial-profile.ts';
import editorialReview from './configs/editorial/editorial-review.ts';
import photoQuote from './configs/editorial/photo-quote.ts';
import quoteClassic from './configs/editorial/quote-classic.ts';
import quoteHighlight from './configs/editorial/quote-highlight.ts';

// Gradient configs
import gradientAurora from './configs/gradient/gradient-aurora.ts';
import gradientBold from './configs/gradient/gradient-bold.ts';
import gradientClean from './configs/gradient/gradient-clean.ts';
import gradientCool from './configs/gradient/gradient-cool.ts';
import gradientCoral from './configs/gradient/gradient-coral.ts';
import gradientDawn from './configs/gradient/gradient-dawn.ts';
import gradientElectric from './configs/gradient/gradient-electric.ts';
import gradientEmber from './configs/gradient/gradient-ember.ts';
import gradientForest from './configs/gradient/gradient-forest.ts';
import gradientGlass from './configs/gradient/gradient-glass.ts';
import gradientMidnight from './configs/gradient/gradient-midnight.ts';
import gradientMinimal from './configs/gradient/gradient-minimal.ts';
import gradientModern from './configs/gradient/gradient-modern.ts';
import gradientNeon from './configs/gradient/gradient-neon.ts';
import gradientOcean from './configs/gradient/gradient-ocean.ts';
import gradientPastel from './configs/gradient/gradient-pastel.ts';
import gradientRoyal from './configs/gradient/gradient-royal.ts';
import gradientStartup from './configs/gradient/gradient-startup.ts';
import gradientSunset from './configs/gradient/gradient-sunset.ts';
import gradientWarm from './configs/gradient/gradient-warm.ts';

// News configs
import newsAlert from './configs/news/news-alert.ts';
import newsBanner from './configs/news/news-banner.ts';
import newsBulletin from './configs/news/news-bulletin.ts';
import newsColumn from './configs/news/news-column.ts';
import newsDigest from './configs/news/news-digest.ts';
import newsExclusive from './configs/news/news-exclusive.ts';
import newsFlash from './configs/news/news-flash.ts';
import newsFrontpage from './configs/news/news-frontpage.ts';
import newsHeadline from './configs/news/news-headline.ts';
import newsLive from './configs/news/news-live.ts';
import newsPhotoBanner from './configs/news/news-photo-banner.ts';
import newsSpecial from './configs/news/news-special.ts';
import newsTicker from './configs/news/news-ticker.ts';
import newsUpdate from './configs/news/news-update.ts';
import newsWire from './configs/news/news-wire.ts';

// Photo configs
import photoBanner from './configs/photo/photo-banner.ts';
import photoBlurBg from './configs/photo/photo-blur-bg.ts';
import photoBrandTint from './configs/photo/photo-brand-tint.ts';
import photoCaption from './configs/photo/photo-caption.ts';
import photoCinematic from './configs/photo/photo-cinematic.ts';
import photoCornerCard from './configs/photo/photo-corner-card.ts';
import photoDarkLuxe from './configs/photo/photo-dark-luxe.ts';
import photoDuotone from './configs/photo/photo-duotone.ts';
import photoEditorial from './configs/photo/photo-editorial.ts';
import photoFeature from './configs/photo/photo-feature.ts';
import photoFrame from './configs/photo/photo-frame.ts';
import photoGlass from './configs/photo/photo-glass.ts';
import photoGradientFade from './configs/photo/photo-gradient-fade.ts';
import photoGrayscale from './configs/photo/photo-grayscale.ts';
import photoHalftone from './configs/photo/photo-halftone.ts';
import photoHero from './configs/photo/photo-hero.ts';
import photoLightAiry from './configs/photo/photo-light-airy.ts';
import photoMagazine from './configs/photo/photo-magazine.ts';
import photoMinimal from './configs/photo/photo-minimal.ts';
import photoMonoType from './configs/photo/photo-mono-type.ts';
import photoMosaic from './configs/photo/photo-mosaic.ts';
import photoOverlayBold from './configs/photo/photo-overlay-bold.ts';
import photoPanoramic from './configs/photo/photo-panoramic.ts';
import photoProfile from './configs/photo/photo-profile.ts';
import photoSepia from './configs/photo/photo-sepia.ts';
import photoSidebar from './configs/photo/photo-sidebar.ts';
import photoSplit from './configs/photo/photo-split.ts';
import photoSpotlight from './configs/photo/photo-spotlight.ts';
import photoStrip from './configs/photo/photo-strip.ts';
import photoTilt from './configs/photo/photo-tilt.ts';
import photoTopStory from './configs/photo/photo-top-story.ts';
import photoVignette from './configs/photo/photo-vignette.ts';
import photoWide from './configs/photo/photo-wide.ts';

// Stats configs
import statsBars from './configs/stats/stats-bars.ts';
import statsCard from './configs/stats/stats-card.ts';
import statsChart from './configs/stats/stats-chart.ts';
import statsComparison from './configs/stats/stats-comparison.ts';
import statsDashboard from './configs/stats/stats-dashboard.ts';
import statsGrid from './configs/stats/stats-grid.ts';
import statsHighlight from './configs/stats/stats-highlight.ts';
import statsMetric from './configs/stats/stats-metric.ts';
import statsScorecard from './configs/stats/stats-scorecard.ts';
import statsTrend from './configs/stats/stats-trend.ts';

const allTemplates: TemplateConfig[] = [
  // Photo (33)
  photoHero, photoGlass, photoCaption, photoSplit, photoDuotone, photoFrame, photoSidebar,
  photoPanoramic, photoCinematic, photoSpotlight, photoMagazine, photoEditorial, photoOverlayBold,
  photoVignette, photoMinimal, photoStrip, photoGradientFade, photoGrayscale, photoSepia,
  photoBrandTint, photoBlurBg, photoCornerCard, photoTopStory, photoFeature, photoWide,
  photoBanner, photoDarkLuxe, photoLightAiry, photoMosaic, photoProfile, photoHalftone,
  photoMonoType, photoTilt,
  // Gradient (20)
  gradientClean, gradientModern, gradientBold, gradientMinimal, gradientGlass, gradientStartup,
  gradientSunset, gradientOcean, gradientNeon, gradientPastel, gradientWarm, gradientCool,
  gradientElectric, gradientAurora, gradientMidnight, gradientDawn, gradientEmber, gradientForest,
  gradientRoyal, gradientCoral,
  // News (15)
  newsBanner, newsPhotoBanner, newsTicker, newsFlash, newsHeadline, newsAlert, newsWire,
  newsDigest, newsFrontpage, newsColumn, newsBulletin, newsSpecial, newsExclusive, newsLive,
  newsUpdate,
  // Stats (10)
  statsBars, statsCard, statsGrid, statsDashboard, statsMetric, statsComparison, statsTrend,
  statsHighlight, statsScorecard, statsChart,
  // Editorial (14)
  quoteClassic, quoteHighlight, editorialMagazine, photoQuote, editorialLongform, editorialOpinion,
  editorialReview, editorialFeature, editorialColumn, editorialLetter, editorialEssay,
  editorialInterview, editorialProfile, editorialAnalysis,
  // Brand (11)
  brandMinimal, brandAnnounce, brandCode, brandEvent, brandStatement, brandSpotlight,
  brandLaunch, brandUpdate, brandStory, brandMilestone, brandProduct,
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

export function getTemplatesByCategory(category: TemplateConfig['category']): TemplateConfig[] {
  return allTemplates.filter(t => t.category === category);
}

export function getAvailableTemplates(hasImage: boolean, disabledIds?: string[]): TemplateConfig[] {
  return allTemplates.filter(t =>
    (!t.requiresImage || hasImage) &&
    (!disabledIds || !disabledIds.includes(t.id))
  );
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

/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';
import { renderFullbleed } from './archetypes/fullbleed.tsx';
import { renderSplitLR } from './archetypes/split-lr.tsx';
import { renderSplitTB } from './archetypes/split-tb.tsx';
import { renderCentered } from './archetypes/centered.tsx';
import { renderTextForward } from './archetypes/text-forward.tsx';
import { renderCard } from './archetypes/card.tsx';
import { renderBanner } from './archetypes/banner.tsx';
import { renderSpecial } from './archetypes/special.tsx';

const ARCHETYPE_RENDERERS: Record<string, (config: TemplateConfig, input: TemplateInput) => any> = {
  'fullbleed': renderFullbleed,
  'split-lr': renderSplitLR,
  'split-tb': renderSplitTB,
  'centered': renderCentered,
  'text-forward': renderTextForward,
  'card': renderCard,
  'banner': renderBanner,
  'special': renderSpecial,
};

export function renderFromConfig(config: TemplateConfig, input: TemplateInput): any {
  const renderer = ARCHETYPE_RENDERERS[config.layout.archetype];
  if (!renderer) {
    throw new Error(`Unknown archetype: ${config.layout.archetype}`);
  }
  return renderer(config, input);
}

/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';
import { FONT_FAMILY_MAP } from '../utils/fonts.ts';
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

/**
 * Convert a React element tree to plain objects for Satori, injecting fontFamily everywhere.
 *
 * Satori 0.12.0 crashes with "Cannot read properties of undefined (reading 'trim')"
 * when any element lacks an explicit fontFamily. Additionally, React elements have
 * $typeof: Symbol(react.element) which object spread doesn't preserve correctly.
 *
 * This function converts the entire tree to plain { type, props, key } objects
 * that Satori handles natively, while ensuring every element has fontFamily.
 */
function toSatoriTree(element: any, fontFamily: string): any {
  // Pass through primitives
  if (element == null || typeof element === 'string' || typeof element === 'number' || typeof element === 'boolean') {
    return element;
  }

  // Handle arrays (e.g., multiple children, fragment arrays) — flatten nested arrays
  if (Array.isArray(element)) {
    return element.flat(Infinity).map(e => toSatoriTree(e, fontFamily)).filter(e => e != null && e !== false);
  }

  // Not a React element — pass through
  if (!element.type && !element.props) return element;

  const type = element.type || 'div';
  const key = element.key || undefined;
  const srcProps = element.props || {};

  // Build style with fontFamily
  let style = srcProps.style;
  if (style && typeof style === 'object') {
    if (!style.fontFamily) {
      style = { ...style, fontFamily };
    }
  } else {
    style = { fontFamily };
  }

  // Build new props (exclude children, we handle them separately)
  const newProps: any = {};
  for (const k of Object.keys(srcProps)) {
    if (k !== 'children') {
      newProps[k] = srcProps[k];
    }
  }
  newProps.style = style;

  // Recurse into children, flattening nested arrays (React allows them, Satori doesn't)
  const rawChildren = srcProps.children;
  if (rawChildren != null) {
    if (Array.isArray(rawChildren)) {
      const flat = rawChildren
        .flat(Infinity)
        .map((c: any) => toSatoriTree(c, fontFamily))
        .filter((c: any) => c != null && c !== false);
      newProps.children = flat;
    } else {
      newProps.children = toSatoriTree(rawChildren, fontFamily);
    }
  }

  // Return plain object — no $typeof, no Symbol — Satori handles these natively
  return { type, props: newProps, key };
}

/**
 * Render a template config to JSX for Satori.
 */
export function renderFromConfig(config: TemplateConfig, input: TemplateInput): any {
  const renderer = ARCHETYPE_RENDERERS[config.layout.archetype];
  if (!renderer) {
    throw new Error(`Unknown archetype: ${config.layout.archetype}`);
  }

  const fontKey = input.fontOverride?.fontFamily || config.title.fontFamily || 'sans';
  const fontFamily = FONT_FAMILY_MAP[fontKey] || 'Inter';

  const jsx = renderer(config, input);
  return toSatoriTree(jsx, fontFamily);
}

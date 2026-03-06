/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from '../types.ts';

const POSITION_STYLES: Record<string, Record<string, unknown>> = {
  'top-left': { top: 0, left: 0 },
  'top-right': { top: 0, right: 0 },
  'bottom-left': { bottom: 0, left: 0 },
  'bottom-right': { bottom: 0, right: 0 },
  'center-top': { top: 0, left: '50%', transform: 'translateX(-50%)' },
};

const BG_STYLES: Record<string, Record<string, unknown>> = {
  'none': {},
  'white-pill': { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 8, padding: '6px 12px' },
  'dark-pill': { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: '6px 12px' },
  'frosted': { backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: 8, padding: '6px 12px' },
};

export function renderLogo(
  logoConfig: TemplateConfig['logo'],
  layoutTheme: 'dark' | 'light',
  input: TemplateInput
): any {
  if (!input.visibility.showLogo) return null;

  const logoSrc = layoutTheme === 'dark' ? input.logoBase64 : input.logoDarkBase64;
  if (!logoSrc) return null;

  const pos = POSITION_STYLES[logoConfig.position] || POSITION_STYLES['bottom-left'];
  const bg = BG_STYLES[logoConfig.background || 'none'] || {};
  const margin = logoConfig.margin;

  return (
    <div style={{
      display: 'flex',
      position: 'absolute',
      ...Object.fromEntries(
        Object.entries(pos).map(([k, v]) => [k, typeof v === 'number' ? v + margin : v])
      ),
      ...bg,
      zIndex: 10,
    }}>
      <img
        src={logoSrc}
        style={{ height: logoConfig.maxHeight, objectFit: 'contain' }}
      />
    </div>
  );
}

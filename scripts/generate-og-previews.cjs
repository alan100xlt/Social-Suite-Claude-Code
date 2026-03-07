/**
 * Generate OG template preview images by calling the edge function's preview action.
 * Usage: node scripts/generate-og-previews.cjs [--all] [--ids photo-hero,gradient-clean,...]
 *
 * Requires: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=["']?(.+?)["']?\s*$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Sample data for previews
const SAMPLE_IMAGE_URL = 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1200&h=630&fit=crop';
const SAMPLE_TITLE = 'Tech Giants Report Record Q4 Growth as AI Revolution Reshapes Global Markets';
const SAMPLE_DESCRIPTION = 'Major technology companies posted unprecedented quarterly results, driven by surging demand for artificial intelligence products and cloud computing services.';
const SAMPLE_BRAND_COLOR = '#3B82F6';

// Default 5 templates to test (one from each major category)
const DEFAULT_IDS = [
  'photo-hero',
  'gradient-clean',
  'news-banner',
  'stats-card',
  'brand-minimal',
];

async function generatePreview(templateId) {
  const startTime = Date.now();
  console.log(`  Rendering ${templateId}...`);

  const resp = await fetch(`${SUPABASE_URL}/functions/v1/og-image-generator`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'preview',
      templateId,
      title: SAMPLE_TITLE,
      description: SAMPLE_DESCRIPTION,
      imageUrl: SAMPLE_IMAGE_URL,
      brandColor: SAMPLE_BRAND_COLOR,
      sourceName: 'TechCrunch',
      author: 'Sarah Chen',
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Failed to render ${templateId}: ${resp.status} ${errText}`);
  }

  const pngBuffer = Buffer.from(await resp.arrayBuffer());
  const elapsed = Date.now() - startTime;
  console.log(`  ✓ ${templateId} (${(pngBuffer.length / 1024).toFixed(0)}KB, ${elapsed}ms)`);
  return pngBuffer;
}

async function uploadToStorage(templateId, pngBuffer) {
  // Upload to Supabase Storage: post-images/og-previews/{templateId}.png
  const storagePath = `og-previews/${templateId}.png`;

  const resp = await fetch(
    `${SUPABASE_URL}/storage/v1/object/post-images/${storagePath}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'image/png',
        'x-upsert': 'true',
      },
      body: pngBuffer,
    }
  );

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Failed to upload ${templateId}: ${resp.status} ${errText}`);
  }

  // Get public URL
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/post-images/${storagePath}`;
  return publicUrl;
}

async function main() {
  const args = process.argv.slice(2);
  let templateIds = DEFAULT_IDS;

  const idsArg = args.find(a => a.startsWith('--ids='));
  if (idsArg) {
    templateIds = idsArg.replace('--ids=', '').split(',');
  }

  console.log(`\nGenerating ${templateIds.length} OG template previews...\n`);
  console.log(`  Image: puppy photo`);
  console.log(`  Title: "${SAMPLE_TITLE.substring(0, 50)}..."`);
  console.log(`  Brand: ${SAMPLE_BRAND_COLOR}\n`);

  const results = [];

  for (const id of templateIds) {
    try {
      const png = await generatePreview(id);
      const url = await uploadToStorage(id, png);
      results.push({ id, url, success: true });
      console.log(`  → ${url}\n`);
    } catch (err) {
      console.error(`  ✗ ${id}: ${err.message}\n`);
      results.push({ id, error: err.message, success: false });
    }
  }

  console.log('\n─── Results ───');
  const succeeded = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  console.log(`  ✓ ${succeeded.length} succeeded`);
  if (failed.length) console.log(`  ✗ ${failed.length} failed: ${failed.map(f => f.id).join(', ')}`);

  if (succeeded.length) {
    console.log('\nPreview URLs:');
    for (const r of succeeded) {
      console.log(`  ${r.id}: ${r.url}`);
    }
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

/** Fetch a remote image and return it as a base64 data URI. Returns null on failure. */
export async function imageToBase64(url: string, timeoutMs = 5000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'image/*' },
    });
    clearTimeout(timer);

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    return `data:${contentType};base64,${base64}`;
  } catch (err) {
    console.warn(`Failed to fetch image ${url}:`, err);
    return null;
  }
}

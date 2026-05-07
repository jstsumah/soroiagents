/**
 * uploadFile - Uploads a file directly to Supabase Storage using a signed URL.
 *
 * This avoids proxying the file through the Next.js server, which has a ~4MB
 * body size limit that causes 413 errors for large PDFs, videos, etc.
 *
 * Flow:
 *  1. Ask our API for a signed upload URL (tiny JSON request, no file involved)
 *  2. PUT the file directly to Supabase from the browser
 *  3. Return the final public URL
 */
export async function uploadFile(file: File, path: string): Promise<string> {
  // Step 1: Get a signed upload URL from our API
  const signedUrlResponse = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, contentType: file.type }),
  });

  if (!signedUrlResponse.ok) {
    const errorData = await signedUrlResponse.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to get upload URL (${signedUrlResponse.status})`);
  }

  const { signedUrl, publicUrl } = await signedUrlResponse.json();

  // Step 2: Upload the file directly to Supabase (bypasses Next.js body limits)
  const uploadResponse = await fetch(signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text().catch(() => '');
    throw new Error(`Direct upload to storage failed (${uploadResponse.status}): ${errorText}`);
  }

  return publicUrl;
}

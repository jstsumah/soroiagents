import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ensureAdmin } from '@/services/auth-service';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const BUCKET_NAME = 'soroi';

/**
 * POST /api/upload
 * 
 * Two modes:
 * 1. Body = FormData with `file` + `path` → direct proxy upload (legacy, limited to ~4MB by Next.js)
 * 2. Body = JSON with `path` + `contentType` + `mode: 'signed-url'` → returns a signed URL for direct client upload
 * 
 * Use mode 'signed-url' to avoid 413 errors for large files.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify Authentication
    await ensureAdmin();

    const contentType = request.headers.get('content-type') ?? '';

    // --- Mode: Get a signed upload URL (recommended for large files) ---
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { path, contentType: fileContentType } = body;

      if (!path || typeof path !== 'string') {
        return NextResponse.json({ error: 'Missing path' }, { status: 400 });
      }

      const supabase = getSupabaseAdmin();

      // Ensure bucket exists
      try {
        await supabase.storage.createBucket(BUCKET_NAME, { public: true });
      } catch (_) { /* already exists */ }

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUploadUrl(path);

      if (error || !data) {
        console.error('[API Upload] Failed to create signed URL:', error);
        return NextResponse.json(
          { error: `Failed to create signed upload URL: ${error?.message}` },
          { status: 500 }
        );
      }

      // Also get the final public URL
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(path);

      return NextResponse.json({
        signedUrl: data.signedUrl,
        token: data.token,
        path: data.path,
        publicUrl,
      });
    }

    // --- Mode: Legacy FormData proxy upload (for small files only) ---
    const formData = await request.formData();
    const file = formData.get('file');
    const path = formData.get('path');

    if (!file || !path || typeof path !== 'string') {
      return NextResponse.json({ error: 'Missing file or path' }, { status: 400 });
    }

    const isFileLike = file && typeof (file as any).arrayBuffer === 'function';
    if (!isFileLike) {
      return NextResponse.json({ error: 'Invalid file object' }, { status: 400 });
    }

    const fileObject = file as unknown as File;
    const arrayBuffer = await fileObject.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = fileObject.type || 'application/octet-stream';

    const supabase = getSupabaseAdmin();

    try {
      await supabase.storage.createBucket(BUCKET_NAME, { public: true });
    } catch (_) { /* already exists */ }

    console.log(`[API Upload] Proxy uploading to ${path} (${buffer.length} bytes)`);

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, buffer, { contentType: mimeType, upsert: true });

    if (error) {
      console.error('[API Upload] Supabase Storage error:', error);
      return NextResponse.json({ error: `Storage error: ${error.message}` }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);

    return NextResponse.json({ url: publicUrl });

  } catch (error: any) {
    console.error('[API Upload] Error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during upload' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

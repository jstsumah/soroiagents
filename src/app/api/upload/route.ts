import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ensureAdmin } from '@/services/auth-service';

export const config = {
  api: {
    bodyParser: false, // Disable the default body parser to handle raw data if needed, but for now we'll use formData()
  },
};

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Authentication
    await ensureAdmin();

    // 2. Parse FormData
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
    const contentType = fileObject.type || 'application/octet-stream';

    // 3. Upload to Supabase
    const supabase = getSupabaseAdmin();
    const bucketName = 'soroi';

    // Ensure bucket exists
    try {
        await supabase.storage.createBucket(bucketName, { public: true });
    } catch (e) {
        // Likely already exists
    }

    console.log(`[API Upload] Uploading to ${path} (${buffer.length} bytes, type: ${contentType})`);

    const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(path, buffer, {
            contentType: contentType,
            upsert: true
        });

    if (error) {
        console.error('Supabase Storage Upload Error:', error);
        return NextResponse.json({ error: `Storage error: ${error.message}` }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(path);

    return NextResponse.json({ url: publicUrl });

  } catch (error: any) {
    console.error('Error in upload route:', error);
    return NextResponse.json({ 
        error: error.message || 'An unexpected error occurred during upload' 
    }, { status: error.message?.includes('Unauthorized') ? 401 : 500 });
  }
}

// app/api/documents/route.js
export const runtime = 'nodejs';

import { ObjectId } from 'mongodb';
import { getGridFSBucket } from '@/lib/mongo';

function isAuthorized(_req) { return true; }

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json; charset=utf-8');
  }
  return new Response(JSON.stringify(data), { ...init, headers });
}

async function findFile(bucket, _id) {
  const files = await bucket.find({ _id }).toArray();
  return files[0] || null;
}

// GET /api/documents -> list all documents
// GET /api/documents?id=<id> -> stream file bytes
export async function GET(req) {
  if (!isAuthorized(req)) {
    return json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    // If ID is provided, return the specific file
    if (id) {
      let _id;
      try { 
        _id = new ObjectId(id); 
      } catch { 
        return json({ success: false, error: 'Invalid id format' }, { status: 400 }); 
      }

      const bucket = await getGridFSBucket();
      const file = await findFile(bucket, _id);
      if (!file) {
        return json({ success: false, error: 'Not found' }, { status: 404 });
      }

      const stream = bucket.openDownloadStream(_id);
      const res = new Response(stream, { status: 200 });
      res.headers.set('Content-Type', file.contentType || 'application/octet-stream');
      res.headers.set('Content-Length', String(file.length ?? 0));
      res.headers.set('Content-Disposition', `inline; filename="${file.filename}"`);
      return res;
    }
    
    // If no ID, return list of all documents
    const bucket = await getGridFSBucket();
    const files = await bucket.find({}).toArray();
    
    // Transform files to include necessary metadata
    const documents = files.map(file => ({
      id: file._id.toString(),
      filename: file.filename,
      title: file.metadata?.title || file.filename,
      contentType: file.contentType,
      size: file.length,
      uploadedAt: file.uploadDate,
      metadata: file.metadata || {}
    }));
    
    return json({ 
      success: true, 
      data: documents 
    });
    
  } catch (error) {
    console.error('Error in GET /api/documents:', error);
    return json({ 
      success: false, 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// HEAD /api/documents?id=<id> -> headers only
export async function HEAD(req) {
  if (!isAuthorized(req)) {
    return new Response(null, { status: 401 });
  }

  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) {
      return new Response(null, { status: 400 });
    }

    let _id;
    try { _id = new ObjectId(id); }
    catch { return new Response(null, { status: 400 }); }

    const bucket = await getGridFSBucket();
    const file = await findFile(bucket, _id);
    if (!file) {
      return new Response(null, { status: 404 });
    }

    const headers = new Headers();
    headers.set('Content-Length', String(file.length ?? 0));
    headers.set('Content-Type', file.contentType || 'application/octet-stream');
    headers.set('X-GridFS-Filename', file.filename);
    headers.set('X-GridFS-UploadDate', file.uploadDate?.toISOString?.() || '');
    return new Response(null, { status: 200, headers });
  } catch {
    return new Response(null, { status: 500 });
  }
}

// DELETE /api/documents?id=<id>
export async function DELETE(req) {
  if (!isAuthorized(req)) {
    return json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) {
      return json({ success: false, error: 'Missing id parameter' }, { status: 400 });
    }

    let _id;
    try { _id = new ObjectId(id); }
    catch { return json({ success: false, error: 'Invalid id format' }, { status: 400 }); }

    const bucket = await getGridFSBucket();
    const file = await findFile(bucket, _id);
    if (!file) {
      return json({ success: false, error: 'Not found' }, { status: 404 });
    }

    await bucket.delete(_id);
    return json({ success: true, data: { id } }, { status: 200 });
  } catch {
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

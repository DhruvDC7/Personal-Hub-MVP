export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { Readable } from 'node:stream';
import { once } from 'node:events';
import { GridFSFindFileByIdWithBucket } from '../../../../src/helpers/mongo';
 // you already have this

export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || 'application/octet-stream';
    const filename = request.headers.get('x-filename');
    const title = request.headers.get('x-title') || filename || 'untitled';
    const existingId = request.headers.get('x-document-id'); // if present -> replace

    if (!filename) {
      return NextResponse.json({ error: 'x-filename header is required' }, { status: 400 });
    }

    // Prepare id + bucket + existing metadata (if replacing)
    let _id;
    let bucket;
    let existingFileDoc = null;

    if (existingId) {
      try { _id = new ObjectId(existingId); }
      catch { return NextResponse.json({ error: 'Invalid x-document-id' }, { status: 400 }); }

      const found = await GridFSFindFileByIdWithBucket('documents', _id);
      bucket = found.bucket;

      if (!found.status) {
        return NextResponse.json({ error: 'File to replace not found' }, { status: 404 });
      }

      existingFileDoc = found.data;
      // delete old file bytes (and files doc)
      await bucket.delete(_id);
    } else {
      // new upload
      const found = await GridFSFindFileByIdWithBucket('documents', new ObjectId()); // just to get bucket
      bucket = found.bucket;
      _id = new ObjectId();
    }

    // Build metadata
    const metadata = {
      ...(existingFileDoc?.metadata || {}),
      originalName: filename,
      title,
      contentType,
      uploadDate: new Date(),
    };

    // Open upload stream (same id if replacing; new id otherwise)
    const uploadStream = bucket.openUploadStreamWithId(_id, filename, {
      metadata,
      contentType,
    });

    // Stream request body -> GridFS
    if (request.body) {
      const nodeStream = Readable.fromWeb(request.body);
      nodeStream.pipe(uploadStream);
      await once(uploadStream, 'finish');
    } else {
      // fallback (shouldn't happen with curl --data-binary)
      const buf = Buffer.from(await request.arrayBuffer());
      uploadStream.end(buf);
      await once(uploadStream, 'finish');
    }

    return NextResponse.json({
      success: true,
      documentId: _id.toString(),
      filename,
      contentType,
      metadata,
      // uploadUrl omitted—single-call flow
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload', details: error.message },
      { status: 500 }
    );
  }
}

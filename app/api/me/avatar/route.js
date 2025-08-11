import { NextResponse } from 'next/server';
import { ObjectId, GridFSBucket } from 'mongodb';
import { requireAuth } from '@/middleware/auth';
import { connectToDatabase } from '@/lib/mongo';
import { handleApiError } from '@/lib/errorHandler';

// Helper: get DB + bucket
async function getBucket() {
  const client = await connectToDatabase();
  const db = client.db(process.env.MONGODB_DB || 'personal_hub');
  return { db, bucket: new GridFSBucket(db, { bucketName: 'avatars' }) };
}

// Helper: find current avatar fileId on user doc
async function getUserAndAvatar(db, userId) {
  const user = await db.collection('users').findOne(
    { _id: new ObjectId(userId) },
    { projection: { _id: 1, avatar_id: 1, avatar_mime: 1 } }
  );
  return user;
}

// GET /api/me/avatar -> streams image or 404
export async function GET(request) {
  try {
    // Authenticate user
    let userId;
    try {
      const auth = requireAuth(request);
      userId = auth.userId;
    } catch (error) {
      error.status = 401;
      return handleApiError(error, 'Authentication failed in GET /api/me/avatar');
    }

    const { db, bucket } = await getBucket();
    

    const user = await getUserAndAvatar(db, userId);
    
    if (!user?.avatar_id) {
      return new NextResponse('Avatar not found', { status: 404 });
    }

    const fileId = new ObjectId(user.avatar_id);
    const files = await db.collection('avatars.files').findOne({ _id: fileId });
    
    if (!files) {
      // Clean up orphaned reference
      await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $unset: { avatar_id: '', avatar_mime: '' } }
      );
      return new NextResponse('Avatar not found', { status: 404 });
    }

    const stream = bucket.openDownloadStream(fileId);
    const response = new NextResponse(stream);
    response.headers.set('Content-Type', files.metadata?.mime || 'application/octet-stream');
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    return handleApiError(error, 'Failed to load avatar');
  }
}

// POST /api/me/avatar (multipart/form-data { file })
export async function POST(request) {
  try {
    // Authenticate user
    let userId;
    try {
      const auth = requireAuth(request);
      userId = auth.userId;
    } catch (error) {
      error.status = 401;
      return handleApiError(error, 'Authentication failed in POST /api/me/avatar');
    }

    const { db, bucket } = await getBucket();
    

    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return new NextResponse('No file provided', { status: 400 });
    }
    
    const mime = file.type || 'application/octet-stream';
    if (!/image\/(png|jpe?g|webp)/i.test(mime)) {
      return NextResponse.json({ message: 'Only PNG/JPG/WEBP allowed' }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // remove previous avatar if exists
    const user = await getUserAndAvatar(db, userId);
    if (user?.avatar_id) {
      try { await bucket.delete(new ObjectId(user.avatar_id)); } catch { /* ignore */ }
    }

    // upload new
    const uploadStream = bucket.openUploadStream(`${userId}`, {
      metadata: { userId, mime, size: buffer.length }
    });
    await new Promise((resolve, reject) => {
      uploadStream.end(buffer, (err) => (err ? reject(err) : resolve()));
    });

    // save reference on user
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: { avatar_id: uploadStream.id, avatar_mime: mime } }
    );

    return NextResponse.json({ ok: true, fileId: uploadStream.id });
  } catch (error) {
    return handleApiError(error, 'Failed to upload avatar');
  }
}

// DELETE /api/me/avatar
export async function DELETE(request) {
  try {
    // Authenticate user
    let userId;
    try {
      const auth = requireAuth(request);
      userId = auth.userId;
    } catch (error) {
      error.status = 401;
      return handleApiError(error, 'Authentication failed in DELETE /api/me/avatar');
    }

    const { db, bucket } = await getBucket();
    

    const user = await getUserAndAvatar(db, userId);
    
    if (user?.avatar_id) {
      try {
        await bucket.delete(new ObjectId(user.avatar_id));
      } catch (error) {
        return handleApiError(error, 'Failed to delete avatar');
      }
      
      // Remove avatar reference from user
      await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $unset: { avatar_id: '', avatar_mime: '' } }
      );
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    return handleApiError(error, 'Failed to delete avatar');
  }
}

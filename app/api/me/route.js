import { requireAuth } from '@/middleware/auth';
import { MongoClientFindOne, MongoClientUpdateOne } from '@/helpers/mongo';
import { ObjectId } from 'mongodb';
import { handleApiError } from '@/lib/errorHandler';

/**
 * GET /api/me - Get current user's profile
 */
export async function GET(req) {
  try {
    // 1. Authenticate user
    let userId;
    let role = 'user';
    try {
      const auth = requireAuth(req);
      userId = auth.userId;
      role = auth.role || 'user';
    } catch (error) {
      error.status = 401;
      return handleApiError(error, 'Authentication failed in GET /api/me');
    }

    // 2. Fetch user data
    const { found, data } = await MongoClientFindOne('users', { 
      _id: ObjectId.isValid(userId) ? new ObjectId(userId) : userId 
    });

    if (!found) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }

    // 3. Return user data
    return Response.json(
      { 
        user: { 
          id: data._id?.toString(),
          email: data.email,
          name: data.name || null,
          phone: data.phone || null,
          address: data.address || null,
          role: data.role || role || 'user'
        } 
      },
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store' 
        } 
      }
    );
  } catch (error) {
    return handleApiError(error, 'GET /api/me failed');
  }
}

/**
 * PUT /api/me - Update current user's profile
 */
export async function PUT(req) {
  try {
    // 1. Authenticate user
    let userId;
    try {
      const auth = requireAuth(req);
      userId = auth.userId;
    } catch (error) {
      error.status = 401;
      return handleApiError(error, 'Authentication failed in PUT /api/me');
    }

    // 2. Validate request body
    const { name, phone, address } = await req.json();
    if (!name && !phone && !address) {
      const error = new Error('At least one field (name, phone, or address) is required');
      error.status = 400;
      throw error;
    }

    // 3. Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;

    // 4. Update user in database
    const { status, data } = await MongoClientUpdateOne(
      'users',
      { _id: ObjectId.isValid(userId) ? new ObjectId(userId) : userId },
      { $set: updateData }
    );

    // Note: helpers/mongo returns modifiedCount as `data`, not the updated doc.
    // Zero modifications can legitimately occur (values unchanged). Don't treat as error.
    // Fetch the latest user document to return.
    const findResult = await MongoClientFindOne('users', {
      _id: ObjectId.isValid(userId) ? new ObjectId(userId) : userId,
    });

    if (!findResult.found) {
      const error = new Error('Failed to load updated user');
      error.status = 500;
      throw error;
    }

    const userDoc = findResult.data;
    // 5. Return updated user data
    return Response.json(
      {
        success: true,
        user: {
          id: userDoc._id?.toString(),
          email: userDoc.email,
          name: userDoc.name || null,
          phone: userDoc.phone || null,
          address: userDoc.address || null,
          role: userDoc.role || role || 'user',
        },
        // Optionally include info about whether an update occurred
        modified: typeof data === 'number' ? data : undefined,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return handleApiError(error, 'PUT /api/me failed');
  }
}

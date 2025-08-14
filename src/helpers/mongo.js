import { ObjectId, GridFSBucket } from 'mongodb';
import { clientPromise } from "../lib/mongo";

const DatabaseName = process.env.MONGODB_DB;

/**
 * Converts various ID types to MongoDB ObjectId
 * @param {string|Buffer|ObjectId|any} id - The ID to convert
 * @returns {ObjectId} - The converted ObjectId
 */
const toObjectId = (id) => {
    if (!id) return id;
    if (id instanceof ObjectId) return id;
    if (Buffer.isBuffer(id)) return new ObjectId(id.toString('hex'));
    if (typeof id === 'string') {
        try {
            return new ObjectId(id);
        } catch (e) {
            // If it's not a valid ObjectId string, create a new one
            return new ObjectId();
        }
    }
    return id;
};

/**
 * Deletes multiple documents from a MongoDB collection.
 */
export const MongoClientDeleteMany = async (collection, query = {}) => {
    if (Object.keys(query).length === 0) throw new Error("Query cannot be empty");
    
    try {
        const client = await clientPromise;
        const db = client.db(DatabaseName);
        
        // Convert _id to ObjectId if it exists in the query
        if (query._id) {
            query._id = toObjectId(query._id);
        }
        
        const deleteResult = await db.collection(collection).deleteMany(query);
        
        return {
            status: deleteResult.acknowledged === true,
            mode: "deleteMany",
            data: deleteResult.deletedCount,
            id: deleteResult.deletedCount,
            message: `Deleted ${deleteResult.deletedCount} documents.`
        };
    } catch (e) {
        return {
            status: false,
            mode: "error",
            data: 0,
            id: "",
            message: `Internal Server Error: ${e.message}`
        };
    }
};

/**
 * Finds a single document in a MongoDB collection.
 */
export const MongoClientFindOne = async (collection, query = {}, options = {}) => {
    try {
        const client = await clientPromise;
        const db = client.db(DatabaseName);
        
        // Convert _id to ObjectId if it exists in the query
        if (query._id) {
            query._id = toObjectId(query._id);
        }
        
        const data = await db.collection(collection).findOne(query, options);
        const found = !!data;

        return {
            status: true, // success even when not found; callers can check `found`
            mode: "find",
            data: data || {},
            id: data?._id || "",
            found,
            message: found ? "Record found." : "No record found."
        };
    } catch (e) {
        return {
            status: false,
            mode: "error",
            data: {},
            id: "",
            message: `Internal Server Error: ${e.message}`
        };
    } 
};

/**
 * Finds multiple documents in a MongoDB collection.
 */
export const MongoClientFind = async (collection, query = {}, options = {}) => {
    try {
        const client = await clientPromise;
        const db = client.db(DatabaseName);
        
        // Convert _id to ObjectId if it exists in the query
        if (query._id) {
            query._id = toObjectId(query._id);
        }
        
        // Handle nested _id in $or queries
        if (query.$or && Array.isArray(query.$or)) {
            query.$or = query.$or.map(condition => {
                if (condition._id) {
                    return { ...condition, _id: toObjectId(condition._id) };
                }
                return condition;
            });
        }
        
        const data = await db.collection(collection).find(query, options).toArray();
        const found = Array.isArray(data) && data.length > 0;

        return {
            status: true, // success even when empty; callers can check `found` or data.length
            mode: "find",
            data,
            id: 1,
            found,
            message: found ? "Records found." : "No records found."
        };
    } catch (e) {
        return {
            status: false,
            mode: "error",
            data: [],
            id: 0,
            message: `Internal Server Error: ${e.message}`
        };
    }
};

/**
 * Updates a single document in a MongoDB collection.
 */
export const MongoClientUpdateOne = async (collection, query = {}, update = {}) => {
    if (Object.keys(update).length === 0) throw new Error("Update options cannot be empty");
    if (Object.keys(query).length === 0) throw new Error("Query cannot be empty");
    
    try {
        const client = await clientPromise;
        const db = client.db(DatabaseName);
        
        // Convert _id to ObjectId if it exists in the query
        if (query._id) {
            query._id = toObjectId(query._id);
        }
        
        // Handle $set operations with _id
        if (update.$set && update.$set._id) {
            update.$set._id = toObjectId(update.$set._id);
        }
        
        const updateResult = await db.collection(collection).updateOne(query, update);
        
        return {
            status: updateResult.modifiedCount > 0,
            mode: "update",
            data: updateResult.modifiedCount,
            id: updateResult.upsertedId?.toHexString ? updateResult.upsertedId.toHexString() : String(updateResult.upsertedId || ""),
            message: updateResult.modifiedCount > 0 ? "Update successful." : "No document updated."
        };
    } catch (e) {
        return {
            status: false,
            mode: "error",
            data: 0,
            id: "",
            message: `Internal Server Error: ${e.message}`
        };
    }
};


/**
 * Inserts a document into a MongoDB collection.
 */
export const MongoClientInsertOne = async (collection, document) => {
    if (Object.keys(document).length === 0) throw new Error("Document cannot be empty");
    
    try {
        const client = await clientPromise;
        const db = client.db(DatabaseName);
        const insertResult = await db.collection(collection).insertOne(document);
        
        return {
            status: insertResult.acknowledged,
            mode: "insert",
            data: insertResult.insertedId?.toHexString ? insertResult.insertedId.toHexString() : String(insertResult.insertedId || ""),
            id: insertResult.insertedId?.toHexString ? insertResult.insertedId.toHexString() : String(insertResult.insertedId || ""),
            message: insertResult.acknowledged ? "Insert successful." : "Insert failed."
        };
    } catch (e) {
        return {
            status: false,
            mode: "error",
            data: 0,
            id: "",
            message: `Internal Server Error: ${e.message}`
        };
    }
};

/**
 * Deletes a single document from a MongoDB collection.
 */
export const MongoClientDeleteOne = async (collection, query) => {
    if (Object.keys(query).length === 0) throw new Error("Query cannot be empty");
    
    try {
        const client = await clientPromise;
        const db = client.db(DatabaseName);
        
        // Convert _id to ObjectId if it exists in the query
        if (query._id) {
            query._id = toObjectId(query._id);
        }
        
        const deleteResult = await db.collection(collection).deleteOne(query);
        
        return {
            status: deleteResult.deletedCount > 0,
            mode: "delete",
            data: deleteResult.deletedCount,
            id: deleteResult.deletedCount,
            message: deleteResult.deletedCount > 0 ? "Delete successful." : "No document found to delete."
        };
    } catch (e) {
        return {
            status: false,
            mode: "error",
            data: 0,
            id: "",
            message: `Internal Server Error: ${e.message}`
        };
    }
};

/**
 * Aggregates documents in a MongoDB collection.
 */
export const MongoClientAggregate = async (collection, pipeline = []) => {
    if (pipeline.length === 0) throw new Error("Pipeline cannot be empty");
    
    try {
        const client = await clientPromise;
        const db = client.db(DatabaseName);
        const data = await db.collection(collection).aggregate(pipeline).toArray();
        
        return {
            status: data.length > 0,
            mode: "aggregate",
            data,
            id: 1,
            message: data.length > 0 ? "Aggregation successful." : "No results from aggregation."
        };
    } catch (e) {
        return {
            status: false,
            mode: "error",
            data: [],
            id: 0,
            message: `Internal Server Error: ${e.message}`
        };
    }
};

// * Updates a single document in an array within a MongoDB collection.
// */
export const MongoClientUpdateOneInArray = async (collection, query = {}, update = {}, arrayFilters = []) => {
   if (Object.keys(update).length === 0) throw new Error("Update options cannot be empty");
   if (Object.keys(query).length === 0) throw new Error("Query cannot be empty");
   if (arrayFilters.length === 0) throw new Error("Array filters cannot be empty");
   
   try {
       const client = await clientPromise;
       const db = client.db(DatabaseName);
       
       // Convert _id to ObjectId if it exists in the query
       if (query._id) {
           query._id = toObjectId(query._id);
       }
       
       // Process array filters to convert any _id fields
       const processedArrayFilters = arrayFilters.map(filter => {
           const newFilter = { ...filter };
           if (newFilter['elem._id']) {
               newFilter['elem._id'] = toObjectId(newFilter['elem._id']);
           }
           return newFilter;
       });
       
       const updateResult = await db.collection(collection).updateOne(query, update, { arrayFilters: processedArrayFilters });
       
       return {
           status: updateResult.modifiedCount > 0,
           mode: "update",
           data: updateResult.modifiedCount,
           id: updateResult.upsertedId || "",
           message: updateResult.modifiedCount > 0 ? "Update successful." : "No document updated."
       };
   } catch (e) {
       return {
           status: false,
           mode: "error",
           data: 0,
           id: "",
           message: `Internal Server Error: ${e.message}`
       };
   }
};

export const MongoClientUpdateManyWithArrayFilter = async (collection, query = {}, update = {}, arrayFilters = []) => {
    if (Object.keys(update).length === 0) throw new Error("Update options cannot be empty");
    if (Object.keys(query).length === 0) throw new Error("Query cannot be empty");
    if (arrayFilters.length === 0) throw new Error("Array filters cannot be empty");
    
    try {
        const client = await clientPromise;
        const db = client.db(DatabaseName);
        
        // Convert _id to ObjectId if it exists in the query
        if (query._id) {
            query._id = toObjectId(query._id);
        }
        
        // Process array filters to convert any _id fields
        const processedArrayFilters = arrayFilters.map(filter => {
            const newFilter = { ...filter };
            if (newFilter['elem._id']) {
                newFilter['elem._id'] = toObjectId(newFilter['elem._id']);
            }
            return newFilter;
        });
        
        const updateResult = await db.collection(collection).updateMany(query, update, { arrayFilters: processedArrayFilters });
        
        return {
            status: updateResult.modifiedCount > 0,
            mode: "update",
            data: updateResult.modifiedCount,
            id: updateResult.upsertedId || "",
            message: updateResult.modifiedCount > 0 ? "Update successful." : "No documents updated."
        };
    } catch (e) {
        return {
            status: false,
            mode: "error",
            data: 0,
            id: "",
            message: `Internal Server Error: ${e.message}`
        };
    }
};


/**
 * Counts the number of documents in a MongoDB collection based on a query.
 */
export const MongoClientDocumentCount = async (collection, query = {}) => {
    try {
        const client = await clientPromise;
        const db = client.db(DatabaseName);
        
        // Convert _id to ObjectId if it exists in the query
        if (query._id) {
            query._id = toObjectId(query._id);
        }
        
        const count = await db.collection(collection).countDocuments(query);
        
        return {
            status: true,
            mode: "count",
            data: count,
            id: 1,
            message: count > 0 ? "Documents found." : "No documents found."
        };
    } catch (e) {
        return {
            status: false,
            mode: "error",
            data: 0,
            id: 0,
            message: `Internal Server Error: ${e.message}`
        };
    }
};



/**
 * Returns both the file document and a GridFSBucket instance for a given bucketName + fileId
 */
export const GridFSFindFileByIdWithBucket = async (bucketName = 'documents', id) => {
    try {
      const client = await clientPromise;
      const db = client.db(DatabaseName);
      const bucket = new GridFSBucket(db, { bucketName, chunkSizeBytes: 255 * 1024 });
  
      const _id = toObjectId(id);
      const fileDoc = await db.collection(`${bucketName}.files`).findOne({ _id });
  
      return {
        status: !!fileDoc,
        mode: 'find',
        bucket,              // Ready to use for delete/upload
        data: fileDoc || {},
        id: fileDoc?._id || '',
        message: fileDoc ? 'File found.' : 'File not found.'
      };
    } catch (e) {
      return {
        status: false,
        mode: 'error',
        data: {},
        id: '',
        bucket: null,
        message: `Internal Server Error: ${e.message}`
      };
    }
  };

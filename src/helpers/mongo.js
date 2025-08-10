import { clientPromise } from "../lib/mongo";

const DatabaseName = process.env.MONGODB_DB;

/**
 * Finds a single document in a MongoDB collection.
 */
export const MongoClientFindOne = async (collection, query = {}, options = {}) => {
    try {
        const client = await clientPromise;
        const db = client.db(DatabaseName);
        const data = await db.collection(collection).findOne(query, options);
        
        return {
            status: !!data,
            mode: "find",
            data: data || {},
            id: data?._id || "",
            message: data ? "Record found." : "No record found."
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
        const data = await db.collection(collection).find(query, options).toArray();
        
        return {
            status: data.length > 0,
            mode: "find",
            data,
            id: 1,
            message: data.length > 0 ? "Records found." : "No records found."
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
        const updateResult = await db.collection(collection).updateOne(query, update);
        
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
            data: insertResult.insertedId,
            id: insertResult.insertedId || "",
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
       const updateResult = await db.collection(collection).updateOne(query, update, { arrayFilters });
       
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
        const updateResult = await db.collection(collection).updateMany(query, update, { arrayFilters });
        
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

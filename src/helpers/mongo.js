const BASE_URI = process.env.MONGODB_DATA_API_URI;
const CUSTOM_URI = process.env.MONGODB_DATA_API_URI_CUSTOM_ENDPOINT || BASE_URI;
const DATA_SOURCE = process.env.MONGODB_DATA_API_DATASOURCE;
const DB_NAME = process.env.MONGODB_DATA_API_DBNAME;

export const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Access-Control-Request-Headers': '*',
  'api-key': process.env.MONGODB_DATA_API_KEY,
};

function parseId(id) {
  if (id && typeof id === 'object') {
    return id.$oid || id.$binary?.base64 || id;
  }
  return id;
}

function transformDoc(doc) {
  if (!doc || typeof doc !== 'object') return doc;
  const { _id, ...rest } = doc;
  const out = { ...rest };
  if (_id !== undefined) out.id = parseId(_id);
  return out;
}

function buildBody(collection, payload) {
  return JSON.stringify({
    dataSource: DATA_SOURCE,
    database: DB_NAME,
    collection,
    ...payload,
  });
}

async function handleResponse(res, mode) {
  let json;
  try {
    json = await res.json();
  } catch {
    return { status: false, mode, data: null, id: 0, message: 'No response body' };
  }
  if (!res.ok) {
    const message = json.error || json.message || 'Request failed';
    return { status: false, mode, data: null, id: 0, message };
  }
  const rawId = json.insertedId || json.upsertedId || 0;
  return { status: true, mode, data: json, id: parseId(rawId), message: '' };
}

export async function MongoApiFindOne(collection, query, options = {}) {
  if (!collection || !query) throw new Error('collection and query are required');
  const url = `${BASE_URI}/action/findOne`;
  const body = buildBody(collection, { filter: query, ...options });
  const res = await fetch(url, { method: 'POST', headers, body });
  const out = await handleResponse(res, 'findOne');
  if (out.status) {
    out.data = transformDoc(out.data.document || null);
    out.id = out.data?.id || 0;
  }
  return out;
}

export async function MongoApiFind(collection, query, options = {}) {
  if (!collection || !query) throw new Error('collection and query are required');
  const url = `${BASE_URI}/action/find`;
  const body = buildBody(collection, { filter: query, ...options });
  const res = await fetch(url, { method: 'POST', headers, body });
  const out = await handleResponse(res, 'find');
  if (out.status) {
    const docs = out.data.documents || [];
    out.data = docs.map(transformDoc);
    out.id = out.data.length;
  }
  return out;
}

export async function MongoApiInsertOne(collection, insertDoc) {
  if (!collection || !insertDoc) throw new Error('collection and insertDoc are required');
  const url = `${BASE_URI}/action/insertOne`;
  const body = buildBody(collection, { document: insertDoc });
  const res = await fetch(url, { method: 'POST', headers, body });
  const out = await handleResponse(res, 'insertOne');
  if (out.status) {
    out.id = parseId(out.id);
    out.data = { id: out.id, ...insertDoc };
  }
  return out;
}

export async function MongoApiUpdateOne(collection, query, updateOptions) {
  if (!collection || !query || !updateOptions) throw new Error('collection, query and updateOptions are required');
  const url = `${BASE_URI}/action/updateOne`;
  const body = buildBody(collection, { filter: query, update: updateOptions });
  const res = await fetch(url, { method: 'POST', headers, body });
  const out = await handleResponse(res, 'updateOne');
  return out;
}

export async function MongoApiUpdateOneInArray(collection, query, updateOptions, arrayFilters) {
  if (!collection || !query || !updateOptions || !arrayFilters) throw new Error('collection, query, updateOptions and arrayFilters are required');
  const url = `${BASE_URI}/action/updateOne`;
  const body = buildBody(collection, { filter: query, update: updateOptions, arrayFilters });
  const res = await fetch(url, { method: 'POST', headers, body });
  const out = await handleResponse(res, 'updateOneInArray');
  return out;
}

export async function MongoApiUpdateManyWithArrayFilter(collection, query, updateOptions, arrayFilters) {
  if (!collection || !query || !updateOptions || !arrayFilters) throw new Error('collection, query, updateOptions and arrayFilters are required');
  const url = `${BASE_URI}/action/updateMany`;
  const body = buildBody(collection, { filter: query, update: updateOptions, arrayFilters });
  const res = await fetch(url, { method: 'POST', headers, body });
  const out = await handleResponse(res, 'updateManyWithArrayFilter');
  return out;
}

export async function MongoApiAggregate(collection, pipeline) {
  if (!collection || !pipeline) throw new Error('collection and pipeline are required');
  const url = `${CUSTOM_URI}/action/aggregate`;
  const body = buildBody(collection, { pipeline });
  const res = await fetch(url, { method: 'POST', headers, body });
  const out = await handleResponse(res, 'aggregate');
  if (out.status) {
    const docs = out.data.documents || [];
    out.data = docs.map(transformDoc);
    out.id = out.data.length;
  }
  return out;
}

export async function documentCountMongo(collection, query, options = {}) {
  if (!collection || !query) throw new Error('collection and query are required');
  const url = `${BASE_URI}/action/countDocuments`;
  const body = buildBody(collection, { filter: query, ...options });
  const res = await fetch(url, { method: 'POST', headers, body });
  const out = await handleResponse(res, 'countDocuments');
  if (out.status) {
    out.id = out.data.count || 0;
    out.data = out.data.count;
  }
  return out;
}

export async function MongoApiDeleteOne(collection, query) {
  if (!collection || !query) throw new Error('collection and query are required');
  const url = `${BASE_URI}/action/deleteOne`;
  const body = buildBody(collection, { filter: query });
  const res = await fetch(url, { method: 'POST', headers, body });
  const out = await handleResponse(res, 'deleteOne');
  return out;
}

const mongoHelpers = {
  MongoApiFindOne,
  MongoApiFind,
  MongoApiInsertOne,
  MongoApiUpdateOne,
  MongoApiUpdateOneInArray,
  MongoApiUpdateManyWithArrayFilter,
  MongoApiAggregate,
  documentCountMongo,
  MongoApiDeleteOne,
};

export default mongoHelpers;

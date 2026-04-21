/**
 * server/lib/pagination.js
 * Pagination helper for MongoDB queries
 */

export function parsePagination(req) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function paginatedResponse(data, total, page, limit) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
}

export async function paginateQuery(collection, query = {}, options = {}, req) {
  const { page, limit, skip } = parsePagination(req);
  const sort = options.sort || { createdAt: -1 };
  
  const [data, total] = await Promise.all([
    collection.find(query).sort(sort).skip(skip).limit(limit).toArray(),
    collection.countDocuments(query),
  ]);
  
  return paginatedResponse(data, total, page, limit);
}
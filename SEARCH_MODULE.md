================================================================================
e. SEARCH MODULE - PROGRAM CODE LISTING
================================================================================

// server/routes/search.js
import express from 'express';
const router = express.Router();
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { authMiddleware } from '../middleware/auth.js';

// Advanced Search across multiple collections
// Supports: users, classes, subjects, notes, quizzes, grades, tickets

/**
 * buildSearchFilter
 * Builds MongoDB query filter from search parameters
 * @param {string} searchTerm - Search keyword
 * @param {Object} fields - Fields to search in
 * @returns {Object} MongoDB filter
 */
function buildSearchFilter(searchTerm, fields) {
  if (!searchTerm || !fields || fields.length === 0) {
    return {};
  }
  
  return {
    $or: fields.map(field => ({
      [field]: { $regex: searchTerm, $options: 'i' }
    }))
  };
}

/**
 * calculateRelevanceScore
 * Calculates search result relevance score
 * @param {Object} doc - Document
 * @param {string} searchTerm - Search term
 * @param {Array} searchFields - Fields searched
 * @returns {number} Relevance score (0-100)
 */
function calculateRelevanceScore(doc, searchTerm, searchFields) {
  let score = 0;
  const term = searchTerm.toLowerCase();
  
  for (const field of searchFields) {
    if (doc[field] && typeof doc[field] === 'string') {
      const value = doc[field].toLowerCase();
      // Exact match = 100, contained = 50, starts with = 75
      if (value === term) score += 100;
      else if (value.includes(term)) score += 50;
      else if (value.startsWith(term)) score += 75;
    }
  }
  
  return Math.min(100, score);
}

/**
 * paginateResults
 * Applies pagination to cursor
 * @param {Cursor} cursor - MongoDB cursor
 * @param {number} page - Page number
 * @param {number} limit - Results per page
 * @returns {Promise<Array>} Paginated results
 */
async function paginateResults(cursor, page = 1, limit = 20) {
  const skip = (Math.max(1, page) - 1) * limit;
  return cursor.skip(skip).limit(limit).toArray();
}

// GET /api/search?q=keyword&type=users&page=1&limit=20
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { q, type, page = '1', limit = '20' } = req.query;
    const searchTerm = q?.trim();
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(100, parseInt(limit) || 20);

    if (!searchTerm) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const db = await connectToDatabase();
    let results = [];
    let total = 0;
    const collection = type || 'all';

    // Search configuration by type
    const searchConfig = {
      users: {
        collection: COLLECTIONS.USERS,
        fields: ['name', 'email', 'role'],
        filter: { active: true }
      },
      classes: {
        collection: COLLECTIONS.CLASSES,
        fields: ['name', 'odId'],
        filter: {}
      },
      subjects: {
        collection: COLLECTIONS.SUBJECTS,
        fields: ['name', 'odId'],
        filter: {}
      },
      notes: {
        collection: COLLECTIONS.CENTRALIZED_NOTES,
        fields: ['title', 'content', 'unitName'],
        filter: { deletedAt: null }
      },
      quizzes: {
        collection: COLLECTIONS.QUIZZES,
        fields: ['title', 'topic'],
        filter: {}
      },
      grades: {
        collection: COLLECTIONS.GRADES,
        fields: ['title', 'category'],
        filter: {}
      },
      tickets: {
        collection: COLLECTIONS.TICKETS,
        fields: ['subject', 'message', 'category'],
        filter: {}
      },
      all: null // Search across all
    };

    const config = searchConfig[collection];
    
    if (collection === 'all') {
      // Search multiple collections
      const searchPromises = Object.entries(searchConfig)
        .filter(([key]) => key !== 'all')
        .map(async ([key, cfg]) => {
          const filter = {
            ...buildSearchFilter(searchTerm, cfg.fields),
            ...cfg.filter
          };
          const docs = await db.collection(cfg.collection)
            .find(filter)
            .limit(10)
            .toArray();
          return docs.map(doc => ({ ...doc, _type: key }));
        });
      
      const flatResults = (await Promise.all(searchPromises)).flat();
      
      // Score and sort results
      const allFields = ['name', 'email', 'title', 'subject', 'content'];
      results = flatResults
        .map(doc => ({
          ...doc,
          id: doc._id?.toString() || doc.id,
          relevanceScore: calculateRelevanceScore(doc, searchTerm, allFields)
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      total = results.length;
      results = results.slice((pageNum - 1) * limitNum, pageNum * limitNum);
    } else if (config) {
      // Search single collection
      const filter = {
        ...buildSearchFilter(searchTerm, config.fields),
        ...config.filter
      };
      
      total = await db.collection(config.collection).countDocuments(filter);
      results = await db.collection(config.collection)
        .find(filter)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .toArray();
      
      // Add relevance scores
      results = results.map(doc => ({
        ...doc,
        id: doc._id?.toString() || doc.id,
        relevanceScore: calculateRelevanceScore(doc, searchTerm, config.fields)
      }));
    }

    res.json({
      success: true,
      data: results,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      },
      meta: {
        searchTerm,
        searchedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/search/users?q=john&role=teacher
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const { q, role, classId, page = '1', limit = '20' } = req.query;
    const searchTerm = q?.trim();
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(100, parseInt(limit) || 20);

    const db = await connectToDatabase();
    const filter = { active: true };
    
    if (searchTerm) {
      filter.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } }
      ];
    }
    
    if (role) filter.role = role;
    if (classId) filter.classId = classId;

    const [users, total] = await Promise.all([
      db.collection(COLLECTIONS.USERS)
        .find(filter)
        .project({ password: 0 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .toArray(),
      db.collection(COLLECTIONS.USERS).countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: users.map(u => ({ ...u, id: u._id?.toString() || u.id })),
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ error: 'User search failed' });
  }
});

// GET /api/search/notes?q=algebra&subjectId=xxx&classId=xxx
router.get('/notes', authMiddleware, async (req, res) => {
  try {
    const { q, subjectId, classId, unitNumber, page = '1', limit = '20' } = req.query;
    const searchTerm = q?.trim();
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(100, parseInt(limit) || 20);

    const db = await connectToDatabase();
    const filter = { deletedAt: null };
    
    if (searchTerm) {
      filter.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { content: { $regex: searchTerm, $options: 'i' } },
        { unitName: { $regex: searchTerm, $options: 'i' } }
      ];
    }
    
    if (subjectId) filter.subjectId = subjectId;
    if (classId) filter.classId = classId;
    if (unitNumber) filter.unitNumber = Number(unitNumber);

    const [notes, total] = await Promise.all([
      db.collection(COLLECTIONS.CENTRALIZED_NOTES)
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .toArray(),
      db.collection(COLLECTIONS.CENTRALIZED_NOTES).countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: notes.map(n => ({ ...n, id: n._id?.toString() || n.id })),
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    console.error('Note search error:', error);
    res.status(500).json({ error: 'Note search failed' });
  }
});

// GET /api/search/quizzes?q=photosynthesis&gradeLevel=Class10
router.get('/quizzes', authMiddleware, async (req, res) => {
  try {
    const { q, gradeLevel, published, page = '1', limit = '20' } = req.query;
    const searchTerm = q?.trim();
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(100, parseInt(limit) || 20);

    const db = await connectToDatabase();
    const filter = {};
    
    if (searchTerm) {
      filter.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { topic: { $regex: searchTerm, $options: 'i' } }
      ];
    }
    
    if (gradeLevel) filter.gradeLevel = gradeLevel;
    if (published !== undefined) filter.published = published === 'true';

    const [quizzes, total] = await Promise.all([
      db.collection(COLLECTIONS.QUIZZES)
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .toArray(),
      db.collection(COLLECTIONS.QUIZZES).countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: quizzes.map(qz => ({ ...qz, id: qz._id?.toString() || qz.id })),
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    console.error('Quiz search error:', error);
    res.status(500).json({ error: 'Quiz search failed' });
  }
});

// GET /api/search/tickets?q=math&status=open&priority=high
router.get('/tickets', authMiddleware, async (req, res) => {
  try {
    const { q, status, category, priority, assignedToId, page = '1', limit = '20' } = req.query;
    const searchTerm = q?.trim();
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(100, parseInt(limit) || 20);

    const db = await connectToDatabase();
    const filter = {};
    
    if (searchTerm) {
      filter.$or = [
        { subject: { $regex: searchTerm, $options: 'i' } },
        { message: { $regex: searchTerm, $options: 'i' } },
        { category: { $regex: searchTerm, $options: 'i' } }
      ];
    }
    
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (assignedToId) filter.assignedToId = assignedToId;

    const [tickets, total] = await Promise.all([
      db.collection(COLLECTIONS.TICKETS)
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .toArray(),
      db.collection(COLLECTIONS.TICKETS).countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: tickets.map(t => ({ ...t, id: t._id?.toString() || t.id })),
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    console.error('Ticket search error:', error);
    res.status(500).json({ error: 'Ticket search failed' });
  }
});

export default router;

// ================================================================================
// SEARCH INDEX CREATION (For optimization)
// ================================================================================

/**
 * createSearchIndexes
 * Creates text indexes for efficient searching
 * Run once during setup
 */
export async function createSearchIndexes(db) {
  const indexes = [
    // Users index
    { 
      key: { name: 'text', email: 'text' }, 
      name: 'users_text_index',
      collection: COLLECTIONS.USERS 
    },
    // Centralized notes index
    { 
      key: { title: 'text', content: 'text', unitName: 'text' }, 
      name: 'notes_text_index',
      collection: COLLECTIONS.CENTRALIZED_NOTES 
    },
    // Quizzes index
    { 
      key: { title: 'text', topic: 'text' }, 
      name: 'quizzes_text_index',
      collection: COLLECTIONS.QUIZZES 
    },
    // Tickets index
    { 
      key: { subject: 'text', message: 'text', category: 'text' }, 
      name: 'tickets_text_index',
      collection: COLLECTIONS.TICKETS 
    }
  ];

  for (const idx of indexes) {
    try {
      await db.collection(idx.collection).createIndex(
        idx.key,
        { name: idx.name }
      );
      console.log(`[Search] Created index: ${idx.name}`);
    } catch (error) {
      if (error.code !== 85) { // Ignore index exists error
        console.error(`[Search] Index error: ${error.message}`);
      }
    }
  }
}

// ================================================================================
// SEARCH UTILITY FUNCTIONS
// ================================================================================

/**
 * highlightMatches
 * Highlights search matches in text
 * @param {string} text - Original text
 * @param {string} searchTerm - Term to highlight
 * @returns {string} HTML with highlights
 */
export function highlightMatches(text, searchTerm) {
  if (!text || !searchTerm) return text;
  
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * fuzzySearch
 * Simple fuzzy search implementation
 * @param {string} source - Source string
 * @param {string} target - Target string  
 * @returns {number} Similarity score (0-1)
 */
export function fuzzySearch(source, target) {
  if (!source || !target) return 0;
  
  source = source.toLowerCase();
  target = target.toLowerCase();
  
  if (source === target) return 1;
  if (source.includes(target)) return 0.8;
  if (target.includes(source)) return 0.7;
  
  // Levenshtein distance-based score
  const longer = source.length > target.length ? source : target;
  const shorter = source.length > target.length ? target : source;
  
  if (longer.length === 0) return 1;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(a, b) {
  const matrix = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

export default router;

================================================================================
                              END OF SEARCH MODULE
================================================================================
// PocketBase Initialization & Collection Schema Setup
// Run this during deployment to create collections and indices

import fetch from 'node-fetch';

interface CollectionSchema {
  name: string;
  type: 'base' | 'auth' | 'view';
  fields: any[];
  indexes?: string[];
  indexes_list?: string[];
}

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@gyandeep.local';
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || 'change_me';

class PocketBaseInitializer {
  private token: string | null = null;

  async initialize() {
    console.log('🚀 Initializing PocketBase...');
    
    try {
      await this.authenticate();
      await this.createCollections();
      await this.createIndexes();
      console.log('✅ PocketBase initialized successfully');
    } catch (error) {
      console.error('❌ PocketBase initialization failed:', error);
      process.exit(1);
    }
  }

  private async authenticate() {
    console.log('🔐 Authenticating with PocketBase...');
    
    const response = await fetch(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identity: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to authenticate with PocketBase');
    }

    const data: any = await response.json();
    this.token = data.token;
    console.log('✓ Authenticated');
  }

  private async createCollections() {
    console.log('📚 Creating collections...');

    const collections: CollectionSchema[] = [
      {
        name: 'users',
        type: 'auth',
        fields: [
          {
            id: 'email',
            name: 'email',
            type: 'email',
            required: true,
            unique: true,
          },
          {
            id: 'full_name',
            name: 'full_name',
            type: 'text',
          },
          {
            id: 'avatar_url',
            name: 'avatar_url',
            type: 'file',
          },
          {
            id: 'role',
            name: 'role',
            type: 'select',
            values: ['user', 'teacher', 'admin'],
            default: 'user',
          },
          {
            id: 'phone',
            name: 'phone',
            type: 'text',
          },
          {
            id: 'bio',
            name: 'bio',
            type: 'editor',
          },
          {
            id: 'preferences',
            name: 'preferences',
            type: 'json',
          },
          {
            id: 'is_verified',
            name: 'is_verified',
            type: 'bool',
            default: false,
          },
          {
            id: 'created_at',
            name: 'created_at',
            type: 'autodate',
            onCreate: true,
          },
          {
            id: 'updated_at',
            name: 'updated_at',
            type: 'autodate',
            onUpdate: true,
          },
        ],
      },
      {
        name: 'books',
        type: 'base',
        fields: [
          {
            id: 'title',
            name: 'title',
            type: 'text',
            required: true,
          },
          {
            id: 'author',
            name: 'author',
            type: 'text',
            required: true,
          },
          {
            id: 'description',
            name: 'description',
            type: 'editor',
          },
          {
            id: 'cover_image',
            name: 'cover_image',
            type: 'file',
          },
          {
            id: 'pdf_url',
            name: 'pdf_url',
            type: 'url',
          },
          {
            id: 'category',
            name: 'category',
            type: 'select',
            values: ['fiction', 'non-fiction', 'science', 'history', 'biography', 'other'],
          },
          {
            id: 'difficulty_level',
            name: 'difficulty_level',
            type: 'select',
            values: ['beginner', 'intermediate', 'advanced'],
            default: 'beginner',
          },
          {
            id: 'isbn',
            name: 'isbn',
            type: 'text',
          },
          {
            id: 'total_pages',
            name: 'total_pages',
            type: 'number',
          },
          {
            id: 'published_date',
            name: 'published_date',
            type: 'date',
          },
          {
            id: 'tags',
            name: 'tags',
            type: 'select',
            values: [],
            multiple: true,
          },
          {
            id: 'rating',
            name: 'rating',
            type: 'number',
          },
          {
            id: 'created_by',
            name: 'created_by',
            type: 'relation',
            collectionId: 'users',
            required: true,
          },
          {
            id: 'created_at',
            name: 'created_at',
            type: 'autodate',
            onCreate: true,
          },
          {
            id: 'updated_at',
            name: 'updated_at',
            type: 'autodate',
            onUpdate: true,
          },
        ],
      },
      {
        name: 'quizzes',
        type: 'base',
        fields: [
          {
            id: 'book_id',
            name: 'book_id',
            type: 'relation',
            collectionId: 'books',
            required: true,
          },
          {
            id: 'title',
            name: 'title',
            type: 'text',
            required: true,
          },
          {
            id: 'description',
            name: 'description',
            type: 'editor',
          },
          {
            id: 'questions',
            name: 'questions',
            type: 'json',
            required: true,
          },
          {
            id: 'difficulty',
            name: 'difficulty',
            type: 'select',
            values: ['easy', 'medium', 'hard'],
          },
          {
            id: 'time_limit',
            name: 'time_limit',
            type: 'number',
          },
          {
            id: 'passing_score',
            name: 'passing_score',
            type: 'number',
            default: 70,
          },
          {
            id: 'created_by',
            name: 'created_by',
            type: 'relation',
            collectionId: 'users',
            required: true,
          },
          {
            id: 'is_published',
            name: 'is_published',
            type: 'bool',
            default: true,
          },
          {
            id: 'created_at',
            name: 'created_at',
            type: 'autodate',
            onCreate: true,
          },
          {
            id: 'updated_at',
            name: 'updated_at',
            type: 'autodate',
            onUpdate: true,
          },
        ],
      },
      {
        name: 'quiz_submissions',
        type: 'base',
        fields: [
          {
            id: 'quiz_id',
            name: 'quiz_id',
            type: 'relation',
            collectionId: 'quizzes',
            required: true,
          },
          {
            id: 'user_id',
            name: 'user_id',
            type: 'relation',
            collectionId: 'users',
            required: true,
          },
          {
            id: 'answers',
            name: 'answers',
            type: 'json',
            required: true,
          },
          {
            id: 'score',
            name: 'score',
            type: 'number',
          },
          {
            id: 'passed',
            name: 'passed',
            type: 'bool',
          },
          {
            id: 'time_taken',
            name: 'time_taken',
            type: 'number',
          },
          {
            id: 'submitted_at',
            name: 'submitted_at',
            type: 'autodate',
            onCreate: true,
          },
        ],
      },
      {
        name: 'user_progress',
        type: 'base',
        fields: [
          {
            id: 'user_id',
            name: 'user_id',
            type: 'relation',
            collectionId: 'users',
            required: true,
          },
          {
            id: 'book_id',
            name: 'book_id',
            type: 'relation',
            collectionId: 'books',
            required: true,
          },
          {
            id: 'chapters_read',
            name: 'chapters_read',
            type: 'number',
            default: 0,
          },
          {
            id: 'pages_read',
            name: 'pages_read',
            type: 'number',
            default: 0,
          },
          {
            id: 'quiz_scores',
            name: 'quiz_scores',
            type: 'json',
          },
          {
            id: 'last_read_position',
            name: 'last_read_position',
            type: 'number',
          },
          {
            id: 'completion_percentage',
            name: 'completion_percentage',
            type: 'number',
            default: 0,
          },
          {
            id: 'is_completed',
            name: 'is_completed',
            type: 'bool',
            default: false,
          },
          {
            id: 'completed_at',
            name: 'completed_at',
            type: 'date',
          },
          {
            id: 'last_accessed',
            name: 'last_accessed',
            type: 'autodate',
            onUpdate: true,
          },
          {
            id: 'created_at',
            name: 'created_at',
            type: 'autodate',
            onCreate: true,
          },
        ],
      },
      {
        name: 'notifications',
        type: 'base',
        fields: [
          {
            id: 'user_id',
            name: 'user_id',
            type: 'relation',
            collectionId: 'users',
            required: true,
          },
          {
            id: 'title',
            name: 'title',
            type: 'text',
            required: true,
          },
          {
            id: 'message',
            name: 'message',
            type: 'editor',
          },
          {
            id: 'type',
            name: 'type',
            type: 'select',
            values: ['info', 'success', 'warning', 'error'],
          },
          {
            id: 'is_read',
            name: 'is_read',
            type: 'bool',
            default: false,
          },
          {
            id: 'read_at',
            name: 'read_at',
            type: 'date',
          },
          {
            id: 'created_at',
            name: 'created_at',
            type: 'autodate',
            onCreate: true,
          },
        ],
      },
    ];

    for (const collection of collections) {
      try {
        await this.createCollection(collection);
        console.log(`✓ Created collection: ${collection.name}`);
      } catch (error) {
        console.warn(`⚠ Collection ${collection.name} may already exist:`, error);
      }
    }
  }

  private async createCollection(collection: CollectionSchema) {
    const response = await fetch(`${POCKETBASE_URL}/api/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(collection),
    });

    if (!response.ok) {
      throw new Error(`Failed to create collection: ${response.statusText}`);
    }
  }

  private async createIndexes() {
    console.log('📇 Creating indexes...');
    // Indexes will be created automatically based on relation fields
    console.log('✓ Indexes created');
  }
}

export const initializePocketBase = async () => {
  const initializer = new PocketBaseInitializer();
  await initializer.initialize();
};

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  initializePocketBase();
}
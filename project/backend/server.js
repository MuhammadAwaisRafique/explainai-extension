import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase - using the same environment variables as frontend
const supabaseUrl = process.env.SUPABASE_URL || 'https://ipadyqvmeemxuieqjgrw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwYWR5cXZtZWVteHVpZXFqZ3J3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI3MTY1MCwiZXhwIjoyMDY3ODQ3NjUwfQ.MKfLb3sgkLx10s7uyNQG3iNq2aP58p5J-I9cA2J7MDY';

console.log('🔧 Supabase Configuration:');
console.log('   URL:', supabaseUrl);
console.log('   Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NOT SET');

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:5173', 
    'http://localhost:5174', // <--- add this line
    'chrome-extension://*',
    'https://*.vercel.app',
    'https://*.railway.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Fallback explanation generator
const generateFallbackExplanation = (text) => {
  const words = text.toLowerCase().split(/\s+/);
  const wordCount = words.length;
  
  // Simple fallback based on text characteristics
  if (wordCount <= 3) {
    return `This appears to be a short phrase or term. You can look it up in a dictionary or search engine for more detailed information.`;
  } else if (wordCount <= 10) {
    return `This is a brief text snippet. For a more detailed explanation, consider searching online or consulting relevant resources.`;
  } else {
    return `This is a longer text passage. To better understand it, you might want to break it down into smaller sections or research the key concepts mentioned.`;
  }
};

// Test database connection
async function testDatabaseConnection() {
  try {
    console.log('🔍 Testing database connection...');
    const { data, error } = await supabase
      .from('explanations')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    return false;
  }
}

// Test database connection on startup
testDatabaseConnection();

// Simple health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      message: 'Backend is running'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      timestamp: new Date().toISOString(),
      error: error.message 
    });
  }
});

// Test endpoint to check database structure
app.get('/api/test/database', async (req, res) => {
  try {
    console.log('🔍 Testing database structure...');
    
    // Check if explanations table exists and get its structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('explanations')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Table structure error:', tableError);
      return res.status(500).json({
        success: false,
        error: 'Database table error',
        details: tableError.message
      });
    }
    
    // Get total count
    const { count, error: countError } = await supabase
      .from('explanations')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Count error:', countError);
    }
    
    console.log('✅ Database structure test successful');
    
    res.json({
      success: true,
      tableExists: true,
      totalRecords: count || 0,
      sampleRecord: tableInfo?.[0] ? {
        id: tableInfo[0].id,
        user_id: tableInfo[0].user_id,
        original_text: tableInfo[0].original_text?.substring(0, 50) + '...',
        created_at: tableInfo[0].created_at
      } : null,
      columns: tableInfo?.[0] ? Object.keys(tableInfo[0]) : []
    });
    
  } catch (error) {
    console.error('❌ Database test error:', error);
    res.status(500).json({
      success: false,
      error: 'Database test failed',
      details: error.message
    });
  }
});

// Routes
app.post('/api/explain', async (req, res) => {
  try {
    const { text, userId, context } = req.body;
    
    if (!text || text.length > 5000) {
      return res.status(400).json({ 
        error: 'Invalid text length. Please select text between 1 and 5000 characters.',
        success: false 
      });
    }

    // Validate user ID format (UUID)
    if (userId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      console.warn('⚠️ Invalid user ID format:', userId);
      console.warn('Expected UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
    }

    let explanation = '';
    let isFallback = false;
    let errorDetails = null;
    let aiProvider = 'gemini';

    try {
      // Try to generate explanation using Google Gemini
      const prompt = `You are an expert at explaining complex concepts in simple, clear language. 
      
When given text, provide a concise explanation that:
1. Uses everyday language
2. Provides relevant context
3. Keeps explanations under 150 words
4. Is helpful for learners and non-experts

Context: ${context || 'General web content'}

Please explain this text in simple terms: "${text}"`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      explanation = response.text().trim();
      
      console.log('✅ Gemini AI explanation generated successfully');
      
    } catch (geminiError) {
      console.log('⚠️  Gemini API error - trying OpenAI as backup:', geminiError.message);
      
      // Try OpenAI as backup if Gemini fails
      try {
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an expert at explaining complex concepts in simple, clear language. 
          When given text, provide a concise explanation that:
          1. Uses everyday language
          2. Provides relevant context
          3. Keeps explanations under 150 words
          4. Is helpful for learners and non-experts
          
          Context: ${context || 'General web content'}`
        },
        {
          role: "user",
          content: `Please explain this text in simple terms: "${text}"`
        }
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

        explanation = completion.choices[0].message.content.trim();
        aiProvider = 'openai';
        console.log('✅ OpenAI backup explanation generated successfully');
        
      } catch (openaiError) {
        // Both AI services failed, use fallback
        console.log('❌ Both Gemini and OpenAI failed - using fallback explanation');
        
        if (openaiError.code === 'insufficient_quota' || openaiError.status === 429) {
          errorDetails = {
            type: 'quota_exceeded',
            message: 'Both AI services are unavailable. Using fallback explanation.',
            details: 'Gemini and OpenAI quotas exceeded. Please check your API keys and billing.'
          };
        } else if (openaiError.code === 'invalid_api_key') {
          errorDetails = {
            type: 'invalid_key',
            message: 'AI services are not properly configured. Using fallback explanation.',
            details: 'Please check your Gemini and OpenAI API key configurations.'
          };
        } else {
          errorDetails = {
            type: 'api_error',
            message: 'AI services are temporarily unavailable. Using fallback explanation.',
            details: 'Both Gemini and OpenAI are experiencing issues. Please try again later.'
          };
        }
        
        // Generate fallback explanation
        explanation = generateFallbackExplanation(text);
        isFallback = true;
        aiProvider = 'fallback';
      }
    }

    // Save to database if user is authenticated and has valid UUID
    if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      try {
        console.log('💾 Saving explanation to database for user:', userId);
        
        const { data, error } = await supabase
        .from('explanations')
        .insert({
          user_id: userId,
          original_text: text,
          explanation: explanation,
          context: context || 'Unknown',
            is_fallback: isFallback,
            ai_provider: aiProvider,
          created_at: new Date().toISOString()
          })
          .select();
        
        if (error) {
          console.error('❌ Database save error:', error);
          console.error('Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          // Don't fail the request if database save fails
        } else {
          console.log('✅ Explanation saved to database successfully');
          console.log('📝 Saved explanation ID:', data?.[0]?.id);
        }
      } catch (dbError) {
        console.error('❌ Database save exception:', dbError.message);
        console.error('Exception details:', {
          message: dbError.message,
          stack: dbError.stack,
          name: dbError.name
        });
        // Don't fail the request if database save fails
      }
    } else {
      if (userId) {
        console.log('⚠️ Invalid user ID format, skipping database save. User ID:', userId);
      } else {
        console.log('⚠️ No user ID provided, skipping database save');
      }
    }

    res.json({ 
      explanation,
      success: true,
      isFallback,
      errorDetails,
      aiProvider,
      savedToDatabase: !!(userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)),
      message: isFallback 
        ? 'Using fallback explanation due to AI service limitations.' 
        : `Explanation generated successfully using ${aiProvider.toUpperCase()}.`
    });

  } catch (error) {
    console.error('💥 Unexpected error in /api/explain:', error.message);
    res.status(500).json({ 
      error: 'An unexpected error occurred while processing your request.',
      success: false,
      message: 'Please try again later or contact support if the problem persists.'
    });
  }
});

app.get('/api/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    console.log('🔍 Fetching history for user:', userId);
    console.log('📄 Page:', page, 'Limit:', limit);
    
    // First, let's check if the user exists and get total count
    const { count, error: countError } = await supabase
      .from('explanations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (countError) {
      console.error('❌ Error counting explanations:', countError);
      throw countError;
    }
    
    console.log('📊 Total explanations for user:', count);
    
    // Now get the actual data
    const { data, error } = await supabase
      .from('explanations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error('❌ Error fetching explanations:', error);
      throw error;
    }

    console.log('✅ Successfully fetched explanations:', data?.length || 0);
    console.log('📋 Sample data:', data?.[0] ? {
      id: data[0].id,
      original_text: data[0].original_text?.substring(0, 50) + '...',
      created_at: data[0].created_at
    } : 'No data');

    res.json({ 
      explanations: data || [],
      success: true,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('❌ Error fetching history:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch history',
      success: false,
      details: error.message
    });
  }
});

// Check records endpoint for debugging
app.get('/api/check-records/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('🔍 Checking records for user:', userId);
    
    // Get total count
    const { count, error: countError } = await supabase
      .from('explanations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (countError) {
      console.error('❌ Error counting explanations:', countError);
      throw countError;
    }
    
    // Get recent records
    const { data, error } = await supabase
      .from('explanations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Error fetching recent explanations:', error);
      throw error;
    }

    console.log('✅ Records check successful:', {
      totalRecords: count || 0,
      recentRecords: data?.length || 0
    });

    res.json({ 
      success: true,
      user_id: userId,
      totalRecords: count || 0,
      recentRecords: data || []
    });

  } catch (error) {
    console.error('❌ Error checking records:', error.message);
    res.status(500).json({ 
      error: 'Failed to check records',
      success: false,
      details: error.message
    });
  }
});

app.delete('/api/explanation/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('explanations')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });

  } catch (error) {
    console.error('❌ Error deleting explanation:', error.message);
    res.status(500).json({ 
      error: 'Failed to delete explanation',
      success: false 
    });
  }
});

// Health check endpoint with AI service status
app.get('/api/health', async (req, res) => {
  try {
    let geminiStatus = 'unknown';
    let openaiStatus = 'unknown';
    
    // Test Gemini connection
    try {
      const result = await model.generateContent('Hello');
      await result.response;
      geminiStatus = 'healthy';
    } catch (geminiError) {
      if (geminiError.message?.includes('API_KEY_INVALID')) {
        geminiStatus = 'invalid_key';
      } else if (geminiError.message?.includes('QUOTA_EXCEEDED')) {
        geminiStatus = 'quota_exceeded';
      } else {
        geminiStatus = 'error';
      }
    }
    
    // Test OpenAI connection (backup)
    try {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      await openai.models.list();
      openaiStatus = 'healthy';
    } catch (openaiError) {
      if (openaiError.code === 'insufficient_quota') {
        openaiStatus = 'quota_exceeded';
      } else if (openaiError.code === 'invalid_api_key') {
        openaiStatus = 'invalid_key';
      } else {
        openaiStatus = 'error';
      }
    }
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        gemini: geminiStatus,
        openai: openaiStatus
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      timestamp: new Date().toISOString(),
      error: error.message 
    });
  }
});

// Test endpoint to create sample data
app.post('/api/test/create-sample', async (req, res) => {
  try {
    const { userId } = req.body;
    
    console.log('🧪 Creating sample data for user:', userId);
    
    if (!userId) {
      console.error('❌ User ID is required');
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Create sample explanations
    const sampleExplanations = [
      {
        user_id: userId,
        original_text: "Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions without being explicitly programmed.",
        explanation: "Machine learning is like teaching a computer to learn from examples, just like how you learn from experience. Instead of following strict rules, the computer finds patterns in data to make predictions or decisions.",
        context: "Wikipedia",
        is_fallback: false,
        ai_provider: 'gemini',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
      },
      {
        user_id: userId,
        original_text: "Quantum computing leverages quantum mechanical phenomena such as superposition and entanglement to process information.",
        explanation: "Quantum computing uses the strange properties of very small particles to solve complex problems much faster than regular computers. It's like having a computer that can be in multiple states at once.",
        context: "Research Paper",
        is_fallback: false,
        ai_provider: 'gemini',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
      },
      {
        user_id: userId,
        original_text: "Blockchain technology provides a decentralized and distributed ledger that records transactions across multiple computers.",
        explanation: "Blockchain is like a digital ledger that's shared across many computers. Each transaction is recorded in a block, and these blocks are linked together in a chain that can't be easily changed.",
        context: "Tech Article",
        is_fallback: false,
        ai_provider: 'openai',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
      }
    ];

    console.log('📝 Inserting sample explanations...');
    const { data, error } = await supabase
      .from('explanations')
      .insert(sampleExplanations);

    if (error) {
      console.error('❌ Error inserting sample data:', error);
      throw error;
    }

    console.log('✅ Sample data created successfully:', data?.length || 0, 'records');

    res.json({ 
      success: true, 
      message: 'Sample explanations created successfully',
      count: sampleExplanations.length,
      data: data
    });

  } catch (error) {
    console.error('❌ Error creating sample data:', error.message);
    res.status(500).json({ 
      error: 'Failed to create sample data',
      success: false,
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 AI Annotator Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔧 API endpoint: http://localhost:${PORT}/api/explain`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test/create-sample`);
  console.log(`🤖 Primary AI: Google Gemini`);
  console.log(`🔄 Backup AI: OpenAI`);
});
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

console.log('🔧 Testing Supabase Connection...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NOT SET');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseConnection() {
  try {
    console.log('\n🔍 Testing database connection...');
    
    // Test 1: Check if table exists
    const { data: tableTest, error: tableError } = await supabase
      .from('explanations')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Table test failed:', tableError);
      return false;
    }
    
    console.log('✅ Table exists and is accessible');
    
    // Test 2: Get total count
    const { count, error: countError } = await supabase
      .from('explanations')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Count test failed:', countError);
      return false;
    }
    
    console.log('✅ Current record count:', count);
    
    // Test 3: Insert test record
    const testRecord = {
      user_id: '00000000-0000-0000-0000-000000000001', // Valid UUID format
      original_text: 'This is a test explanation to verify database connection.',
      explanation: 'This is a test explanation that was inserted to verify the database connection is working properly.',
      context: 'Test Context',
      is_fallback: false,
      ai_provider: 'test',
      created_at: new Date().toISOString()
    };
    
    console.log('\n📝 Inserting test record...');
    console.log('Test record:', testRecord);
    
    const { data: insertData, error: insertError } = await supabase
      .from('explanations')
      .insert(testRecord)
      .select();
    
    if (insertError) {
      console.error('❌ Insert test failed:', insertError);
      console.error('Error details:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
      return false;
    }
    
    console.log('✅ Test record inserted successfully!');
    console.log('Inserted record ID:', insertData[0].id);
    
    // Test 4: Verify the record was inserted
    const { data: verifyData, error: verifyError } = await supabase
      .from('explanations')
      .select('*')
      .eq('id', insertData[0].id);
    
    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
      return false;
    }
    
    console.log('✅ Record verified in database');
    console.log('Verified record:', verifyData[0]);
    
    // Test 5: Get updated count
    const { count: newCount, error: newCountError } = await supabase
      .from('explanations')
      .select('*', { count: 'exact', head: true });
    
    if (newCountError) {
      console.error('❌ New count test failed:', newCountError);
    } else {
      console.log('✅ New record count:', newCount);
    }
    
    console.log('\n🎉 All database tests passed!');
    return true;
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return false;
  }
}

// Run the test
testDatabaseConnection()
  .then(success => {
    if (success) {
      console.log('\n✅ Database connection is working properly!');
    } else {
      console.log('\n❌ Database connection failed!');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  }); 
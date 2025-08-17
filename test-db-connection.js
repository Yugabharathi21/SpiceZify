// Simple test script to verify database connection
// Run with: node test-db-connection.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseConnection() {
  try {
    console.log('🔄 Testing database connection...');
    
    // Test 1: Check if we can connect and query tables
    const { data: tables, error: tablesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
      
    if (tablesError) {
      console.error('❌ Failed to connect to database:', tablesError.message);
      return false;
    }
    
    console.log('✅ Database connection successful');
    
    // Test 2: Check if sample data exists
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .limit(5);
      
    if (convError) {
      console.error('❌ Failed to query conversations:', convError.message);
      return false;
    }
    
    console.log(`✅ Found ${conversations.length} sample conversations`);
    
    // Test 3: Test preferences upsert
    const testUserId = '00000000-0000-0000-0000-000000000001';
    const testPrefs = { testConnection: true, timestamp: new Date().toISOString() };
    
    const { data: upsertData, error: upsertError } = await supabase
      .from('preferences')
      .upsert({ user_id: testUserId, data: testPrefs }, { onConflict: 'user_id' })
      .select();
      
    if (upsertError) {
      console.error('❌ Failed to upsert preferences:', upsertError.message);
      return false;
    }
    
    console.log('✅ Preferences upsert successful');
    
    // Test 4: Verify the upsert worked
    const { data: fetchData, error: fetchError } = await supabase
      .from('preferences')
      .select('data')
      .eq('user_id', testUserId)
      .single();
      
    if (fetchError) {
      console.error('❌ Failed to fetch preferences:', fetchError.message);
      return false;
    }
    
    console.log('✅ Preferences fetch successful:', fetchData.data);
    
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

// Run the test
testDatabaseConnection().then(success => {
  if (success) {
    console.log('\n🎉 All database tests passed! Your SpiceZify database is ready.');
  } else {
    console.log('\n💥 Database tests failed. Check the errors above.');
    process.exit(1);
  }
});

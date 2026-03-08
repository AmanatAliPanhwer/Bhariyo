const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.supabaseProjectURL;
const supabaseKey = process.env.supabaseSecretKey; // Using secret key for server-side bypass of RLS if needed

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;

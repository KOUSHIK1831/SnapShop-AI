import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const email = `test_${Date.now()}@example.com`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password: 'password123',
    options: {
      data: {
        name: 'Test User',
        phone: '+919999999999',
        role: 'buyer',
      },
    },
  });
  console.log('SignUp Data:', JSON.stringify(data, null, 2));
  console.log('SignUp Error:', error);

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email,
      password: 'password123',
    });
  console.log('SignIn Error:', signInError);
}

test();

/**
 * Database Migration Script
 * Runs database migrations for production deployment
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigrations() {
  console.log('🚀 Starting database migrations...');
  
  try {
    // Check if migrations table exists
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'migrations');
    
    if (!tables || tables.length === 0) {
      // Create migrations table
      console.log('📦 Creating migrations table...');
      const { error } = await supabase.rpc('run_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.migrations (
            id SERIAL PRIMARY KEY,
            filename TEXT NOT NULL UNIQUE,
            executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `
      });
      
      if (error) {
        console.error('❌ Failed to create migrations table:', error);
        process.exit(1);
      }
    }
    
    // Get list of migration files
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('📁 No migrations directory found, skipping migrations');
      return;
    }
    
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    // Get executed migrations
    const { data: executedMigrations } = await supabase
      .from('migrations')
      .select('filename');
    
    const executed = new Set(executedMigrations?.map(m => m.filename) || []);
    
    // Run pending migrations
    for (const file of migrationFiles) {
      if (!executed.has(file)) {
        console.log(`📝 Running migration: ${file}`);
        
        const migrationPath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(migrationPath, 'utf8');
        
        const { error } = await supabase.rpc('run_sql', { sql });
        
        if (error) {
          console.error(`❌ Migration failed: ${file}`, error);
          process.exit(1);
        }
        
        // Record migration
        await supabase
          .from('migrations')
          .insert({ filename: file });
        
        console.log(`✅ Migration completed: ${file}`);
      }
    }
    
    console.log('✅ All migrations completed successfully');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

// Run migrations
runMigrations();

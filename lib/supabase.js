import { createClient } from '@supabase/supabase-js'

// 1. Verifique se não há espaços nas strings abaixo
const supabaseUrl = 'https://bzkhqlzbrewwthfazvec.supabase.co'.trim()
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6a2hxbHpicmV3d3RoZmF6dmVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NTAxMzksImV4cCI6MjA4MjAyNjEzOX0.lGzs7Q2QQSELZ4HiO3TWMe8Yacj1lVc_03wN64zvvDI'.trim()

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // Essencial para evitar o erro de fetch no Next.js 16
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  global: {
    headers: { 'x-my-custom-header': 'my-app' }, // Ajuda a evitar alguns bloqueios de rede
  }
})
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6a2hxbHpicmV3d3RoZmF6dmVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NTAxMzksImV4cCI6MjA4MjAyNjEzOX0.lGzs7Q2QQSELZ4HiO3TWMe8Yacj1lVc_03wN64zvvDI
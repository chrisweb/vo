//import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

// Handle environment variables safely
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Check if the environment variables are set
if (supabaseUrl === '' || supabaseAnonKey === '') {
    console.warn('Supabase URL or Anonymous Key is missing. Make sure to set these in your .env.local file.')
}

//export const supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
        params: {
            eventsPerSecond: 10,
        },
    },
})
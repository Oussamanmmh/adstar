import "server-only"

import { createClient } from "@supabase/supabase-js"
import { supabaseUrl } from "./env"

function requireServiceRoleKey(): string {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error("Missing Supabase environment variable: SUPABASE_SERVICE_ROLE_KEY")
  }

  return serviceRoleKey
}

export function createSupabaseAdminClient() {
  return createClient(supabaseUrl, requireServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
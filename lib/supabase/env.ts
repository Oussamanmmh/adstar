function requireEnv(value: string | undefined, keyName: string): string {
  if (!value) {
    throw new Error(`Missing Supabase environment variable: ${keyName}`)
  }

  return value
}

export const supabaseUrl = requireEnv(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_SUPABASE_URL,
  "NEXT_PUBLIC_SUPABASE_URL"
)

export const supabaseAnonKey = requireEnv(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_SUPABASE_ANON_KEY,
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
)

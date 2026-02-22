import { createClient } from '@supabase/supabase-js';
import type { VercelRequest } from '@vercel/node';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AuthUser {
  id: string;
  email?: string;
  role?: string;
}

/**
 * Verify the Supabase JWT from the Authorization header.
 * Returns the authenticated user or null.
 */
export async function verifyAuth(req: VercelRequest): Promise<AuthUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  // Fetch role from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    email: user.email,
    role: profile?.role || 'student'
  };
}

/**
 * Require authentication — returns user or sends 401 response.
 */
export async function requireAuth(req: VercelRequest): Promise<AuthUser | null> {
  const user = await verifyAuth(req);
  return user;
}

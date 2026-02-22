import { supabase } from './supabaseClient';
import { calculateDistance } from './locationService';
import type { Coordinates } from '../types';

// ─── Auth Functions ──────────────────────────────────────────────────────────

export async function register(email: string, password: string, name: string, role: string = 'student') {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role }
    }
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function loginWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`
    }
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  // Fetch full profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  return {
    id: user.id,
    email: user.email,
    name: profile.name,
    role: profile.role,
    faceImage: profile.face_image,
    preferences: profile.preferences || {},
    history: profile.history || [],
    assignedSubjects: profile.assigned_subjects || [],
    performance: profile.performance || [],
    classId: profile.class_id,
    xp: profile.xp || 0,
    badges: profile.badges || [],
    coins: profile.coins || 0,
    level: profile.level || 1,
    password: undefined // never expose
  };
}

// ─── Face Auth ───────────────────────────────────────────────────────────────

export async function registerFace(userId: string, imageDataUrl: string): Promise<{ ok: boolean }> {
  // Upload to Supabase Storage 'faces' bucket
  const base64Data = imageDataUrl.split(',')[1];
  if (!base64Data) return { ok: false };

  const blob = await fetch(imageDataUrl).then(r => r.blob());

  const { error: uploadError } = await supabase.storage
    .from('faces')
    .upload(`${userId}/face.jpg`, blob, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (uploadError) {
    console.error('Face upload error:', uploadError);
    throw new Error('Face registration failed');
  }

  // Also store data URL in profile for quick access
  await supabase.from('profiles').update({ face_image: imageDataUrl }).eq('id', userId);

  return { ok: true };
}

export async function verifyFace(
  imageDataUrl: string,
  userId?: string
): Promise<{ authenticated: boolean; confidence?: number }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const apiBase = import.meta.env.VITE_API_URL || '';
  const res = await fetch(`${apiBase}/api/face-auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ image: imageDataUrl, user_id: userId })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Face verification failed');
  }
  return res.json();
}

// ─── Location Auth ───────────────────────────────────────────────────────────

export async function verifyLocation(
  current: Coordinates,
  target: Coordinates,
  radiusMeters: number
): Promise<{ authenticated: boolean; distance_m: number; radius_m: number }> {
  const distance_m = calculateDistance(current, target);
  const authenticated = distance_m <= radiusMeters;
  return { authenticated, distance_m, radius_m: radiusMeters };
}

// ─── Legacy Compat (kept for Login.tsx backward compatibility during migration) ──

export async function hashPassword(plain: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(plain));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function passwordMatches(input: string, stored: string | undefined): Promise<boolean> {
  if (!stored) return false;
  if (/^[0-9a-f]{64}$/.test(stored)) {
    const hashed = await hashPassword(input);
    return hashed === stored;
  }
  return input === stored;
}

/**
 * lib/jsonParser.ts
 * Robust JSON extraction from AI responses
 * Handles markdown fences, extra text, and malformed JSON
 */

export function extractJSON<T = any>(raw: string, fallback: T): T {
  const cleaned = cleanResponse(raw);

  // Try direct parse first
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try to find JSON array
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]) as T;
      } catch {
        // Continue to object search
      }
    }

    // Try to find JSON object
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]) as T;
      } catch {
        // Try fixing common JSON issues
      }
    }

    // Attempt to repair JSON
    const repaired = repairJSON(cleaned);
    if (repaired) {
      try {
        return JSON.parse(repaired) as T;
      } catch {
        // All parsing attempts failed
      }
    }
  }

  console.warn('[JSONParser] Failed to extract JSON, returning fallback');
  return fallback;
}

function cleanResponse(raw: string): string {
  return raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();
}

function repairJSON(raw: string): string | null {
  try {
    let repaired = raw;

    // Fix trailing commas
    repaired = repaired.replace(/,\s*([}\]])/g, '$1');

    // Fix unquoted keys
    repaired = repaired.replace(/(\w+)\s*:/g, '"$1":');

    // Fix single quotes to double quotes
    repaired = repaired.replace(/'/g, '"');

    // Fix missing commas between objects/arrays
    repaired = repaired.replace(/}\s*{/g, '},{');
    repaired = repaired.replace(/]\s*\[/g, '],[');

    // Fix missing quotes around string values
    repaired = repaired.replace(/:\s*([^"\s\[\]{,][^,\s\[\]{}]*)/g, ': "$1"');

    return repaired;
  } catch {
    return null;
  }
}

export function extractJSONArray<T = any>(raw: string, fallback: T[] = []): T[] {
  const cleaned = cleanResponse(raw);
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) {
    console.warn('[JSONParser] No JSON array found in response');
    return fallback;
  }
  return extractJSON<T[]>(match[0], fallback);
}

export function extractJSONObject<T = any>(raw: string, fallback: T = {} as T): T {
  const cleaned = cleanResponse(raw);
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) {
    console.warn('[JSONParser] No JSON object found in response');
    return fallback;
  }
  return extractJSON<T>(match[0], fallback);
}

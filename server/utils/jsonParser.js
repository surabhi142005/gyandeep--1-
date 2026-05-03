/**
 * server/utils/jsonParser.js
 * Robust JSON extraction from AI responses
 */

function cleanResponse(raw) {
  return raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();
}

function repairJSON(raw) {
  try {
    let repaired = raw;
    repaired = repaired.replace(/,\s*([}\]])/g, '$1');
    repaired = repaired.replace(/(\w+)\s*:/g, '"$1":');
    repaired = repaired.replace(/'/g, '"');
    repaired = repaired.replace(/}\s*{/g, '},{');
    repaired = repaired.replace(/]\s*\[/g, '],[');
    repaired = repaired.replace(/:\s*([^"\s\[\]{,][^,\s\[\]{}]*)/g, ': "$1"');
    return repaired;
  } catch {
    return null;
  }
}

export function extractJSON(raw, fallback) {
  const cleaned = cleanResponse(raw);

  try {
    return JSON.parse(cleaned);
  } catch {
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch {}
    }

    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {}
    }

    const repaired = repairJSON(cleaned);
    if (repaired) {
      try {
        return JSON.parse(repaired);
      } catch {}
    }
  }

  console.warn('[JSONParser] Failed to extract JSON, returning fallback');
  return fallback;
}

export function extractJSONArray(raw, fallback = []) {
  const cleaned = cleanResponse(raw);
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) {
    console.warn('[JSONParser] No JSON array found in response');
    return fallback;
  }
  return extractJSON(match[0], fallback);
}

export function extractJSONObject(raw, fallback = {}) {
  const cleaned = cleanResponse(raw);
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) {
    console.warn('[JSONParser] No JSON object found in response');
    return fallback;
  }
  return extractJSON(match[0], fallback);
}

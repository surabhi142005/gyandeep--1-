import fs from 'fs';
import path from 'path';

const schemaPath = path.resolve('prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Replace @map for other fields but NOT @map("_id") and NOT @@map("...")
// Using negative lookbehind to avoid matching @@map
schema = schema.replace(/(?<!@)@map\("(?!_id\b)[^"]+"\)/g, '');

// Rename markedAt to timestamp in Attendance model
schema = schema.replace(/markedAt\s+DateTime\s+@default\(now\(\)\)/g, 'timestamp DateTime @default(now())');

// Rename percentage to score in QuizAttempt model
schema = schema.replace(/percentage\s+Float/g, 'score Float');

// Clean up double spaces created by removing @map
schema = schema.split('\n').map(line => {
  return line.replace(/\s+/g, ' ').trimEnd();
}).join('\n');

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('schema.prisma successfully updated!');

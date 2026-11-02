import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import '../src/config/environment.js';

// Read-only inspection. Disable all schema/index creation and never load a demo provider.
const names = ['chatbox', 'courses', 'curriculums', 'schedules', 'studentprofiles', 'systemprompts', 'users'];
const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/mongo-repair');
const uri = process.env.MONGODB_URI?.trim();
if (!uri) throw new Error('MONGODB_URI is required; no fallback connection is used.');
const client = new mongoose.mongo.MongoClient(uri, { serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000 });
const watchdog = setTimeout(() => { console.error('MongoDB audit timed out; no writes were performed.'); process.exit(1); }, 20000);
try {
  await client.connect();
  const db = client.db('chatbox');
  const snapshot = {}, collections = {};
  for (const name of names) {
    const collection = db.collection(name);
    // Authentication secrets are unnecessary for relation inspection.
    snapshot[name] = await collection.find({}, name === 'users' ? { projection: { password: 0, passwordHash: 0, tokens: 0, resetToken: 0 } } : {}).toArray();
    collections[name] = { count: snapshot[name].length, indexes: await collection.indexes(), fields: [...new Set(snapshot[name].flatMap(doc => Object.keys(doc)))] };
  }
  fs.mkdirSync(directory, { recursive: true });
  const EJSON = mongoose.mongo.BSON.EJSON;
  const output = path.join(directory, 'audit-snapshot.ejson');
  fs.writeFileSync(output, EJSON.stringify({ database: db.databaseName, snapshot, collections, inspectedAt: new Date() }, null, 2, { relaxed: false }), { flag: 'w', mode: 0o600 });
  const curriculumCounts = snapshot.curriculums.map(c => ({ id: String(c._id), program: c.program, totalCredits: c.totalCredits, scope: c.scope || null, memberships: (c.sections || []).reduce((n, s) => n + (s.courses || []).length, 0), groups: Object.keys(c.rules?.groups || {}) }));
  const profileLinks = snapshot.studentprofiles.map(p => ({ id: String(p._id), isRequestedStudent: p.mssv === '2474802010458', courseCount: (p.courses || []).length, specialization: p.specialization || null, curriculumId: p.curriculumId || null, hasLinkedUser: snapshot.users.some(u => String(u._id) === String(p.userId)) }));
  console.log(JSON.stringify({ database: db.databaseName, counts: Object.fromEntries(names.map(name => [name, snapshot[name].length])), curriculumCounts, profileLinks, privateSnapshot: output }));
} catch (error) {
  // Avoid printing driver errors that can contain credentials or connection strings.
  console.error(JSON.stringify({ error: 'MongoDB read-only audit failed', type: error.name, code: error.code || null }));
  process.exitCode = 1;
} finally {
  clearTimeout(watchdog);
  await client.close();
}

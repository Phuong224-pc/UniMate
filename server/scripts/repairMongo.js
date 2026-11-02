import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import '../src/config/environment.js';
import { applyRepairPlan, rollbackRepairBackup, prepareRepairPlan, readPrivateEjson, writePrivateEjson } from '../src/utils/mongoRepairEngine.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
const defaultPrivateDirectory = path.resolve(directory, '../data/mongo-repair');
const collectionNames = ['chatbox', 'courses', 'curriculums', 'schedules', 'studentprofiles', 'systemprompts', 'users'];
const secretKey = /password|passhash|secret|token|api.?key|credential|connection.?string|mongodb.?uri/i;
function redactCredentials(value) {
  if (Array.isArray(value)) return value.map(redactCredentials);
  if (!value || typeof value !== 'object' || value instanceof Date || value._bsontype) return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !secretKey.test(key)).map(([key, item]) => [key, redactCredentials(item)]));
}

export function parseArguments(args) {
  const result = { database: 'chatbox', expectedDatabase: 'chatbox', mode: 'dry-run', backupDirectory: defaultPrivateDirectory };
  const values = { '--database': 'database', '--expected-database': 'expectedDatabase', '--backup-dir': 'backupDirectory', '--snapshot': 'snapshot', '--snapshot-out': 'snapshotOut', '--plan': 'plan', '--plan-out': 'planOut', '--report': 'report', '--curriculum': 'curriculum', '--transcript': 'transcript', '--student-mssv': 'studentMssv', '--specialization': 'specialization' };
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (values[argument]) {
      if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`Missing value for ${argument}.`);
      result[values[argument]] = args[++index];
    } else if (argument === '--apply') result.mode = 'apply';
    else if (argument === '--dry-run') result.mode = 'dry-run';
    else if (argument === '--audit') result.mode = 'audit';
    else if (argument === '--confirm-transcript-link') result.confirmTranscriptLink = true;
    else if (argument === '--rollback') {
      if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error('Missing private backup path for rollback.');
      result.mode = 'rollback'; result.rollback = args[++index];
    } else if (argument === '--help') result.help = true;
    else throw new Error(`Unknown argument: ${argument}.`);
  }
  if (result.database !== 'chatbox' || result.expectedDatabase !== 'chatbox') throw new Error('This repair is restricted to the explicitly authorized chatbox database.');
  if (result.snapshot && ['apply', 'rollback'].includes(result.mode)) throw new Error('Offline snapshots support audit/dry-run only.');
  if (result.confirmTranscriptLink && (!result.studentMssv || !result.transcript)) throw new Error('A confirmed transcript link requires both its PDF source and explicit student identifier.');
  return result;
}

export async function readDatabaseSnapshot(db) {
  const collections = {}, indexes = {}, collectionShapes = {};
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(item => item.name));
  for (const name of collectionNames) {
    if (!existing.has(name)) { collections[name] = []; indexes[name] = []; collectionShapes[name] = { count: 0, fields: [], exists: false }; continue; }
    const documents = await db.collection(name).find({}).toArray();
    // Native collection reads inspect old shapes without invoking models/defaults or automatic index creation.
    collections[name] = documents.map(redactCredentials);
    indexes[name] = await db.collection(name).listIndexes().toArray();
    collectionShapes[name] = { count: documents.length, fields: [...new Set(documents.flatMap(doc => Object.keys(doc)))].sort(), exists: true };
  }
  return { format: 'unimate-mongo-snapshot', database: db.databaseName, capturedAt: new Date(), collections, indexes, collectionShapes };
}

async function buildPlan(snapshot, options) {
  if (options.plan) return readPrivateEjson(options.plan);
  const { buildDatabaseRepairPlan } = await import('../src/services/databaseRepairPlan.js');
  const canonicalCurriculum = JSON.parse(fs.readFileSync(options.curriculum || path.resolve(directory, '../src/data/khungK30.json'), 'utf8'));
  let transcript = null;
  if (options.transcript) {
    const { extractTextFromPdf, parseVluTranscriptText } = await import('../src/services/ocrService.js');
    const buffer = fs.readFileSync(options.transcript);
    transcript = parseVluTranscriptText(await extractTextFromPdf(buffer));
    if (!transcript) throw new Error('The supplied transcript could not be parsed; no database changes were planned.');
    const source = { type: 'application/pdf', filename: path.basename(options.transcript), fileHash: crypto.createHash('sha256').update(buffer).digest('hex') };
    transcript.source = source;
    transcript.sourceTotals = { ...transcript.sourceTotals, source };
    for (const semester of transcript.semesters) for (const course of semester.courses) course.source = { ...course.source, ...source };
  }
  const transcriptLink = options.confirmTranscriptLink ? { mssv: options.studentMssv, specialization: options.specialization || null, confirmed: true, source: 'user_confirmed' } : null;
  return buildDatabaseRepairPlan({ snapshot, canonicalCurriculum, transcript, transcriptLink });
}

function reportPlan(plan, snapshot) {
  const counts = Object.fromEntries(collectionNames.map(name => [name, { existing: snapshot.collections[name]?.length || 0, add: 0, update: 0 }]));
  for (const operation of plan.operations || []) {
    counts[operation.collection] ||= { existing: 0, add: 0, update: 0 };
    counts[operation.collection][operation.kind === 'insert' ? 'add' : 'update']++;
  }
  return { database: snapshot.database, mode: 'dry-run', counts,
    reviewCount: (plan.review || []).length, blockingReviewCount: (plan.review || []).filter(item => item.blocking === true).length,
    sourceScope: plan.scope || null };
}

async function connect(options) {
  if (!process.env.MONGODB_URI?.trim()) throw Object.assign(new Error('MONGODB_URI is not configured. Database was not updated.'), { code: 'MONGODB_URI_MISSING' });
  const client = new mongoose.mongo.MongoClient(process.env.MONGODB_URI.trim(), {
    serverSelectionTimeoutMS: 8000, connectTimeoutMS: 5000, socketTimeoutMS: 10000,
    retryWrites: true, maxPoolSize: 2
  });
  let timer;
  try {
    await Promise.race([client.connect(), new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error('MongoDB connection deadline exceeded. Database was not updated.'), { code: 'MONGODB_CONNECT_TIMEOUT' })), 15000); })]);
    const db = client.db(options.database);
    if (db.databaseName !== options.expectedDatabase) throw Object.assign(new Error('Connected database differs from expected database.'), { code: 'DATABASE_MISMATCH' });
    return { client, db };
  } catch (error) {
    await Promise.race([client.close(true).catch(() => {}), new Promise(resolve => setTimeout(resolve, 1000))]);
    throw Object.assign(new Error('MongoDB connection failed; no database writes were performed.'), { code: error.code || 'MONGODB_CONNECTION_FAILED' });
  } finally { clearTimeout(timer); }
}

export async function main(args = process.argv.slice(2)) {
  const options = parseArguments(args);
  if (options.help) {
    console.log('repairMongo.js [--audit|--dry-run|--apply|--rollback <backup.ejson>] [--snapshot <offline.ejson>] [--snapshot-out <private.ejson>] [--transcript <pdf> --student-mssv <id> --specialization software --confirm-transcript-link]');
    return;
  }
  let connection;
  try {
    if (!options.snapshot) connection = await connect(options);
    if (options.mode === 'rollback') {
      const result = await rollbackRepairBackup(connection.db, options.rollback, { expectedDatabase: options.expectedDatabase });
      console.log(JSON.stringify({ mode: 'rollback', database: options.database, ...result }));
      if (result.conflicts) process.exitCode = 2;
      return result;
    }
    const snapshot = options.snapshot ? readPrivateEjson(options.snapshot) : await readDatabaseSnapshot(connection.db);
    if (snapshot.database !== options.expectedDatabase) throw new Error('Snapshot database differs from expected database.');
    if (options.snapshotOut) writePrivateEjson(options.snapshotOut, snapshot);
    if (options.mode === 'audit') {
      const result = { mode: 'audit', database: snapshot.database, collections: snapshot.collectionShapes || Object.fromEntries(Object.entries(snapshot.collections).map(([name, documents]) => [name, { count: documents.length, fields: [...new Set(documents.flatMap(doc => Object.keys(doc)))].sort() }])) };
      console.log(JSON.stringify(result, null, 2));
      return result;
    }
    const plan = await buildPlan(snapshot, options);
    const report = reportPlan(plan, snapshot);
    const output = { ...report, review: plan.review || [] };
    if (options.planOut) writePrivateEjson(options.planOut, plan);
    if (options.report) writePrivateEjson(options.report, output);
    if (options.mode === 'dry-run') {
      // Preparing validates expected documents and scope but makes no MongoDB writes.
      if (connection && !report.blockingReviewCount) await prepareRepairPlan(connection.db, plan, { expectedDatabase: options.expectedDatabase });
      console.log(JSON.stringify(report, null, 2));
      return output;
    }
    const result = await applyRepairPlan(connection.db, plan, { backupDirectory: options.backupDirectory, expectedDatabase: options.expectedDatabase });
    const fresh = await readDatabaseSnapshot(connection.db);
    const repeatedPlan = await buildPlan(fresh, { ...options, plan: null });
    const secondRunChanges = (repeatedPlan.operations || []).length;
    const applied = { mode: 'apply', database: options.database, ...result, secondDryRunChanges: secondRunChanges,
      remainingBlockingReview: (repeatedPlan.review || []).filter(item => item.blocking).length };
    if (options.report) writePrivateEjson(options.report, { ...output, applied });
    console.log(JSON.stringify(applied, null, 2));
    if (secondRunChanges) process.exitCode = 2;
    return applied;
  } finally {
    if (connection) await Promise.race([connection.client.close(true), new Promise(resolve => setTimeout(resolve, 1000))]);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    // Errors from drivers can contain server names or credentials; emit stable safe codes only.
    console.error(JSON.stringify({ success: false, code: error.code || error.name || 'REPAIR_FAILED',
      message: error.name === 'RepairError' || ['MONGODB_URI_MISSING', 'MONGODB_CONNECT_TIMEOUT', 'MONGODB_CONNECTION_FAILED'].includes(error.code) ? error.message : 'Repair did not complete. Inspect the private report/backup before retrying.',
      ...(error.backup ? { backup: error.backup, counts: error.counts } : {}) }));
    process.exitCode = 1;
  }).finally(() => process.exit(process.exitCode || 0));
}

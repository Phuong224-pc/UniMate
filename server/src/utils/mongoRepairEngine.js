import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

const { EJSON, ObjectId } = mongoose.mongo.BSON;
const COLLECTIONS = new Set(['chatbox', 'courses', 'curriculums', 'schedules', 'studentprofiles', 'systemprompts', 'users']);
export const cloneBson = value => EJSON.parse(EJSON.stringify(value, { relaxed: false }), { relaxed: false });
const stable = value => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
export const fingerprint = value => crypto.createHash('sha256').update(JSON.stringify(stable(EJSON.serialize(value, { relaxed: false })))).digest('hex');
const fail = (message, code = 'REPAIR_VALIDATION') => Object.assign(new Error(message), { name: 'RepairError', code });

function segments(field) {
  const result = String(field).split('.');
  if (!field || result.some(key => !key || key.startsWith('$') || ['__proto__', 'prototype', 'constructor'].includes(key)) || result[0] === '_id') throw fail('Unsafe or immutable repair field.');
  return result;
}
function lookup(document, field) {
  let value = document;
  for (const key of field.split('.')) {
    if (!value || !Object.hasOwn(value, key)) return { exists: false };
    value = value[key];
  }
  return { exists: true, value };
}
function assign(document, field, value, remove = false) {
  const parts = segments(field);
  let target = document;
  for (const key of parts.slice(0, -1)) {
    if (!target[key] || typeof target[key] !== 'object') {
      if (remove) return;
      target[key] = {};
    }
    target = target[key];
  }
  if (remove) delete target[parts.at(-1)];
  else target[parts.at(-1)] = cloneBson(value);
}
function patch(document, set = {}, unset = []) {
  const result = cloneBson(document);
  for (const [field, value] of Object.entries(set)) assign(result, field, value);
  for (const field of unset) assign(result, field, null, true);
  return result;
}
const exactFilter = document => ({ _id: document._id, $expr: { $eq: ['$$ROOT', { $literal: document }] } });
function fieldsMatch(current, expected, fields) {
  return fields.every(field => {
    const a = lookup(current, field), b = lookup(expected, field);
    return a.exists === b.exists && (!a.exists || fingerprint(a.value) === fingerprint(b.value));
  });
}
function validateOperation(operation) {
  if (!COLLECTIONS.has(operation.collection)) throw fail('Repair collection is outside the authorized database scope.');
  if (operation.collection === 'users') throw fail('Account mutations are prohibited in this academic repair.');
  if (operation.collection === 'schedules') throw fail('Timetable mutations are prohibited without an actual timetable source.');
  if (!['insert', 'update'].includes(operation.kind)) throw fail('Only non-destructive insert/update repairs are supported.');
  if (operation.kind === 'update') {
    if (operation.id === null || operation.id === undefined) throw fail('Existing document identity is required.');
    for (const field of [...Object.keys(operation.set || {}), ...(operation.unset || [])]) segments(field);
  } else if (!operation.document || !operation.naturalKey || !Object.keys(operation.naturalKey).length) throw fail('A source document and natural identity are required for each insertion.');
}

export function writePrivateEjson(filename, value, { exclusive = false } = {}) {
  const directory = path.dirname(path.resolve(filename));
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const destination = path.resolve(filename);
  const temporary = exclusive ? destination : `${destination}.${crypto.randomUUID()}.tmp`;
  const descriptor = fs.openSync(temporary, 'wx', 0o600);
  try {
    fs.writeFileSync(descriptor, EJSON.stringify(value, null, 2, { relaxed: false }), 'utf8');
    fs.fsyncSync(descriptor);
  } finally { fs.closeSync(descriptor); }
  if (!exclusive) fs.renameSync(temporary, destination);
}
export function readPrivateEjson(filename) {
  return EJSON.parse(fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, ''), { relaxed: false });
}

export async function prepareRepairPlan(db, plan, { expectedDatabase = 'chatbox' } = {}) {
  if (db.databaseName !== expectedDatabase) throw fail('Connected database does not match the explicitly authorized database.', 'DATABASE_MISMATCH');
  const blockers = (plan.review || []).filter(item => item.blocking === true);
  if (blockers.length) throw fail(`Repair has ${blockers.length} unresolved blocking review item(s).`, 'REVIEW_REQUIRED');
  const operations = [];
  const seen = new Set();
  let skipped = 0;
  for (const input of plan.operations || []) {
    validateOperation(input);
    const operation = cloneBson(input);
    const collection = db.collection(operation.collection);
    if (operation.kind === 'insert') {
      if (await collection.findOne(operation.naturalKey)) throw fail('An insertion identity already exists; rebuild the dry-run plan.', 'STALE_PLAN');
      operation.document._id ||= new ObjectId();
      operation.id = operation.document._id;
      operation.before = null;
      operation.after = cloneBson(operation.document);
    } else {
      operation.before = await collection.findOne({ _id: operation.id });
      if (!operation.before) throw fail('An expected source document is missing; rebuild the dry-run plan.', 'STALE_PLAN');
      if (operation.expected && fingerprint(operation.expected) !== fingerprint(operation.before)) throw fail('A source document changed after the snapshot; rebuild the dry-run plan.', 'STALE_PLAN');
      operation.after = patch(operation.before, operation.set, operation.unset);
      if (fingerprint(operation.before) === fingerprint(operation.after)) { skipped++; continue; }
    }
    const key = `${operation.collection}:${fingerprint(operation.id)}`;
    if (seen.has(key)) throw fail('More than one write targets the same document; combine its repair fields.');
    seen.add(key);
    delete operation.expected;
    operation.index = operations.length;
    operation.beforeHash = operation.before ? fingerprint(operation.before) : null;
    operation.afterHash = fingerprint(operation.after);
    operation.state = 'pending';
    operations.push(operation);
  }
  return { operations, skipped };
}

function counters(operations) {
  const result = {};
  for (const operation of operations) {
    result[operation.collection] ||= { added: 0, updated: 0, skipped: 0, errors: 0 };
    const counter = result[operation.collection];
    if (operation.state === 'applied') counter[operation.kind === 'insert' ? 'added' : 'updated']++;
    else if (operation.state === 'error') counter.errors++;
    else counter.skipped++;
  }
  return result;
}

export async function applyRepairPlan(db, plan, { backupDirectory, expectedDatabase = 'chatbox', onProgress = null } = {}) {
  if (!backupDirectory) throw fail('A private backup directory is required before applying changes.');
  const prepared = await prepareRepairPlan(db, plan, { expectedDatabase });
  if (!prepared.operations.length) return { changed: false, backup: null, counts: {}, skipped: prepared.skipped, verified: true };
  const runId = crypto.randomUUID();
  const filename = path.resolve(backupDirectory, `repair-${new Date().toISOString().replace(/[:.]/g, '-')}-${runId}.ejson`);
  const journal = { format: 'unimate-mongo-repair', version: 1, runId, database: expectedDatabase,
    createdAt: new Date(), status: 'prepared', operations: prepared.operations, source: plan.source || plan.scope || null };
  writePrivateEjson(filename, journal, { exclusive: true });
  try {
    journal.status = 'applying';
    writePrivateEjson(filename, journal);
    for (const operation of journal.operations) {
      const collection = db.collection(operation.collection);
      const current = await collection.findOne({ _id: operation.id });
      if (operation.kind === 'update' && (!current || fingerprint(current) !== operation.beforeHash)) throw fail('A target changed after backup creation; write stopped without overwriting it.', 'CONCURRENT_CHANGE');
      if (operation.kind === 'insert' && (current || await collection.findOne(operation.naturalKey))) throw fail('An insertion identity appeared after backup creation; write stopped.', 'CONCURRENT_CHANGE');
      operation.state = 'in_flight';
      writePrivateEjson(filename, journal);
      if (operation.kind === 'insert') await collection.insertOne(operation.after);
      else {
        const mutation = { ...(Object.keys(operation.set || {}).length ? { $set: operation.set } : {}), ...((operation.unset || []).length ? { $unset: Object.fromEntries(operation.unset.map(field => [field, ''])) } : {}) };
        const changed = await collection.updateOne(exactFilter(operation.before), mutation);
        if (changed.matchedCount !== 1) throw fail('Optimistic write check failed; the source was changed concurrently.', 'CONCURRENT_CHANGE');
      }
      const saved = await collection.findOne({ _id: operation.id });
      if (!saved || fingerprint(saved) !== operation.afterHash) throw fail('Database read-back differs from the planned repair.', 'VERIFY_FAILED');
      operation.state = 'applied';
      writePrivateEjson(filename, journal);
      if (onProgress) onProgress({ collection: operation.collection, kind: operation.kind, index: operation.index });
    }
    journal.status = 'complete';
    journal.completedAt = new Date();
    writePrivateEjson(filename, journal);
    return { changed: true, backup: filename, runId, counts: counters(journal.operations), skipped: prepared.skipped, verified: true };
  } catch (error) {
    journal.status = 'failed';
    journal.failure = { code: error.code || 'DATABASE_WRITE_FAILED', at: new Date() };
    writePrivateEjson(filename, journal);
    throw Object.assign(fail('Repair stopped. Use its private backup to inspect or roll back applied operations.', error.code || 'DATABASE_WRITE_FAILED'),
      { backup: filename, counts: counters(journal.operations), cause: error });
  }
}

export async function rollbackRepairBackup(db, filename, { expectedDatabase = 'chatbox' } = {}) {
  const journal = readPrivateEjson(filename);
  if (db.databaseName !== expectedDatabase || journal.database !== expectedDatabase || journal.format !== 'unimate-mongo-repair' || Number(journal.version) !== 1) throw fail('Backup format or database does not match the authorized target.');
  if (journal.status === 'rolled_back') return { changed: false, restored: 0, removedOwnInsertions: 0, conflicts: 0 };
  journal.status = 'rolling_back';
  writePrivateEjson(filename, journal);
  let restored = 0, removedOwnInsertions = 0, conflicts = 0;
  for (const operation of [...journal.operations].reverse()) {
    validateOperation(operation);
    if (!['applied', 'in_flight', 'rollback_conflict'].includes(operation.state)) continue;
    const collection = db.collection(operation.collection);
    const current = await collection.findOne({ _id: operation.id });
    if (operation.kind === 'insert') {
      if (!current) operation.state = 'reverted';
      else if (fingerprint(current) === operation.afterHash) {
        const deleted = await collection.deleteOne(exactFilter(current));
        if (deleted.deletedCount !== 1) { operation.state = 'rollback_conflict'; conflicts++; }
        else { operation.state = 'reverted'; removedOwnInsertions++; }
      } else { operation.state = 'rollback_conflict'; conflicts++; }
    } else {
      const fields = [...new Set([...Object.keys(operation.set || {}), ...(operation.unset || [])])];
      if (current && fieldsMatch(current, operation.before, fields)) operation.state = 'reverted';
      else if (current && fieldsMatch(current, operation.after, fields)) {
        const set = {}, unset = [];
        for (const field of fields) {
          const original = lookup(operation.before, field);
          if (original.exists) set[field] = original.value;
          else unset.push(field);
        }
        const reverted = await collection.updateOne(exactFilter(current), { ...(Object.keys(set).length ? { $set: set } : {}), ...(unset.length ? { $unset: Object.fromEntries(unset.map(field => [field, ''])) } : {}) });
        if (reverted.matchedCount !== 1) { operation.state = 'rollback_conflict'; conflicts++; }
        else { operation.state = 'reverted'; restored++; }
      } else { operation.state = 'rollback_conflict'; conflicts++; }
    }
    writePrivateEjson(filename, journal);
  }
  journal.status = conflicts ? 'rollback_partial' : 'rolled_back';
  journal.rollbackAt = new Date();
  writePrivateEjson(filename, journal);
  return { changed: Boolean(restored || removedOwnInsertions), restored, removedOwnInsertions, conflicts };
}

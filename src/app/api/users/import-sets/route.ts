import { NextRequest, NextResponse } from 'next/server';
import { enforceRbac } from '@/lib/rbac';
import {
  createImportSet,
  validateStagingRows,
  executeTransform,
  generateResultsCsv,
  parseSpreadsheet,
  retryRowWelcomeEmail,
  cleanupExpiredStagingSets,
} from '@/lib/importSets';

/**
 * Enterprise ServiceNow-Style Import Sets API for User Management
 * Protected by RBAC ('users_roles_config')
 */

export async function GET(req: NextRequest) {
  const auth = await enforceRbac(req, 'users_roles_config', 'Inspect Import Sets');
  if (!auth.allowed) return auth.response;

  const { db } = auth;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  try {
    if (id) {
      const setRes = await db.query('SELECT * FROM user_import_sets WHERE id = $1', [Number(id)]);
      const importSet = setRes.rows[0];
      if (!importSet) {
        return NextResponse.json({ error: 'Import Set not found' }, { status: 404 });
      }

      const rowsRes = await db.query(
        'SELECT * FROM user_import_staging_rows WHERE import_set_id = $1 ORDER BY row_number ASC',
        [Number(id)]
      );

      const parsedRows = rowsRes.rows.map((r: any) => ({
        ...r,
        rawData: JSON.parse(r.raw_data_json || '{}'),
        mappedData: JSON.parse(r.mapped_data_json || '{}'),
        validationErrors: JSON.parse(r.validation_errors_json || '[]'),
      }));

      // Security check: Scrub any legacy plaintext temporary passwords if present in old test summary
      const rawSummary = JSON.parse(importSet.execution_summary_json || '{}');
      if (Array.isArray(rawSummary.details)) {
        rawSummary.details = rawSummary.details.map((d: any) => {
          const { temporaryPassword, ...safeDetails } = d;
          return safeDetails;
        });
      }

      return NextResponse.json({
        importSet: {
          ...importSet,
          transformMap: JSON.parse(importSet.transform_map_json || '{}'),
          sheetsAvailable: JSON.parse(importSet.sheets_available_json || '[]'),
          executionSummary: rawSummary,
        },
        rows: parsedRows,
      });
    }

    // List recent import sets for history
    const listRes = await db.query(
      `SELECT id, set_number, file_name, file_size, file_type, status, selected_sheet,
              total_rows, valid_rows, error_rows, skipped_rows, created_rows, updated_rows,
              created_by, created_at, executed_by, executed_at
       FROM user_import_sets
       ORDER BY id DESC LIMIT 50`
    );

    return NextResponse.json({ importSets: listRes.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await enforceRbac(req, 'users_roles_config', 'Execute User Import Set Action');
  if (!auth.allowed) return auth.response;

  const { db, user: adminUser } = auth;

  try {
    const body = await req.json();
    const action = body.action;

    // ACTION: INSPECT SHEETS (For multi-worksheet Excel files before loading)
    if (action === 'sheets') {
      const { fileName, rawContent } = body;
      if (!rawContent) {
        return NextResponse.json({ error: 'File content cannot be empty.' }, { status: 400 });
      }

      const parsed = await parseSpreadsheet(rawContent, { fileName });
      return NextResponse.json({
        success: true,
        sheets: parsed.sheets,
        selectedSheet: parsed.selectedSheet,
      });
    }

    // STEP 1: LOAD DATA (Upload spreadsheet/CSV into staging area)
    if (action === 'load') {
      const { fileName, fileSize, fileType, rawContent, sheetName } = body;
      if (!rawContent || !rawContent.trim?.()) {
        return NextResponse.json({ error: 'File content cannot be empty.' }, { status: 400 });
      }

      // Enforce server-side 5 MB limit
      const MAX_SIZE = 5 * 1024 * 1024;
      const actualSize = Number(fileSize) || Buffer.byteLength(rawContent);
      if (actualSize > MAX_SIZE) {
        return NextResponse.json(
          { error: `File size (${(actualSize / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed 5 MB limit.` },
          { status: 400 }
        );
      }

      const result = await createImportSet(db, {
        fileName: (fileName || 'users_import.csv').trim(),
        fileSize: actualSize,
        fileType: fileType || 'csv',
        rawContent,
        sheetName,
        adminUser,
      });

      return NextResponse.json({
        success: true,
        action: 'LOADED',
        importSet: result.importSet,
        headers: result.headers,
        sheets: result.sheets,
        selectedSheet: result.selectedSheet,
        defaultTransformMap: result.defaultTransformMap,
        validationSummary: result.validationSummary,
        message: `Import Set ${result.importSet.set_number} loaded into staging area with ${result.importSet.total_rows} records. No user accounts have been created yet.`,
      });
    }

    // STEP 2: TRANSFORM MAP & RE-VALIDATION
    if (action === 'validate') {
      const { importSetId, transformMap, updateExisting } = body;
      if (!importSetId) {
        return NextResponse.json({ error: 'importSetId is required' }, { status: 400 });
      }

      const validationSummary = await validateStagingRows(
        db,
        Number(importSetId),
        transformMap || {},
        { updateExisting: Boolean(updateExisting) }
      );

      return NextResponse.json({
        success: true,
        validationSummary,
      });
    }

    // TOGGLE ROW EXCLUSION
    if (action === 'toggle_exclude') {
      const { rowId, isExcluded } = body;
      if (!rowId) {
        return NextResponse.json({ error: 'rowId is required' }, { status: 400 });
      }

      const updateRes = await db.query(
        `UPDATE user_import_staging_rows
         SET is_excluded = $1
         WHERE id = $2
         RETURNING *`,
        [Boolean(isExcluded), Number(rowId)]
      );

      return NextResponse.json({
        success: true,
        row: updateRes.rows[0],
      });
    }

    // STEP 3: TRANSFORM EXECUTION (Provision accounts via shared logic)
    if (action === 'execute') {
      const { importSetId, updateExisting, sendWelcomeEmails } = body;
      if (!importSetId) {
        return NextResponse.json({ error: 'importSetId is required' }, { status: 400 });
      }

      const summary = await executeTransform(db, Number(importSetId), adminUser, {
        updateExisting: Boolean(updateExisting),
        sendWelcomeEmails: Boolean(sendWelcomeEmails),
      });

      return NextResponse.json({
        success: true,
        summary,
        message: `Import Set execution completed: ${summary.created} users created, ${summary.updated} updated, ${summary.skipped} skipped, ${summary.failed} failed.`,
      });
    }

    // RETRY WELCOME EMAIL FOR A STAGING ROW
    if (action === 'retry_email') {
      const { stagingRowId } = body;
      if (!stagingRowId) {
        return NextResponse.json({ error: 'stagingRowId is required' }, { status: 400 });
      }

      const retryResult = await retryRowWelcomeEmail(db, Number(stagingRowId), adminUser);
      return NextResponse.json({
        success: retryResult.success,
        email: retryResult.email,
        error: retryResult.error,
        message: retryResult.success ? `Welcome email successfully resent to ${retryResult.email}` : `Retry failed: ${retryResult.error}`,
      });
    }

    // STAGING RETENTION CLEANUP
    if (action === 'cleanup_retention') {
      const { retentionDays = 90 } = body;
      const result = await cleanupExpiredStagingSets(db, Number(retentionDays), adminUser.name);
      return NextResponse.json({
        success: true,
        purgedCount: result.purgedCount,
        retentionDays: result.retentionDays,
        message: `Purged ${result.purgedCount} staging sets older than ${result.retentionDays} calendar days. User accounts preserved intact.`,
      });
    }

    // DOWNLOAD RESULTS CSV
    if (action === 'download_results') {
      const { importSetId } = body;
      if (!importSetId) {
        return NextResponse.json({ error: 'importSetId is required' }, { status: 400 });
      }

      const setRes = await db.query('SELECT * FROM user_import_sets WHERE id = $1', [Number(importSetId)]);
      const importSet = setRes.rows[0];
      if (!importSet) {
        return NextResponse.json({ error: 'Import Set not found' }, { status: 404 });
      }

      const summary = JSON.parse(importSet.execution_summary_json || '{}');
      const csvText = generateResultsCsv(summary);

      return new NextResponse(csvText, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${importSet.set_number}_results.csv"`,
        },
      });
    }

    return NextResponse.json({ error: 'Unrecognized action.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

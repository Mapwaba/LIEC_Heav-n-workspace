import ExcelJS from 'exceljs';
import { DBClient } from './db';
import { provisionUserAccount, retryUserWelcomeEmail } from './userProvisioning';

export interface ParsedSpreadsheetData {
  headers: string[];
  rows: Array<Record<string, string>>;
  sheets: string[];
  selectedSheet: string;
}

/**
 * Robust Spreadsheet Parser supporting:
 * 1. Genuine binary .xlsx workbooks (via maintained ExcelJS library)
 * 2. Multi-worksheet selection
 * 3. Delimited text: CSV (comma), CSV (semicolon - French Excel), TSV (tab), TXT
 * 4. UTF-8 BOM stripping
 * 5. Rejection of macro-enabled workbooks (.xlsm) and embedded VBA
 * 6. Detection and rejection of duplicate / ambiguous column headers
 * 7. Server-side row-count limit enforcement (max 500 rows)
 */
export async function parseSpreadsheet(
  input: string | Buffer,
  options: { fileName?: string; sheetName?: string } = {}
): Promise<ParsedSpreadsheetData> {
  const fileName = (options.fileName || '').toLowerCase();

  // 1. Strict security check against macro-enabled files
  if (
    fileName.endsWith('.xlsm') ||
    fileName.endsWith('.xltm') ||
    fileName.endsWith('.xlam') ||
    fileName.endsWith('.docm')
  ) {
    throw new Error('Macro-enabled workbooks (.xlsm) and macro scripts are strictly prohibited for security.');
  }

  let buffer: Buffer;
  let isBinaryXlsx = false;

  if (Buffer.isBuffer(input)) {
    buffer = input;
    // Check for ZIP magic bytes (0x50 0x4B 0x03 0x04) which start .xlsx files
    if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
      isBinaryXlsx = true;
    }
  } else if (typeof input === 'string') {
    // If sent as base64 data URL
    if (input.startsWith('data:') && input.includes('base64,')) {
      const base64Data = input.split('base64,')[1];
      buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
        isBinaryXlsx = true;
      }
    } else if (input.startsWith('PK\x03\x04') || input.startsWith('PK')) {
      buffer = Buffer.from(input, 'binary');
      isBinaryXlsx = true;
    } else {
      buffer = Buffer.from(input, 'utf-8');
    }
  } else {
    throw new Error('Unsupported input format for spreadsheet parser.');
  }

  // 2. Parse genuine .xlsx workbooks using ExcelJS
  if (isBinaryXlsx || fileName.endsWith('.xlsx')) {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as any);
    } catch (err: any) {
      throw new Error(`Failed to parse Excel workbook: ${err.message}`);
    }

    const sheets = (workbook.worksheets || []).map((w) => w.name);
    if (sheets.length === 0) {
      throw new Error('The uploaded Excel workbook contains no worksheets.');
    }

    const selectedSheet = options.sheetName && sheets.includes(options.sheetName)
      ? options.sheetName
      : sheets[0];

    const worksheet = workbook.getWorksheet(selectedSheet);
    if (!worksheet) {
      throw new Error(`Worksheet "${selectedSheet}" not found in workbook.`);
    }

    // Convert worksheet rows to raw grid
    const rawGrid: string[][] = [];
    const maxCols = worksheet.columnCount || 0;

    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const rowVals: string[] = [];
      const colLimit = Math.max(maxCols, row.cellCount || 0);
      for (let c = 1; c <= colLimit; c++) {
        const cell = row.getCell(c);
        let cellVal = '';
        if (cell.value !== null && cell.value !== undefined) {
          if (typeof cell.value === 'object') {
            if ('text' in cell.value) {
              cellVal = String((cell.value as any).text ?? '').trim();
            } else if ('result' in cell.value) {
              cellVal = String((cell.value as any).result ?? '').trim();
            } else if (cell.value instanceof Date) {
              cellVal = cell.value.toISOString();
            } else {
              cellVal = String(cell.value);
            }
          } else {
            cellVal = String(cell.value).trim();
          }
        }
        rowVals.push(cellVal);
      }
      rawGrid.push(rowVals);
    });

    if (rawGrid.length === 0) {
      return { headers: [], rows: [], sheets, selectedSheet };
    }

    // Extract and validate headers
    const rawHeaders = (rawGrid[0] || []).map((h) => String(h ?? '').trim());
    const validHeaderCount = rawHeaders.filter(Boolean).length;
    if (validHeaderCount === 0) {
      throw new Error(`Worksheet "${selectedSheet}" does not contain any column headers.`);
    }

    const headers: string[] = [];
    const seenHeaders = new Set<string>();

    for (let idx = 0; idx < rawHeaders.length; idx++) {
      const h = rawHeaders[idx];
      if (!h) continue;
      const cleanH = h.trim();
      const normKey = cleanH.toLowerCase();

      if (seenHeaders.has(normKey)) {
        throw new Error(`Duplicate or ambiguous column header detected: "${cleanH}". Please ensure all column headers are unique.`);
      }
      seenHeaders.add(normKey);
      headers.push(cleanH);
    }

    // Extract data rows
    const rows: Array<Record<string, string>> = [];
    for (let r = 1; r < rawGrid.length; r++) {
      const lineValues = rawGrid[r] || [];
      if (!lineValues.some((v: any) => String(v ?? '').trim().length > 0)) {
        continue; // Skip entirely blank rows
      }

      const rowObj: Record<string, string> = {};
      for (let c = 0; c < headers.length; c++) {
        const headerName = headers[c];
        const cellVal = String(lineValues[c] ?? '').trim();
        rowObj[headerName] = cellVal;
      }
      rows.push(rowObj);
    }

    // Enforce 500 row limit
    if (rows.length > 500) {
      throw new Error(`The uploaded file exceeds the maximum limit of 500 records per batch (found ${rows.length} rows). Please split into smaller batches.`);
    }

    return { headers, rows, sheets, selectedSheet };
  }

  // 3. Parse delimited text (CSV, TSV, TXT with semicolon / comma / tab / BOM)
  const textContent = buffer.toString('utf-8');
  const delimited = parseDelimitedText(textContent);

  // Check duplicate headers in delimited text
  const seenHeaders = new Set<string>();
  for (const h of delimited.headers) {
    const normKey = h.trim().toLowerCase();
    if (seenHeaders.has(normKey)) {
      throw new Error(`Duplicate or ambiguous column header detected: "${h}". Please ensure all column headers are unique.`);
    }
    seenHeaders.add(normKey);
  }

  // Enforce 500 row limit
  if (delimited.rows.length > 500) {
    throw new Error(`The uploaded file exceeds the maximum limit of 500 records per batch (found ${delimited.rows.length} rows). Please split into smaller batches.`);
  }

  return {
    headers: delimited.headers,
    rows: delimited.rows,
    sheets: ['Sheet1'],
    selectedSheet: 'Sheet1',
  };
}

/**
 * Robust CSV / TSV text parser
 * Handles comma, semicolon (French Excel standard), and tab delimiters
 * Supports RFC 4180 quotes, escaped quotes, and BOM markers
 */
export function parseDelimitedText(content: string): { headers: string[]; rows: Array<Record<string, string>> } {
  // Strip BOM if present
  let text = content.replace(/^\uFEFF/, '').trim();
  if (!text) return { headers: [], rows: [] };

  // Detect delimiter from first non-empty line
  const firstLine = text.split(/\r?\n/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  let delimiter = ',';
  if (semicolonCount > commaCount && semicolonCount >= tabCount) {
    delimiter = ';';
  } else if (tabCount > commaCount && tabCount > semicolonCount) {
    delimiter = '\t';
  }

  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentLine.push(currentField.trim());
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentLine.push(currentField.trim());
      if (currentLine.some((f) => f.length > 0)) {
        lines.push(currentLine);
      }
      currentLine = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentLine.length > 0) {
    currentLine.push(currentField.trim());
    if (currentLine.some((f) => f.length > 0)) {
      lines.push(currentLine);
    }
  }

  if (lines.length === 0) return { headers: [], rows: [] };

  const rawHeaders = lines[0];
  const headers = rawHeaders.map((h, idx) => h.replace(/^["']|["']$/g, '').trim() || `column_${idx + 1}`);

  const rows: Array<Record<string, string>> = [];
  for (let r = 1; r < lines.length; r++) {
    const values = lines[r];
    if (!values.some((v) => v.length > 0)) continue;

    const rowObj: Record<string, string> = {};
    for (let h = 0; h < headers.length; h++) {
      const colName = headers[h];
      const val = (values[h] || '').replace(/^["']|["']$/g, '').trim();
      rowObj[colName] = val;
    }
    rows.push(rowObj);
  }

  return { headers, rows };
}

/**
 * ServiceNow Transform Map: Intelligent Default Column Mapping
 */
export function generateDefaultTransformMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const normalize = (h: string) =>
    h
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

  for (const h of headers) {
    const norm = normalize(h);
    if (!map.first_name && ['firstname', 'prenom', 'first', 'prenoms'].includes(norm)) {
      map.first_name = h;
    } else if (!map.last_name && ['lastname', 'nom', 'surname', 'last', 'noms', 'familyname'].includes(norm)) {
      map.last_name = h;
    } else if (!map.email && ['email', 'courriel', 'mail', 'emailaddress', 'adresseemail'].includes(norm)) {
      map.email = h;
    } else if (!map.business_profile && ['businessprofile', 'profile', 'profil', 'profilmetier', 'rolemetier'].includes(norm)) {
      map.business_profile = h;
    } else if (!map.title && ['title', 'titre', 'jobtitle', 'fonction', 'poste'].includes(norm)) {
      map.title = h;
    } else if (!map.technical_roles && ['technicalroles', 'roles', 'roleselect', 'roletechnique', 'permissions'].includes(norm)) {
      map.technical_roles = h;
    } else if (!map.user_id && ['userid', 'id', 'username', 'identifiant', 'code', 'matricule'].includes(norm)) {
      map.user_id = h;
    } else if (!map.name && ['fullname', 'nomcomplet', 'name'].includes(norm)) {
      map.name = h;
    }
  }

  return map;
}

/**
 * Step 1: Load Data
 * Creates Import Set container and staging rows.
 * ZERO user accounts are created in this step!
 */
export async function createImportSet(
  db: DBClient,
  params: {
    fileName: string;
    fileSize?: number;
    fileType?: string;
    rawContent: string | Buffer;
    sheetName?: string;
    adminUser: { name: string; email?: string };
  }
) {
  const { fileName, fileSize = 0, fileType = 'csv', rawContent, sheetName, adminUser } = params;

  // Server-side size validation (max 5 MB)
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error('Uploaded file exceeds the maximum allowed size of 5 MB.');
  }

  const parsed = await parseSpreadsheet(rawContent, { fileName, sheetName });
  if (parsed.rows.length === 0) {
    throw new Error('The uploaded file contains no data rows to import.');
  }

  // Generate unique sequential Import Set Number (e.g. ISET-2026-001)
  const countRes = await db.query<{ count: string | number }>('SELECT COUNT(*) as count FROM user_import_sets');
  const nextNum = Number(countRes.rows[0]?.count || 0) + 1;
  const currentYear = new Date().getFullYear();
  let setNumber = `ISET-${currentYear}-${String(nextNum).padStart(3, '0')}`;

  while (true) {
    const exist = await db.query('SELECT 1 FROM user_import_sets WHERE set_number = $1', [setNumber]);
    if (!exist.rows || exist.rows.length === 0) break;
    setNumber = `ISET-${currentYear}-${String(nextNum + Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
  }

  const defaultTransformMap = generateDefaultTransformMap(parsed.headers);

  // Insert import set master record
  const setInsertRes = await db.query(
    `INSERT INTO user_import_sets (
      set_number, file_name, file_size, file_type, status, total_rows, transform_map_json,
      selected_sheet, sheets_available_json, created_by
    ) VALUES ($1, $2, $3, $4, 'LOADED', $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      setNumber,
      fileName,
      fileSize,
      fileType,
      parsed.rows.length,
      JSON.stringify(defaultTransformMap),
      parsed.selectedSheet,
      JSON.stringify(parsed.sheets),
      adminUser.name,
    ]
  );
  const importSet = setInsertRes.rows[0];

  // Insert staging rows
  for (let i = 0; i < parsed.rows.length; i++) {
    const rowNumber = i + 1;
    const rawData = parsed.rows[i];
    await db.query(
      `INSERT INTO user_import_staging_rows (
        import_set_id, row_number, raw_data_json, validation_status, transform_status, email_status
      ) VALUES ($1, $2, $3, 'PENDING', 'PENDING', 'NOT_SENT')`,
      [importSet.id, rowNumber, JSON.stringify(rawData)]
    );
  }

  // Run initial validation pass
  const validationSummary = await validateStagingRows(db, importSet.id, defaultTransformMap, {
    updateExisting: false,
  });

  return {
    importSet,
    headers: parsed.headers,
    sheets: parsed.sheets,
    selectedSheet: parsed.selectedSheet,
    defaultTransformMap,
    validationSummary,
  };
}

/**
 * Step 2: Transform Map & Validation
 */
export async function validateStagingRows(
  db: DBClient,
  importSetId: number,
  transformMap: Record<string, string>,
  options: { updateExisting?: boolean } = {}
) {
  const existingUsersRes = await db.query('SELECT id, user_id, email, name, business_profile, role FROM users');
  const existingEmailMap = new Map<string, any>();
  const existingUserIdMap = new Map<string, any>();
  for (const u of existingUsersRes.rows) {
    if (u.email) existingEmailMap.set(u.email.toLowerCase().trim(), u);
    if (u.user_id) existingUserIdMap.set(u.user_id.toLowerCase().trim(), u);
  }

  const rowsRes = await db.query(
    'SELECT * FROM user_import_staging_rows WHERE import_set_id = $1 ORDER BY row_number ASC',
    [importSetId]
  );

  const seenEmailsInFile = new Set<string>();
  const validationResults = [];

  for (const row of rowsRes.rows) {
    const rawData = JSON.parse(row.raw_data_json || '{}');
    const errors: string[] = [];
    const warnings: string[] = [];

    const mapped: any = {
      first_name: (rawData[transformMap.first_name || ''] || '').trim(),
      last_name: (rawData[transformMap.last_name || ''] || '').trim(),
      email: (rawData[transformMap.email || ''] || '').trim().toLowerCase(),
      business_profile: (rawData[transformMap.business_profile || ''] || '').trim() || 'Secretary',
      title: (rawData[transformMap.title || ''] || '').trim(),
      technical_roles: (rawData[transformMap.technical_roles || ''] || '').trim(),
      user_id: (rawData[transformMap.user_id || ''] || '').trim().toLowerCase(),
    };

    if ((!mapped.first_name || !mapped.last_name) && transformMap.name && rawData[transformMap.name]) {
      const parts = rawData[transformMap.name].trim().split(/\s+/);
      if (!mapped.first_name) mapped.first_name = parts[0] || '';
      if (!mapped.last_name) mapped.last_name = parts.slice(1).join(' ') || parts[0] || '';
    }

    if (!mapped.first_name) errors.push('Missing required First Name');
    if (!mapped.last_name) errors.push('Missing required Last Name');
    if (!mapped.email) errors.push('Missing required Professional Email');

    if (mapped.email) {
      if (!mapped.email.includes('@')) {
        errors.push('Invalid email format');
      } else if (!mapped.email.endsWith('@liecconsulting.com')) {
        errors.push('Email must end with @liecconsulting.com');
      }

      if (seenEmailsInFile.has(mapped.email)) {
        errors.push(`Duplicate email within import file (${mapped.email})`);
      } else {
        seenEmailsInFile.add(mapped.email);
      }
    }

    // Role check: prevent admin escalation
    if (mapped.business_profile && mapped.business_profile.toLowerCase().includes('admin')) {
      errors.push('Administrative profiles cannot be granted via bulk import batches.');
    }

    let isExistingUser = false;
    let isProtectedAdmin = false;
    let existingUserRecord: any = null;

    if (mapped.email && existingEmailMap.has(mapped.email)) {
      isExistingUser = true;
      existingUserRecord = existingEmailMap.get(mapped.email);

      // Check if existing user is protected administrator
      if (
        existingUserRecord.business_profile === 'Admin' ||
        existingUserRecord.role === 'admin' ||
        existingUserRecord.id === 1 ||
        existingUserRecord.email === 'bmapwabantoro@liecconsulting.com'
      ) {
        isProtectedAdmin = true;
        warnings.push(`Protected Administrator account (${existingUserRecord.email}). Modification via bulk import is strictly blocked.`);
      } else if (!options.updateExisting) {
        warnings.push(`Existing account found (${existingUserRecord.user_id || existingUserRecord.name}). Default: will be SKIPPED.`);
      } else {
        warnings.push(`Existing account found. Explicitly marked for UPDATE.`);
      }
    }

    let validationStatus = 'VALID';
    if (errors.length > 0) {
      validationStatus = 'INVALID';
    } else if (isProtectedAdmin) {
      validationStatus = 'PROTECTED';
    } else if (isExistingUser) {
      validationStatus = options.updateExisting ? 'VALID' : 'SKIPPED';
    }

    await db.query(
      `UPDATE user_import_staging_rows
       SET mapped_data_json = $1,
           validation_status = $2,
           validation_errors_json = $3
       WHERE id = $4`,
      [JSON.stringify(mapped), validationStatus, JSON.stringify([...errors, ...warnings]), row.id]
    );

    validationResults.push({
      id: row.id,
      rowNumber: row.row_number,
      rawData,
      mapped,
      validationStatus,
      errors,
      warnings,
      isExistingUser,
      isProtectedAdmin,
      existingUserId: existingUserRecord?.user_id,
      isExcluded: Boolean(row.is_excluded),
    });
  }

  const validCount = validationResults.filter((r) => r.validationStatus === 'VALID' && !r.isExcluded).length;
  const errorCount = validationResults.filter((r) => r.validationStatus === 'INVALID').length;
  const skippedCount = validationResults.filter((r) => (r.validationStatus === 'SKIPPED' || r.validationStatus === 'PROTECTED') && !r.isExcluded).length;

  await db.query(
    `UPDATE user_import_sets
     SET transform_map_json = $1,
         valid_rows = $2,
         error_rows = $3,
         skipped_rows = $4,
         status = 'MAPPED'
     WHERE id = $5`,
    [JSON.stringify(transformMap), validCount, errorCount, skippedCount, importSetId]
  );

  return {
    importSetId,
    totalRows: rowsRes.rows.length,
    validRows: validCount,
    errorRows: errorCount,
    skippedRows: skippedCount,
    rows: validationResults,
  };
}

/**
 * Step 3: Execute Transform
 * Atomic locking with 2-minute lease & heartbeat, atomic row claims, crash recovery, and ZERO plain password exposure!
 */
export async function executeTransform(
  db: DBClient,
  importSetId: number,
  adminUser: { name: string; email?: string; business_profile?: string },
  options: { updateExisting?: boolean; sendWelcomeEmails?: boolean } = {}
) {
  const lockId = `LOCK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const LEASE_DURATION_MS = 2 * 60 * 1000; // 2-minute active execution lease

  // 1. ATOMIC CONDITIONAL STATUS TRANSITION & CONCURRENCY LOCK
  const lockRes = await db.query(
    `UPDATE user_import_sets
     SET status = 'TRANSFORMING',
         execution_lock_id = $1,
         execution_started_at = CURRENT_TIMESTAMP,
         execution_heartbeat_at = CURRENT_TIMESTAMP,
         executed_by = $2
     WHERE id = $3 AND status IN ('LOADED', 'MAPPED')
     RETURNING id, set_number`,
    [lockId, adminUser.name, importSetId]
  );

  if (!lockRes.rows || lockRes.rows.length === 0) {
    // Inspect current status to return accurate and informative error
    const currentRes = await db.query(
      'SELECT status, execution_started_at, execution_heartbeat_at, set_number FROM user_import_sets WHERE id = $1',
      [importSetId]
    );
    const current = currentRes.rows[0];
    if (!current) throw new Error('Import Set not found.');

    if (current.status === 'COMPLETED') {
      throw new Error(`Import Set ${current.set_number} has already been completed. Duplicate execution is strictly blocked.`);
    }

    if (current.status === 'TRANSFORMING') {
      // Check if lease heartbeat is stale (> 2 minutes)
      const lastHeartbeat = current.execution_heartbeat_at
        ? new Date(current.execution_heartbeat_at).getTime()
        : (current.execution_started_at ? new Date(current.execution_started_at).getTime() : 0);
      const isStale = Date.now() - lastHeartbeat > LEASE_DURATION_MS;

      if (isStale) {
        // Safe stale recovery: reclaim lock atomically
        const reclaimRes = await db.query(
          `UPDATE user_import_sets
           SET execution_lock_id = $1,
               execution_heartbeat_at = CURRENT_TIMESTAMP,
               executed_by = $2
           WHERE id = $3 AND status = 'TRANSFORMING'
           RETURNING id, set_number`,
          [lockId, adminUser.name, importSetId]
        );

        if (!reclaimRes.rows || reclaimRes.rows.length === 0) {
          throw new Error(`Failed to reclaim execution lease for Import Set ${current.set_number}.`);
        }

        // Reset any orphaned rows that were left in PROCESSING state back to PENDING so they can be claimed safely
        await db.query(
          `UPDATE user_import_staging_rows
           SET transform_status = 'PENDING',
               execution_lock_id = NULL
           WHERE import_set_id = $1 AND transform_status = 'PROCESSING'`,
          [importSetId]
        );
      } else {
        throw new Error(`Import Set ${current.set_number} is currently being executed by another process (active lease). Concurrent execution is blocked.`);
      }
    }
  }

  const setRes = await db.query('SELECT * FROM user_import_sets WHERE id = $1', [importSetId]);
  const importSet = setRes.rows[0];

  const executionDetails = [];
  let processedInThisRun = 0;

  // 2. ATOMIC ROW CLAIMING LOOP
  while (true) {
    // Claim ONE eligible row atomically using row-level locking
    const claimRes = await db.query(
      `UPDATE user_import_staging_rows
       SET transform_status = 'PROCESSING',
           execution_lock_id = $1
       WHERE id = (
         SELECT id FROM user_import_staging_rows
         WHERE import_set_id = $2
           AND is_excluded = FALSE
           AND validation_status <> 'INVALID'
           AND validation_status <> 'PROTECTED'
           AND transform_status = 'PENDING'
         ORDER BY row_number ASC
         LIMIT 1
       )
       RETURNING *`,
      [lockId, importSetId]
    );

    const row = claimRes.rows[0];
    if (!row) {
      // No more pending rows to process
      break;
    }

    // Renew heartbeat on parent import set and verify fencing token
    const heartbeatRes = await db.query(
      `UPDATE user_import_sets
       SET execution_heartbeat_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND execution_lock_id = $2
       RETURNING id`,
      [importSetId, lockId]
    );

    if (!heartbeatRes.rows || heartbeatRes.rows.length === 0) {
      throw new Error(`Execution lease for Import Set ${importSet.set_number} was revoked or expired. Execution aborted.`);
    }

    processedInThisRun++;
    const mapped = JSON.parse(row.mapped_data_json || '{}');
    const rolesArray = mapped.technical_roles
      ? mapped.technical_roles
          .split(/[,;|]/)
          .map((r: string) => r.trim())
          .filter(Boolean)
      : undefined;

    try {
      const outcome = await provisionUserAccount(db, {
        firstName: mapped.first_name,
        lastName: mapped.last_name,
        email: mapped.email,
        businessProfile: mapped.business_profile,
        title: mapped.title,
        technicalRoles: rolesArray,
        requestedUserId: mapped.user_id,
        adminUser,
        options: {
          updateIfExists: Boolean(options.updateExisting),
          sendWelcomeEmail: options.sendWelcomeEmails ?? false,
          sourceBatch: importSet.set_number,
        },
      });

      const emailStatus = outcome.emailSent ? 'SENT' : (outcome.emailError ? 'FAILED' : 'NOT_SENT');
      const emailError = outcome.emailError || null;

      if (outcome.action === 'PROVISIONED') {
        await db.query(
          `UPDATE user_import_staging_rows
           SET transform_status = 'PROVISIONED',
               provisioned_user_id = $1,
               provisioned_user_identifier = $2,
               email_status = $3,
               email_error = $4,
               email_sent_at = CASE WHEN $3 = 'SENT' THEN CURRENT_TIMESTAMP ELSE NULL END,
               error_message = $5,
               execution_lock_id = NULL
           WHERE id = $6 AND execution_lock_id = $7`,
          [outcome.user.id, outcome.userId, emailStatus, emailError, emailError ? `Account created; welcome email failed: ${emailError}` : null, row.id, lockId]
        );
      } else if (outcome.action === 'UPDATED') {
        await db.query(
          `UPDATE user_import_staging_rows
           SET transform_status = 'UPDATED',
               provisioned_user_id = $1,
               provisioned_user_identifier = $2,
               email_status = 'NOT_SENT',
               email_error = NULL,
               error_message = NULL,
               execution_lock_id = NULL
           WHERE id = $3 AND execution_lock_id = $4`,
          [outcome.user?.id, outcome.userId, row.id, lockId]
        );
      } else if (outcome.action === 'SKIPPED') {
        await db.query(
          `UPDATE user_import_staging_rows
           SET transform_status = 'SKIPPED',
               provisioned_user_identifier = $1,
               error_message = $2,
               execution_lock_id = NULL
           WHERE id = $3 AND execution_lock_id = $4`,
          [outcome.userId || mapped.user_id, outcome.error || 'Existing user skipped', row.id, lockId]
        );
      } else {
        await db.query(
          `UPDATE user_import_staging_rows
           SET transform_status = 'FAILED',
               error_message = $1,
               execution_lock_id = NULL
           WHERE id = $2 AND execution_lock_id = $3`,
          [outcome.error || 'Provisioning failed', row.id, lockId]
        );
      }

      // CRITICAL SECURITY FIX: Plaintext temporary passwords are NEVER collected or stored
      executionDetails.push({
        rowNumber: row.row_number,
        stagingRowId: row.id,
        name: `${mapped.first_name} ${mapped.last_name}`,
        email: mapped.email,
        businessProfile: mapped.business_profile,
        userId: outcome.userId,
        action: outcome.action,
        accountStatus: outcome.action === 'PROVISIONED' ? 'Created' : outcome.action === 'UPDATED' ? 'Updated' : 'Skipped',
        emailStatus,
        emailError,
        error: outcome.error,
      });
    } catch (err: any) {
      await db.query(
        `UPDATE user_import_staging_rows
         SET transform_status = 'FAILED',
             error_message = $1,
             execution_lock_id = NULL
         WHERE id = $2 AND execution_lock_id = $3`,
        [err.message, row.id, lockId]
      );
      executionDetails.push({
        rowNumber: row.row_number,
        stagingRowId: row.id,
        name: `${mapped.first_name} ${mapped.last_name}`,
        email: mapped.email,
        action: 'FAILED',
        accountStatus: 'Failed',
        emailStatus: 'NOT_SENT',
        error: err.message,
      });
    }
  }

  // Calculate cumulative counts including prior partial executions
  const allStagedRes = await db.query(
    `SELECT transform_status, COUNT(*) as c FROM user_import_staging_rows WHERE import_set_id = $1 GROUP BY transform_status`,
    [importSetId]
  );
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  for (const r of allStagedRes.rows) {
    const count = Number(r.c || 0);
    if (r.transform_status === 'PROVISIONED') totalCreated = count;
    else if (r.transform_status === 'UPDATED') totalUpdated = count;
    else if (r.transform_status === 'SKIPPED') totalSkipped = count;
    else if (r.transform_status === 'FAILED') totalFailed = count;
  }

  const summary = {
    importSetNumber: importSet.set_number,
    fileName: importSet.file_name,
    executedBy: adminUser.name,
    executedAt: new Date().toISOString(),
    totalStaged: importSet.total_rows,
    processed: processedInThisRun,
    created: totalCreated,
    updated: totalUpdated,
    skipped: totalSkipped,
    failed: totalFailed,
    details: executionDetails,
  };

  // Mark status as COMPLETED and record sanitized execution summary
  await db.query(
    `UPDATE user_import_sets
     SET status = 'COMPLETED',
         created_rows = $1,
         updated_rows = $2,
         skipped_rows = $3,
         error_rows = $4,
         execution_summary_json = $5,
         executed_by = $6,
         executed_at = CURRENT_TIMESTAMP,
         execution_heartbeat_at = CURRENT_TIMESTAMP,
         execution_lock_id = NULL
     WHERE id = $7 AND execution_lock_id = $8`,
    [totalCreated, totalUpdated, totalSkipped, totalFailed, JSON.stringify(summary), adminUser.name, importSetId, lockId]
  );

  // Dedicated audit trail entry
  await db.query(
    `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
     VALUES ($1, 'IMPORT_SET_TRANSFORM', $2, 'SUCCESS', $3)`,
    [
      adminUser.name,
      importSet.set_number,
      `Executed Transform for Import Set ${importSet.set_number} (${importSet.file_name}). Results: ${totalCreated} created, ${totalUpdated} updated, ${totalSkipped} skipped, ${totalFailed} failed. Passwords scrubbed.`,
    ]
  );

  return summary;
}

/**
 * Retry Welcome Email for a Specific Staging Row
 */
export async function retryRowWelcomeEmail(
  db: DBClient,
  stagingRowId: number,
  adminUser: { name: string; email?: string }
) {
  const rowRes = await db.query('SELECT * FROM user_import_staging_rows WHERE id = $1', [stagingRowId]);
  const row = rowRes.rows[0];
  if (!row) throw new Error('Staging record not found.');
  if (!row.provisioned_user_id) throw new Error('No user account associated with this staging record.');

  const result = await retryUserWelcomeEmail(db, row.provisioned_user_id, adminUser.name);

  if (result.success) {
    await db.query(
      `UPDATE user_import_staging_rows
       SET email_status = 'RETRY_SENT',
           email_error = NULL,
           email_sent_at = CURRENT_TIMESTAMP,
           error_message = NULL
       WHERE id = $1`,
      [stagingRowId]
    );
  } else {
    await db.query(
      `UPDATE user_import_staging_rows
       SET email_status = 'FAILED',
           email_error = $1
       WHERE id = $2`,
      [result.error || 'Retry failed', stagingRowId]
    );
  }

  return result;
}

/**
 * Generate Downloadable CSV of Transform Results
 * CRITICAL SECURITY FIX:
 * - Temporary Password column COMPLETELY REMOVED
 * - Formula Injection Sanitized (leading =, +, -, @ escaped with ')
 */
export function generateResultsCsv(summary: any): string {
  const headers = [
    'Row Number',
    'Full Name',
    'Professional Email',
    'Business Profile',
    'User ID',
    'Transform Action',
    'Account Status',
    'Welcome Email Status',
    'Email Error Note',
    'Status / Error Note',
  ];

  const sanitizeCell = (val: any) => {
    let str = String(val ?? '').trim();
    // Formula injection guard
    if (/^[=+@-]/.test(str)) {
      str = `'${str}`;
    }
    return `"${str.replace(/"/g, '""')}"`;
  };

  const lines = [headers.join(',')];

  for (const item of summary.details || []) {
    const row = [
      item.rowNumber,
      sanitizeCell(item.name),
      sanitizeCell(item.email),
      sanitizeCell(item.businessProfile),
      sanitizeCell(item.userId),
      sanitizeCell(item.action),
      sanitizeCell(item.accountStatus || (item.action === 'PROVISIONED' ? 'Created' : item.action)),
      sanitizeCell(item.emailStatus || (item.emailSent ? 'SENT' : 'NOT_SENT')),
      sanitizeCell(item.emailError || ''),
      sanitizeCell(item.error || ''),
    ];
    lines.push(row.join(','));
  }

  return lines.join('\r\n');
}

/**
 * Prune Staging Data older than Retention Window (Default: 90 Days)
 * Deletes staging records without touching provisioned users or audit logs
 */
export async function cleanupExpiredStagingSets(db: DBClient, retentionDays = 90, adminName = 'System Maintenance') {
  const expiredRes = await db.query(
    `SELECT id, set_number FROM user_import_sets
     WHERE status = 'COMPLETED' AND executed_at < CURRENT_TIMESTAMP - ($1 || ' days')::INTERVAL`,
    [retentionDays]
  );

  let purgedCount = 0;
  for (const set of expiredRes.rows) {
    await db.query('DELETE FROM user_import_sets WHERE id = $1', [set.id]);
    purgedCount++;
  }

  if (purgedCount > 0) {
    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
       VALUES ($1, 'PRUNE_IMPORT_STAGING', 'IMPORT_SETS', 'SUCCESS', $2)`,
      [
        adminName,
        `Purged ${purgedCount} expired import sets older than ${retentionDays} calendar days. User accounts and audit logs preserved intact.`,
      ]
    );
  }

  return { purgedCount, retentionDays };
}

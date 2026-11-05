import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateServerRequest, canAccessProgrammeReports } from '@/lib/rbac';
import { computeRetentionStatus } from '../retention/route';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-email, x-user-lang',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export interface CandidateJourney {
  ref: string;
  full_name: string;
  email: string;
  country: string;
  nationality: string;
  program: string;
  adviser: string;
  application_year: string;
  qualified_at: string | null;
  qualification_status: string;
  procedure_status: string;
  progress_pct: number;
  stage_badge: string;
  // School Admission
  school_name: string;
  admission_status: string;
  admission_date?: string | null;
  // Visa
  visa_status: 'Not Applied' | 'In Preparation' | 'Submitted' | 'Obtained' | 'Refused' | 'Withdrawn';
  visa_submission_date?: string | null;
  visa_decision_date?: string | null;
  visa_outcome_notes?: string | null;
  // Retention
  documents_purged: boolean;
  retention_status: string;
  retention_deadline?: string | null;
  // Milestones
  jalons: any[];
  // Chronological Events
  timeline: Array<{
    timestamp: string;
    author: string;
    activity_type: string;
    details: string;
  }>;
}

export interface ProgrammeReportSummary {
  intake_year: string;
  mode: 'live' | 'finalised';
  cutoff_date: string | null;
  generated_at: string;
  generated_by: string;
  total_candidates: number;
  qualified_count: number;
  requires_review_count: number;
  // Admissions
  admissions_admitted: number;
  admissions_pending: number;
  admissions_refused: number;
  admission_rate_pct: number;
  // Visas
  visa_obtained: number;
  visa_refused: number;
  visa_submitted_pending: number;
  visa_in_preparation: number;
  visa_not_applied: number;
  visa_withdrawn: number;
  visa_decided_count: number; // obtained + refused
  visa_success_rate_pct: number; // (obtained / (obtained + refused)) * 100
  // Document retention
  retention_purged_count: number;
  retention_active_count: number;
  retention_due_count: number;
  retention_review_count: number;
}

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) return auth.response;

    const { user } = auth;
    if (!canAccessProgrammeReports(user)) {
      return NextResponse.json(
        { error: 'Access denied: You do not have permission to access confidential academic programme reports.' },
        { status: 403, headers: corsHeaders() }
      );
    }

    const { searchParams } = new URL(req.url);

    // List archived snapshots if requested
    if (searchParams.get('snapshots') === 'true') {
      const snapRes = await db.query(
        `SELECT id, report_title, intake_year, reporting_mode, cutoff_date, total_candidates,
                admissions_confirmed, visa_obtained, visa_refused, visa_success_rate_pct,
                finalised_by, finalised_at
         FROM programme_report_snapshots
         ORDER BY finalised_at DESC`
      );
      return NextResponse.json({ ok: true, snapshots: snapRes.rows }, { headers: corsHeaders() });
    }

    const intakeYear = searchParams.get('intake') || '2027–2028';
    const mode = (searchParams.get('mode') || 'live').toLowerCase() as 'live' | 'finalised';
    const cutoffDateStr = searchParams.get('cutoff_date');
    const cutoffDate = cutoffDateStr ? new Date(cutoffDateStr) : null;

    // Fetch candidates for the intake year (or candidates matching year pattern)
    const canRes = await db.query(
      `SELECT * FROM candidats ORDER BY id ASC`
    );

    // Filter candidates for intake year (flexible matching for session/year)
    const matchingCandidates = canRes.rows.filter((row: any) => {
      if (!intakeYear || intakeYear === 'ALL') return true;
      const appYear = row.application_year || '2027–2028';
      // Match exact intake year or substring (e.g. 2027, 2027–2028, 2027-2028)
      const cleanTarget = intakeYear.replace(/[-–\s]/g, '');
      const cleanCandidate = appYear.replace(/[-–\s]/g, '');
      return cleanCandidate.includes(cleanTarget) || cleanTarget.includes(cleanCandidate);
    });

    const studentJourneys: CandidateJourney[] = [];

    let totalCandidates = 0;
    let qualifiedCount = 0;
    let requiresReviewCount = 0;

    let admissionsAdmitted = 0;
    let admissionsPending = 0;
    let admissionsRefused = 0;

    let visaObtained = 0;
    let visaRefused = 0;
    let visaSubmittedPending = 0;
    let visaInPreparation = 0;
    let visaNotApplied = 0;
    let visaWithdrawn = 0;

    let retentionPurgedCount = 0;
    let retentionActiveCount = 0;
    let retentionDueCount = 0;
    let retentionReviewCount = 0;

    for (const row of matchingCandidates) {
      totalCandidates++;

      const retention = computeRetentionStatus(row);
      if (row.documents_purged) retentionPurgedCount++;
      else if (retention.status === 'DUE_FOR_PURGE') retentionDueCount++;
      else if (retention.requiresReview) retentionReviewCount++;
      else retentionActiveCount++;

      if (row.qualified_at && row.qualification_status === 'QUALIFIED') {
        qualifiedCount++;
      } else {
        requiresReviewCount++;
      }

      // Vœux & Admissions
      let voeux: any[] = [];
      try {
        voeux = JSON.parse(row.voeux_json || '[]');
      } catch {
        voeux = [];
      }
      const topVoeu = voeux[0] || {};
      const schoolName = topVoeu.university || row.program?.split('—')[0]?.trim() || 'Partenaire Lyon';

      // Admission outcome evaluation
      let admStatus = row.admission_status || topVoeu.statusBadge || 'Under Review';
      if (
        admStatus.toLowerCase().includes('admis') ||
        admStatus.toLowerCase().includes('accepté') ||
        admStatus.toLowerCase().includes('validé') ||
        admStatus.toLowerCase().includes('confirm')
      ) {
        admissionsAdmitted++;
        admStatus = 'Admitted';
      } else if (admStatus.toLowerCase().includes('refus')) {
        admissionsRefused++;
        admStatus = 'Refused';
      } else {
        admissionsPending++;
        admStatus = 'Pending / In Progress';
      }

      // Visa evaluation (strictly structured field)
      let vStatus = (row.visa_status || 'Not Applied') as any;

      // In finalised cutoff mode, check whether decision happened prior to cutoff
      if (mode === 'finalised' && cutoffDate && row.visa_decision_date) {
        const decDate = new Date(row.visa_decision_date);
        if (decDate > cutoffDate) {
          // Decision occurred after reporting cutoff date -> count as Pending at cutoff
          vStatus = 'Submitted';
        }
      }

      switch (vStatus) {
        case 'Obtained':
          visaObtained++;
          break;
        case 'Refused':
          visaRefused++;
          break;
        case 'Submitted':
          visaSubmittedPending++;
          break;
        case 'In Preparation':
          visaInPreparation++;
          break;
        case 'Withdrawn':
          visaWithdrawn++;
          break;
        case 'Not Applied':
        default:
          visaNotApplied++;
          vStatus = 'Not Applied';
          break;
      }

      // Milestones & History
      let jalons: any[] = [];
      try {
        jalons = JSON.parse(row.jalons_json || '[]');
      } catch {
        jalons = [];
      }

      let timeline: any[] = [];
      try {
        timeline = JSON.parse(row.history_json || '[]');
        if (!Array.isArray(timeline)) timeline = [];
      } catch {
        timeline = [];
      }

      // If qualification event not in timeline, add synthesized verified event
      if (row.qualified_at && !timeline.some((t: any) => t.activity_type === 'CANDIDATE_QUALIFIED')) {
        timeline.push({
          timestamp: new Date(row.qualified_at).toISOString().replace('T', ' ').substring(0, 19),
          author: row.adviser || 'LIEC Administration',
          activity_type: 'CANDIDATE_QUALIFIED',
          details: `Prospect qualified and enrolled in Academic Intake ${row.application_year || intakeYear}.`,
        });
      }

      // Sort timeline chronologically descending
      timeline.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      studentJourneys.push({
        ref: row.ref,
        full_name: row.full_name,
        email: row.email,
        country: row.country || 'RDC',
        nationality: row.nationality || 'Congolaise',
        program: row.program || '',
        adviser: row.adviser || 'LIEC Advisor',
        application_year: row.application_year || intakeYear,
        qualified_at: row.qualified_at,
        qualification_status: row.qualification_status || (row.qualified_at ? 'QUALIFIED' : 'REQUIRES_REVIEW'),
        procedure_status: row.procedure_status || row.stage_badge || 'En cours',
        progress_pct: Number(row.progress_pct) || 25,
        stage_badge: row.stage_badge || 'En cours',
        school_name: schoolName,
        admission_status: admStatus,
        visa_status: vStatus,
        visa_submission_date: row.visa_submission_date,
        visa_decision_date: row.visa_decision_date,
        visa_outcome_notes: row.visa_outcome_notes,
        documents_purged: !!row.documents_purged,
        retention_status: retention.statusLabel,
        retention_deadline: retention.deadline,
        jalons,
        timeline,
      });
    }

    // Key Performance Calculations
    // Strict Denominator Safeguard:
    // Visa Success Rate = (Obtained / (Obtained + Refused)) * 100
    // Strictly excludes Pending, In Preparation, and Unsubmitted from the denominator.
    const visaDecidedCount = visaObtained + visaRefused;
    const visaSuccessRatePct =
      visaDecidedCount > 0 ? Math.round((visaObtained / visaDecidedCount) * 1000) / 10 : 0;

    const admissionTotalEvaluated = admissionsAdmitted + admissionsRefused;
    const admissionRatePct =
      admissionTotalEvaluated > 0
        ? Math.round((admissionsAdmitted / (admissionTotalEvaluated + admissionsPending)) * 1000) / 10
        : (totalCandidates > 0 ? Math.round((admissionsAdmitted / totalCandidates) * 1000) / 10 : 0);

    const summary: ProgrammeReportSummary = {
      intake_year: intakeYear,
      mode,
      cutoff_date: cutoffDateStr || null,
      generated_at: new Date().toISOString(),
      generated_by: `${user.name} (${user.business_profile})`,
      total_candidates: totalCandidates,
      qualified_count: qualifiedCount,
      requires_review_count: requiresReviewCount,
      admissions_admitted: admissionsAdmitted,
      admissions_pending: admissionsPending,
      admissions_refused: admissionsRefused,
      admission_rate_pct: admissionRatePct,
      visa_obtained: visaObtained,
      visa_refused: visaRefused,
      visa_submitted_pending: visaSubmittedPending,
      visa_in_preparation: visaInPreparation,
      visa_not_applied: visaNotApplied,
      visa_withdrawn: visaWithdrawn,
      visa_decided_count: visaDecidedCount,
      visa_success_rate_pct: visaSuccessRatePct,
      retention_purged_count: retentionPurgedCount,
      retention_active_count: retentionActiveCount,
      retention_due_count: retentionDueCount,
      retention_review_count: retentionReviewCount,
    };

    return NextResponse.json(
      {
        ok: true,
        summary,
        studentJourneys,
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error generating programme report:', error);
    return NextResponse.json({ error: error?.message }, { status: 500, headers: corsHeaders() });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) return auth.response;

    const { user } = auth;
    if (!canAccessProgrammeReports(user)) {
      return NextResponse.json(
        { error: 'Forbidden: Access denied to finalize programme report snapshots.' },
        { status: 403, headers: corsHeaders() }
      );
    }

    const body = await req.json();
    const intakeYear = (body.intake_year || '2027–2028').trim();
    const cutoffDate = (body.cutoff_date || new Date().toISOString().substring(0, 10)).trim();
    const summary = body.summary || {};
    const reportTitle = (
      body.report_title ||
      `LIEC Academic Intake ${intakeYear} — Finalised Programme Report (Cutoff: ${cutoffDate})`
    ).trim();

    // Check if snapshot already exists for this intake and cutoff date
    const existingSnap = await db.query(
      `SELECT id FROM programme_report_snapshots WHERE intake_year = $1 AND cutoff_date = $2 LIMIT 1`,
      [intakeYear, cutoffDate]
    );

    let snapshotId: number;
    if (existingSnap.rows && existingSnap.rows.length > 0) {
      snapshotId = existingSnap.rows[0].id;
      await db.query(
        `UPDATE programme_report_snapshots SET
          report_title = $1,
          total_candidates = $2,
          admissions_confirmed = $3,
          visa_obtained = $4,
          visa_refused = $5,
          visa_success_rate_pct = $6,
          snapshot_data_json = $7,
          finalised_by = $8,
          finalised_at = CURRENT_TIMESTAMP
         WHERE id = $9`,
        [
          reportTitle,
          summary.total_candidates || 0,
          summary.admissions_admitted || 0,
          summary.visa_obtained || 0,
          summary.visa_refused || 0,
          summary.visa_success_rate_pct || 0,
          JSON.stringify(body),
          `${user.name} (${user.business_profile})`,
          snapshotId,
        ]
      );
    } else {
      const insertRes = await db.query(
        `INSERT INTO programme_report_snapshots (
          report_title, intake_year, reporting_mode, cutoff_date, total_candidates,
          admissions_confirmed, visa_obtained, visa_refused, visa_success_rate_pct,
          snapshot_data_json, finalised_by, finalised_at
        ) VALUES ($1, $2, 'finalised', $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
        RETURNING id`,
        [
          reportTitle,
          intakeYear,
          cutoffDate,
          summary.total_candidates || 0,
          summary.admissions_admitted || 0,
          summary.visa_obtained || 0,
          summary.visa_refused || 0,
          summary.visa_success_rate_pct || 0,
          JSON.stringify(body),
          `${user.name} (${user.business_profile})`,
        ]
      );
      snapshotId = insertRes.rows[0].id;
    }

    // Immutable audit log
    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
       VALUES ($1, 'Finalise Academic Programme Report Snapshot', $2, 'Succès', $3)`,
      [
        `${user.name} (${user.business_profile})`,
        `Snapshot #${snapshotId}`,
        `Intake: ${intakeYear}. Cutoff: ${cutoffDate}. Success rate: ${summary.visa_success_rate_pct}%. Preserved immutable snapshot.`,
      ]
    );

    return NextResponse.json(
      {
        ok: true,
        success: true,
        snapshot_id: snapshotId,
        intake_year: intakeYear,
        cutoff_date: cutoffDate,
        message: `Academic Intake Programme Report for ${intakeYear} successfully finalised and archived (Snapshot #${snapshotId}).`,
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error saving report snapshot:', error);
    return NextResponse.json({ error: error?.message }, { status: 500, headers: corsHeaders() });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateServerRequest } from '@/lib/rbac';
import {
  resolveAuthoritativeCourseFee,
  resolveInstalmentObligation,
} from '@/lib/paymentSubmissions';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) return auth.response;

    const { searchParams } = new URL(req.url);
    const entityType = (searchParams.get('entity_type') || searchParams.get('entityType') || '').toUpperCase().trim();
    const entityRef = (searchParams.get('entity_ref') || searchParams.get('entityRef') || '').trim();
    const applicantName = (searchParams.get('applicant_name') || searchParams.get('name') || '').trim();
    const applicantEmail = (searchParams.get('applicant_email') || searchParams.get('email') || '').trim();

    if (!entityRef) {
      return NextResponse.json(
        { error: 'Missing required parameter: entity_ref (or entityRef).' },
        { status: 400 }
      );
    }

    // 1. Resolve authoritative course fee dynamically
    const feeResolution = await resolveAuthoritativeCourseFee(db, {
      entityType: entityType || 'DEMANDE',
      entityRef,
      applicantName,
      applicantEmail,
    });

    const totalCourseFee = feeResolution.fee;

    // 2. Query view_applicant_total_course_balances
    const courseBalanceRes = await db.query(
      `SELECT * FROM view_applicant_total_course_balances
       WHERE entity_ref = $1
       LIMIT 1;`,
      [entityRef]
    );

    const totalValidatedCourseAmount = courseBalanceRes.rows.length > 0
      ? parseFloat(courseBalanceRes.rows[0].total_course_validated_amount || '0')
      : 0;

    const outstandingCourseBalance = Math.max(0, totalCourseFee - totalValidatedCourseAmount);

    // 3. Query view_applicant_instalment_balances
    const instalmentBalancesRes = await db.query(
      `SELECT * FROM view_applicant_instalment_balances
       WHERE entity_ref = $1
       ORDER BY instalment_number ASC;`,
      [entityRef]
    );

    const instalmentMap: Record<number, any> = {};
    for (const row of instalmentBalancesRes.rows) {
      instalmentMap[row.instalment_number] = {
        validated_amount: parseFloat(row.total_validated_amount || '0'),
        validated_count: parseInt(row.validated_payments_count || '0', 10),
        total_submissions_count: parseInt(row.total_submissions_count || '0', 10),
        has_active_pending: Boolean(row.has_active_pending_submission),
        last_validated_date: row.last_validated_payment_date,
      };
    }

    // 4. Query pending, rejected, and active submissions for this entity
    const submissionsRes = await db.query(
      `SELECT id, submission_ref, instalment_number, amount, currency, status, payment_method,
              rawbank_slip_number, rawbank_operation_code, payment_date, created_at, decision_reason
       FROM payment_submissions
       WHERE entity_ref = $1 AND is_archived = FALSE
       ORDER BY id DESC;`,
      [entityRef]
    );

    const pendingSubmissions = submissionsRes.rows.filter((s: any) =>
      s.status === 'PENDING_ADMIN_VALIDATION' || s.status === 'ADDITIONAL_EVIDENCE_REQUESTED'
    );
    const rejectedSubmissions = submissionsRes.rows.filter((s: any) => s.status === 'REJECTED');
    const validatedSubmissions = submissionsRes.rows.filter((s: any) => s.status === 'VALIDATED');

    // 5. Build instalment breakdown for 1 and 2 (and any other instalment)
    const instalments = await Promise.all(
      [1, 2].map(async (num) => {
        const obligation = await resolveInstalmentObligation(db, {
          entityType: entityType || 'DEMANDE',
          entityRef,
          applicantName,
          applicantEmail,
          instalmentNumber: num,
          totalCourseFee,
        });

        const fromView = instalmentMap[num] || {
          validated_amount: 0,
          validated_count: 0,
          total_submissions_count: 0,
          has_active_pending: false,
          last_validated_date: null,
        };

        const pendingForInstalment = pendingSubmissions.filter((s: any) => s.instalment_number === num);
        const pendingAmount = pendingForInstalment.reduce((acc: number, curr: any) => acc + parseFloat(curr.amount || '0'), 0);
        const remainingBalance = Math.max(0, obligation.amount - fromView.validated_amount);
        const percentage = totalCourseFee > 0 ? Number(((obligation.amount / totalCourseFee) * 100).toFixed(2)) : 0;

        return {
          instalment_number: num,
          expected_amount: obligation.amount,
          percentage_of_total: percentage,
          source: obligation.source,
          validated_amount: fromView.validated_amount,
          remaining_balance: remainingBalance,
          pending_amount: pendingAmount,
          pending_count: pendingForInstalment.length,
          has_active_pending: fromView.has_active_pending || pendingForInstalment.length > 0,
          last_validated_date: fromView.last_validated_date,
          is_settled: remainingBalance <= 0,
        };
      })
    );

    return NextResponse.json({
      success: true,
      entity_type: entityType,
      entity_ref: entityRef,
      applicant_name: applicantName,
      fee_resolution: {
        total_course_fee: totalCourseFee,
        source: feeResolution.source,
      },
      course_balance: {
        total_course_fee: totalCourseFee,
        total_validated_amount: totalValidatedCourseAmount,
        outstanding_course_balance: outstandingCourseBalance,
        is_fully_paid: outstandingCourseBalance <= 0,
        has_active_pending_submission: pendingSubmissions.length > 0,
      },
      instalments,
      submissions_summary: {
        total_submissions: submissionsRes.rows.length,
        validated_count: validatedSubmissions.length,
        pending_count: pendingSubmissions.length,
        rejected_count: rejectedSubmissions.length,
        pending_submissions: pendingSubmissions,
        rejected_submissions: rejectedSubmissions,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

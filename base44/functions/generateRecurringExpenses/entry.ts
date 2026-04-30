import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

  // Get all recurring expenses
  const allExpenses = await base44.asServiceRole.entities.Expense.list();
  const recurringTemplates = allExpenses.filter(e => e.is_recurring);

  let created = 0;

  for (const template of recurringTemplates) {
    // Get the original day of month
    let dayOfMonth = 1;
    if (template.expense_date) {
      dayOfMonth = parseInt(template.expense_date.split("-")[2]) || 1;
    }

    // Clamp to last day of current month
    const lastDay = new Date(currentYear, currentMonth, 0).getDate();
    const clampedDay = Math.min(dayOfMonth, lastDay);
    const newDate = `${currentMonthStr}-${String(clampedDay).padStart(2, "0")}`;

    // Check if already created this month (same description + same month)
    const alreadyExists = allExpenses.some(
      e =>
        !e.is_recurring &&
        e.description === template.description &&
        e.expense_date?.startsWith(currentMonthStr) &&
        e.amount === template.amount
    );

    if (!alreadyExists) {
      await base44.asServiceRole.entities.Expense.create({
        description: template.description,
        amount: template.amount,
        category: template.category,
        expense_date: newDate,
        paid_by: template.paid_by,
        receipt_note: template.receipt_note,
        notes: template.notes,
        is_recurring: false,
      });
      created++;
    }
  }

  return Response.json({ success: true, created, month: currentMonthStr });
});
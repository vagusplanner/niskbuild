import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { holiday_id, booking_type, amount, details } = await req.json();

    // Fetch holiday
    const holidays = await base44.entities.Holiday.filter({ id: holiday_id });
    if (!holidays[0]) {
      return Response.json({ error: 'Holiday not found' }, { status: 404 });
    }

    const holiday = holidays[0];

    // Create expense record
    await base44.entities.HolidayExpense.create({
      holiday_id,
      category: booking_type,
      title: `${booking_type.charAt(0).toUpperCase() + booking_type.slice(1)} Booking`,
      amount,
      paid_by: user.email,
      date: new Date().toISOString().split('T')[0],
      notes: details || 'Auto-imported from booking confirmation'
    });

    // Get all expenses for this holiday
    const expenses = await base44.entities.HolidayExpense.filter({ holiday_id });
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Update holiday budget if not set or needs adjustment
    const updates = {};
    if (!holiday.budget || holiday.budget < totalSpent) {
      updates.budget = Math.ceil(totalSpent * 1.2); // Set budget 20% above current spending
    }

    // Update package booking info
    if (booking_type === 'flights' || booking_type === 'accommodation') {
      updates.package_booking = {
        ...holiday.package_booking,
        [`${booking_type === 'flights' ? 'flight' : 'hotel'}_confirmed`]: true,
        total_cost: totalSpent
      };
    }

    if (Object.keys(updates).length > 0) {
      await base44.entities.Holiday.update(holiday_id, updates);
    }

    return Response.json({
      success: true,
      budget_updated: !!updates.budget,
      new_budget: updates.budget,
      total_spent: totalSpent
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
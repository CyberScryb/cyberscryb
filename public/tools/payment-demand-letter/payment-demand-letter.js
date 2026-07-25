// payment-demand-letter — flagship life tool boot
document.addEventListener('DOMContentLoaded', function () {
  if (!window.LifeTool) {
    console.error('LifeTool missing');
    return;
  }
  LifeTool.mount({
    toolId: "payment-demand-letter",
    emptyMessage: "Enter who owes what, due dates, and which notice stage you need.",
    fieldIds: ["debtor", "amount", "invoice", "due_date", "prior", "deadline", "pay_method", "next_step"],
    modeLabels: {"friendly": "1st \u2014 friendly reminder", "firm": "2nd \u2014 firm follow-up", "final": "Final notice", "personal": "Personal / roommate debt"},
    modeTips: {"friendly": {"title": "Friendly reminder", "body": "Assume good intent. Restate invoice #, amount, original due date, and a simple pay-by date. Attach the invoice. Short and warm wins first contact."}, "firm": {"title": "Firm follow-up", "body": "Reference prior reminders with dates. Restate amount and a clear deadline. Mention pause of work or late fee only if your contract allows it and you will actually do it."}, "final": {"title": "Final notice", "body": "Last written chance before escalation. Stay professional. Only mention collections, small claims, or stopping work if that is a real next step you are prepared to take \u2014 never invent legal threats."}, "personal": {"title": "Personal / roommate", "body": "Keep it factual: what was agreed, what\u2019s unpaid, total, and a friendly but clear pay-by date. Preserve the relationship if possible; still create a dated record."}},
    criticalFields: ["debtor", "amount", "due_date", "deadline"]
  });
});

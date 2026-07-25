// sap-appeal-letter — flagship life tool boot
document.addEventListener('DOMContentLoaded', function () {
  if (!window.LifeTool) {
    console.error('LifeTool missing');
    return;
  }
  LifeTool.mount({
    toolId: "sap-appeal-letter",
    emptyMessage: "Explain which SAP rule you failed and what happened, plus your plan for next term.",
    fieldIds: ["school", "student_id", "program", "term", "sap_metric", "circumstance_dates", "support", "next_term"],
    modeLabels: {"gpa": "GPA shortfall", "pace": "Pace / completion rate", "max-time": "Max time frame", "combined": "Multiple SAP rules"},
    modeTips: {"gpa": {"title": "GPA appeal", "body": "Committees look for a documented extenuating circumstance with dates, plus a term-by-term plan to raise GPA (credit load, tutoring, reduced work hours). Emotion without a plan rarely succeeds."}, "pace": {"title": "Pace / completion rate", "body": "Pace = completed credits \u00f7 attempted credits. Explain W/F grades with dates, then show how next-term schedule recovers pace (fewer withdrawals, support services)."}, "max-time": {"title": "Maximum timeframe", "body": "You\u2019re near or past 150% of program length. Justify remaining credits needed for degree and a realistic graduation term. Degree audit or advisor map helps."}, "combined": {"title": "Multiple rules", "body": "Address each failed metric separately, then one unified academic plan. Don\u2019t bury numbers \u2014 put GPA/pace/timeframe in plain view."}},
    criticalFields: ["school", "term", "sap_metric", "next_term"]
  });
});

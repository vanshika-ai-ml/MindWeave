export default function MasteryBadge({ tier, score = null }) {
  let badgeClass = "badge-unassessed";
  let label = "Unassessed";
  let icon = "⚪";

  if (tier === "mastery" || (score !== null && score >= 75)) {
    badgeClass = "badge-mastery";
    label = "Strong Understanding";
    icon = "🟢";
  } else if (tier === "developing" || (score !== null && score >= 50)) {
    badgeClass = "badge-developing";
    label = "Partial Understanding";
    icon = "🟡";
  } else if (tier === "novice" || (score !== null && score < 50)) {
    badgeClass = "badge-novice";
    label = "Needs Revision";
    icon = "🔴";
  }

  return (
    <span className={`badge ${badgeClass}`}>
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
      {score !== null && <span>({score}%)</span>}
    </span>
  );
}

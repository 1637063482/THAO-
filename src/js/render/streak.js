import { state } from "../state.js";
import { t } from "../i18n.js";
import { Icons } from "../icons.js";
import { buildLegacyStreak } from "../streak.js";
import { showToast } from "../utils.js";

function getDerivedStreak() {
  return buildLegacyStreak(state.appState.entries, state.activeYear, new Date(), "Asia/Ho_Chi_Minh", {
    previousYearEntries: state.previousYearEntries,
  });
}

function hasRewardFired(threshold, todayStr) {
  try { return localStorage.getItem("expense_streak_reward_" + threshold + "_" + todayStr) === "1"; }
  catch (e) { return false; }
}

function markRewardFired(threshold, todayStr) {
  try { localStorage.setItem("expense_streak_reward_" + threshold + "_" + todayStr, "1"); }
  catch (e) {}
}

function launchFireworks(options) {
  import("../fireworks.js")
    .then(function ({ Fireworks }) { Fireworks.launch(options); })
    .catch(function () {});
}

export function renderStreakPanel() {
  var panel = document.getElementById("streak-panel");
  if (!panel) return;
  var s = getDerivedStreak();

  panel.innerHTML = '<div class="card p-4">'
    + '<div class="flex items-center justify-between">'
    + '<div class="flex items-center gap-3">'
    + '<div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md shadow-amber-200/60">' + Icons.flame('w-7 h-7 text-white') + '</div>'
    + '<div><div class="text-xs text-slate-500 dark:text-slate-400 font-medium">' + t("streak_days") + '</div>'
    + '<div class="text-2xl font-black text-slate-800 dark:text-white">' + s.streak + ' <span class="text-sm font-normal text-slate-500 dark:text-slate-400">' + t("streak_unit") + '</span></div></div></div>'
    + '<div class="text-right">'
    + (s.hasRecordedToday ? '<span class="streak-badge">' + Icons.check('w-3.5 h-3.5') + t("checked_in_today") + '</span>' : '<span class="text-xs text-slate-400 dark:text-slate-500">' + t("not_recorded_yet") + '</span>')
    + '</div></div>'
    + (s.streak >= 7 ? '<div class="mt-3 pt-3 border-t border-slate-100"><p class="text-xs text-amber-600 font-medium flex items-center gap-1">' + Icons.flame('w-4 h-4') + t("streak_encouragement", { days: s.streak }) + '</p></div>' : '')
    + '</div>';

  state.currentStreak = s.streak;
  return s;
}

export function updateStreakAfterRecord(options) {
  options = options || {};
  var launchDefaultFireworks = options.launchDefaultFireworks !== false;
  var s = renderStreakPanel();
  if (!s || !s.hasRecordedToday) {
    return;
  }

  if ((s.streak === 7 || s.streak === 30) && !hasRewardFired(s.streak, s.todayStr)) {
    markRewardFired(s.streak, s.todayStr);
    showToast(t("streak_achieved", { days: s.streak }));
    launchFireworks({ duration: 12000 });
  } else if (launchDefaultFireworks) {
    launchFireworks({ duration: 6000 });
  }
}

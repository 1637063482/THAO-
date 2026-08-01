import { renderDepositCard } from "./deposit-card.js";
/**
 * @param {import("../../types/app-state").DepositViewItem[]} items
 * @param {import("../../types/app-state").DepositRenderOptions} options
 */
export function renderDepositTable(items, options) {
  const { labels, locale, money, productLabel, escape } = options;
  return `<div class="deposit-table-wrap"><table class="deposit-table"><thead><tr><th>${labels.institution}</th><th>${labels.amount}</th><th>${labels.rate}</th><th>${labels.interest}</th><th>${labels.opened}</th><th>${labels.matures}</th><th>${labels.status}</th><th>${labels.actions}</th></tr></thead><tbody>${items.map(item => { const action = renderDepositCard(item, options).match(/<div class="deposit-actions">([\s\S]*)<\/div><\/article>$/)?.[1] || ""; return `<tr data-deposit-id="${escape(item.id)}"><td><strong>${escape(item.institutionName)}</strong><small>${escape(productLabel(item.productName, locale))}</small></td><td class="blur-sensitive">${money(item.principalVnd, locale)}</td><td class="blur-sensitive">${(item.annualRatePpm / 10000).toLocaleString()}%</td><td class="blur-sensitive">${money(item.expectedInterestVnd ?? item.calculatedInterestVnd, locale)}</td><td>${escape(item.openedOn)}</td><td class="blur-sensitive">${escape(item.maturesOn)}</td><td><span class="deposit-status status-${item.derivedStatus.toLowerCase()}">${escape(labels[item.derivedStatus])}</span></td><td>${action}</td></tr>`; }).join("")}</tbody></table></div>`;
}

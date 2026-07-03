const APP_VERSION = "v0.0.5";

const TAX_BRACKETS_2026 = [
  { from: 0, to: 7010, rate: 0.10 },
  { from: 7010, to: 10060, rate: 0.14 },
  { from: 10060, to: 19000, rate: 0.20 },
  { from: 19000, to: 25100, rate: 0.31 },
  { from: 25100, to: 35220, rate: 0.35 },
  { from: 35220, to: 58190, rate: 0.47 },
  { from: 58190, to: Infinity, rate: 0.50 },
];

const els = {
  baseSalary: document.getElementById("baseSalary"),
  overtimeGross: document.getElementById("overtimeGross"),
  spouseBaseSalary: document.getElementById("spouseBaseSalary"),
  calculateBtn: document.getElementById("calculateBtn"),
  spouseRequiredTotalGross: document.getElementById("spouseRequiredTotalGross"),
  spouseRequiredExtraGross: document.getElementById("spouseRequiredExtraGross"),
  lostNet: document.getElementById("lostNet"),
  savedTax: document.getElementById("savedTax"),
  spouseTax: document.getElementById("spouseTax"),
  spouseNet: document.getElementById("spouseNet"),
  yourOvertimeNet: document.getElementById("yourOvertimeNet"),
  yourMarginalTax: document.getElementById("yourMarginalTax"),
  decisionText: document.getElementById("decisionText"),
  taxBreakdown: document.getElementById("taxBreakdown"),
  versionBadge: document.getElementById("versionBadge"),
};

function formatCurrency(value) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(Math.max(0, value));
}

function formatRange(bracket) {
  if (!Number.isFinite(bracket.to)) return `מעל ${formatCurrency(bracket.from)}`;
  if (bracket.from === 0) return `עד ${formatCurrency(bracket.to)}`;
  return `${formatCurrency(bracket.from + 1)}–${formatCurrency(bracket.to)}`;
}

function calculateTax(gross) {
  let totalTax = 0;
  let marginalRate = 0;
  const rows = TAX_BRACKETS_2026.map((bracket) => {
    const taxablePart = Math.max(0, Math.min(gross, bracket.to) - bracket.from);
    const tax = taxablePart * bracket.rate;
    if (gross > bracket.from && taxablePart > 0) marginalRate = bracket.rate;
    totalTax += tax;
    return { range: formatRange(bracket), taxablePart, tax, rate: bracket.rate, active: taxablePart > 0 };
  });
  return { totalTax, marginalRate, rows };
}

function calculateIncrementalTax(baseGross, extraGross) {
  const baseTax = calculateTax(baseGross).totalTax;
  const combinedTax = calculateTax(baseGross + extraGross).totalTax;
  return Math.max(0, combinedTax - baseTax);
}

function netFromExtraGross(baseGross, extraGross) {
  return Math.max(0, extraGross - calculateIncrementalTax(baseGross, extraGross));
}

function grossNeededForTargetNet(baseGross, targetNet) {
  if (targetNet <= 0) return 0;
  let low = 0;
  let high = Math.max(targetNet * 1.25, 1000);

  while (netFromExtraGross(baseGross, high) < targetNet) {
    high *= 2;
    if (high > 10000000) break;
  }

  for (let i = 0; i < 70; i++) {
    const mid = (low + high) / 2;
    const net = netFromExtraGross(baseGross, mid);
    if (net >= targetNet) high = mid;
    else low = mid;
  }

  return high;
}

function render() {
  const baseSalary = Number(els.baseSalary.value || 0);
  const overtimeGross = Number(els.overtimeGross.value || 0);
  const spouseBaseSalary = Number(els.spouseBaseSalary.value || 0);

  const fullYourGross = baseSalary + overtimeGross;
  const baseTax = calculateTax(baseSalary).totalTax;
  const fullTaxResult = calculateTax(fullYourGross);
  const overtimeTax = Math.max(0, fullTaxResult.totalTax - baseTax);
  const overtimeNet = Math.max(0, overtimeGross - overtimeTax);

  const spouseRequiredExtraGross = grossNeededForTargetNet(spouseBaseSalary, overtimeNet);
  const spouseRequiredTotalGross = spouseBaseSalary + spouseRequiredExtraGross;
  const spouseTax = calculateIncrementalTax(spouseBaseSalary, spouseRequiredExtraGross);
  const spouseNet = Math.max(0, spouseRequiredExtraGross - spouseTax);

  els.spouseRequiredTotalGross.textContent = formatCurrency(spouseRequiredTotalGross);
  els.spouseRequiredExtraGross.textContent = formatCurrency(spouseRequiredExtraGross);
  els.lostNet.textContent = formatCurrency(overtimeNet);
  els.savedTax.textContent = formatCurrency(overtimeTax);
  els.spouseTax.textContent = formatCurrency(spouseTax);
  els.spouseNet.textContent = formatCurrency(spouseNet);
  els.yourOvertimeNet.textContent = formatCurrency(overtimeNet);
  els.yourMarginalTax.textContent = `${Math.round(fullTaxResult.marginalRate * 100)}%`;
  els.versionBadge.textContent = APP_VERSION;

  if (overtimeNet <= 0) {
    els.decisionText.textContent = "הכנס ברוטו שעות נוספות כדי לחשב את השכר הנדרש לבת הזוג.";
  } else if (spouseBaseSalary > 0) {
    els.decisionText.textContent = `כדי להחליף ${formatCurrency(overtimeNet)} נטו שאתה מפסיד, בת הזוג צריכה להגיע לשכר ברוטו חודשי של ${formatCurrency(spouseRequiredTotalGross)}. כלומר תוספת של ${formatCurrency(spouseRequiredExtraGross)} מעל השכר הנוכחי שלה.`;
  } else {
    els.decisionText.textContent = `כדי להחליף ${formatCurrency(overtimeNet)} נטו שאתה מפסיד, בת הזוג צריכה להרוויח שכר ברוטו חודשי של ${formatCurrency(spouseRequiredTotalGross)}.`;
  }

  els.taxBreakdown.innerHTML = fullTaxResult.rows.map((row) => `
    <tr class="${row.active ? "active" : ""}">
      <td>${row.range}<br><small>${Math.round(row.rate * 100)}%</small></td>
      <td>${formatCurrency(row.taxablePart)}</td>
      <td>${formatCurrency(row.tax)}</td>
    </tr>
  `).join("");
}

els.calculateBtn?.addEventListener("click", render);
[els.baseSalary, els.overtimeGross, els.spouseBaseSalary].forEach((input) => input.addEventListener("input", render));
render();

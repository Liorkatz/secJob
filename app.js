const APP_VERSION = "v0.0.4";

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
  spouseHourlyRate: document.getElementById("spouseHourlyRate"),
  calculateBtn: document.getElementById("calculateBtn"),
  lostGross: document.getElementById("lostGross"),
  savedTax: document.getElementById("savedTax"),
  lostNet: document.getElementById("lostNet"),
  yourMarginalTax: document.getElementById("yourMarginalTax"),
  spouseRequiredGross: document.getElementById("spouseRequiredGross"),
  spouseTax: document.getElementById("spouseTax"),
  spouseNet: document.getElementById("spouseNet"),
  spouseHours: document.getElementById("spouseHours"),
  decisionText: document.getElementById("decisionText"),
  yourNetPer1000: document.getElementById("yourNetPer1000"),
  spouseNetPer1000: document.getElementById("spouseNetPer1000"),
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

function formatNumber(value, digits = 1) {
  return new Intl.NumberFormat("he-IL", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
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
  const spouseHourlyRate = Number(els.spouseHourlyRate.value || 0);

  const fullYourGross = baseSalary + overtimeGross;
  const baseTax = calculateTax(baseSalary).totalTax;
  const fullTaxResult = calculateTax(fullYourGross);
  const overtimeTax = Math.max(0, fullTaxResult.totalTax - baseTax);
  const overtimeNet = Math.max(0, overtimeGross - overtimeTax);
  const spouseRequiredGross = grossNeededForTargetNet(spouseBaseSalary, overtimeNet);
  const spouseTax = calculateIncrementalTax(spouseBaseSalary, spouseRequiredGross);
  const spouseNet = Math.max(0, spouseRequiredGross - spouseTax);
  const spouseHours = spouseHourlyRate > 0 ? spouseRequiredGross / spouseHourlyRate : 0;

  const yourNetPer1000 = netFromExtraGross(baseSalary, 1000);
  const spouseNetPer1000 = netFromExtraGross(spouseBaseSalary, 1000);
  const spouseEffectiveRate = spouseRequiredGross > 0 ? spouseNet / spouseRequiredGross : 0;

  els.lostGross.textContent = formatCurrency(overtimeGross);
  els.savedTax.textContent = formatCurrency(overtimeTax);
  els.lostNet.textContent = formatCurrency(overtimeNet);
  els.yourMarginalTax.textContent = `${Math.round(fullTaxResult.marginalRate * 100)}%`;

  els.spouseRequiredGross.textContent = formatCurrency(spouseRequiredGross);
  els.spouseTax.textContent = formatCurrency(spouseTax);
  els.spouseNet.textContent = formatCurrency(spouseNet);
  els.spouseHours.textContent = `${formatNumber(spouseHours, 1)} שעות`;

  els.yourNetPer1000.textContent = formatCurrency(yourNetPer1000);
  els.spouseNetPer1000.textContent = formatCurrency(spouseNetPer1000);
  els.versionBadge.textContent = APP_VERSION;

  if (overtimeNet <= 0) {
    els.decisionText.textContent = "אין כרגע נטו להחלפה כי לא הוזן ברוטו שעות נוספות.";
  } else if (spouseHourlyRate <= 0) {
    els.decisionText.textContent = `כדי לכסות ${formatCurrency(overtimeNet)} נטו, בת הזוג צריכה להרוויח ${formatCurrency(spouseRequiredGross)} ברוטו.`;
  } else {
    els.decisionText.textContent = `נקודת האיזון: אם אתה מוותר על ${formatCurrency(overtimeGross)} ברוטו שעות נוספות, המשפחה מאבדת ${formatCurrency(overtimeNet)} נטו. כדי לכסות את זה, בת הזוג צריכה להרוויח ${formatCurrency(spouseRequiredGross)} ברוטו, שהם בערך ${formatNumber(spouseHours, 1)} שעות לפי ${formatCurrency(spouseHourlyRate)} לשעה. נטו אפקטיבי שלה: ${Math.round(spouseEffectiveRate * 100)}% מהברוטו.`;
  }

  els.taxBreakdown.innerHTML = fullTaxResult.rows.map((row) => `
    <tr class="${row.active ? "active" : ""}">
      <td>${row.range}<br><small>${Math.round(row.rate * 100)}%</small></td>
      <td>${formatCurrency(row.taxablePart)}</td>
      <td>${formatCurrency(row.tax)}</td>
    </tr>
  `).join("");
}

els.calculateBtn.addEventListener("click", render);
[els.baseSalary, els.overtimeGross, els.spouseBaseSalary, els.spouseHourlyRate].forEach((input) => input.addEventListener("input", render));
render();

const APP_VERSION = "v0.0.1";

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
  grossSalary: document.getElementById("grossSalary"),
  calculateBtn: document.getElementById("calculateBtn"),
  totalTax: document.getElementById("totalTax"),
  netAfterTax: document.getElementById("netAfterTax"),
  marginalTax: document.getElementById("marginalTax"),
  averageTax: document.getElementById("averageTax"),
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
  const from = bracket.from + 1;
  if (!Number.isFinite(bracket.to)) return `מעל ${formatCurrency(bracket.from)}`;
  if (bracket.from === 0) return `עד ${formatCurrency(bracket.to)}`;
  return `${formatCurrency(from)}–${formatCurrency(bracket.to)}`;
}

function calculateTax(gross) {
  let totalTax = 0;
  let marginalRate = 0;
  const rows = TAX_BRACKETS_2026.map((bracket) => {
    const taxablePart = Math.max(0, Math.min(gross, bracket.to) - bracket.from);
    const tax = taxablePart * bracket.rate;

    if (gross > bracket.from && taxablePart > 0) {
      marginalRate = bracket.rate;
    }

    totalTax += tax;

    return {
      range: formatRange(bracket),
      taxablePart,
      tax,
      rate: bracket.rate,
      active: taxablePart > 0,
    };
  });

  return { totalTax, marginalRate, rows };
}

function render() {
  const gross = Number(els.grossSalary.value || 0);
  const { totalTax, marginalRate, rows } = calculateTax(gross);
  const net = Math.max(0, gross - totalTax);
  const averageRate = gross > 0 ? totalTax / gross : 0;

  els.totalTax.textContent = formatCurrency(totalTax);
  els.netAfterTax.textContent = formatCurrency(net);
  els.marginalTax.textContent = `${Math.round(marginalRate * 100)}%`;
  els.averageTax.textContent = `${(averageRate * 100).toFixed(1)}%`;
  els.versionBadge.textContent = APP_VERSION;

  els.taxBreakdown.innerHTML = rows
    .map((row) => `
      <tr class="${row.active ? "active" : ""}">
        <td>${row.range}<br><small>${Math.round(row.rate * 100)}%</small></td>
        <td>${formatCurrency(row.taxablePart)}</td>
        <td>${formatCurrency(row.tax)}</td>
      </tr>
    `)
    .join("");
}

els.calculateBtn.addEventListener("click", render);
els.grossSalary.addEventListener("input", render);
render();

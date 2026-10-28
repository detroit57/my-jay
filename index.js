

/*
  FBM DRINKS DISTRIBUTION MANAGEMENT SYSTEM
  Version 2: Inventory deduction, saved prices and COGS.

  IMPORTANT:
  This version uses browser localStorage. It is not yet a
  multi-device database. Do not clear browser storage while
  you need these prototype records.
*/

const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const dashboardPage = document.getElementById("dashboardPage");
const workspacePage = document.getElementById("workspacePage");
const workspaceContent = document.getElementById("workspaceContent");

const pageInfo = {
  dashboard: ["Business Overview", "Monitor your business performance at a glance."],
  inventory: ["Inventory Management", "Manage products, stock quantities and prices."],
  sales: ["Sales & Receipts", "Record sales using saved product prices."],
  packaging: ["Returnable Packaging", "Track bottles and crates going out and coming back."],
  expenses: ["Business Expenses", "Record business spending."],
  reports: ["Business Reports", "Review revenue, cost of goods sold, expenses and profit."]
};

const STORAGE_PREFIX = "fbm_";

document.getElementById("todayDate").textContent =
  new Date().toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });

// ---------- STORAGE HELPERS ----------

function getRecords(key) {
  try {
    const records = JSON.parse(
      localStorage.getItem(STORAGE_PREFIX + key) || "[]"
    );
    return Array.isArray(records) ? records : [];
  } catch (error) {
    console.error("Could not read FBM records:", error);
    return [];
  }
}

function setRecords(key, records) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(records));
    return true;
  } catch (error) {
    console.error("Could not save FBM records:", error);
    alert("The browser could not save this record. Check available storage.");
    return false;
  }
}

function saveRecord(key, record) {
  const records = getRecords(key);
  records.push(record);
  return setRecords(key, records);
}

function makeId(prefix) {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return prefix + "-" + window.crypto.randomUUID();
  }
  return prefix + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

function money(value) {
  return Number(value || 0).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function formatQuantity(value) {
  return Number(value).toLocaleString("en-NG", {
    maximumFractionDigits: 3
  });
}

function localDateTime() {
  return new Date().toLocaleString("en-NG");
}

function todayKey() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
}

function showMessage(message, isError = false) {
  const target = document.getElementById("formMessage");
  if (!target) return;

  target.textContent = message;
  target.style.color = isError ? "#b42318" : "#21815c";
}

// ---------- MIGRATE EXISTING INVENTORY ----------
// Older prototype products did not have IDs. Give them IDs once.
// Existing quantities and prices are preserved.

function getInventory() {
  const records = getRecords("inventory");
  let changed = false;

  const migrated = records.map(record => {
    const updated = { ...record };

    if (!updated.id) {
      updated.id = makeId("product");
      changed = true;
    }

    updated.quantity = Number(updated.quantity) || 0;
    updated.cost = Number(updated.cost) || 0;
    updated.price = Number(updated.price) || 0;

    return updated;
  });

  if (changed) {
    setRecords("inventory", migrated);
  }

  return migrated;
}

function updateInventory(updatedRecords) {
  return setRecords("inventory", updatedRecords);
}

function findProduct(productId) {
  return getInventory().find(product => product.id === productId);
}

// ---------- TABLE AND FORM HELPERS ----------

function tableHTML(headers, rows) {
  if (!rows.length) {
    return `<p class="empty-state">No records yet. Add your first record using the form above.</p>`;
  }

  return `<div class="table-wrap"><table>
    <thead><tr>${headers.map(h => `<th>${escapeHTML(h)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(row =>
      `<tr>${row.map(cell => `<td>${escapeHTML(cell)}</td>`).join("")}</tr>`
    ).join("")}</tbody>
  </table></div>`;
}

function field(label, name, type = "text", required = true, options = []) {
  let control;

  if (type === "select") {
    control = `<select name="${name}" ${required ? "required" : ""}>
      ${options.map(option => {
        const value = typeof option === "string" ? option : option.value;
        const text = typeof option === "string" ? option : option.label;
        return `<option value="${escapeHTML(value)}">${escapeHTML(text)}</option>`;
      }).join("")}
    </select>`;
  } else {
    const numericAttributes = type === "number"
      ? 'min="0" step="any" inputmode="decimal"'
      : "";

    control = `<input name="${name}" type="${type}" ${numericAttributes}
      ${required ? "required" : ""}>`;
  }

  return `<label class="form-field">${escapeHTML(label)}${control}</label>`;
}

function formHTML(title, fields, buttonLabel) {
  return `<h2>${escapeHTML(title)}</h2>
    <p>Enter the details below and save your record.</p>
    <form id="recordForm">
      <div class="form-grid">${fields.join("")}</div>
      <button class="primary-button" type="submit">${escapeHTML(buttonLabel)}</button>
    </form>
    <p id="formMessage" role="status" aria-live="polite"></p>`;
}

// ---------- INVENTORY ----------

function renderInventory() {
  const inventory = getInventory();

  workspaceContent.innerHTML =
    formHTML("Add a new product", [
      field("Product name", "product"),
      field("Category", "category", "select", true,
        ["Beer", "Soft Drinks", "Bottled Water", "Other"]),
      field("Opening quantity", "quantity", "number"),
      field("Stock and sales unit", "unit", "select", true,
        ["Crates", "Cartons", "Packs", "Bottles"]),
      field("Cost per unit (₦)", "cost", "number"),
      field("Selling price per unit (₦)", "price", "number")
    ], "Save product") +
    `<div class="notice">
      Each product uses one stock unit. For example, if Star Lager is
      recorded in crates, sales must also be recorded in crates.
      To avoid duplicate stock records, use a unique product name.
    </div>` +
    `<h2>Current inventory</h2>` +
    tableHTML(
      ["Product", "Category", "Available stock", "Unit", "Cost/unit", "Selling/unit", "Stock value"],
      inventory.map(product => [
        product.product,
        product.category,
        formatQuantity(product.quantity),
        product.unit,
        money(product.cost),
        money(product.price),
        money(product.quantity * product.cost)
      ])
    );

  document.getElementById("recordForm").addEventListener("submit", event => {
    event.preventDefault();

    const data = new FormData(event.target);
    const name = String(data.get("product") || "").trim();
    const category = String(data.get("category") || "");
    const quantity = safeNumber(data.get("quantity"));
    const unit = String(data.get("unit") || "");
    const cost = safeNumber(data.get("cost"));
    const price = safeNumber(data.get("price"));

    if (!name || !Number.isFinite(quantity) || quantity <= 0 ||
        !Number.isFinite(cost) || cost < 0 ||
        !Number.isFinite(price) || price < 0) {
      showMessage("Enter a product name, a quantity above zero, and valid prices.", true);
      return;
    }

    const currentInventory = getInventory();
    const duplicate = currentInventory.some(
      product => product.product.trim().toLowerCase() === name.toLowerCase()
    );

    if (duplicate) {
      showMessage(
        "This product already exists. Do not add it again, because that could duplicate stock. Stock receiving will be added as a separate feature.",
        true
      );
      return;
    }

    const record = {
      id: makeId("product"),
      product: name,
      category,
      quantity,
      unit,
      cost,
      price,
      createdAt: new Date().toISOString()
    };

    if (!setRecords("inventory", [...currentInventory, record])) return;

    renderInventory();
    showMessage("Product saved successfully.");
  });
}

// ---------- SALES AND AUTOMATIC STOCK DEDUCTION ----------

function renderSales() {
  const inventory = getInventory();
  const sales = getRecords("sales");

  const productOptions = inventory
    .filter(product => product.quantity > 0)
    .map(product => ({
      value: product.id,
      label: `${product.product} — ${formatQuantity(product.quantity)} ${product.unit} available`
    }));

  const formFields = inventory.length && productOptions.length
    ? [
        field("Product", "productId", "select", true, productOptions),
        field("Quantity sold", "quantity", "number"),
        field("Payment method", "payment", "select", true,
          ["Cash", "Transfer", "POS", "Credit"]),
        field("Customer name (optional)", "customer", "text", false)
      ]
    : [];

  workspaceContent.innerHTML =
    (formFields.length
      ? formHTML("Record a sale", formFields, "Complete sale")
      : `<h2>Record a sale</h2>
         <p>Add a product with available stock in Inventory before recording a sale.</p>
         <p class="empty-state">No products are currently available for sale.</p>`) +
    `<div class="notice">
      Selling price and cost price are taken from the saved product record.
      The sale will be rejected if there is not enough stock.
      This browser-only version does not yet process customer credit payments.
    </div>` +
    `<h2>Sales history</h2>` +
    tableHTML(
      ["Receipt", "Date", "Product", "Quantity", "Unit price", "Revenue", "COGS", "Gross profit", "Payment"],
      sales.map(sale => [
        sale.receipt || "—",
        sale.date || "—",
        sale.product || "—",
        `${formatQuantity(sale.quantity)} ${sale.unit || ""}`,
        money(sale.price),
        money(sale.total),
        sale.cogs === undefined ? "Not recorded" : money(sale.cogs),
        sale.cogs === undefined ? "Not recorded" : money(sale.total - sale.cogs),
        sale.payment || "—"
      ])
    );

  const form = document.getElementById("recordForm");
  if (!form) return;

  // Show the saved product's price before submission.
  const productSelect = form.elements.productId;
  const preview = document.createElement("p");
  preview.id = "pricePreview";
  preview.className = "muted";
  preview.setAttribute("aria-live", "polite");
  productSelect.closest(".form-field").insertAdjacentElement("afterend", preview);

  function updatePricePreview() {
    const product = findProduct(productSelect.value);
    preview.textContent = product
      ? `Saved selling price: ${money(product.price)} per ${product.unit}. Saved cost: ${money(product.cost)} per ${product.unit}.`
      : "";
  }

  productSelect.addEventListener("change", updatePricePreview);
  updatePricePreview();

  form.addEventListener("submit", event => {
    event.preventDefault();

    // Read the latest saved stock again before processing.
    const data = new FormData(form);
    const productId = String(data.get("productId") || "");
    const quantity = safeNumber(data.get("quantity"));
    const payment = String(data.get("payment") || "");
    const customer = String(data.get("customer") || "").trim();

    if (!Number.isFinite(quantity) || quantity <= 0) {
      showMessage("Quantity sold must be greater than zero.", true);
      return;
    }

    if (!["Cash", "Transfer", "POS", "Credit"].includes(payment)) {
      showMessage("Select a valid payment method.", true);
      return;
    }

    if (payment === "Credit") {
      showMessage(
        "Credit sales are not enabled yet. Choose Cash, Transfer or POS for this prototype.",
        true
      );
      return;
    }

    const currentInventory = getInventory();
    const productIndex = currentInventory.findIndex(p => p.id === productId);

    if (productIndex === -1) {
      showMessage("This product could not be found. Refresh and try again.", true);
      return;
    }

    const product = currentInventory[productIndex];

    if (quantity > product.quantity) {
      showMessage(
        `Insufficient stock. Only ${formatQuantity(product.quantity)} ${product.unit} remain.`,
        true
      );
      return;
    }

    const price = Number(product.price);
    const cost = Number(product.cost);

    if (!Number.isFinite(price) || price < 0 ||
        !Number.isFinite(cost) || cost < 0) {
      showMessage("This product has invalid saved prices. Correct the inventory record first.", true);
      return;
    }

    const revenue = quantity * price;
    const cogs = quantity * cost;
    const newQuantity = product.quantity - quantity;

    // Save stock deduction first. If saving fails, do not create a sale.
    const updatedInventory = [...currentInventory];
    updatedInventory[productIndex] = {
      ...product,
      quantity: newQuantity,
      updatedAt: new Date().toISOString()
    };

    if (!updateInventory(updatedInventory)) {
      showMessage("Stock could not be updated. No sale was recorded.", true);
      return;
    }

    const currentSales = getRecords("sales");
    const receipt = "FBM-" + Date.now().toString().slice(-10);

    const saleRecord = {
      id: makeId("sale"),
      receipt,
      date: localDateTime(),
      dateKey: todayKey(),
      productId: product.id,
      product: product.product,
      category: product.category,
      quantity,
      unit: product.unit,
      price,
      costPerUnit: cost,
      total: revenue,
      cogs,
      grossProfit: revenue - cogs,
      payment,
      customer,
      createdAt: new Date().toISOString()
    };

    if (!setRecords("sales", [...currentSales, saleRecord])) {
      // Attempt to restore the previous inventory if saving the sale fails.
      updateInventory(currentInventory);
      showMessage(
        "The sale could not be saved. The system attempted to restore the previous stock quantity. Check Inventory before retrying.",
        true
      );
      return;
    }

    renderSales();
    showMessage(
      `Sale completed. Receipt ${receipt}. ${formatQuantity(quantity)} ${product.unit} deducted.`
    );
  });
}

// ---------- RETURNABLE PACKAGING ----------

function renderPackaging() {
  const records = getRecords("packaging");

  workspaceContent.innerHTML =
    formHTML("Record packaging movement", [
      field("Packaging type", "type", "select", true,
        ["Returnable bottles", "Empty crates", "Other returnable packaging"]),
      field("Movement", "movement", "select", true,
        ["Issued", "Returned"]),
      field("Quantity", "quantity", "number"),
      field("Related sale or customer", "reference", "text", false),
      field("Notes", "notes", "text", false)
    ], "Save movement") +
    `<div class="notice">
      This records packaging movements but does not yet calculate customer
      deposits or outstanding packaging balances.
    </div>` +
    `<h2>Packaging movements</h2>` +
    tableHTML(
      ["Date", "Type", "Movement", "Quantity", "Reference", "Notes"],
      records.map(r => [
        r.date, r.type, r.movement, formatQuantity(r.quantity),
        r.reference || "—", r.notes || "—"
      ])
    );

  document.getElementById("recordForm").addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(event.target);
    const quantity = safeNumber(data.get("quantity"));

    if (!Number.isFinite(quantity) || quantity <= 0) {
      showMessage("Quantity must be greater than zero.", true);
      return;
    }

    const saved = saveRecord("packaging", {
      id: makeId("packaging"),
      date: localDateTime(),
      type: data.get("type"),
      movement: data.get("movement"),
      quantity,
      reference: data.get("reference"),
      notes: data.get("notes")
    });

    if (!saved) return;
    renderPackaging();
    showMessage("Packaging movement saved.");
  });
}

// ---------- EXPENSES ----------

function renderExpenses() {
  const records = getRecords("expenses");

  workspaceContent.innerHTML =
    formHTML("Record an expense", [
      field("Expense description", "description"),
      field("Expense category", "category", "select", true,
        ["Transport", "Fuel", "Rent", "Staff", "Utilities", "Repairs", "Other"]),
      field("Amount (₦)", "amount", "number"),
      field("Payment method", "payment", "select", true,
        ["Cash", "Transfer", "POS", "Other"]),
      field("Notes (optional)", "notes", "text", false)
    ], "Save expense") +
    `<h2>Expense records</h2>` +
    tableHTML(
      ["Date", "Description", "Category", "Amount", "Payment", "Notes"],
      records.map(r => [
        r.date, r.description, r.category, money(r.amount),
        r.payment, r.notes || "—"
      ])
    );

  document.getElementById("recordForm").addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(event.target);
    const amount = safeNumber(data.get("amount"));
    const description = String(data.get("description") || "").trim();

    if (!description || !Number.isFinite(amount) || amount <= 0) {
      showMessage("Enter an expense description and an amount greater than zero.", true);
      return;
    }

    const saved = saveRecord("expenses", {
      id: makeId("expense"),
      date: localDateTime(),
      dateKey: todayKey(),
      description,
      category: data.get("category"),
      amount,
      payment: data.get("payment"),
      notes: data.get("notes")
    });

    if (!saved) return;
    renderExpenses();
    showMessage("Expense saved successfully.");
  });
}

// ---------- REPORTS: REVENUE, COGS AND PROFIT ----------

function renderReports() {
  const sales = getRecords("sales");
  const expenses = getRecords("expenses");
  const inventory = getInventory();

  const revenue = sales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);

  // Older sales do not have COGS. Do not pretend their missing costs are zero.
  const salesWithCost = sales.filter(sale =>
    Number.isFinite(Number(sale.cogs)) && sale.cogs !== undefined && sale.cogs !== null
  );

  const knownCogs = salesWithCost.reduce(
    (sum, sale) => sum + Number(sale.cogs), 0
  );

  const recordedExpenses = expenses.reduce(
    (sum, expense) => sum + (Number(expense.amount) || 0), 0
  );

  const grossProfit = revenue - knownCogs;
  const estimatedNet = grossProfit - recordedExpenses;
  const allSalesHaveCogs = sales.length === salesWithCost.length;

  const costMessage = allSalesHaveCogs
    ? "COGS is available for all recorded sales."
    : `${sales.length - salesWithCost.length} older sale(s) do not have saved cost data. Their costs cannot be reconstructed automatically unless the original product cost is known.`;

  const netMessage = allSalesHaveCogs
    ? `Estimated net result: ${money(estimatedNet)} before any other unrecorded costs, taxes or adjustments.`
    : "Net result is incomplete because some older sales have no saved cost-of-goods-sold values.";

  workspaceContent.innerHTML = `
    <h2>Business performance report</h2>
    <p>Totals for records saved in this browser. These are not yet live, shared business accounts.</p>

    <div class="stats-grid">
      <article class="stat-card">
        <div class="stat-top"><span>Sales revenue</span><span class="stat-icon blue">↗</span></div>
        <h3>${money(revenue)}</h3>
        <p>${sales.length} recorded sale(s)</p>
      </article>
      <article class="stat-card">
        <div class="stat-top"><span>Cost of goods sold</span><span class="stat-icon orange">₦</span></div>
        <h3>${money(knownCogs)}</h3>
        <p>${salesWithCost.length} sale(s) with cost data</p>
      </article>
      <article class="stat-card">
        <div class="stat-top"><span>Gross profit</span><span class="stat-icon green">↗</span></div>
        <h3>${money(grossProfit)}</h3>
        <p>Revenue minus recorded COGS</p>
      </article>
      <article class="stat-card">
        <div class="stat-top"><span>Recorded expenses</span><span class="stat-icon purple">₦</span></div>
        <h3>${money(recordedExpenses)}</h3>
        <p>${expenses.length} expense(s)</p>
      </article>
    </div>

    <div class="notice">${escapeHTML(costMessage)} ${escapeHTML(netMessage)}</div>

    <h2>Inventory valuation</h2>
    <p>Estimated stock value at recorded cost: <strong>${money(
      inventory.reduce((sum, product) =>
        sum + (Number(product.quantity) || 0) * (Number(product.cost) || 0), 0)
    )}</strong></p>

    <h2>Sales with cost tracking</h2>
    ${tableHTML(
      ["Receipt", "Date", "Product", "Quantity", "Revenue", "COGS", "Gross profit"],
      sales.map(sale => [
        sale.receipt || "—",
        sale.date || "—",
        sale.product || "—",
        `${formatQuantity(sale.quantity)} ${sale.unit || ""}`,
        money(sale.total),
        sale.cogs === undefined ? "Not recorded" : money(sale.cogs),
        sale.cogs === undefined ? "Not recorded" : money(Number(sale.total) - Number(sale.cogs))
      ])
    )}
  `;
}

// ---------- NAVIGATION ----------

function openPage(page) {
  if (!pageInfo[page]) return;

  document.querySelectorAll(".nav-link").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  pageTitle.textContent = pageInfo[page][0];
  pageSubtitle.textContent = pageInfo[page][1];

  dashboardPage.classList.toggle("hidden", page !== "dashboard");
  workspacePage.classList.toggle("hidden", page === "dashboard");

  if (page === "dashboard") {
    refreshDashboardSummary();
    return;
  }

  const renderers = {
    inventory: renderInventory,
    sales: renderSales,
    packaging: renderPackaging,
    expenses: renderExpenses,
    reports: renderReports
  };

  renderers[page]();
}

// ---------- UPDATE DASHBOARD SUMMARY ----------
// These values now use saved browser records rather than the old demo amounts.

function refreshDashboardSummary() {
  const inventory = getInventory();
  const sales = getRecords("sales");
  const expenses = getRecords("expenses");
  const today = todayKey();

  const todaysSales = sales.filter(sale =>
    sale.dateKey === today
  );

  const todaysExpenses = expenses.filter(expense =>
    expense.dateKey === today
  );

  const stockValue = inventory.reduce((sum, product) =>
    sum + product.quantity * product.cost, 0
  );

  const revenueToday = todaysSales.reduce((sum, sale) =>
    sum + (Number(sale.total) || 0), 0
  );

  const cogsToday = todaysSales.reduce((sum, sale) =>
    sum + (Number(sale.cogs) || 0), 0
  );

  const expensesToday = todaysExpenses.reduce((sum, expense) =>
    sum + (Number(expense.amount) || 0), 0
  );

  const grossProfitToday = revenueToday - cogsToday;
  const netEstimateToday = grossProfitToday - expensesToday;

  const cards = document.querySelectorAll("#dashboardPage .stat-card h3");

  if (cards.length >= 4) {
    cards[0].textContent = money(stockValue);
    cards[1].textContent = money(revenueToday);
    cards[2].textContent = money(expensesToday);
    cards[3].textContent = money(netEstimateToday);
  }

  const descriptions = document.querySelectorAll("#dashboardPage .stat-card p");

  if (descriptions.length >= 4) {
    descriptions[0].textContent = `${inventory.length} product(s)`;
    descriptions[1].textContent = `${todaysSales.length} sale(s) today`;
    descriptions[2].textContent = `${todaysExpenses.length} expense(s) today`;
    descriptions[3].textContent = "Estimated after COGS and recorded expenses";
  }

  const summaryNote = document.querySelector("#dashboardPage .section-heading .muted");
  if (summaryNote) {
    summaryNote.textContent = "Based on records saved in this browser";
  }
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => openPage(button.dataset.page));
});

refreshDashboardSummary();

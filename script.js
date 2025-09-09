// ====== Elements ======
const display = document.getElementById("display");
const historyList = document.getElementById("historyList");
const emptyHistory = document.getElementById("emptyHistory");
const themeToggleBtn = document.getElementById("themeToggle");
const themeIcon = document.querySelector(".theme-toggle i");

// ====== State ======
let history = []; // array of {expr, result, time}
const STORAGE_KEY = "modernCalculatorHistory";
const THEME_KEY = "modernCalculatorTheme";

// ====== Utilities ======
function saveHistory() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function loadHistory() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try { 
            history = JSON.parse(raw) || []; 
        } catch { 
            history = []; 
        }
    }
    renderHistory();
}

function saveTheme(isDark) {
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
}

function loadTheme() {
    const t = localStorage.getItem(THEME_KEY);
    if (t === "dark") {
        document.body.classList.remove("light-theme");
        document.body.classList.add("dark-theme");
        themeIcon.classList.remove("fa-moon");
        themeIcon.classList.add("fa-sun");
    } else {
        document.body.classList.remove("dark-theme");
        document.body.classList.add("light-theme");
        themeIcon.classList.remove("fa-sun");
        themeIcon.classList.add("fa-moon");
    }
}

// Replace occurrences of numbers with % into (number/100)
function normalizePercent(expr) {
    // replace 50% => (50/100)
    return expr.replace(/(\d+(\.\d+)?)%/g, "($1/100)");
}

// Very small sanitizer for repeated operators and starting operators
function sanitizeExpression(expr) {
    // prevent starting with operator except minus and '('
    expr = expr.trim();
    if (/^[+*/]/.test(expr)) expr = expr.slice(1);

    // collapse repeated operators like "++" or "+-" into last operator except percent sign
    expr = expr.replace(/([+\-*/]){2,}/g, (m) => m[m.length - 1]);

    return expr;
}

function safeEval(expression) {
    // Normalize percent
    let expr = normalizePercent(expression);
    expr = sanitizeExpression(expr);

    // Evaluate using Function (similar to eval but explicit)
    // Only allowed chars: digits, operators, parentheses, decimal point
    if (!/^[0-9+\-*/().\s%]+$/.test(expression)) {
        throw new Error("Invalid characters");
    }
    // Use Function constructor
    // eslint-disable-next-line no-new-func
    return Function(`"use strict"; return (${expr});`)();
}

// ====== Display control ======
function appendValue(value) {
    // If was Error, clear first
    if (display.value === "Error" || display.value === "Infinity" || display.value === "NaN") {
        display.value = "";
    }

    const lastChar = display.value.slice(-1);

    // Prevent two operators in a row (except allow '-' as negative if expression empty)
    if ("+-*/".includes(value)) {
        if (display.value === "" && value !== "-") return; // don't start with +*/ 
        if ("+-*/".includes(lastChar)) {
            // replace last operator with new one (common calculator behavior)
            display.value = display.value.slice(0, -1) + value;
            return;
        }
    }

    // Prevent more than one decimal point in the current number segment
    if (value === ".") {
        const tokens = display.value.split(/[\+\-\*\/%]/);
        const lastToken = tokens[tokens.length - 1];
        if (lastToken.includes(".")) return; // already a dot
        if (lastToken === "") display.value += "0"; // leading dot -> 0.
    }

    // Append percent sign normally (we'll handle it on evaluate)
    display.value += value;
}

function clearDisplay() {
    display.value = "";
}

function deleteLast() {
    if (display.value === "Error") {
        display.value = "";
        return;
    }
    display.value = display.value.slice(0, -1);
}

// ====== Calculation & History ======
function calculateResult() {
    const expr = display.value.trim();
    if (expr === "") return;

    try {
        const result = safeEval(expr);
        const rounded = (typeof result === "number" && !Number.isInteger(result))
            ? parseFloat(result.toFixed(10)) // limit floating precision
            : result;

        addToHistory(expr, rounded);
        display.value = String(rounded);
    } catch (err) {
        display.value = "Error";
    }
}

function addToHistory(expression, result) {
    const entry = {
        expr: expression,
        result: String(result),
        time: new Date().toISOString()
    };
    history.unshift(entry); // newest first
    if (history.length > 200) history.pop(); // cap history
    saveHistory();
    renderHistory();
}

function renderHistory() {
    historyList.innerHTML = "";
    if (!history || history.length === 0) {
        emptyHistory.style.display = "block";
        return;
    }
    emptyHistory.style.display = "none";

    history.forEach(item => {
        const el = document.createElement("div");
        el.className = "history-item";

        // left column: operation + time
        const left = document.createElement("div");
        left.style.display = "flex";
        left.style.flexDirection = "column";
        left.style.flex = "1";
        const op = document.createElement("div");
        op.className = "history-operation";
        op.textContent = item.expr;
        const t = document.createElement("div");
        t.className = "history-time";
        // show local time nicely
        const dt = new Date(item.time);
        t.textContent = dt.toLocaleString();
        left.appendChild(op);
        left.appendChild(t);

        // right column: result
        const right = document.createElement("div");
        right.className = "history-result";
        right.textContent = item.result;

        el.appendChild(left);
        el.appendChild(right);

        // clicking an entry restores it to display
        el.addEventListener("click", () => {
            display.value = item.expr;
        });

        historyList.appendChild(el);
    });
}

function clearHistory() {
    history = [];
    saveHistory();
    renderHistory();
}

function addSampleData() {
    const samples = [
        { exp: "5+3", res: "8" },
        { exp: "12/4", res: "3" },
        { exp: "7*6", res: "42" },
        { exp: "50%", res: "0.5" },
        { exp: "200-10%", res: "180" }
    ];
    samples.forEach(s => {
        history.unshift({ expr: s.exp, result: s.res, time: new Date().toISOString() });
    });
    saveHistory();
    renderHistory();
}

// ====== Theme Toggle ======
function toggleTheme() {
    const isDark = document.body.classList.contains("light-theme");
    
    if (isDark) {
        document.body.classList.remove("light-theme");
        document.body.classList.add("dark-theme");
        themeIcon.classList.remove("fa-moon");
        themeIcon.classList.add("fa-sun");
        saveTheme(true);
    } else {
        document.body.classList.remove("dark-theme");
        document.body.classList.add("light-theme");
        themeIcon.classList.remove("fa-sun");
        themeIcon.classList.add("fa-moon");
        saveTheme(false);
    }
}

// ====== Keyboard support ======
function onKeyDown(e) {
    const key = e.key;
    if ((/^[0-9]$/).test(key)) {
        appendValue(key);
    } else if ("+-*/".includes(key)) {
        appendValue(key);
    } else if (key === "Enter") {
        e.preventDefault();
        calculateResult();
    } else if (key === "Backspace") {
        deleteLast();
    } else if (key === "Escape") {
        clearDisplay();
    } else if (key === ".") {
        appendValue(".");
    } else if (key === "%") {
        appendValue("%");
    }
}

// ====== Init ======
function init() {
    // load saved history & theme
    loadHistory();
    loadTheme();

    // attach toggle
    if (themeToggleBtn) themeToggleBtn.addEventListener("click", toggleTheme);

    // keyboard events (so user can type even if input disabled)
    document.addEventListener("keydown", onKeyDown);

    // prevent form submit if user ever adds form
    document.addEventListener("submit", (e) => e.preventDefault());
}

// run init
init();
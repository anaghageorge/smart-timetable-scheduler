"use strict";

// ========================================
// 1. DATA STORAGE
// ========================================

// Subjects are stored as strings.
let subjects = [];

// Each conflict is stored as a pair of subject names.
let conflicts = [];

// Store the latest generated result.
let latestColors = null;

// Colors used to display graph vertices and periods.
const COLORS = [
    "#3157d5",
    "#059669",
    "#d97706",
    "#9333ea",
    "#db2777",
    "#0891b2",
    "#dc2626",
    "#4f46e5",
    "#65a30d",
    "#ea580c"
];

// ========================================
// 2. GET HTML ELEMENTS
// ========================================

const subjectForm = document.getElementById("subjectForm");
const subjectInput = document.getElementById("subjectInput");
const subjectList = document.getElementById("subjectList");
const subjectCount = document.getElementById("subjectCount");

const subject1 = document.getElementById("subject1");
const subject2 = document.getElementById("subject2");
const addConflictBtn = document.getElementById("addConflictBtn");
const conflictList = document.getElementById("conflictList");
const conflictCount = document.getElementById("conflictCount");

const graph = document.getElementById("graph");

const generateBtn = document.getElementById("generateBtn");
const sampleBtn = document.getElementById("sampleBtn");
const resetBtn = document.getElementById("resetBtn");

const periodStart = document.getElementById("periodStart");
const periodDuration = document.getElementById("periodDuration");
const breakDuration = document.getElementById("breakDuration");

const timetable = document.getElementById("timetable");
const message = document.getElementById("message");
const summary = document.getElementById("summary");

// ========================================
// 3. SHOW MESSAGES
// ========================================

function showMessage(text, type = "success") {
    message.textContent = text;
    message.className = "message " + type;
}

// ========================================
// 4. CLEAR OLD TIMETABLE
// ========================================

function clearTimetable() {
    timetable.replaceChildren();
    summary.replaceChildren();
    latestColors = null;
}

// ========================================
// 5. ADD A SUBJECT
// ========================================

subjectForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = subjectInput.value.trim();

    if (name === "") {
        showMessage("Please enter a subject name.", "error");
        return;
    }

    const alreadyExists = subjects.some(
        subject => subject.toLowerCase() === name.toLowerCase()
    );

    if (alreadyExists) {
        showMessage("This subject already exists.", "error");
        return;
    }

    subjects.push(name);

    updateSubjectList();
    updateDropdowns();
    drawGraph();
    clearTimetable();

    subjectInput.value = "";
    subjectInput.focus();

    showMessage(name + " added successfully!");
});

// ========================================
// 6. DISPLAY SUBJECT LIST
// ========================================

function updateSubjectList() {
    subjectList.replaceChildren();

    subjectCount.textContent =
        subjects.length + (subjects.length === 1 ? " subject" : " subjects");

    if (subjects.length === 0) {
        const li = document.createElement("li");
        li.className = "empty-list";
        li.textContent = "No subjects added yet.";
        subjectList.appendChild(li);
        return;
    }

    subjects.forEach(function (subject) {
        const li = document.createElement("li");

        const name = document.createElement("span");
        name.textContent = subject;

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "remove-btn";
        removeButton.textContent = "Remove";

        removeButton.addEventListener("click", function () {
            removeSubject(subject);
        });

        li.append(name, removeButton);
        subjectList.appendChild(li);
    });
}

// ========================================
// 7. UPDATE SUBJECT DROPDOWNS
// ========================================

function updateDropdowns() {
    [subject1, subject2].forEach(function (select, index) {
        const previousValue = select.value;

        select.replaceChildren();

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent =
            index === 0 ? "Select first subject" : "Select second subject";

        select.appendChild(placeholder);

        subjects.forEach(function (subject) {
            const option = document.createElement("option");
            option.value = subject;
            option.textContent = subject;
            select.appendChild(option);
        });

        if (subjects.includes(previousValue)) {
            select.value = previousValue;
        }
    });
}

// ========================================
// 8. REMOVE A SUBJECT
// ========================================

function removeSubject(name) {
    subjects = subjects.filter(subject => subject !== name);

    // Remove every conflict involving the deleted subject.
    conflicts = conflicts.filter(
        conflict => conflict[0] !== name && conflict[1] !== name
    );

    updateSubjectList();
    updateDropdowns();
    updateConflictList();
    drawGraph();
    clearTimetable();

    showMessage(name + " and its conflicts have been removed.");
}

// ========================================
// 9. ADD A CONFLICT / GRAPH EDGE
// ========================================

addConflictBtn.addEventListener("click", function () {
    const first = subject1.value;
    const second = subject2.value;

    if (!first || !second) {
        showMessage("Please select both subjects.", "error");
        return;
    }

    if (first === second) {
        showMessage(
            "A subject cannot have a conflict with itself.",
            "error"
        );
        return;
    }

    const alreadyExists = conflicts.some(function (conflict) {
        return (
            (conflict[0] === first && conflict[1] === second) ||
            (conflict[0] === second && conflict[1] === first)
        );
    });

    if (alreadyExists) {
        showMessage("This conflict has already been added.", "error");
        return;
    }

    conflicts.push([first, second]);

    updateConflictList();
    drawGraph();
    clearTimetable();

    showMessage("Conflict added between " + first + " and " + second + ".");
});

// ========================================
// 10. DISPLAY CONFLICT LIST
// ========================================

function updateConflictList() {
    conflictList.replaceChildren();

    conflictCount.textContent =
        conflicts.length +
        (conflicts.length === 1 ? " conflict" : " conflicts");

    if (conflicts.length === 0) {
        const li = document.createElement("li");
        li.className = "empty-list";
        li.textContent = "No conflicts added yet.";
        conflictList.appendChild(li);
        return;
    }

    conflicts.forEach(function (conflict, index) {
        const li = document.createElement("li");

        const description = document.createElement("span");
        description.textContent = conflict[0] + " ↔ " + conflict[1];

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "remove-btn";
        removeButton.textContent = "Remove";

        removeButton.addEventListener("click", function () {
            conflicts.splice(index, 1);

            updateConflictList();
            drawGraph();
            clearTimetable();

            showMessage("Conflict removed.");
        });

        li.append(description, removeButton);
        conflictList.appendChild(li);
    });
}

// ========================================
// 11. BUILD THE GRAPH
// ========================================

function buildGraph() {
    const adjacency = new Map();

    subjects.forEach(function (subject) {
        adjacency.set(subject, []);
    });

    conflicts.forEach(function (conflict) {
        const [first, second] = conflict;

        if (adjacency.has(first) && adjacency.has(second)) {
            adjacency.get(first).push(second);
            adjacency.get(second).push(first);
        }
    });

    return adjacency;
}

// ========================================
// 12. DRAW THE CONFLICT GRAPH
// ========================================

function drawGraph() {
    graph.replaceChildren();

    const namespace = "http://www.w3.org/2000/svg";

    const width = 700;
    const height = 380;

    if (subjects.length === 0) {
        const text = document.createElementNS(namespace, "text");

        text.setAttribute("x", width / 2);
        text.setAttribute("y", height / 2);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("fill", "#64748b");
        text.textContent = "Add subjects to display the graph";

        graph.appendChild(text);
        return;
    }

    const centerX = width / 2;
    const centerY = height / 2;

    const radius = Math.min(125, 45 + subjects.length * 9);
    const nodeRadius = subjects.length > 20 ? 17 : 23;

    const positions = new Map();

    subjects.forEach(function (subject, index) {
        const angle =
            -Math.PI / 2 + (2 * Math.PI * index) / subjects.length;

        positions.set(subject, {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
        });
    });

    conflicts.forEach(function (conflict) {
        const first = positions.get(conflict[0]);
        const second = positions.get(conflict[1]);

        if (!first || !second) {
            return;
        }

        const line = document.createElementNS(namespace, "line");

        line.setAttribute("x1", first.x);
        line.setAttribute("y1", first.y);
        line.setAttribute("x2", second.x);
        line.setAttribute("y2", second.y);
        line.setAttribute("class", "graph-edge");

        graph.appendChild(line);
    });

    subjects.forEach(function (subject, index) {
        const position = positions.get(subject);

        const circle = document.createElementNS(namespace, "circle");

        circle.setAttribute("cx", position.x);
        circle.setAttribute("cy", position.y);
        circle.setAttribute("r", nodeRadius);
        circle.setAttribute("fill", COLORS[index % COLORS.length]);
        circle.setAttribute("class", "graph-node");

        const title = document.createElementNS(namespace, "title");
        title.textContent = subject;

        circle.appendChild(title);
        graph.appendChild(circle);

        const label = document.createElementNS(namespace, "text");

        label.setAttribute("x", position.x);
        label.setAttribute("y", position.y);
        label.setAttribute("class", "graph-label");

        let displayName = subject;

        if (displayName.length > 12) {
            displayName = displayName.slice(0, 11) + "…";
        }

        label.textContent = displayName;

        graph.appendChild(label);
    });
}

// ========================================
// 13. GREEDY GRAPH COLORING ALGORITHM
// ========================================

function greedyColoring() {
    const adjacency = buildGraph();
    const assignedColors = new Map();

    for (const subject of subjects) {
        const unavailableColors = new Set();

        for (const neighbor of adjacency.get(subject)) {
            if (assignedColors.has(neighbor)) {
                unavailableColors.add(assignedColors.get(neighbor));
            }
        }

        let color = 0;

        while (unavailableColors.has(color)) {
            color++;
        }

        assignedColors.set(subject, color);
    }

    return assignedColors;
}

// ========================================
// 14. GENERATE TIMETABLE
// ========================================

generateBtn.addEventListener("click", function () {
    if (subjects.length === 0) {
        clearTimetable();
        showMessage("Please add at least one subject first.", "error");
        return;
    }

    const colors = greedyColoring();

    displayTimetable(colors);
    showMessage("Timetable generated successfully!");
});

// ========================================
// 15. FORMAT TIME
// ========================================

function formatTime(totalMinutes) {
    const minutesInDay = 24 * 60;

    totalMinutes =
        ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const date = new Date(2000, 0, 1, hours, minutes);

    return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}

// ========================================
// 16. DISPLAY GENERATED TIMETABLE
// ========================================

function displayTimetable(colors) {
    clearTimetable();

    latestColors = colors;

    const numberOfPeriods =
        Math.max(...Array.from(colors.values())) + 1;

    const groupedSubjects = new Map();

    for (let i = 0; i < numberOfPeriods; i++) {
        groupedSubjects.set(i, []);
    }

    colors.forEach(function (period, subject) {
        groupedSubjects.get(period).push(subject);
    });

    let startParts = periodStart.value.split(":").map(Number);
    let startMinutes = startParts[0] * 60 + startParts[1];

    const duration = Number(periodDuration.value);
    const breakMinutes = Number(breakDuration.value);

    for (let period = 0; period < numberOfPeriods; period++) {
        const card = document.createElement("div");
        card.className = "period-card";

        const title = document.createElement("h3");
        title.style.setProperty(
            "--period-color",
            COLORS[period % COLORS.length]
        );

        title.textContent = "Period " + (period + 1);

        card.style.setProperty(
            "--period-color",
            COLORS[period % COLORS.length]
        );

        const startTime = startMinutes + period * (duration + breakMinutes);
        const endTime = startTime + duration;

        const time = document.createElement("div");
        time.className = "period-time";
        time.textContent =
            formatTime(startTime) + " – " + formatTime(endTime);

        card.append(title, time);

        groupedSubjects.get(period).forEach(function (subject) {
            const chip = document.createElement("span");

            chip.className = "subject-chip";
            chip.textContent = subject;

            card.appendChild(chip);
        });

        timetable.appendChild(card);
    }

    displaySummary(colors, numberOfPeriods);
}

// ========================================
// 17. DISPLAY TIMETABLE SUMMARY
// ========================================

function displaySummary(colors, numberOfPeriods) {
    summary.replaceChildren();

    const heading = document.createElement("h3");
    heading.textContent = "Timetable Summary";

    const grid = document.createElement("div");
    grid.className = "summary-grid";

    const data = [
        ["Subjects", subjects.length],
        ["Conflicts", conflicts.length],
        ["Periods Used", numberOfPeriods]
    ];

    data.forEach(function (item) {
        const box = document.createElement("div");
        box.className = "summary-item";

        const number = document.createElement("strong");
        number.textContent = item[1];

        const label = document.createElement("span");
        label.textContent = item[0];

        box.append(number, label);
        grid.appendChild(box);
    });

    const explanation = document.createElement("p");

    explanation.className = "note";
    explanation.textContent =
        "The Greedy Coloring algorithm assigned " +
        subjects.length +
        " subjects to " +
        numberOfPeriods +
        " period(s). This is a valid coloring for the conflicts provided.";

    summary.append(heading, grid, explanation);
}

// ========================================
// 18. LOAD SAMPLE DATA
// ========================================

sampleBtn.addEventListener("click", function () {
    subjects = [
        "Mathematics",
        "DBMS",
        "Operating Systems",
        "Python"
    ];

    conflicts = [
        ["Mathematics", "DBMS"],
        ["Mathematics", "Python"],
        ["DBMS", "Operating Systems"],
        ["Operating Systems", "Python"]
    ];

    updateSubjectList();
    updateDropdowns();
    updateConflictList();
    drawGraph();
    clearTimetable();

    showMessage(
        "Sample data loaded. Click Generate Timetable to see the result."
    );
});

// ========================================
// 19. RESET THE PROJECT
// ========================================

resetBtn.addEventListener("click", function () {
    const confirmed = window.confirm(
        "Are you sure you want to remove all subjects and conflicts?"
    );

    if (!confirmed) {
        return;
    }

    subjects = [];
    conflicts = [];

    updateSubjectList();
    updateDropdowns();
    updateConflictList();
    drawGraph();
    clearTimetable();

    showMessage("Project reset successfully.");
});

// ========================================
// 20. INITIALIZE THE PAGE
// ========================================

updateSubjectList();
updateDropdowns();
updateConflictList();
drawGraph();
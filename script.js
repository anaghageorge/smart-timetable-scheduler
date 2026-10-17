"use strict";

// ========================================
// 1. DATA STORAGE (Synced with MongoDB)
// ========================================

let subjects = []; 
let conflicts = []; 
let latestColors = null;

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
// 5. FETCH & LOAD DATA FROM MONGODB
// ========================================

async function loadDataFromDatabase() {
    try {
        const [subRes, confRes] = await Promise.all([
            fetch("/api/subjects"),
            fetch("/api/conflicts")
        ]);

        if (subRes.ok) subjects = await subRes.json();
        if (confRes.ok) conflicts = await confRes.json();

        updateSubjectList();
        updateDropdowns();
        updateConflictList();
        drawGraph();
    } catch (error) {
        console.error("Failed to load data from database:", error);
        showMessage("Error connecting to database.", "error");
    }
}

// ========================================
// 6. ADD A SUBJECT
// ========================================

subjectForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = subjectInput.value.trim();

    if (name === "") {
        showMessage("Please enter a subject name.", "error");
        return;
    }

    try {
        const response = await fetch("/api/subjects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name })
        });

        const data = await response.json();

        if (!response.ok) {
            showMessage(data.error || "Failed to add subject.", "error");
            return;
        }

        subjectInput.value = "";
        subjectInput.focus();

        await loadDataFromDatabase();
        clearTimetable();
        showMessage(name + " added and saved to database successfully!");
    } catch (error) {
        showMessage("Server error while adding subject.", "error");
    }
});

// ========================================
// 7. DISPLAY SUBJECT LIST
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

        const nameSpan = document.createElement("span");
        nameSpan.textContent = subject.name;

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "remove-btn";
        removeButton.textContent = "Remove";

        removeButton.addEventListener("click", function () {
            removeSubject(subject._id, subject.name);
        });

        li.append(nameSpan, removeButton);
        subjectList.appendChild(li);
    });
}

// ========================================
// 8. UPDATE SUBJECT DROPDOWNS
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
            option.value = subject._id;
            option.textContent = subject.name;
            select.appendChild(option);
        });

        if (subjects.some(s => s._id === previousValue)) {
            select.value = previousValue;
        }
    });
}

// ========================================
// 9. REMOVE A SUBJECT
// ========================================

async function removeSubject(id, name) {
    try {
        const response = await fetch(`/api/subjects/${id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            showMessage("Failed to remove subject.", "error");
            return;
        }

        await loadDataFromDatabase();
        clearTimetable();
        showMessage(name + " and its conflicts have been removed.");
    } catch (error) {
        showMessage("Server error while deleting subject.", "error");
    }
}

// ========================================
// 10. ADD A CONFLICT
// ========================================

addConflictBtn.addEventListener("click", async function () {
    const firstId = subject1.value;
    const secondId = subject2.value;

    if (!firstId || !secondId) {
        showMessage("Please select both subjects.", "error");
        return;
    }

    if (firstId === secondId) {
        showMessage("A subject cannot have a conflict with itself.", "error");
        return;
    }

    try {
        const response = await fetch("/api/conflicts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subject1: firstId, subject2: secondId })
        });

        const data = await response.json();

        if (!response.ok) {
            showMessage(data.error || "Failed to add conflict.", "error");
            return;
        }

        await loadDataFromDatabase();
        clearTimetable();
        showMessage("Conflict added and saved successfully.");
    } catch (error) {
        showMessage("Server error while adding conflict.", "error");
    }
});

// ========================================
// 11. DISPLAY CONFLICT LIST
// ========================================

function updateConflictList() {
    conflictList.replaceChildren();

    conflictCount.textContent =
        conflicts.length + (conflicts.length === 1 ? " conflict" : " conflicts");

    if (conflicts.length === 0) {
        const li = document.createElement("li");
        li.className = "empty-list";
        li.textContent = "No conflicts added yet.";
        conflictList.appendChild(li);
        return;
    }

    conflicts.forEach(function (conflict) {
        const li = document.createElement("li");

        const description = document.createElement("span");
        description.textContent = conflict.subject1 + " ↔ " + conflict.subject2;

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "remove-btn";
        removeButton.textContent = "Remove";

        removeButton.addEventListener("click", function () {
            removeConflict(conflict._id);
        });

        li.append(description, removeButton);
        conflictList.appendChild(li);
    });
}

async function removeConflict(id) {
    try {
        const response = await fetch(`/api/conflicts/${id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            showMessage("Failed to remove conflict.", "error");
            return;
        }

        await loadDataFromDatabase();
        clearTimetable();
        showMessage("Conflict removed.");
    } catch (error) {
        showMessage("Server error while deleting conflict.", "error");
    }
}

// ========================================
// 12. BUILD THE GRAPH
// ========================================

function buildGraph() {
    const adjacency = new Map();

    subjects.forEach(function (subject) {
        adjacency.set(subject.name, []);
    });

    conflicts.forEach(function (conflict) {
        const first = conflict.subject1;
        const second = conflict.subject2;

        if (adjacency.has(first) && adjacency.has(second)) {
            adjacency.get(first).push(second);
            adjacency.get(second).push(first);
        }
    });

    return adjacency;
}

// ========================================
// 13. DRAW THE CONFLICT GRAPH
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
        const angle = -Math.PI / 2 + (2 * Math.PI * index) / subjects.length;
        positions.set(subject.name, {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
        });
    });

    conflicts.forEach(function (conflict) {
        const first = positions.get(conflict.subject1);
        const second = positions.get(conflict.subject2);

        if (!first || !second) return;

        const line = document.createElementNS(namespace, "line");
        line.setAttribute("x1", first.x);
        line.setAttribute("y1", first.y);
        line.setAttribute("x2", second.x);
        line.setAttribute("y2", second.y);
        line.setAttribute("class", "graph-edge");
        graph.appendChild(line);
    });

    subjects.forEach(function (subject, index) {
        const position = positions.get(subject.name);
        if (!position) return;

        const circle = document.createElementNS(namespace, "circle");
        circle.setAttribute("cx", position.x);
        circle.setAttribute("cy", position.y);
        circle.setAttribute("r", nodeRadius);
        circle.setAttribute("fill", COLORS[index % COLORS.length]);
        circle.setAttribute("class", "graph-node");

        const title = document.createElementNS(namespace, "title");
        title.textContent = subject.name;

        circle.appendChild(title);
        graph.appendChild(circle);

        const label = document.createElementNS(namespace, "text");
        label.setAttribute("x", position.x);
        label.setAttribute("y", position.y);
        label.setAttribute("class", "graph-label");

        let displayName = subject.name;
        if (displayName.length > 12) {
            displayName = displayName.slice(0, 11) + "…";
        }
        label.textContent = displayName;
        graph.appendChild(label);
    });
}

// ========================================
// 14. GREEDY GRAPH COLORING ALGORITHM
// ========================================

function greedyColoring() {
    const adjacency = buildGraph();
    const assignedColors = new Map();

    subjects.forEach(function (subject) {
        const unavailableColors = new Set();
        const neighbors = adjacency.get(subject.name) || [];

        for (const neighbor of neighbors) {
            if (assignedColors.has(neighbor)) {
                unavailableColors.add(assignedColors.get(neighbor));
            }
        }

        let color = 0;
        while (unavailableColors.has(color)) {
            color++;
        }

        assignedColors.set(subject.name, color);
    });

    return assignedColors;
}

// ========================================
// 15. GENERATE & SAVE TIMETABLE
// ========================================

generateBtn.addEventListener("click", async function () {
    if (subjects.length === 0) {
        clearTimetable();
        showMessage("Please add at least one subject first.", "error");
        return;
    }

    const colors = greedyColoring();
    displayTimetable(colors);

    const numberOfPeriods = Math.max(...Array.from(colors.values())) + 1;
    const timetableObj = {};
    for (let i = 0; i < numberOfPeriods; i++) {
        timetableObj[i + 1] = [];
    }
    colors.forEach(function (period, subjectName) {
        timetableObj[period + 1].push(subjectName);
    });

    try {
        await fetch("/api/saved-timetables", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                timetable: timetableObj,
                totalSubjects: subjects.length,
                totalPeriods: numberOfPeriods
            })
        });
        showMessage("Timetable generated and saved to database successfully!");
    } catch (err) {
        console.error("Error saving timetable:", err);
        showMessage("Timetable generated, but failed to save to database.", "error");
    }
});

// ========================================
// 16. FORMAT TIME
// ========================================

function formatTime(totalMinutes) {
    const minutesInDay = 24 * 60;
    totalMinutes = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;

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
// 17. DISPLAY GENERATED TIMETABLE
// ========================================

function displayTimetable(colors) {
    clearTimetable();
    latestColors = colors;

    const numberOfPeriods = Math.max(...Array.from(colors.values())) + 1;
    const groupedSubjects = new Map();

    for (let i = 0; i < numberOfPeriods; i++) {
        groupedSubjects.set(i, []);
    }

    colors.forEach(function (period, subjectName) {
        groupedSubjects.get(period).push(subjectName);
    });

    let startParts = periodStart.value.split(":").map(Number);
    let startMinutes = startParts[0] * 60 + startParts[1];

    const duration = Number(periodDuration.value);
    const breakMinutes = Number(breakDuration.value);

    for (let period = 0; period < numberOfPeriods; period++) {
        const card = document.createElement("div");
        card.className = "period-card";

        const title = document.createElement("h3");
        title.style.setProperty("--period-color", COLORS[period % COLORS.length]);
        title.textContent = "Period " + (period + 1);

        card.style.setProperty("--period-color", COLORS[period % COLORS.length]);

        const startTime = startMinutes + period * (duration + breakMinutes);
        const endTime = startTime + duration;

        const time = document.createElement("div");
        time.className = "period-time";
        time.textContent = formatTime(startTime) + " – " + formatTime(endTime);

        card.append(title, time);

        groupedSubjects.get(period).forEach(function (subjectName) {
            const chip = document.createElement("span");
            chip.className = "subject-chip";
            chip.textContent = subjectName;
            card.appendChild(chip);
        });

        timetable.appendChild(card);
    }

    displaySummary(colors, numberOfPeriods);
}

// ========================================
// 18. DISPLAY TIMETABLE SUMMARY
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
// 19. LOAD SAMPLE DATA BUTTON
// ========================================

sampleBtn.addEventListener("click", async function () {
    try {
        const sampleSubjects = ["Mathematics", "DBMS", "Operating Systems", "Python"];
        
        for (const name of sampleSubjects) {
            await fetch("/api/subjects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name })
            });
        }

        await loadDataFromDatabase();

        const m = subjects.find(s => s.name === "Mathematics")?._id;
        const d = subjects.find(s => s.name === "DBMS")?._id;
        const o = subjects.find(s => s.name === "Operating Systems")?._id;
        const p = subjects.find(s => s.name === "Python")?._id;

        if (m && d && o && p) {
            const pairs = [
                [m, d],
                [m, p],
                [d, o],
                [o, p]
            ];
            for (const pair of pairs) {
                await fetch("/api/conflicts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ subject1: pair[0], subject2: pair[1] })
                });
            }
        }

        await loadDataFromDatabase();
        clearTimetable();
        showMessage("Sample data loaded and saved to database successfully!");
    } catch (err) {
        showMessage("Error loading sample data.", "error");
    }
});

// ========================================
// 20. RESET PROJECT BUTTON
// ========================================

resetBtn.addEventListener("click", async function () {
    const confirmed = window.confirm(
        "Are you sure you want to remove all subjects and conflicts from the database?"
    );

    if (!confirmed) return;

    try {
        for (const subject of subjects) {
            await fetch(`/api/subjects/${subject._id}`, {
                method: "DELETE"
            });
        }

        await loadDataFromDatabase();
        clearTimetable();
        showMessage("Project reset successfully.");
    } catch (err) {
        showMessage("Error resetting project.", "error");
    }
});

// ========================================
// 21. INITIALIZE PAGE ON LOAD
// ========================================

loadDataFromDatabase();
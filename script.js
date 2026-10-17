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

const viewSavedBtn = document.getElementById("viewSavedBtn");
const savedTimetablesList = document.getElementById("savedTimetablesList");

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
            headers:
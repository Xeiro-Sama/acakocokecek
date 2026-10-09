const namesInput = document.getElementById("names");
const groupCountInput = document.getElementById("groupCount");

const studentCount = document.getElementById("studentCount");
const totalStudents = document.getElementById("totalStudents");
const totalGroups = document.getElementById("totalGroups");
const studentsPerGroup = document.getElementById("studentsPerGroup");

const randomizeBtn = document.getElementById("randomizeBtn");
const randomStudentBtn = document.getElementById("randomStudentBtn");
const resetBtn = document.getElementById("resetBtn");

const decreaseGroups = document.getElementById("decreaseGroups");
const increaseGroups = document.getElementById("increaseGroups");

const resultsSection = document.getElementById("resultsSection");
const groupResults = document.getElementById("groupResults");

const randomStudentDisplay =
    document.getElementById("randomStudentDisplay");

const randomStudentName =
    document.getElementById("randomStudentName");

const copyBtn = document.getElementById("copyBtn");
const message = document.getElementById("message");

// ====================================
// GAME SOUND ENGINE
// ====================================


let soundEnabled = true;
let audioContext = null;

const soundToggle = document.getElementById("soundToggle");

function getAudioContext() {
    if (!audioContext) {
        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) return null;

        audioContext = new AudioContextClass();
    }

    if (audioContext.state === "suspended") {
        audioContext.resume();
    }

    return audioContext;
}

function playTone(
    frequency = 440,
    duration = 0.08,
    type = "sine",
    volume = 0.12,
    endFrequency = frequency
) {
    if (!soundEnabled) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(1, endFrequency),
        now + duration
    );

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + duration
    );

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);
}

// Stronger UI click
function playClickSound() {
    playTone(700, 0.055, "square", 0.055, 400);
}

// Louder arcade rolling tick
function playRollSound() {
    playTone(620, 0.055, "square", 0.045, 300);
}

// Dramatic two-note reveal
function playRevealSound() {
    playTone(523, 0.18, "triangle", 0.16, 660);

    setTimeout(() => {
        playTone(784, 0.28, "triangle", 0.18, 1046);
    }, 130);

    setTimeout(() => {
        playTone(1046, 0.35, "sine", 0.15, 1318);
    }, 280);
}

// Sound toggle
soundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;

    soundToggle.textContent =
        soundEnabled ? "SOUND: ON" : "SOUND: OFF";

    soundToggle.classList.toggle("muted", !soundEnabled);

    if (soundEnabled) {
        playClickSound();
    }
});

// Click sound for buttons
document.addEventListener("click", (event) => {
    const button = event.target.closest("button");

    if (button && button.id !== "soundToggle") {
        playClickSound();
    }
});

// ------------------------------------
// GET STUDENTS
// ------------------------------------

function getNames() {

    return namesInput.value
        .split("\n")
        .map(name => name.trim())
        .filter(name => name.length > 0);
}


// ------------------------------------
// UPDATE INFORMATION
// ------------------------------------

function updateStats() {

    const names = getNames();
    const groups = Math.max(
        1,
        parseInt(groupCountInput.value) || 1
    );

    const base = Math.floor(names.length / groups);
    const remainder = names.length % groups;

    studentCount.textContent =
        `${names.length} student${names.length === 1 ? "" : "s"}`;

    totalStudents.textContent = names.length;
    totalGroups.textContent = groups;

    if (names.length === 0) {
        studentsPerGroup.textContent = "0";
    } else if (remainder === 0) {
        studentsPerGroup.textContent = base;
    } else {
        studentsPerGroup.textContent = `${base}-${base + 1}`;
    }
}


// ------------------------------------
// CHECK DUPLICATES
// ------------------------------------

function findDuplicates(names) {

    const seen = new Set();
    const duplicates = new Set();

    names.forEach(name => {

        const normalized = name.toLowerCase();

        if (seen.has(normalized)) {
            duplicates.add(name);
        }

        seen.add(normalized);
    });

    return [...duplicates];
}


// ------------------------------------
// SHUFFLE ARRAY
// ------------------------------------

function shuffle(array) {

    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [result[i], result[j]] =
            [result[j], result[i]];
    }

    return result;
}


// ------------------------------------
// CREATE GROUPS
// ------------------------------------

function createGroups(names, numberOfGroups) {

    const shuffled = shuffle(names);

    const groups = Array.from(
        { length: numberOfGroups },
        () => []
    );

    /*
        This distributes students using a round-robin
        method.

        Example:

        10 students
        3 groups

        Group 1 = 4
        Group 2 = 3
        Group 3 = 3
    */

    shuffled.forEach((name, index) => {

        groups[index % numberOfGroups].push(name);

    });

    return groups;
}


// ------------------------------------
// DISPLAY GROUPS
// ------------------------------------

function displayGroups(groups) {

    groupResults.innerHTML = "";

    groups.forEach((group, index) => {

        const card = document.createElement("div");

        card.className = "group-card";

        card.style.animationDelay =
            `${index * 0.08}s`;

        card.innerHTML = `
            <div class="group-card-header">
                <h3>GROUP ${index + 1}</h3>
                <span class="member-count">
                    ${group.length} member${group.length === 1 ? "" : "s"}
                </span>
            </div>

            <ul class="member-list">
                ${group.map(name =>
                    `<li>${escapeHTML(name)}</li>`
                ).join("")}
            </ul>
        `;

        groupResults.appendChild(card);
    });

    resultsSection.classList.remove("hidden");
}


// ------------------------------------
// RANDOMIZE GROUPS
// ------------------------------------

async function randomizeGroups() {

    clearMessage();

    const names = getNames();

    const numberOfGroups =
        parseInt(groupCountInput.value);

    if (names.length === 0) {

        showMessage("Please enter at least one student name.");

        return;
    }

    if (
        !numberOfGroups ||
        numberOfGroups < 1
    ) {

        showMessage("Please enter a valid number of groups.");

        return;
    }

    if (numberOfGroups > names.length) {

        showMessage(
            "The number of groups cannot be greater than the number of students."
        );

        return;
    }

    const duplicates = findDuplicates(names);

    if (duplicates.length > 0) {

        showMessage(
            `Duplicate name detected: ${duplicates.join(", ")}`
        );

        return;
    }

    randomizeBtn.disabled = true;

    randomizeBtn.innerHTML =
        "<span>↻</span> SHUFFLING...";

    groupResults.innerHTML = "";

    resultsSection.classList.remove("hidden");

    /*
        Simple shuffle animation.
        Temporary groups are generated several times
        before the final result appears.
    */


const animationTime = 2200;
const startTime = performance.now();

randomizeBtn.disabled = true;
randomStudentBtn.disabled = true;

groupResults.classList.add("shuffle");

let lastTick = 0;
let currentDelay = 65;

await new Promise(resolve => {
    function animate(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / animationTime, 1);

        // Start fast, then gradually slow down
        currentDelay = 55 + (progress * progress * 350);

        if (now - lastTick >= currentDelay) {
            displayGroups(createGroups(names, numberOfGroups));
            groupResults.classList.add("shuffle");

            playRollSound();
            lastTick = now;
        }

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            resolve();
        }
    }

    requestAnimationFrame(animate);
});

groupResults.classList.remove("shuffle");

const finalGroups = createGroups(names, numberOfGroups);
displayGroups(finalGroups);

playRevealSound();

randomizeBtn.disabled = false;
randomStudentBtn.disabled = false;

    randomizeBtn.innerHTML =
        "<span>↻</span> RANDOMIZE AGAIN";
}


// ------------------------------------
// RANDOM STUDENT
// ------------------------------------

async function pickRandomStudent() {

    clearMessage();

    const names = getNames();

    if (names.length === 0) {

        showMessage("Please enter at least one student name.");

        return;
    }

    randomStudentDisplay.classList.remove("hidden");

    randomStudentBtn.disabled = true;

    const duration = 1000;
    const interval = 80;

    const animation =
        setInterval(() => {

            const randomIndex =
                Math.floor(Math.random() * names.length);

            randomStudentName.textContent =
                names[randomIndex];

            playRollSound();

        }, interval);

    await new Promise(resolve =>
        setTimeout(resolve, duration)
    );

    clearInterval(animation);

    const finalIndex =
        Math.floor(Math.random() * names.length);

    randomStudentName.textContent =
        names[finalIndex];
        
    playRevealSound();

    randomStudentBtn.disabled = false;
}


// ------------------------------------
// COPY RESULTS
// ------------------------------------

function copyResults() {

    const cards =
        document.querySelectorAll(".group-card");

    if (cards.length === 0) {

        showMessage("There are no results to copy.");

        return;
    }

    let text = "CLASS RANDOMIZER\n\n";

    cards.forEach((card, index) => {

        text += `GROUP ${index + 1}\n`;

        const members =
            card.querySelectorAll("li");

        members.forEach((member, memberIndex) => {

            text +=
                `${memberIndex + 1}. ${member.textContent}\n`;

        });

        text += "\n";
    });

    navigator.clipboard.writeText(text)
        .then(() => {

            copyBtn.textContent = "COPIED!";

            setTimeout(() => {

                copyBtn.textContent = "COPY RESULTS";

            }, 1500);

        })
        .catch(() => {

            showMessage("Unable to copy results.");

        });
}


// ------------------------------------
// RESET
// ------------------------------------

function resetEverything() {

    namesInput.value = "";

    groupCountInput.value = 4;

    resultsSection.classList.add("hidden");

    randomStudentDisplay.classList.add("hidden");

    groupResults.innerHTML = "";

    randomStudentName.textContent = "---";

    randomizeBtn.disabled = false;

    randomizeBtn.innerHTML =
        "<span>⚡</span> RANDOMIZE GROUPS";

    clearMessage();

    updateStats();
}


// ------------------------------------
// GROUP +/- BUTTONS
// ------------------------------------

decreaseGroups.addEventListener(
    "click",
    () => {

        let value =
            parseInt(groupCountInput.value) || 1;

        if (value > 1) {
            value--;
        }

        groupCountInput.value = value;

        updateStats();
    }
);


increaseGroups.addEventListener(
    "click",
    () => {

        let value =
            parseInt(groupCountInput.value) || 1;

        const names = getNames();

        if (value < names.length || names.length === 0) {
            value++;
        }

        groupCountInput.value = value;

        updateStats();
    }
);


// ------------------------------------
// INPUT EVENTS
// ------------------------------------

namesInput.addEventListener(
    "input",
    updateStats
);

groupCountInput.addEventListener(
    "input",
    updateStats
);


// ------------------------------------
// BUTTON EVENTS
// ------------------------------------

randomizeBtn.addEventListener(
    "click",
    randomizeGroups
);

randomStudentBtn.addEventListener(
    "click",
    pickRandomStudent
);

copyBtn.addEventListener(
    "click",
    copyResults
);

resetBtn.addEventListener(
    "click",
    resetEverything
);


// ------------------------------------
// MESSAGE SYSTEM
// ------------------------------------

function showMessage(text) {

    message.textContent = text;

}

function clearMessage() {

    message.textContent = "";

}


// ------------------------------------
// BASIC HTML SECURITY
// ------------------------------------

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}


// ------------------------------------
// INITIALIZE
// ------------------------------------

updateStats();
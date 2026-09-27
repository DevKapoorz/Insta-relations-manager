let people = [];

const homePage = document.getElementById("homePage");
const loadingPage = document.getElementById("loadingPage");
const infoPage = document.getElementById("infoPage");
const dropZone = document.getElementById("dropZone");
const zipFileInput = document.getElementById("zipFileInput");
const dropStatus = document.getElementById("dropStatus");
const newFileBtn = document.getElementById("newFileBtn");

const loadingFileNameText = document.getElementById("loadingFileNameText");
const loadingFileSizeText = document.getElementById("loadingFileSizeText");
const loadingStatusText = document.getElementById("loadingStatusText");
const loadingPercentText = document.getElementById("loadingPercentText");
const loadingProgressBar = document.getElementById("loadingProgressBar");

const stepUnpack = document.getElementById("stepUnpack");
const stepFollowing = document.getElementById("stepFollowing");
const stepFollowers = document.getElementById("stepFollowers");
const stepPending = document.getElementById("stepPending");
const stepDiff = document.getElementById("stepDiff");

const descUnpack = document.getElementById("descUnpack");
const descFollowing = document.getElementById("descFollowing");
const descFollowers = document.getElementById("descFollowers");
const descPending = document.getElementById("descPending");
const descDiff = document.getElementById("descDiff");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Analytics event tracker (100% privacy-safe: strictly anonymous actions without PII)
function trackAnalyticsEvent(eventName, eventParams = {}) {
    if (typeof window.gtag === "function") {
        try {
            window.gtag("event", eventName, eventParams);
        } catch (e) {
            console.debug("Analytics event error:", e);
        }
    }
}

function formatFileSize(bytes) {
    if (!bytes || bytes <= 0) return "0 B";
    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + " KB";
    }
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function setStepState(stepElement, state) {
    if (!stepElement) return;
    stepElement.classList.remove("active", "completed");
    if (state) stepElement.classList.add(state);
}

function updateProgress(percentage, text) {
    if (loadingStatusText && text) loadingStatusText.textContent = text;
    if (loadingPercentText && percentage !== undefined) {
        loadingPercentText.textContent = `${percentage}%`;
    }
    if (loadingProgressBar && percentage !== undefined) {
        loadingProgressBar.style.width = `${percentage}%`;
    }
}

function setStatus(message, type = "") {
    if (!dropStatus) return;
    if (!message) {
        dropStatus.style.display = "none";
        dropStatus.textContent = "";
        dropStatus.className = "drop-status";
        return;
    }
    dropStatus.style.display = "block";
    dropStatus.textContent = message;
    dropStatus.className = `drop-status ${type}`;
}

async function handleZipSelection(file) {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".zip")) {
        setStatus("Please select a valid .zip file exported from Instagram.", "error");
        return;
    }

    const MAX_INPUT_FILE_SIZE = 5 * 1024 * 1024; // 5 MB max
    if (file.size > MAX_INPUT_FILE_SIZE) {
        setStatus(`File is too large (${formatFileSize(file.size)}). Maximum supported size is 5 MB to prevent browser freeze.`, "error");
        return;
    }

    setStatus("");

    // Switch from home page to dedicated loading page
    if (homePage) homePage.style.display = "none";
    if (loadingPage) loadingPage.style.display = "flex";

    // Set file meta
    if (loadingFileNameText) loadingFileNameText.textContent = file.name;
    if (loadingFileSizeText) loadingFileSizeText.textContent = formatFileSize(file.size);

    // Reset checklist states
    setStepState(stepUnpack, "active");
    setStepState(stepFollowing, "");
    setStepState(stepFollowers, "");
    setStepState(stepPending, "");
    setStepState(stepDiff, "");

    if (descUnpack) descUnpack.textContent = "Extracting JSON files from archive";
    if (descFollowing) descFollowing.textContent = "Pending extraction...";
    if (descFollowers) descFollowers.textContent = "Pending extraction...";
    if (descPending) descPending.textContent = "Pending extraction...";
    if (descDiff) descDiff.textContent = "Calculating who doesn't follow back";

    updateProgress(15, "Reading ZIP archive...");

    try {
        const processed = await processZipFile(file, async (step, info) => {
            if (step === "unpack") {
                if (descUnpack) descUnpack.textContent = `Indexed ${info.totalFiles} files in archive`;
                setStepState(stepUnpack, "completed");
                setStepState(stepFollowing, "active");
                if (descFollowing) descFollowing.textContent = "Scanning following records...";
                updateProgress(35, "Parsing following accounts...");
                await sleep(350);
            } else if (step === "following") {
                if (descFollowing) descFollowing.textContent = `Found ${info.count} following accounts`;
                setStepState(stepFollowing, "completed");
                setStepState(stepFollowers, "active");
                if (descFollowers) descFollowers.textContent = "Scanning followers list...";
                updateProgress(60, "Parsing followers list...");
                await sleep(350);
            } else if (step === "followers") {
                if (descFollowers) descFollowers.textContent = `Found ${info.count} followers`;
                setStepState(stepFollowers, "completed");
                setStepState(stepPending, "active");
                if (descPending) descPending.textContent = "Scanning pending follow requests...";
                updateProgress(80, "Checking pending requests...");
                await sleep(350);
            } else if (step === "pending") {
                if (descPending) {
                    descPending.textContent = info.count > 0 ? `Found ${info.count} pending requests` : "No pending follow requests found";
                }
                setStepState(stepPending, "completed");
                setStepState(stepDiff, "active");
                if (descDiff) descDiff.textContent = "Cross-referencing relations...";
                updateProgress(95, "Analyzing connections...");
                await sleep(350);
            } else if (step === "diff") {
                if (descDiff) {
                    descDiff.textContent = `${info.notFollowingBack} don't follow back, ${info.notFollowedBack} you don't follow back`;
                }
                setStepState(stepDiff, "completed");
                updateProgress(100, "Analysis complete! Opening dashboard...");
                await sleep(400);
            }
        });

        people = processed;

        trackAnalyticsEvent("archive_processed", {
            total_profiles: people.length
        });

        // Transition from loading page to info page
        if (loadingPage) loadingPage.style.display = "none";
        if (infoPage) infoPage.style.display = "flex";
        await showPeople();
    } catch (err) {
        console.error("Error processing zip:", err);
        if (loadingPage) loadingPage.style.display = "none";
        if (homePage) homePage.style.display = "flex";
        setStatus(
            err.message || "Failed to process zip file. Please ensure it contains Instagram export files.",
            "error",
        );
    }
}

// Prevent browser from navigating away if zip is dropped outside dropzone
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => e.preventDefault());

if (dropZone && zipFileInput) {
    ["dragenter", "dragover"].forEach((eventName) => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add("dragover");
        });
    });

    ["dragleave", "drop"].forEach((eventName) => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove("dragover");
        });
    });

    dropZone.addEventListener("drop", (e) => {
        const dt = e.dataTransfer;
        const files = dt ? dt.files : null;
        if (files && files.length > 0) {
            handleZipSelection(files[0]);
        }
    });

    dropZone.addEventListener("click", (e) => {
        if (e.target.closest(".btn-browse") || e.target === zipFileInput) return;
        zipFileInput.click();
    });

    zipFileInput.addEventListener("change", (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleZipSelection(e.target.files[0]);
        }
    });
}

if (newFileBtn) {
    newFileBtn.addEventListener("click", () => {
        trackAnalyticsEvent("change_zip_clicked");
        if (infoPage) infoPage.style.display = "none";
        if (loadingPage) loadingPage.style.display = "none";
        if (homePage) homePage.style.display = "flex";
        if (zipFileInput) zipFileInput.value = "";
        setStatus("");
    });
}

const searchInput = document.querySelector(".controls input");

const sortSelect = document.querySelector(".controls select");

function getCategoryContainer(categoryName) {
    let sections = document.querySelectorAll(".category");

    for (let section of sections) {
        let heading = section.querySelector("h2");

        if (heading && heading.textContent.includes(categoryName)) {
            return section.querySelector(".people");
        }
    }

    return null;
}

async function showPeople() {
    let data = [...people];

    // UPDATE OVERVIEW STATS (from full dataset)
    const notFollowingTotal = people.filter(
        (p) => p.category === "Who don't follow you back",
    ).length;
    const notFollowedTotal = people.filter(
        (p) => p.category === "Who you don't follow back",
    ).length;
    const pendingTotal = people.filter(
        (p) => p.category === "Pending Follow Requests",
    ).length;

    const statCountNotFollowing = document.getElementById("statCountNotFollowing");
    const statCountNotFollowed = document.getElementById("statCountNotFollowed");
    const statCountPending = document.getElementById("statCountPending");

    if (statCountNotFollowing) statCountNotFollowing.textContent = notFollowingTotal;
    if (statCountNotFollowed) statCountNotFollowed.textContent = notFollowedTotal;
    if (statCountPending) statCountPending.textContent = pendingTotal;

    // SEARCH
    let searchText = (searchInput ? searchInput.value : "").trim().toLowerCase();

    data = data.filter((person) => {
        return (
            (person.name && person.name.toLowerCase().includes(searchText)) ||
            (person.id && person.id.toString().toLowerCase().includes(searchText))
        );
    });

    // SORT
    if (sortSelect) {
        switch (sortSelect.value) {
            case "Sort A-Z":
                data.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case "Sort Z-A":
                data.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case "Date Old to New":
                data.sort((a, b) => a.timeStamp - b.timeStamp);
                break;
            case "Date New to Old":
                data.sort((a, b) => b.timeStamp - a.timeStamp);
                break;
        }
    }

    // CLEAR OLD CARDS
    document.querySelectorAll(".people").forEach((box) => {
        box.innerHTML = "";
    });

    // CREATE CARDS
    data.forEach((person) => {
        let container = getCategoryContainer(person.category);
        if (!container) return;

        let card = document.createElement("a");
        card.className = "person";
        card.href = typeof sanitizeInstagramUrl === "function"
            ? sanitizeInstagramUrl(person.id, person.name)
            : (person.id || "#");
        card.target = "_blank";
        card.rel = "noopener noreferrer nofollow";

        let rawTime = Number(person.timeStamp) || 0;
        if (rawTime > 0 && rawTime < 1e11) {
            rawTime *= 1000;
        }

        let datime =
            rawTime > 0
                ? new Date(rawTime).toLocaleString("en-IN", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                  })
                : "";

        const cleanName = person.name || "user";

        const details = document.createElement("div");
        details.className = "details";

        const nameEl = document.createElement("div");
        nameEl.className = "personName";
        nameEl.textContent = `@${cleanName}`;
        details.appendChild(nameEl);

        if (datime) {
            const timeEl = document.createElement("div");
            timeEl.className = "TimeHappened";
            timeEl.innerHTML = `
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
            `;
            const timeSpan = document.createElement("span");
            timeSpan.textContent = datime;
            timeEl.appendChild(timeSpan);
            details.appendChild(timeEl);
        }

        card.appendChild(details);
        container.appendChild(card);
    });

    // UPDATE COUNTS & TOGGLE VISIBILITY
    let totalCardsVisible = 0;
    document.querySelectorAll(".category").forEach((section) => {
        let count = section.querySelectorAll(".person").length;
        totalCardsVisible += count;

        let button = section.querySelector(".toggleCategory");
        if (button) {
            let countEl = button.querySelector(".category-count");
            if (countEl) {
                countEl.textContent = `${count} ${count !== 1 ? "People" : "Person"}`;
            } else if (button.childNodes[0]) {
                button.childNodes[0].textContent = `${count} ${count !== 1 ? "People" : "Person"} `;
            }
        }

        section.style.display = count === 0 ? "none" : "block";
    });

    const noResults = document.getElementById("noResults");
    if (noResults) {
        noResults.style.display = totalCardsVisible === 0 ? "flex" : "none";
    }
}

if (searchInput) {
    searchInput.addEventListener("input", showPeople);
}

if (sortSelect) {
    sortSelect.addEventListener("change", showPeople);
}

// Custom Sort Dropdown
const sortDropdown = document.getElementById("sortDropdown");
const sortCustomBtn = document.getElementById("sortCustomBtn");
const sortOptionsMenu = document.getElementById("sortOptionsMenu");
const sortLabel = sortCustomBtn ? sortCustomBtn.querySelector(".custom-select-label") : null;

if (sortCustomBtn && sortOptionsMenu && sortDropdown) {
    sortCustomBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = sortDropdown.classList.toggle("open");
        sortOptionsMenu.style.display = isOpen ? "flex" : "none";
        sortCustomBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    document.querySelectorAll(".custom-option").forEach((option) => {
        option.addEventListener("click", (e) => {
            e.stopPropagation();
            const val = option.getAttribute("data-value");
            if (sortSelect) {
                sortSelect.value = val;
            }
            if (sortLabel) {
                sortLabel.textContent = val;
            }
            document.querySelectorAll(".custom-option").forEach((opt) => opt.classList.remove("selected"));
            option.classList.add("selected");

            sortDropdown.classList.remove("open");
            sortOptionsMenu.style.display = "none";
            sortCustomBtn.setAttribute("aria-expanded", "false");

            trackAnalyticsEvent("sort_changed", {
                sort_by: val
            });

            showPeople();
        });
    });

    document.addEventListener("click", (e) => {
        if (!sortDropdown.contains(e.target)) {
            sortDropdown.classList.remove("open");
            sortOptionsMenu.style.display = "none";
            sortCustomBtn.setAttribute("aria-expanded", "false");
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && sortDropdown.classList.contains("open")) {
            sortDropdown.classList.remove("open");
            sortOptionsMenu.style.display = "none";
            sortCustomBtn.setAttribute("aria-expanded", "false");
        }
    });
}

const clearSearchBtn = document.getElementById("clearSearchBtn");
if (clearSearchBtn && searchInput) {
    clearSearchBtn.addEventListener("click", () => {
        searchInput.value = "";
        showPeople();
    });
}

// Click stat cards to jump to corresponding category
document.querySelectorAll(".stat-card").forEach((statCard) => {
    statCard.addEventListener("click", () => {
        const catName = statCard.getAttribute("data-category");
        const container = getCategoryContainer(catName);
        if (container) {
            const section = container.closest(".category");
            if (section) {
                section.classList.remove("hidden");
                section.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        }
    });
});

document.querySelectorAll(".toggleCategory").forEach((button) => {
    button.addEventListener("click", () => {
        let category = button.closest(".category");
        if (category) {
            category.classList.toggle("hidden");
        }
    });
});

// Back to top button
const backToTopBtn = document.getElementById("backToTopBtn");
const mainContainer = document.querySelector("#infoPage main");

if (backToTopBtn) {
    const handleScroll = () => {
        const scrollTop = mainContainer ? mainContainer.scrollTop : (window.pageYOffset || document.documentElement.scrollTop);
        if (scrollTop > 280) {
            backToTopBtn.classList.add("visible");
        } else {
            backToTopBtn.classList.remove("visible");
        }
    };

    if (mainContainer) {
        mainContainer.addEventListener("scroll", handleScroll);
    }
    window.addEventListener("scroll", handleScroll);

    backToTopBtn.addEventListener("click", () => {
        trackAnalyticsEvent("back_to_top_clicked");
        if (mainContainer) {
            mainContainer.scrollTo({
                top: 0,
                behavior: "smooth",
            });
        }
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    });
}

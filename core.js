async function fetchJSONData(file_url) {
    return await fetch(file_url)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            return data;
        })
        .catch((error) => {
            console.error("Failed to fetch data:", error);
        });
}
async function getMissing(first, second, categoryName) {
    return first
        .filter(
            (item) =>
                !second.some((secondItem) => secondItem.title === item.title),
        )
        .map((user) => ({
            name: user.title,
            id: user.profileUrl,
            category: categoryName,
            timeStamp: user.timeStamp,
        }));
}
async function getFollowings() {
    const flwings = (
        await fetchJSONData("./followers_and_following/following.json")
    ).relationships_following;

    return flwings
        .filter((user) => {
            const title = user.title;
            const href = user.string_list_data?.[0]?.href;

            // Exclude deleted/deactivated accounts
            return (
                title &&
                title.trim() !== "" &&
                href &&
                href.includes("instagram.com")
            );
        })
        .map((user) => ({
            title: user.title,
            profileUrl: user.string_list_data[0].href,
            timeStamp: user.string_list_data[0].timestamp,
        }));
}
async function getFollowers() {
    const flwers = await fetchJSONData(
        "./followers_and_following/followers_1.json",
    );
    
    return flwers.map((user) => ({
        title: user.string_list_data[0].value,
        profileUrl: user.string_list_data[0].href,
        timeStamp: user.string_list_data[0].timestamp,
    }));
}
async function whoDontFollowBack() {
    const followings = await getFollowings();
    const followers = await getFollowers();

    return getMissing(followings, followers, "Who don't follow you back");
}

async function whomIDontFollowBack() {
    const followings = await getFollowings();
    const followers = await getFollowers();

    return getMissing(followers, followings, "Who you don't follow back");
}

async function pendingFollowRequests() {
    const pflwreq = await fetchJSONData(
        "./followers_and_following/pending_follow_requests.json",
    );

    return await pflwreq.map((user) => ({
        name: user.label_values[2].value,
        id: `https://www.instagram.com/_u/${user.label_values[2].value}`,
        timeStamp: user.timestamp,
        category: "Pending Follow Requests",
    }));
}

// Security Limits for Archive & Decompression Protection
const SECURITY_LIMITS = {
    MAX_ZIP_SIZE: 5 * 1024 * 1024,                 // 5 MB max archive size
    MAX_ENTRIES_IN_ZIP: 500,                       // 500 entries max in ZIP
    MAX_TARGET_JSON_FILES: 50,                     // 50 followers/following JSON chunks max
    MAX_SINGLE_FILE_DECOMPRESSED: 2 * 1024 * 1024, // 2 MB max decompressed size for a single JSON file
    MAX_TOTAL_DECOMPRESSED: 5 * 1024 * 1024,       // 5 MB total decompressed JSON size across all files
};

/**
 * Validates and sanitizes an Instagram username.
 * Prevents HTML/script injection, limits length, and removes syntax/control characters.
 */
function sanitizeUsername(input) {
    if (typeof input !== "string") return "";
    return input.trim().replace(/[<>\"'&`=\/\\]/g, "").slice(0, 50);
}

/**
 * Validates and sanitizes Instagram profile URLs.
 * Strictly checks protocol (must be http/https) and hostname (must be instagram.com),
 * completely blocking javascript:, data:, vbscript:, and malicious redirects.
 */
function sanitizeInstagramUrl(rawUrl, fallbackUsername = "") {
    const cleanUser = encodeURIComponent(sanitizeUsername(fallbackUsername));
    const safeFallback = cleanUser
        ? `https://www.instagram.com/${cleanUser}`
        : "https://www.instagram.com/";

    if (!rawUrl || typeof rawUrl !== "string") {
        return safeFallback;
    }

    const trimmed = rawUrl.trim();
    const lower = trimmed.toLowerCase();

    // Explicitly reject dangerous URL schemes
    if (
        lower.startsWith("javascript:") ||
        lower.startsWith("data:") ||
        lower.startsWith("vbscript:") ||
        lower.startsWith("file:") ||
        lower.startsWith("blob:")
    ) {
        return safeFallback;
    }

    try {
        const parsed = new URL(trimmed, "https://www.instagram.com");
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
            return safeFallback;
        }

        const hostname = parsed.hostname.toLowerCase();
        if (
            hostname === "instagram.com" ||
            hostname === "www.instagram.com" ||
            hostname.endsWith(".instagram.com")
        ) {
            parsed.protocol = "https:";
            return parsed.href;
        }
    } catch {
        return safeFallback;
    }

    return safeFallback;
}

function parseFollowingsData(rawFollowing) {
    const flwings =
        rawFollowing?.relationships_following ||
        (Array.isArray(rawFollowing) ? rawFollowing : []);

    return flwings
        .map((user) => {
            const rawTitle =
                user.title || user.string_list_data?.[0]?.value || "";
            const title = sanitizeUsername(rawTitle);
            const rawHref = user.string_list_data?.[0]?.href || "";
            const profileUrl = sanitizeInstagramUrl(rawHref, title);
            const rawTimestamp =
                user.string_list_data?.[0]?.timestamp || user.timestamp || 0;
            const timeStamp = Number(rawTimestamp) || 0;

            return {
                title,
                profileUrl,
                timeStamp: Number.isFinite(timeStamp) ? timeStamp : 0,
            };
        })
        .filter((user) => user.title !== "");
}

function parseFollowersData(rawFollowers) {
    const flwers = Array.isArray(rawFollowers)
        ? rawFollowers
        : rawFollowers?.relationships_followers || [];

    return flwers
        .map((user) => {
            const rawTitle =
                user.string_list_data?.[0]?.value || user.title || "";
            const title = sanitizeUsername(rawTitle);
            const rawHref = user.string_list_data?.[0]?.href || "";
            const profileUrl = sanitizeInstagramUrl(rawHref, title);
            const rawTimestamp =
                user.string_list_data?.[0]?.timestamp || user.timestamp || 0;
            const timeStamp = Number(rawTimestamp) || 0;

            return {
                title,
                profileUrl,
                timeStamp: Number.isFinite(timeStamp) ? timeStamp : 0,
            };
        })
        .filter((user) => user.title !== "");
}

function parsePendingRequestsData(rawPending) {
    const pflwreq = Array.isArray(rawPending)
        ? rawPending
        : rawPending?.relationships_follow_requests_sent || [];

    return pflwreq
        .map((user) => {
            let rawUsername = "";
            if (Array.isArray(user.label_values)) {
                const usernameItem =
                    user.label_values.find(
                        (lv) =>
                            lv?.label &&
                            lv.label.toLowerCase().includes("username"),
                    ) ||
                    user.label_values[2] ||
                    user.label_values[1];
                rawUsername = usernameItem?.value || "";
            } else if (user.string_list_data?.[0]?.value) {
                rawUsername = user.string_list_data[0].value;
            } else if (user.title) {
                rawUsername = user.title;
            }

            const username = sanitizeUsername(rawUsername);
            const rawTimestamp =
                user.timestamp || user.string_list_data?.[0]?.timestamp || 0;
            const timeStamp = Number(rawTimestamp) || 0;

            return {
                name: username,
                id: sanitizeInstagramUrl("", username),
                timeStamp: Number.isFinite(timeStamp) ? timeStamp : 0,
                category: "Pending Follow Requests",
            };
        })
        .filter((user) => user.name !== "");
}

async function processZipFile(zipFile, onProgress = null) {
    if (typeof JSZip === "undefined") {
        throw new Error(
            "JSZip library is not loaded. Please check your internet connection and reload the page.",
        );
    }

    if (!zipFile || typeof zipFile.size !== "number") {
        throw new Error("Invalid file provided.");
    }

    // 1. Check archive file size before unzipping
    if (zipFile.size > SECURITY_LIMITS.MAX_ZIP_SIZE) {
        throw new Error(
            `ZIP file exceeds maximum allowed size of 5 MB (${(zipFile.size / (1024 * 1024)).toFixed(1)} MB). Processing aborted to prevent system freeze.`,
        );
    }

    let zip;
    try {
        zip = await JSZip.loadAsync(zipFile);
    } catch (e) {
        throw new Error(
            "Unable to open ZIP file. The file may be corrupt, password-protected, or invalid.",
        );
    }

    const fileEntries = Object.keys(zip.files);
    const totalFilesInZip = fileEntries.length;

    // 2. Check entry count to protect against ZIP bombs (thousands of tiny files)
    if (totalFilesInZip > SECURITY_LIMITS.MAX_ENTRIES_IN_ZIP) {
        throw new Error(
            `Archive contains an unusually large number of files (${totalFilesInZip}). Aborted to protect against potential ZIP bombs.`,
        );
    }

    if (onProgress) {
        await onProgress("unpack", {
            totalFiles: totalFilesInZip,
        });
    }

    let followingFiles = [];
    let followerFiles = [];
    let pendingFiles = [];
    let hasHtmlFiles = false;

    for (const relativePath of fileEntries) {
        const file = zip.files[relativePath];
        if (file.dir) continue;

        // Path traversal protection: ignore relative traversal attempts
        const normalized = relativePath.toLowerCase().replace(/\\/g, "/");
        if (normalized.includes("../") || normalized.startsWith("/")) {
            continue;
        }

        const filename = normalized.split("/").pop();

        if (filename.endsWith(".html")) {
            hasHtmlFiles = true;
        }

        if (
            filename.startsWith("following") &&
            filename.endsWith(".json") &&
            !filename.includes("recently")
        ) {
            followingFiles.push(file);
        } else if (
            filename.startsWith("followers") &&
            filename.endsWith(".json")
        ) {
            followerFiles.push(file);
        } else if (
            filename.includes("pending_follow_requests") &&
            filename.endsWith(".json")
        ) {
            pendingFiles.push(file);
        }
    }

    const totalTargetFiles =
        followingFiles.length + followerFiles.length + pendingFiles.length;
    if (totalTargetFiles > SECURITY_LIMITS.MAX_TARGET_JSON_FILES) {
        throw new Error(
            `Found ${totalTargetFiles} matching relation files, which exceeds the safety threshold (${SECURITY_LIMITS.MAX_TARGET_JSON_FILES}). Processing stopped.`,
        );
    }

    if (followingFiles.length === 0 && followerFiles.length === 0) {
        if (hasHtmlFiles) {
            throw new Error(
                "Your export appears to be in HTML format. Please request a new export from Instagram selecting 'JSON' format.",
            );
        }
        throw new Error(
            "Could not find following or followers JSON files in this zip. Please ensure this is the Instagram JSON export zip.",
        );
    }

    // Decompression monitor to prevent runaway memory expansion
    let totalDecompressedBytes = 0;

    async function safelyExtractAndParse(file) {
        // Pre-check uncompressed size metadata from ZIP headers if available
        const uncompressedSize = file._data?.uncompressedSize || 0;
        if (uncompressedSize > SECURITY_LIMITS.MAX_SINGLE_FILE_DECOMPRESSED) {
            throw new Error(
                `Decompressed file "${file.name}" exceeds the maximum safety limit of 2 MB. Aborted to protect browser memory.`,
            );
        }

        const text = await file.async("text");
        totalDecompressedBytes += text.length;

        if (totalDecompressedBytes > SECURITY_LIMITS.MAX_TOTAL_DECOMPRESSED) {
            throw new Error(
                "Total extracted JSON data exceeds the 5 MB safety limit. Aborted to protect against runaway memory expansion.",
            );
        }

        // Parse with prototype pollution guard
        return JSON.parse(text, (key, value) => {
            if (key === "__proto__" || key === "constructor" || key === "prototype") {
                return undefined;
            }
            return value;
        });
    }

    let followingData = [];
    for (const file of followingFiles) {
        try {
            const parsed = await safelyExtractAndParse(file);
            followingData = followingData.concat(parseFollowingsData(parsed));
        } catch (err) {
            console.warn("Failed parsing following file:", file.name, err);
        }
    }

    const uniqueFollowing = Array.from(
        new Map(followingData.map((u) => [u.title.toLowerCase(), u])).values(),
    );

    if (onProgress) {
        await onProgress("following", {
            count: uniqueFollowing.length,
        });
    }

    let followersData = [];
    for (const file of followerFiles) {
        try {
            const parsed = await safelyExtractAndParse(file);
            followersData = followersData.concat(parseFollowersData(parsed));
        } catch (err) {
            console.warn("Failed parsing followers file:", file.name, err);
        }
    }

    const uniqueFollowers = Array.from(
        new Map(followersData.map((u) => [u.title.toLowerCase(), u])).values(),
    );

    if (onProgress) {
        await onProgress("followers", {
            count: uniqueFollowers.length,
        });
    }

    let pendingData = [];
    for (const file of pendingFiles) {
        try {
            const parsed = await safelyExtractAndParse(file);
            pendingData = pendingData.concat(parsePendingRequestsData(parsed));
        } catch (err) {
            console.warn("Failed parsing pending file:", file.name, err);
        }
    }

    if (onProgress) {
        await onProgress("pending", {
            count: pendingData.length,
        });
    }

    const notFollowingBack = uniqueFollowing
        .filter(
            (u) =>
                !uniqueFollowers.some(
                    (f) => f.title.toLowerCase() === u.title.toLowerCase(),
                ),
        )
        .map((u) => ({
            name: u.title,
            id: u.profileUrl,
            category: "Who don't follow you back",
            timeStamp: u.timeStamp,
        }));

    const notFollowedBack = uniqueFollowers
        .filter(
            (u) =>
                !uniqueFollowing.some(
                    (f) => f.title.toLowerCase() === u.title.toLowerCase(),
                ),
        )
        .map((u) => ({
            name: u.title,
            id: u.profileUrl,
            category: "Who you don't follow back",
            timeStamp: u.timeStamp,
        }));

    if (onProgress) {
        await onProgress("diff", {
            notFollowingBack: notFollowingBack.length,
            notFollowedBack: notFollowedBack.length,
        });
    }

    return [...notFollowingBack, ...notFollowedBack, ...pendingData];
}

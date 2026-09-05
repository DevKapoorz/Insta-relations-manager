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

function parseFollowingsData(rawFollowing) {
    const flwings =
        rawFollowing?.relationships_following ||
        (Array.isArray(rawFollowing) ? rawFollowing : []);

    return flwings
        .map((user) => {
            const title =
                user.title || user.string_list_data?.[0]?.value || "";
            const href =
                user.string_list_data?.[0]?.href ||
                (title ? `https://www.instagram.com/${title}` : "");
            const timeStamp =
                user.string_list_data?.[0]?.timestamp || user.timestamp || 0;

            return {
                title: title.trim(),
                profileUrl: href,
                timeStamp: Number(timeStamp) || 0,
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
            const title =
                user.string_list_data?.[0]?.value || user.title || "";
            const href =
                user.string_list_data?.[0]?.href ||
                (title ? `https://www.instagram.com/${title}` : "");
            const timeStamp =
                user.string_list_data?.[0]?.timestamp || user.timestamp || 0;

            return {
                title: title.trim(),
                profileUrl: href,
                timeStamp: Number(timeStamp) || 0,
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
            let username = "";
            if (Array.isArray(user.label_values)) {
                const usernameItem =
                    user.label_values.find(
                        (lv) =>
                            lv?.label &&
                            lv.label.toLowerCase().includes("username"),
                    ) ||
                    user.label_values[2] ||
                    user.label_values[1];
                username = usernameItem?.value || "";
            } else if (user.string_list_data?.[0]?.value) {
                username = user.string_list_data[0].value;
            } else if (user.title) {
                username = user.title;
            }

            username = (username || "").trim();

            const timeStamp =
                user.timestamp || user.string_list_data?.[0]?.timestamp || 0;

            return {
                name: username,
                id: `https://www.instagram.com/${username}`,
                timeStamp: Number(timeStamp) || 0,
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

    let zip;
    try {
        zip = await JSZip.loadAsync(zipFile);
    } catch (e) {
        throw new Error(
            "Unable to open ZIP file. The file may be corrupt or not a valid archive.",
        );
    }

    const totalFilesInZip = Object.keys(zip.files).length;
    if (onProgress) {
        await onProgress("unpack", {
            totalFiles: totalFilesInZip,
        });
    }

    let followingFiles = [];
    let followerFiles = [];
    let pendingFiles = [];
    let hasHtmlFiles = false;

    zip.forEach((relativePath, file) => {
        if (file.dir) return;
        const normalized = relativePath.toLowerCase().replace(/\\/g, "/");
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
    });

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

    let followingData = [];
    for (const file of followingFiles) {
        try {
            const text = await file.async("text");
            followingData = followingData.concat(parseFollowingsData(JSON.parse(text)));
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
            const text = await file.async("text");
            followersData = followersData.concat(parseFollowersData(JSON.parse(text)));
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
            const text = await file.async("text");
            pendingData = pendingData.concat(parsePendingRequestsData(JSON.parse(text)));
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

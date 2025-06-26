function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function getCurrentProfileId() {
  try {
    const { profileId } = await new Promise((resolve) => {
      chrome.storage.local.get(["profileId"], resolve);
    });
    console.log("Stored profileId from chrome.storage.local:", profileId);

    if (profileId) {
      console.log("Using stored profileId:", profileId);
      const response = await fetch(
        `http://localhost:3000/profiles?currentProfileId=${profileId}`
      );
      console.log(
        "Response from /profiles:",
        response.status,
        response.statusText
      );
      if (response.ok) {
        const profiles = await response.json();
        console.log("Profiles received:", profiles);
        if (
          profiles.some(
            (p) => p.profileId.toLowerCase() === profileId.toLowerCase()
          )
        ) {
          return profileId.toLowerCase();
        }
      }
      console.log("ProfileId not found or invalid, clearing storage");
      await new Promise((resolve) =>
        chrome.storage.local.remove("profileId", resolve)
      );
      return null;
    }

    console.log("No profileId found, waiting for user selection");
    return null;
  } catch (error) {
    console.error("Error determining profileId:", error);
    return null;
  }
}

async function selectProfile() {
  try {
    const response = await fetch("http://localhost:3000/profiles");
    console.log(
      "Response from /profiles for selectProfile:",
      response.status,
      response.statusText
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch profiles: ${response.statusText}`);
    }
    const profiles = await response.json();
    console.log("Available profiles for selection:", profiles);

    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          action: "selectProfile",
          profiles: profiles.map((p) => ({
            profileId: p.profileId,
            profileName: p.profileName,
          })),
        },
        (response) => {
          console.log(
            "Received response from selectProfile message:",
            response
          );
          if (response && response.selectedProfileId) {
            const selectedProfileId = response.selectedProfileId.toLowerCase();
            chrome.storage.local.set({ profileId: selectedProfileId }, () => {
              console.log("Selected and stored profileId:", selectedProfileId);
              resolve(selectedProfileId);
            });
          } else {
            console.log("No profile selected, keeping profiles unselected");
            resolve(null);
          }
        }
      );
    });
  } catch (error) {
    console.error("Error selecting profile:", error);
    return null;
  }
}

async function updateProfiles(manual = false) {
  let currentProfileId = await getCurrentProfileId();
  if (!currentProfileId && manual) {
    console.log("No valid profileId, sending profiles for selection");
    const profiles = await fetch("http://localhost:3000/profiles").then((res) =>
      res.json()
    );
    console.log("Profiles for selection:", profiles);
    chrome.runtime.sendMessage({
      action: "selectProfile",
      profiles: profiles.map((p) => ({
        profileId: p.profileId,
        profileName: p.profileName,
      })),
    });
    return profiles;
  }

  if (!currentProfileId) {
    console.log("No valid profileId, returning empty profiles");
    chrome.runtime.sendMessage({ action: "updateProfiles", profiles: [] });
    return [];
  }

  const tabs = await new Promise((resolve) => {
    chrome.tabs.query({ currentWindow: true }, resolve);
  });
  const validTabs = tabs.filter(
    (tab) =>
      tab.title &&
      tab.url &&
      !tab.url.startsWith("chrome://") &&
      !tab.url.startsWith("file://") &&
      !tab.url.startsWith("chrome-extension://") &&
      tab.status === "complete"
  );
  console.log(
    "Current valid tabs:",
    validTabs.map((t) => ({ id: t.id, title: t.title, url: t.url }))
  );

  let currentProfileName = "Unknown Profile";
  try {
    const response = await fetch(
      `http://localhost:3000/profile-name?profileId=${currentProfileId}`
    );
    console.log(
      "Response from /profile-name:",
      response.status,
      response.statusText
    );
    if (response.ok) {
      const { profileName } = await response.json();
      currentProfileName = profileName || "Unknown Profile";
    }
  } catch (error) {
    console.error("Error fetching profile name:", error);
  }

  console.log("Profile info:", {
    currentProfileId,
    currentProfileName,
    tabCount: validTabs.length,
  });

  try {
    const postResponse = await fetch("http://localhost:3000/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId: currentProfileId,
        profileName: currentProfileName,
        userId: currentProfileId,
        tabs: validTabs.map((tab) => ({
          id: tab.id,
          title: tab.title || "Untitled",
          url: tab.url,
        })),
      }),
    });
    console.log(
      "POST /profiles response:",
      postResponse.status,
      postResponse.statusText
    );
    if (!postResponse.ok) {
      const errorText = await postResponse.text();
      console.error("POST /profiles error details:", errorText);
      throw new Error(
        `POST /profiles failed: ${postResponse.statusText} (${errorText})`
      );
    }

    const response = await fetch(
      `http://localhost:3000/profiles?currentProfileId=${currentProfileId}`
    );
    console.log(
      "GET /profiles response:",
      response.status,
      response.statusText
    );
    if (!response.ok) {
      throw new Error(`GET /profiles failed: ${response.statusText}`);
    }
    const profiles = await response.json();
    console.log("Received profiles:", profiles);
    // Проверяем, что профили содержат вкладки, прежде чем отправлять
    if (
      profiles.length > 0 &&
      profiles.some((p) => p.tabs && p.tabs.length > 0)
    ) {
      chrome.runtime.sendMessage({ action: "updateProfiles", profiles });
    } else {
      console.warn("No tabs in profiles, delaying update");
      // Можно добавить повторный запрос через небольшую задержку
      setTimeout(() => updateProfiles(manual), 1000);
    }
    return profiles;
  } catch (error) {
    console.error("Error updating profiles:", error.message);
    const response = await fetch(
      `http://localhost:3000/profiles?currentProfileId=${currentProfileId}`
    );
    if (response.ok) {
      const profiles = await response.json();
      console.log("Fallback profiles:", profiles);
      chrome.runtime.sendMessage({ action: "updateProfiles", profiles });
      return profiles;
    }
    chrome.runtime.sendMessage({ action: "updateProfiles", profiles: [] });
    return [];
  }
}

async function savePage(tabId, url, title) {
  try {
    if (!tabId || typeof tabId !== "number") {
      console.error("Invalid tabId:", tabId);
      return { error: "Invalid tabId" };
    }

    if (
      !url ||
      url.startsWith("chrome://") ||
      url.startsWith("file://") ||
      url.startsWith("chrome-extension://")
    ) {
      console.warn("Restricted or invalid URL:", url);
      return { error: "Cannot save page: Invalid or restricted URL" };
    }

    console.log("Saving page with tabId:", tabId, "url:", url, "title:", title);

    const tab = await new Promise((resolve) => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          console.error("Tab not found:", chrome.runtime.lastError.message);
          resolve(null);
        } else {
          resolve(tab);
        }
      });
    });

    if (!tab) {
      return { error: `Tab with ID ${tabId} not found` };
    }

    if (tab.status !== "complete" || tab.discarded) {
      console.log(
        `Tab ${tabId} not fully loaded (status: ${tab.status}, discarded: ${tab.discarded}), reloading`
      );
      await new Promise((resolve, reject) => {
        chrome.tabs.reload(tabId, {}, () => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error reloading tab:",
              chrome.runtime.lastError.message
            );
            reject(new Error("Failed to reload tab"));
          } else {
            chrome.tabs.onUpdated.addListener(function listener(
              tabIdUpdated,
              changeInfo
            ) {
              if (tabIdUpdated === tabId && changeInfo.status === "complete") {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
              }
            });
          }
        });
      });
      const updatedTab = await new Promise((resolve) => {
        chrome.tabs.get(tabId, resolve);
      });
      if (!updatedTab || updatedTab.status !== "complete") {
        return { error: `Tab with ID ${tabId} not fully loaded after reload` };
      }
    }

    const mhtmlData = await new Promise((resolve, reject) => {
      chrome.pageCapture.saveAsMHTML({ tabId }, (data) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (!data) {
          reject(new Error("No MHTML data returned"));
        } else {
          resolve(data);
        }
      });
    });

    const mhtmlSizeMB = mhtmlData.size / (1024 * 1024);
    const maxSizeMB = 50;
    if (mhtmlSizeMB > maxSizeMB) {
      console.error(
        `MHTML size (${mhtmlSizeMB.toFixed(
          2
        )} MB) exceeds limit (${maxSizeMB} MB)`
      );
      return {
        error: `Page too large (${mhtmlSizeMB.toFixed(
          2
        )} MB). Maximum allowed is ${maxSizeMB} MB.`,
      };
    }
    if (mhtmlSizeMB < 0.001) {
      console.error(
        "MHTML data is empty or too small:",
        mhtmlSizeMB.toFixed(4),
        "MB"
      );
      return {
        error: "Failed to save page: Page content is empty or not loaded",
      };
    }

    const reader = new FileReader();
    const dataUrl = await new Promise((resolve) => {
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.readAsDataURL(mhtmlData);
    });

    const profileId = await getCurrentProfileId();
    if (!profileId) {
      return { error: "No valid profile selected" };
    }

    const response = await fetch("http://localhost:3000/save-page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        title: title || "Untitled",
        mhtmlData: dataUrl,
        profileId,
      }),
    });

    console.log("Save page response:", response.status, response.statusText);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to save page: ${response.statusText} (${errorText})`
      );
    }

    const result = await response.json();
    if (!result.id || !result.fileName) {
      throw new Error("Invalid server response: Missing id or fileName");
    }

    await updateProfiles(true);
    return { success: true, ...result };
  } catch (error) {
    console.error("Error saving page:", error.message);
    return { error: error.message };
  }
}

async function openInProfile(url, profileId) {
  try {
    const currentProfileId = await getCurrentProfileId();
    if (!currentProfileId) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon.png",
        title: "Error",
        message: "No valid profile selected. Please select a profile.",
      });
      return { error: "No valid profile selected" };
    }

    if (profileId.toLowerCase() === currentProfileId) {
      chrome.windows.create({ url, type: "normal" }, (window) => {
        if (chrome.runtime.lastError) {
          console.error("Error creating window:", chrome.runtime.lastError);
          chrome.notifications.create({
            type: "basic",
            iconUrl: "icon.png",
            title: "Error",
            message: `Failed to open URL: ${chrome.runtime.lastError.message}`,
          });
        } else {
          console.log("Successfully opened URL in current profile:", url);
        }
      });
      return { success: true };
    }

    // Получаем профили для определения profileDir
    const profilesResponse = await fetch(
      `http://localhost:3000/profiles?currentProfileId=${currentProfileId}`
    );
    if (!profilesResponse.ok) {
      throw new Error(
        `Failed to fetch profiles: ${profilesResponse.statusText}`
      );
    }
    const profiles = await profilesResponse.json();
    const targetProfile = profiles.find(
      (p) => p.profileId.toLowerCase() === profileId.toLowerCase()
    );
    if (!targetProfile) {
      throw new Error(`Profile ${profileId} not found`);
    }
    const profileDir = targetProfile.profileDir || "Default";

    // Проверяем существующие окна (упрощённая проверка, так как tabs.url не содержит --profile-directory)
    const windows = await new Promise((resolve) =>
      chrome.windows.getAll({ populate: true }, resolve)
    );
    let targetWindow = null;
    for (const win of windows) {
      // Поскольку tabs.url не содержит информацию о профиле, полагаемся на server.js
      // Альтернативно, можно добавить дополнительную логику проверки через сервер
      if (win.tabs.some((tab) => tab.url === url)) {
        targetWindow = win;
        break;
      }
    }

    if (targetWindow) {
      chrome.tabs.create({ windowId: targetWindow.id, url }, (tab) => {
        if (chrome.runtime.lastError) {
          console.error("Error creating tab:", chrome.runtime.lastError);
          chrome.notifications.create({
            type: "basic",
            iconUrl: "icon.png",
            title: "Error",
            message: `Failed to open URL: ${chrome.runtime.lastError.message}`,
          });
        } else {
          console.log("Successfully opened URL in existing window:", url);
        }
      });
      return { success: true };
    }
  } catch (error) {
    console.error("Error opening in profile:", error);
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon.png",
      title: "Error",
      message: `Error opening URL: ${error.message}`,
    });
    return { error: error.message };
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Received message:", request);
  if (request.action === "getProfiles") {
    updateProfiles(true)
      .then((profiles) => {
        console.log("Sending profiles to UI:", profiles);
        sendResponse({ profiles });
      })
      .catch((error) => {
        console.error("Error in getProfiles:", error);
        sendResponse({ error: error.message });
      });
    return true;
  } else if (request.action === "savePage") {
    savePage(request.tabId, request.url, request.title)
      .then((result) => {
        console.log("Save page result:", result);
        sendResponse({ success: !!result.success, ...result });
      })
      .catch((error) => {
        console.error("Error in savePage:", error);
        sendResponse({ error: error.message });
      });
    return true;
  } else if (request.action === "getSavedPages") {
    fetch("http://localhost:3000/saved-pages")
      .then((res) => res.json())
      .then((savedPages) => {
        console.log("Sending saved pages:", savedPages);
        sendResponse({ savedPages });
      })
      .catch((error) => {
        console.error("Error fetching saved pages:", error);
        sendResponse({ error: error.message });
      });
    return true;
  } else if (request.action === "deleteSavedPage") {
    fetch("http://localhost:3000/saved-page", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: request.url, id: request.id }),
    })
      .then(() => {
        console.log("Deleted saved page:", request.id);
        sendResponse({ success: true });
        updateProfiles(true);
      })
      .catch((error) => {
        console.error("Error deleting saved page:", error);
        sendResponse({ error: error.message });
      });
    return true;
  } else if (request.action === "openWindow") {
    openInProfile(request.url, request.profileId)
      .then(() => {
        console.log("Opened window for URL:", request.url);
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error("Error in openWindow:", error);
        sendResponse({ error: error.message });
      });
    return true;
  } else if (request.action === "openSavedPage") {
    const { filePath } = request;
    console.log("Opening saved page:", filePath);
    if (!filePath || !filePath.startsWith("file://")) {
      console.error("Invalid filePath:", filePath);
      sendResponse({ error: "Invalid file path" });
      return true;
    }
    chrome.tabs.create({ url: filePath }, () => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error opening saved page:",
          chrome.runtime.lastError.message
        );
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        console.log("Successfully opened saved page:", filePath);
        sendResponse({ success: true });
      }
    });
    return true;
  } else if (request.action === "selectProfile") {
    console.log(
      "Sending selectProfile message with profiles:",
      request.profiles
    );
    sendResponse({ status: "selector shown" });
    return true;
  } else if (request.action === "selectProfileResponse") {
    const selectedProfileId = request.selectedProfileId?.toLowerCase();
    console.log("Received selectProfileResponse:", selectedProfileId);
    if (selectedProfileId) {
      chrome.storage.local.set({ profileId: selectedProfileId }, () => {
        console.log("Stored selected profileId:", selectedProfileId);
        updateProfiles(true)
          .then((profiles) => {
            console.log("Sending updated profiles after selection:", profiles);
            sendResponse({ profiles });
          })
          .catch((error) => {
            console.error("Error in selectProfileResponse:", error);
            sendResponse({ error: error.message });
          });
      });
    } else {
      chrome.storage.local.remove("profileId", () => {
        console.log("Cleared profileId from storage");
        updateProfiles(true)
          .then((profiles) => {
            sendResponse({ profiles });
          })
          .catch((error) => {
            console.error("Error in selectProfileResponse:", error);
            sendResponse({ error: error.message });
          });
      });
    }
    return true;
  }
  sendResponse({ error: "Unknown action" });
  return false;
});

chrome.windows.onCreated.addListener(() => {
  console.log("Window created, checking if profile update is needed");
  // Вызываем updateProfiles только если есть активный профиль
  getCurrentProfileId().then((currentProfileId) => {
    if (currentProfileId) {
      updateProfiles(true);
    } else {
      console.log("No active profile, skipping profile update");
    }
  });
});

chrome.runtime.onStartup.addListener(() => {
  console.log("Runtime startup, loading profiles");
  updateProfiles(true);
});

chrome.windows.onCreated.addListener(() => {
  console.log("Window created, loading profiles");
  updateProfiles(true);
});

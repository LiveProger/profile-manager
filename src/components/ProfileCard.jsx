import React, { useContext, useEffect, useRef, useState } from "react";
import { ProfileContext } from "../context/ProfileContext.jsx";

const ProfileCard = ({ profile, fetchSavedPages }) => {
  const { refreshProfiles } = useContext(ProfileContext);
  const [openMenus, setOpenMenus] = useState({});
  const menuRefs = useRef({});

  // Проверка, можно ли сохранить URL
  const isRestrictedUrl = (url) => {
    return (
      url.startsWith("chrome://") ||
      url.startsWith("chrome-extension://") ||
      url.startsWith("file://")
    );
  };

  const openNewWindow = (url, profileId) => {
    console.log("Opening URL in profile:", { url, profileId });
    chrome.runtime.sendMessage(
      { action: "openWindow", url, profileId },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error opening URL:", chrome.runtime.lastError);
          alert("Failed to open URL: " + chrome.runtime.lastError.message);
        } else if (response?.success) {
          console.log("Successfully opened URL:", url);
          // refreshProfiles();
        } else {
          console.error("Failed to open URL:", response);
          alert("Failed to open URL: " + (response?.error || "Unknown error"));
        }
      }
    );
  };

  const savePage = (tabId, url, title) => {
    console.log("Attempting to save page:", {
      tabId,
      url,
      title,
      isTabIdNumber: typeof tabId === "number",
    });
    chrome.runtime.sendMessage(
      { action: "savePage", tabId, url, title },
      (response) => {
        console.log("Save page response:", response);
        if (response?.success) {
          refreshProfiles();
          fetchSavedPages();
          alert("Page saved successfully!");
        } else if (response?.error) {
          alert(`Failed to save page: ${response.error}`);
        } else {
          alert("Failed to save page: Unknown error");
        }
      }
    );
  };

  const toggleMenu = (tabIndex) => {
    setOpenMenus((prev) => ({ ...prev, [tabIndex]: !prev[tabIndex] }));
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.keys(menuRefs.current).forEach((index) => {
        if (
          menuRefs.current[index] &&
          !menuRefs.current[index].contains(event.target) &&
          !event.target.closest(".delete-button")
        ) {
          setOpenMenus((prev) => ({ ...prev, [index]: false }));
        }
      });
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  console.log(
    "ProfileCard rendering for profile:",
    profile.profileName,
    "tabs:",
    profile.tabs
  );

  const openSavedPage = (id, filePath) => {
    console.log("Opening saved page:", { id, filePath });
    chrome.runtime.sendMessage(
      { action: "openSavedPage", id, filePath },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error opening saved page:", chrome.runtime.lastError);
          alert(
            "Failed to open saved page: " + chrome.runtime.lastError.message
          );
        } else if (response?.success) {
          console.log("Successfully opened saved page:", filePath);
        } else {
          console.error("Failed to open saved page:", response);
          alert(
            "Failed to open saved page: " + (response?.error || "Unknown error")
          );
        }
      }
    );
  };

  const deleteSavedPage = (url, id) => {
    chrome.runtime.sendMessage(
      { action: "deleteSavedPage", url, id },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error deleting saved page:", chrome.runtime.lastError);
          alert(
            "Failed to delete saved page: " + chrome.runtime.lastError.message
          );
        } else if (response?.success) {
          console.log("Successfully deleted saved page:", id);
          refreshProfiles();
          fetchSavedPages();
        } else {
          console.error("Failed to delete saved page:", response);
          alert(
            "Failed to delete saved page: " +
              (response?.error || "Unknown error")
          );
        }
      }
    );
  };

  return (
    <div
      className={`bg-white p-4 rounded shadow mb-4 ${
        profile.isCurrent ? "border-2 border-blue-500" : ""
      }`}
    >
      <h2 className="text-lg font-semibold mb-2">
        {profile.profileName} {profile.isCurrent && "(Current)"}
      </h2>
      <div className="mt-4">
        <h3 className="font-medium mb-2">Tabs:</h3>
        <ul className="list-disc pl-5 space-y-2">
          {profile.tabs.length === 0 && <li>No tabs available.</li>}
          {profile.tabs.map((tab, index) => (
            <li key={index} className="flex items-center space-x-2">
              <div className="flex-1">
                <a
                  href="#"
                  className="text-blue-600 hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    openNewWindow(tab.url, profile.profileId);
                  }}
                >
                  {tab.title || "Untitled"}
                </a>
                <p className="text-xs text-gray-500">{tab.url}</p>
              </div>
              <button
                className="bg-blue-500 text-white px-2 py-1 rounded text-sm hover:bg-blue-600"
                onClick={() => openNewWindow(tab.url, profile.profileId)}
              >
                Open
              </button>
              <button
                className={`px-2 py-1 rounded text-sm text-white ${
                  isRestrictedUrl(tab.url)
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-500 hover:bg-green-600"
                }`}
                onClick={() => savePage(tab.id, tab.url, tab.title)}
                disabled={isRestrictedUrl(tab.url)}
                title={
                  isRestrictedUrl(tab.url)
                    ? "Cannot save internal Chrome or extension pages"
                    : "Save page"
                }
              >
                Save
              </button>
              {tab.savedVersions?.length > 0 && (
                <div className="relative">
                  <button
                    className="text-gray-600 hover:text-gray-800"
                    onClick={() => toggleMenu(index)}
                    title="Open saved page"
                  >
                    📄
                  </button>
                  {openMenus[index] && (
                    <div
                      ref={(el) => (menuRefs.current[index] = el)}
                      className="absolute z-10 bg-white shadow-lg rounded p-2 mt-1 w-64 max-h-[300px] overflow-y-auto"
                    >
                      <ul className="space-y-1">
                        {tab.savedVersions.map((version, vIndex) => (
                          <li
                            key={vIndex}
                            className="flex items-center justify-between text-sm"
                          >
                            <a
                              href="#"
                              className="flex-1 hover:underline"
                              onClick={(e) => {
                                e.preventDefault();
                                openSavedPage(version.id, version.filePath);
                                toggleMenu(index);
                              }}
                            >
                              {version.fileName} (
                              {new Date(version.timestamp).toLocaleString()})
                            </a>
                            <button
                              className="text-red-500 hover:text-red-600 delete-button"
                              onClick={() => {
                                deleteSavedPage(tab.url, version.id);
                              }}
                            >
                              🗑️
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ProfileCard;

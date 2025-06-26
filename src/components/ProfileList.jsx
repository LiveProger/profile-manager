import React, { useContext, useState, useEffect } from "react";
import { ProfileContext } from "../context/ProfileContext.jsx";
import ProfileCard from "./ProfileCard.jsx";

const ProfileList = () => {
  const { profiles, refreshProfiles } = useContext(ProfileContext);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [savedPages, setSavedPages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [availableProfiles, setAvailableProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");

  const fetchSavedPages = () => {
    setIsLoading(true);
    chrome.runtime.sendMessage({ action: "getSavedPages" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error fetching saved pages:", chrome.runtime.lastError);
        alert(
          "Failed to fetch saved pages: " + chrome.runtime.lastError.message
        );
        setSavedPages([]);
      } else {
        console.log("Fetched saved pages:", response.savedPages);
        setSavedPages(response.savedPages || []);
      }
      setIsLoading(false);
    });
  };

  const handleRefresh = () => {
    setIsLoading(true);
    refreshProfiles(() => {
      setIsLoading(false);
      console.log("Profiles after refresh:", profiles);
      if (profiles.length === 0) {
        alert(
          "No profiles found. Please ensure Chrome profiles are set up and synced."
        );
      }
    });
  };

  const handleProfileSelect = (profileId) => {
    console.log("Selected profileId in UI:", profileId);
    setSelectedProfileId(profileId);
    if (profileId) {
      chrome.storage.local.set({ profileId: profileId.toLowerCase() }, () => {
        console.log("Stored selected profileId:", profileId);
        chrome.runtime.sendMessage(
          { action: "selectProfileResponse", selectedProfileId: profileId },
          (response) => {
            console.log("Response from selectProfileResponse:", response);
            if (response.profiles) {
              setAvailableProfiles(response.profiles);
              refreshProfiles();
            } else {
              console.error("No profiles received after selection");
              setAvailableProfiles([]);
            }
          }
        );
      });
    } else {
      chrome.storage.local.remove("profileId", () => {
        console.log("Cleared profileId from storage");
        chrome.runtime.sendMessage({ action: "getProfiles" }, (response) => {
          console.log("Profiles after clearing selection:", response.profiles);
          setAvailableProfiles(response.profiles || []);
          refreshProfiles();
        });
      });
    }
  };

  const openSavedPage = (id, filePath) => {
    console.log("Attempting to open saved page:", { id, filePath });
    if (!filePath) {
      console.error("Invalid filePath for saved page:", id);
      alert("Cannot open saved page: Invalid file path");
      return;
    }
    chrome.runtime.sendMessage(
      { action: "openSavedPage", id, filePath },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error opening saved page:", chrome.runtime.lastError);
          alert(
            "Failed to open saved page: " + chrome.runtime.lastError.message
          );
        } else if (response.success) {
          console.log("Successfully opened saved page:", id);
        } else {
          console.error("Failed to open saved page:", response);
          alert("Failed to open saved page");
        }
      }
    );
  };

  useEffect(() => {
    console.log("ProfileList useEffect triggered");
    // Загружаем сохранённый profileId
    chrome.storage.local.get(["profileId"], (result) => {
      console.log("Stored profileId:", result.profileId);
      if (result.profileId) {
        setSelectedProfileId(result.profileId.toLowerCase());
      } else {
        setSelectedProfileId("");
      }
    });

    // Загружаем профили
    chrome.runtime.sendMessage({ action: "getProfiles" }, (response) => {
      console.log("Initial profiles response:", response);
      if (response.profiles) {
        console.log("Setting available profiles:", response.profiles);
        setAvailableProfiles(response.profiles);
        // Синхронизируем selectedProfileId с профилями
        chrome.storage.local.get(["profileId"], (result) => {
          const storedProfileId = result.profileId?.toLowerCase();
          if (
            storedProfileId &&
            response.profiles.some(
              (p) => p.profileId.toLowerCase() === storedProfileId
            )
          ) {
            setSelectedProfileId(storedProfileId);
          } else {
            console.warn("Stored profileId not found in profiles, resetting");
            setSelectedProfileId("");
            chrome.storage.local.remove("profileId");
          }
        });
      } else {
        console.error("No profiles received in initial getProfiles");
        setAvailableProfiles([]);
        setSelectedProfileId("");
      }
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log("Received message in ProfileList:", request);
      if (request.action === "selectProfile") {
        console.log(
          "Setting available profiles from selectProfile:",
          request.profiles
        );
        setAvailableProfiles(request.profiles || []);
        // Проверяем, соответствует ли текущий selectedProfileId
        chrome.storage.local.get(["profileId"], (result) => {
          const storedProfileId = result.profileId?.toLowerCase();
          if (
            storedProfileId &&
            !request.profiles.some(
              (p) => p.profileId.toLowerCase() === storedProfileId
            )
          ) {
            console.warn("Stored profileId not in new profiles, resetting");
            setSelectedProfileId("");
            chrome.storage.local.remove("profileId");
          }
        });
        sendResponse({ status: "selector shown" });
      }
      return true;
    });

    return () => {
      chrome.runtime.onMessage.removeListener();
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      {isLoading && (
        <div className="flex items-center space-x-2 mb-4">
          <svg
            className="animate-spin h-5 w-5 text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Loading profiles...</span>
        </div>
      )}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Profile and Tabs</h1>
        <button
          className="text-gray-600 h-6"
          onClick={() => {
            setIsSettingsOpen(!isSettingsOpen);
            if (!isSettingsOpen) fetchSavedPages();
          }}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      <div className="bg-white p-4 rounded shadow mb-4">
        <h2 className="text-lg font-semibold mb-2">Select Current Profile</h2>
        {availableProfiles.length === 0 && (
          <p className="text-red-500">
            No profiles available. Please check server connection or Chrome
            profiles.
          </p>
        )}
        <select
          value={selectedProfileId}
          onChange={(e) => handleProfileSelect(e.target.value)}
          className="border p-2 rounded w-full"
          disabled={isLoading || availableProfiles.length === 0}
        >
          <option value="">Select a profile</option>
          {availableProfiles.map((profile) => (
            <option key={profile.profileId} value={profile.profileId}>
              {profile.profileName}
            </option>
          ))}
        </select>
      </div>

      {isSettingsOpen && (
        <div className="bg-white p-4 rounded shadow mb-4">
          <h2 className="text-lg font-semibold mb-2">Saved Pages</h2>
          <button
            className="bg-red-500 text-white px-4 py-2 rounded mb-4 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => {
              savedPages.forEach((page) => {
                chrome.runtime.sendMessage(
                  { action: "deleteSavedPage", url: page.url, id: page.id },
                  () => {
                    fetchSavedPages();
                    refreshProfiles();
                  }
                );
              });
            }}
            disabled={isLoading || savedPages.length === 0}
          >
            Delete All
          </button>
          {isLoading && (
            <div className="flex items-center space-x-2">
              <svg
                className="animate-spin h-5 w-5 text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Loading...</span>
            </div>
          )}
          {!isLoading && savedPages.length === 0 && (
            <p>No saved pages found.</p>
          )}
          {!isLoading &&
            savedPages.map((page) => (
              <div
                key={page.id}
                className="flex justify-between items-center p-2 border-b"
              >
                <div>
                  <p className="font-medium">{page.title || "Untitled"}</p>
                  <p className="text-sm text-gray-500">
                    {page.url || "No URL"}
                  </p>
                  <p className="text-sm text-gray-500">{page.timestamp}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    className="text-blue-500 hover:underline"
                    onClick={() => openSavedPage(page.id, page.filePath)}
                  >
                    Open
                  </button>
                  <button
                    className="text-red-500 hover:underline"
                    onClick={() => {
                      chrome.runtime.sendMessage(
                        {
                          action: "deleteSavedPage",
                          url: page.url,
                          id: page.id,
                        },
                        () => {
                          fetchSavedPages();
                          refreshProfiles();
                        }
                      );
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {profiles.map((profile) => (
        <ProfileCard key={profile.profileId} profile={profile} />
      ))}
    </div>
  );
};

export default ProfileList;

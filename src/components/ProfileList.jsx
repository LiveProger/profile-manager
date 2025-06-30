import { useContext, useState, useEffect, useMemo, useRef } from "react";
import { ProfileContext } from "../context/ProfileContext.jsx";
import ProfileCard from "./ProfileCard.jsx";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import toastPromise from "./toastPromise.jsx";

const ProfileList = () => {
  const { profiles, refreshProfiles } = useContext(ProfileContext);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [savedPages, setSavedPages] = useState([]);
  const [pendingSavedPages, setPendingSavedPages] = useState(null);
  const [availableProfiles, setAvailableProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [settingsAnimation, setSettingsAnimation] = useState("");
  const [isContentVisible, setIsContentVisible] = useState(false);
  const settingsPanelRef = useRef(null);
  const menuButtonRef = useRef(null);
  const isToggling = useRef(false);

  const getSavedPages = () => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: "getSavedPages" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error fetching saved pages:",
            chrome.runtime.lastError.message
          );
          reject(
            new Error(
              `Failed to fetch saved pages: ${chrome.runtime.lastError.message}`
            )
          );
        } else {
          console.log("Fetched saved pages:", response.savedPages);
          resolve(response.savedPages || []);
        }
      });
    });
  };

  const fetchSavedPages = async () => {
    setIsLoading(true);
    try {
      await refreshProfiles();
      const savedPages = await getSavedPages();
      setPendingSavedPages(savedPages);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const displayedSavedPages = useMemo(() => {
    if (pendingSavedPages !== null) {
      const isEqual =
        pendingSavedPages.length === savedPages.length &&
        pendingSavedPages.every((page, i) => page.id === savedPages[i]?.id);
      if (!isEqual) {
        console.log("Updating savedPages:", pendingSavedPages);
        setSavedPages(pendingSavedPages);
        return pendingSavedPages;
      }
    }
    return savedPages;
  }, [pendingSavedPages, savedPages]);

  const handleProfileSelect = async (profileId) => {
    setIsLoading(true);
    try {
      setSelectedProfileId(profileId);
      if (profileId) {
        await new Promise((resolve, reject) => {
          chrome.storage.local.set(
            { profileId: profileId.toLowerCase() },
            () => {
              chrome.runtime.sendMessage(
                {
                  action: "selectProfileResponse",
                  selectedProfileId: profileId,
                },
                (response) => {
                  if (chrome.runtime.lastError) {
                    reject(
                      new Error(
                        `Failed to select profile: ${chrome.runtime.lastError.message}`
                      )
                    );
                  } else {
                    resolve();
                  }
                }
              );
            }
          );
        });
        await toastPromise(
          refreshProfiles(),
          "Selecting profile...",
          "Current profile selected",
          "Failed to select profile"
        );
      } else {
        await new Promise((resolve, reject) => {
          chrome.storage.local.remove("profileId", () => {
            chrome.runtime.sendMessage(
              { action: "getProfiles" },
              (response) => {
                if (chrome.runtime.lastError) {
                  reject(
                    new Error(
                      `Failed to remove profile: ${chrome.runtime.lastError.message}`
                    )
                  );
                } else {
                  resolve();
                }
              }
            );
          });
        });
        await toastPromise(
          refreshProfiles(),
          "Updating profiles...",
          "Profiles updated",
          "Failed to update profiles"
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshProfiles = async () => {
    setIsLoading(true);
    try {
      await toastPromise(
        refreshProfiles(),
        "Updating profiles...",
        "Profiles updated",
        "Failed to update profiles"
      );
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAllPages = async () => {
    if (displayedSavedPages.length === 0) return;
    setIsLoading(true);
    try {
      const results = await Promise.all(
        displayedSavedPages.map(
          (page) =>
            new Promise((resolve, reject) => {
              chrome.runtime.sendMessage(
                { action: "deleteSavedPage", url: page.url, id: page.id },
                (response) => {
                  if (chrome.runtime.lastError || !response.success) {
                    reject(new Error(`Failed to delete page ${page.id}`));
                  } else {
                    resolve();
                  }
                }
              );
            })
        )
      );
      await toastPromise(
        refreshProfiles(),
        "Updating profiles...",
        "All pages deleted",
        `Failed to delete some pages`
      );
      await fetchSavedPages();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    chrome.storage.local.get(["profileId"], (result) => {
      setSelectedProfileId(result.profileId?.toLowerCase() || "");
    });

    const messageListener = (request, sender, sendResponse) => {
      if (request.action === "selectProfile") {
        setAvailableProfiles(
          request.profiles.map((p) => ({
            profileId: p.profileId,
            profileName: p.profileName,
          }))
        );
        sendResponse({ status: "selector shown" });
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, []);

  useEffect(() => {
    if (isToggling.current) return;
    if (isSettingsOpen) {
      console.log("Opening settings panel, isSettingsOpen:", true);
      setSettingsAnimation("settings-panel-enter");
      const timeout = setTimeout(() => {
        setIsContentVisible(true);
        fetchSavedPages();
      }, 300);
      return () => clearTimeout(timeout);
    } else if (settingsAnimation) {
      console.log("Closing settings panel, isSettingsOpen:", false);
      setSettingsAnimation("settings-panel-exit");
      setIsContentVisible(false);
      const timeout = setTimeout(() => setSettingsAnimation(""), 300);
      return () => clearTimeout(timeout);
    }
  }, [isSettingsOpen]);

  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleClickOutside = (e) => {
      if (
        settingsPanelRef.current &&
        !settingsPanelRef.current.contains(e.target) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(e.target)
      ) {
        console.log("Click outside, closing settings panel");
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isSettingsOpen]);

  return (
    <div className="max-w-4xl mx-auto p-6 relative">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Profile and Tabs</h1>
        <div className="flex gap-2">
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            onClick={handleRefreshProfiles}
            disabled={isLoading}
          >
            Refresh Profiles
          </button>
          <button
            ref={menuButtonRef}
            className="text-gray-600 h-6"
            onClick={() => {
              if (isToggling.current) return;
              isToggling.current = true;
              console.log(
                "Menu button clicked, toggling isSettingsOpen to:",
                !isSettingsOpen
              );
              setIsSettingsOpen(!isSettingsOpen);
              setTimeout(() => {
                isToggling.current = false;
              }, 300);
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
      </div>

      <div className="bg-white p-4 rounded shadow mb-4">
        <h2 className="text-lg font-semibold mb-2">Select Current Profile</h2>
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
        <div
          className={`settings-panel ${settingsAnimation}`}
          ref={settingsPanelRef}
        >
          <button
            className="close-button"
            onClick={() => {
              console.log("Close button clicked, closing settings panel");
              setIsSettingsOpen(false);
            }}
          >
            <svg
              className="w-5 h-5 text-gray-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <h2 className="text-lg font-semibold mb-2">Saved Pages</h2>
          <button
            className="bg-red-500 text-white px-4 py-2 rounded mb-4 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleDeleteAllPages}
            disabled={isLoading || displayedSavedPages.length === 0}
          >
            Delete All
          </button>
          <div className="card">
            {displayedSavedPages.length === 0 && <p>No saved pages found.</p>}
            {displayedSavedPages.map((page) => (
              <div
                key={page.id}
                className="flex justify-between items-center p-2 border |b"
              >
                <div className="row">
                  <p className="font-medium">{page.title || "Untitled"}</p>
                  <p className="text-sm text-gray-500">{page.url}</p>
                  <p className="text-sm text-gray-500">{page.timestamp}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    className="text-blue-500 hover:underline"
                    onClick={() => {
                      const openSavedPage = () =>
                        new Promise((resolve, reject) => {
                          chrome.runtime.sendMessage(
                            {
                              action: "openSavedPage",
                              id: page.id,
                              filePath: page.filePath,
                            },
                            (response) => {
                              if (
                                chrome.runtime.lastError ||
                                !response.success
                              ) {
                                reject(
                                  new Error(
                                    `Failed to open page: ${
                                      chrome.runtime.lastError?.message ||
                                      response.error
                                    }`
                                  )
                                );
                              } else {
                                resolve();
                              }
                            }
                          );
                        });
                      setIsLoading(true);
                      toastPromise(
                        openSavedPage(),
                        `Opening page: ${page.title || "Untitled"}...`,
                        `Opened page: ${page.title || "Untitled"}`,
                        `Failed to open page: ${page.title || "Untitled"}`
                      ).finally(() => setIsLoading(false));
                    }}
                  >
                    Open
                  </button>
                  <button
                    className="text-red-500 hover:underline"
                    onClick={() => {
                      const deleteSavedPage = () =>
                        new Promise((resolve, reject) => {
                          chrome.runtime.sendMessage(
                            {
                              action: "deleteSavedPage",
                              url: page.url,
                              id: page.id,
                            },
                            (response) => {
                              if (
                                chrome.runtime.lastError ||
                                !response.success
                              ) {
                                reject(
                                  new Error(
                                    `Failed to delete page: ${
                                      chrome.runtime.lastError?.message ||
                                      response.error
                                    }`
                                  )
                                );
                              } else {
                                resolve();
                              }
                            }
                          );
                        });
                      setIsLoading(true);
                      toastPromise(
                        deleteSavedPage().then(() => {
                          fetchSavedPages();
                          return refreshProfiles();
                        }),
                        `Deleting page: ${page.title || "Untitled"}...`,
                        `Deleted page: ${page.title || "Untitled"}`,
                        `Failed to delete page: ${page.title || "Untitled"}`
                      ).finally(() => setIsLoading(false));
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {profiles.map((profile) => (
        <ProfileCard
          key={profile.profileId}
          profile={profile}
          fetchSavedPages={fetchSavedPages}
          setIsLoading={setIsLoading}
        />
      ))}
    </div>
  );
};

export default ProfileList;

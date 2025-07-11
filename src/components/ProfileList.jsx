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
  const settingsPanelRef = useRef(null);
  const menuButtonRef = useRef(null);
  const isToggling = useRef(false);

  const sortedProfiles = useMemo(() => {
    return [...profiles].sort((a, b) => {
      if (a.isCurrent && !b.isCurrent) return -1;
      if (!a.isCurrent && b.isCurrent) return 1;
      return 0;
    });
  }, [profiles]);

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
              if (page.isOrphan) {
                chrome.runtime.sendMessage(
                  {
                    action: "deleteSavedPage",
                    url: page.url,
                    id: undefined,
                    filePath: page.filePath,
                  },
                  (response) => {
                    if (chrome.runtime.lastError || !response.success) {
                      reject(
                        new Error(
                          `Failed to delete page: ${
                            chrome.runtime.lastError?.message || response.error
                          }`
                        )
                      );
                    } else {
                      resolve();
                    }
                  }
                );
              } else {
                chrome.runtime.sendMessage(
                  {
                    action: "deleteSavedPage",
                    url: page.url,
                    id: page.id,
                  },
                  (response) => {
                    if (chrome.runtime.lastError || !response.success) {
                      reject(
                        new Error(
                          `Failed to delete page: ${
                            chrome.runtime.lastError?.message || response.error
                          }`
                        )
                      );
                    } else {
                      resolve();
                    }
                  }
                );
              }
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
    // Восстановление выбранного профиля
    chrome.storage.local.get(["profileId"], (result) => {
      setSelectedProfileId(result.profileId?.toLowerCase() || "");
    });

    // Явное получение списка профилей с runtime
    chrome.runtime.sendMessage({ action: "getProfiles" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Failed to get profiles:",
          chrome.runtime.lastError.message
        );
      } else if (response?.profiles) {
        setAvailableProfiles(
          response.profiles.map((p) => ({
            profileId: p.profileId,
            profileName: p.profileName,
          }))
        );
      }
    });

    fetchSavedPages();

    // Слушатель сообщений (оставляем для других ситуаций)
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
        fetchSavedPages();
      }, 300);
      return () => clearTimeout(timeout);
    } else if (settingsAnimation) {
      console.log("Closing settings panel, isSettingsOpen:", false);
      setSettingsAnimation("settings-panel-exit");
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

  const [showTip, setShowTip] = useState(false);
  const [savePath, setSavePath] = useState();

  useEffect(() => {
    chrome.storage.local.get(["showProfileTip"], (result) => {
      const value = result.showProfileTip;
      setShowTip(value !== false);
    });
    chrome.runtime.sendMessage({ action: "getSavePath" }, (response) => {
      console.log("Save path loaded from background:", response);

      if (response?.path) {
        setSavePath(response.path);
      } else {
        console.error("Failed to load save path:", response?.error);
      }
    });
  }, []);

  const handleSavePathChange = () => {
    setIsLoading(true);
    chrome.runtime.sendMessage(
      { action: "setSavePath", path: savePath },
      (res) => {
        setIsLoading(false);
        if (res?.success) {
          toast.success("Save path updated!");
        } else {
          toast.error("Failed to update save path");
        }
      }
    );
  };

  const hideTip = () => {
    setShowTip(false);
    chrome.storage.local.set({ showProfileTip: false });
  };

  const openTip = () => {
    setShowTip(true);
    chrome.storage.local.set({ showProfileTip: true });
  };

  const profileMap = useMemo(() => {
    const map = new Map();
    [...profiles, ...availableProfiles].forEach((p) => {
      if (p.profileId && p.profileName) {
        map.set(p.profileId.toLowerCase(), p.profileName);
      }
    });
    return map;
  }, [profiles, availableProfiles]);

  useEffect(() => {
    console.log("All saved pages:", displayedSavedPages);
    console.log(
      "Available profile IDs:",
      profiles.map((p) => p.profileId)
    );
  }, [displayedSavedPages, profiles]);

  const groupedSavedPages = useMemo(() => {
    const groups = {};
    displayedSavedPages.forEach((page) => {
      const profileId = page.profileId?.toLowerCase() || "__no_profile__";
      if (!groups[profileId]) {
        groups[profileId] = [];
      }
      groups[profileId].push(page);
    });
    return groups;
  }, [displayedSavedPages]);

  const [profileFilter, setProfileFilter] = useState("active");

  function getFilter() {
    chrome.runtime.sendMessage({ action: "getProfilesFilter" }, (response) => {
      console.log(13, response);
      if (response?.filter) {
        setProfileFilter(response?.filter);
      }
    });
  }
  useEffect(() => {
    getFilter();
  }, [profiles]);

  const handleFilterChange = (newFilter) => {
    setProfileFilter(newFilter);
    setIsLoading(true);
    fetch("http://localhost:3000/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "profileFilter", value: newFilter }),
    })
      .then(() => {
        // Вызываем refreshProfiles и синхронизируем selectedProfileId
        return refreshProfiles(newFilter).then(() => {
          chrome.storage.local.get(["profileId"], (result) => {
            setSelectedProfileId(result.profileId?.toLowerCase() || "");
            setIsLoading(false);
          });
        });
      })
      .catch((error) => {
        console.error("Ошибка при переключении фильтра:", error);
        setIsLoading(false);
      });
  };

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
        <h1 className="text-2xl font-bold">
          Profile and Tabs{" "}
          <button
            onClick={openTip}
            className="text-blue-600 hover:text-blue-800"
            title="Показать подсказку по открытию ссылок"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        </h1>
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

      {showTip && (
        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4 rounded shadow-md flex justify-between items-center">
          <p>
            This widget allows you to:
            <ul className="list-disc pl-5 mt-1">
              <li>Select and manage Chrome profiles</li>
              <li>View and open saved pages</li>
              <li>Delete saved pages or entire profiles</li>
              <li>Set the folder where pages are saved</li>
            </ul>
            <br />
            To install the backend server, download and run it from:
            <a
              href="https://github.com/LiveProger/profile-tabs-manager/releases"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline"
            >
              GitHub Releases
            </a>
            .
          </p>

          <button
            onClick={hideTip}
            className="text-blue-700 hover:text-blue-900 font-semibold"
          >
            Close
          </button>
        </div>
      )}

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
          <h2 className="text-lg font-semibold mb-2">Settings</h2>
          <h2 className="text-lg font-semibold mb-2">Save Directory</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Current save folder
            </label>
            <input
              type="text"
              value={savePath}
              onChange={(e) => setSavePath(e.target.value)}
              className="border p-2 rounded w-full"
              placeholder="Enter folder path"
            />
            <button
              className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              onClick={handleSavePathChange}
              disabled={isLoading}
            >
              Update Save Path
            </button>
          </div>

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
            {Object.entries(groupedSavedPages).map(([profileId, pages]) => (
              <div key={profileId} className="mb-6">
                <h3 className="text-md font-semibold text-gray-800 mb-2">
                  Profile:{" "}
                  <span className="text-blue-600">
                    {profileMap.get(profileId) || profileId}
                  </span>
                </h3>
                <div className="card space-y-2">
                  {pages.map((page) => (
                    <div
                      key={page.id}
                      className="flex justify-between items-center p-2 border rounded"
                    >
                      <div className="row">
                        <p className="font-medium">
                          {page.title || "Untitled"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {page.url || "No URL"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {page.timestamp
                            ? new Date(page.timestamp).toLocaleString()
                            : "Unknown date"}
                        </p>
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
                                if (page.isOrphan) {
                                  chrome.runtime.sendMessage(
                                    {
                                      action: "deleteSavedPage",
                                      url: page.url,
                                      id: undefined,
                                      filePath: page.filePath,
                                    },
                                    (response) => {
                                      if (
                                        chrome.runtime.lastError ||
                                        !response.success
                                      ) {
                                        reject(
                                          new Error(
                                            `Failed to delete page: ${
                                              chrome.runtime.lastError
                                                ?.message || response.error
                                            }`
                                          )
                                        );
                                      } else {
                                        resolve();
                                      }
                                    }
                                  );
                                } else {
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
                                              chrome.runtime.lastError
                                                ?.message || response.error
                                            }`
                                          )
                                        );
                                      } else {
                                        resolve();
                                      }
                                    }
                                  );
                                }
                              });
                            setIsLoading(true);
                            toastPromise(
                              deleteSavedPage().then(() => {
                                fetchSavedPages();
                                return refreshProfiles();
                              }),
                              `Deleting page: ${page.title || "Untitled"}...`,
                              `Deleted page: ${page.title || "Untitled"}`,
                              `Failed to delete page: ${
                                page.title || "Untitled"
                              }`
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
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => handleFilterChange("active")}
          className={`px-3 py-1 rounded ${
            profileFilter === "active"
              ? "bg-blue-500 text-white"
              : "bg-gray-200"
          }`}
        >
          Show Active
        </button>
        <button
          onClick={() => handleFilterChange("all")}
          className={`px-3 py-1 rounded ${
            profileFilter === "all" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
        >
          Show All
        </button>
      </div>

      {sortedProfiles.map((profile) => (
        <ProfileCard
          key={profile.profileId}
          profile={profile}
          fetchSavedPages={fetchSavedPages}
          setIsLoading={setIsLoading}
          onToggleHide={async (profileId, isHidden) => {
            await fetch("http://localhost:3000/profile/visibility", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ profileId, isHidden }),
            });
            refreshProfiles(profileFilter);
          }}
        />
      ))}
    </div>
  );
};

export default ProfileList;

import { createContext, useState, useEffect } from "react";

export const ProfileContext = createContext();

export const ProfileProvider = ({ children }) => {
  const [profiles, setProfiles] = useState([]);

  const refreshProfiles = (callback) => {
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage({ action: "getProfiles" }, (response) => {
        if (chrome.runtime.lastError) {
          if (callback) callback();
        } else {
          setProfiles(response.profiles || []);
          if (callback) callback();
        }
      });
    } else {
      setProfiles([
        {
          profileId: "mock1",
          profileName: "Mock Profile 1",
          tabs: [
            { id: 1, title: "Test Tab 1", url: "https://example.com" },
            { id: 2, title: "Test Tab 2", url: "https://example.org" },
          ],
        },
      ]);
      if (callback) callback();
    }
  };

  useEffect(() => {
    refreshProfiles();
  }, []);

  return (
    <ProfileContext.Provider value={{ profiles, refreshProfiles }}>
      {children}
    </ProfileContext.Provider>
  );
};
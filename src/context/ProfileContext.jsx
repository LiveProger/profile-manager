import React, { createContext, useState, useEffect } from "react";

export const ProfileContext = createContext();

export const ProfileProvider = ({ children }) => {
  const [profiles, setProfiles] = useState([]);

  const refreshProfiles = (callback) => {
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage({ action: "getProfiles" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error fetching profiles:", chrome.runtime.lastError);
          // Не сбрасываем profiles, оставляем текущее состояние
          if (callback) callback();
        } else {
          console.log("Setting profiles in context:", response.profiles || []);
          setProfiles(response.profiles || []);
          if (callback) callback();
        }
      });
    } else {
      console.warn("Chrome API is not available. Running in dev mode.");
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
    console.log("ProfileContext useEffect triggered");
    refreshProfiles();
  }, []);

  return (
    <ProfileContext.Provider value={{ profiles, refreshProfiles }}>
      {children}
    </ProfileContext.Provider>
  );
};

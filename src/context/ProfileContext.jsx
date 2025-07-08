import { createContext, useState, useEffect, useCallback } from "react";

export const ProfileContext = createContext();

export const ProfileProvider = ({ children }) => {
  const [profiles, setProfiles] = useState([]);

  const refreshProfiles = useCallback((filter) => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: "getProfiles", filter },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(
              new Error(
                `Failed to refresh profiles: ${chrome.runtime.lastError.message}`
              )
            );
          } else if (response?.profiles) {
            setProfiles(response.profiles);
            resolve("Profiles updated");
          } else {
            reject(
              new Error("Failed to refresh profiles: No profiles received")
            );
          }
        }
      );
    });
  }, []);

  useEffect(() => {
    refreshProfiles();
  }, []);

  return (
    <ProfileContext.Provider value={{ profiles, refreshProfiles }}>
      {children}
    </ProfileContext.Provider>
  );
};

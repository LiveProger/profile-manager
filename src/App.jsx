import { useState } from 'react'
import ProfileList from "./components/ProfileList.jsx";
import { ProfileProvider } from "./context/ProfileContext.jsx";


const App = () => (
  <ProfileProvider>
    <ProfileList />
  </ProfileProvider>
);

export default App

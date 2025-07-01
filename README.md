Profile and Tabs Manager
Welcome to Profile and Tabs Manager, a Chrome extension for managing Chrome profiles, tabs, and saving pages offline as MHTML files. The extension communicates with a local Node.js server via native messaging and allows configuration of the server port through the extension's interface (default: 3000). It replaces Chrome's new tab page with a custom interface for profile and tab management.
Choose Your Language

[English](README.en.md)
[Русский](README.ru.md)

For detailed instructions on installation, setup, server building, and publishing to the Chrome Web Store, please select your preferred language above.
Quick Start

Clone the Repository:
git clone https://github.com/LiveProger/profile-manager.git
cd profile-tabs-manager


Install Server Dependencies:
npm install


Run the Server:
npm start


Load the Extension:

Place extension files in the extension/ folder.
Open Chrome, go to chrome://extensions/, enable "Developer mode," and load the extension/ folder via "Load unpacked."
Open a new tab to access the extension's interface.



For more details, refer to the language-specific README files linked above.

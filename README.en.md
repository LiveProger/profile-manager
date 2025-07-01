Profile and Tabs Manager
A Chrome extension for managing Chrome profiles, tabs, and saving pages offline as MHTML files. The extension communicates with a local Node.js server via native messaging to manage profiles and tabs. The server port is configurable through the extension interface (default: 3000).
Features

Manage Chrome profiles and their tabs.
Save and open web pages as MHTML files.
Configure the server port via the extension interface.
Native messaging integration with a Node.js server.
Replaces Chrome's new tab page with the extension interface.

Prerequisites

Node.js: Version 18 or higher (LTS versions like v18.x.x or v20.x.x recommended).
npm: Version 8 or higher.
Google Chrome: Installed with user profiles configured.
SQLite3: For server-side data storage.
Git: For cloning the repository.

Installation
Server

Clone the Repository:
git clone https://github.com/your-username/profile-tabs-manager.git
cd profile-tabs-manager


Install Dependencies:
npm install


Set Up Environment Variables:Create a .env file in the project root:
PORT=3000

Ensure the port matches the extension's settings (default: 3000).

Configure Native Messaging:

Place com.example.chrome_profile_host.json in:
Windows: C:\Users\<YourUsername>\AppData\Local\Google\Chrome\User Data\NativeMessagingHosts
macOS: ~/Library/Application Support/Google/Chrome/NativeMessagingHosts
Linux: ~/.config/google-chrome/NativeMessagingHosts


Set the path to dist/profile-tabs-manager.exe (after building).
Update allowed_origins with your extension's ID:"allowed_origins": ["chrome-extension://<your-extension-id>/"]




Run the Server:
npm start



Extension

Prepare Extension Files:

Place files (manifest.json, index.html, main.jsx, App.jsx, ProfileContext.jsx, toastPromise.jsx, ProfileList.jsx, ProfileCard.jsx, background.js, index.css, icon16.png, icon48.png, icon128.png) in an extension/ folder.


Test Locally:

Open Chrome, go to chrome://extensions/.
Enable "Developer mode".
Click "Load unpacked" and select the extension/ folder.
Open a new tab to verify the interface.
Configure the server port in the settings panel (default: 3000).



Server Build

Install pkg:
npm install --save-dev pkg


Build Executable:
npm run build

Creates dist/profile-tabs-manager.exe for Windows using node18-win-x64.

Update com.example.chrome_profile_host.json:
"path": "C:\\Users\\<YourUsername>\\Desktop\\profile-tabs-manager\\dist\\profile-tabs-manager.exe"



Publishing to Chrome Web Store

Create ZIP Archive:
cd extension
zip -r ../extension.zip .


Create Developer Account:

Register at Chrome Developer Dashboard ($5 fee).
Upload extension.zip.


Fill in Details:

Name: "Profile and Tabs Manager".
Description: "Manage Chrome profiles, tabs, and save pages offline with a configurable server port."
Icons: Upload icon128.png.
Screenshots: Provide 1–5 images (1280x800 or 640x400).
Privacy Policy: Host privacy.html on a public URL (e.g., GitHub Pages).


Submit for Review:

After approval, update com.example.chrome_profile_host.json with the extension ID.



Development Setup

Server:
npm run dev

Uses nodemon for hot-reloading.

Extension:

Update files in extension/ and reload the extension in Chrome (chrome://extensions/).



Project Structure

Server:
server.js: Main server (Express, SQLite3).
.env: Server port configuration (default: 3000).
profiles.db: SQLite database.
SavedPages/: Directory for MHTML files.
dist/: Directory for compiled executables.


Extension:
manifest.json: Chrome extension manifest.
index.html, main.jsx, App.jsx, ProfileContext.jsx, toastPromise.jsx, ProfileList.jsx, ProfileCard.jsx: React components.
background.js: Background logic.
index.css: Styles (Tailwind CSS + custom).
icon16.png, icon48.png, icon128.png: Extension icons.



Scripts

npm start: Run the server.
npm run dev: Run the server with nodemon.
npm run build: Compile the server into an executable.

Dependencies

Server: express, sqlite3, uuid, dotenv.
Extension: react, react-dom, react-toastify, tailwindcss (via CDN).

Notes

The server port is configurable in the extension interface (default: 3000). Ensure it matches .env.
Use Node.js v18 or v20, as node19 is not supported by pkg.
A privacy policy is required for Chrome Web Store publication.

Troubleshooting

Server Not Responding:
Ensure the server is running (npm start).
Verify the port in .env matches the extension setting.


Build Errors:
Run npm rebuild sqlite3.
Use npx pkg --debug ....


Extension Not Loading:
Check manifest.json and icons.
Ensure all files are in extension/.



For more details, see the Chrome Native Messaging documentation.
Uploading to GitHub

Initialize Repository:
git init
git add .
git commit -m "Initial commit"


Create GitHub Repository:

Go to GitHub.
Create a repository (e.g., profile-tabs-manager).


Push to GitHub:
git remote add origin https://github.com/your-username/profile-tabs-manager.git
git branch -M main
git push -u origin main



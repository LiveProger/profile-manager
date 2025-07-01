Privacy Policy for Profile and Tabs Manager
Last Updated: July 1, 2025
Profile and Tabs Manager is a Chrome extension developed by LiveProger that allows users to manage Chrome profiles, tabs, and save web pages offline as MHTML files. This Privacy Policy explains how the extension collects, uses, stores, and protects your data. By using the extension, you agree to the terms outlined in this policy.
1. Information We Collect
The extension collects the following data to provide its core functionality:

Tab Data: URLs, titles, and metadata of browser tabs to display and manage them in the extension's interface.
Page Content: Web page content captured as MHTML files when you choose to save pages offline.
User Preferences: Settings such as the server port number (default: 3000) and the visibility state of the instructional tip, stored locally using chrome.storage.local.
Profile Data: Information about Chrome profiles (e.g., profile names, IDs) sent to a local Node.js server for storage and management.

All data is processed locally on your device and communicated to a local Node.js server running on http://localhost:3000. The server stores data in a local SQLite database (profiles.db) and a directory (SavedPages/) on your device.
2. How We Use Your Data
The collected data is used solely to provide the extension's functionality:

Tab Data: To display and organize tabs in the new tab interface and allow opening links in specific Chrome profiles via right-click context menus.
Page Content: To save web pages as MHTML files in the SavedPages/ directory for offline access.
User Preferences: To persist settings like the server port and instructional tip visibility across sessions.
Profile Data: To manage Chrome profiles, store tab information, and coordinate with the local server to launch Chrome with specific profiles.

No data is shared with third parties or transmitted to external servers. All processing occurs locally on your device.
3. Data Storage and Security

Local Storage: Tab data, page content (MHTML files), and profile data are stored locally on your device in the profiles.db SQLite database and SavedPages/ directory, managed by the local Node.js server. User preferences are stored in chrome.storage.local.
Security: Data remains on your device and is not transmitted over the internet. You are responsible for securing your device and the local server. Ensure the server is configured correctly (e.g., using port 3000) and that com.example.chrome_profile_host.json is set up as described in the repository.
Data Retention: Data persists until you manually delete the profiles.db file, SavedPages/ directory, or clear chrome.storage.local data via Chrome's settings.

4. Third-Party Services
The extension uses external scripts (e.g., Tailwind CSS, React) hosted on https://cdn.jsdelivr.net for its user interface, as specified in the content_security_policy in manifest.json. These scripts do not collect or process user data.
5. User Control and Choices
You have full control over your data:

Delete Data: Remove the profiles.db file or SavedPages/ directory to delete stored profile and page data. Clear chrome.storage.local via Chrome's settings (chrome://settings/clearBrowserData) to remove preferences.
Disable Features: Stop the local Node.js server to prevent data collection or processing by the extension.
Port Configuration: Configure the server port (default: 3000) via the extension's interface to ensure secure communication.

6. Compliance with Chrome Web Store Policies
This extension complies with the Chrome Web Store Program Policies. It uses permissions (tabs, pageCapture, storage, nativeMessaging, notifications, and host_permissions for http://localhost:3000/*) only for its single purpose: managing Chrome profiles, tabs, and saving pages offline.
7. Changes to This Privacy Policy
We may update this Privacy Policy to reflect changes in the extension's functionality or legal requirements. The latest version will be available at https://github.com/LiveProger/profile-tabs-manager/blob/main/privacy-policy.md. Significant changes will be communicated via the extension's repository.
8. Contact Us
If you have questions about this Privacy Policy or the extension, contact the developer at:

GitHub Issues: https://github.com/LiveProger/profile-tabs-manager/issues
Email: Provide an email address or remove this line if not applicable.

Thank you for using Profile and Tabs Manager!
Characters: 1812/2048
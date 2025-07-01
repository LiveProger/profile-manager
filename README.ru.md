Менеджер профилей и вкладок
Chrome-расширение для управления профилями Chrome, вкладками и сохранения страниц в формате MHTML. Расширение взаимодействует с локальным сервером Node.js через нативный обмен сообщениями для управления профилями и вкладками. Порт сервера настраивается через интерфейс (по умолчанию 3000).
Возможности

Управление профилями Chrome и их вкладками.
Сохранение и открытие веб-страниц в формате MHTML.
Настройка порта сервера через интерфейс расширения.
Интеграция с сервером Node.js через нативный обмен сообщениями.
Замена новой вкладки Chrome интерфейсом расширения.

Требования

Node.js: Версия 18 или выше (рекомендуется LTS, например, v18.x.x или v20.x.x).
npm: Версия 8 или выше.
Google Chrome: Установлен и настроен с пользовательскими профилями.
SQLite3: Для хранения данных на сервере.
Git: Для клонирования репозитория.

Установка
Сервер

Клонируйте репозиторий:
git clone https://github.com/your-username/profile-tabs-manager.git
cd profile-tabs-manager


Установите зависимости:
npm install


Настройте переменные окружения:Создайте файл .env в корне проекта:
PORT=3000

Порт должен совпадать с настройками в расширении (по умолчанию 3000).

Настройте нативный обмен сообщениями:

Поместите com.example.chrome_profile_host.json в:
Windows: C:\Users\<ВашПользователь>\AppData\Local\Google\Chrome\User Data\NativeMessagingHosts
macOS: ~/Library/Application Support/Google/Chrome/NativeMessagingHosts
Linux: ~/.config/google-chrome/NativeMessagingHosts


Укажите путь к dist/profile-tabs-manager.exe (после сборки) в path.
Обновите allowed_origins с ID вашего расширения:"allowed_origins": ["chrome-extension://<your-extension-id>/"]




Запустите сервер:
npm start



Расширение

Соберите файлы расширения:

Поместите файлы (manifest.json, index.html, main.jsx, App.jsx, ProfileContext.jsx, toastPromise.jsx, ProfileList.jsx, ProfileCard.jsx, background.js, index.css, icon16.png, icon48.png, icon128.png) в папку extension/.


Локальное тестирование:

Откройте Chrome, перейдите в chrome://extensions/.
Включите "Developer mode".
Нажмите "Load unpacked" и выберите папку extension/.
Откройте новую вкладку, чтобы проверить интерфейс.
Настройте порт сервера в панели настроек (по умолчанию 3000).



Сборка сервера

Установите pkg:
npm install --save-dev pkg


Соберите исполняемый файл:
npm run build

Создаст dist/profile-tabs-manager.exe для Windows (использует node18-win-x64).

Обновите com.example.chrome_profile_host.json:
"path": "C:\\Users\\<ВашПользователь>\\Desktop\\profile-tabs-manager\\dist\\profile-tabs-manager.exe"



Публикация в Chrome Web Store

Соберите ZIP-архив:
cd extension
zip -r ../extension.zip .


Создайте аккаунт разработчика:

Зарегистрируйтесь в Chrome Developer Dashboard ($5).
Загрузите extension.zip.


Заполните данные:

Название: "Profile and Tabs Manager".
Описание: "Manage Chrome profiles, tabs, and save pages offline with a configurable server port."
Иконки: Загрузите icon128.png.
Скриншоты: Подготовьте 1–5 изображений (1280x800 или 640x400).
Политика конфиденциальности: Разместите privacy.html на публичном URL (например, GitHub Pages).


Отправьте на проверку:

После одобрения обновите com.example.chrome_profile_host.json с ID расширения.



Настройка для разработки

Сервер:
npm run dev

Использует nodemon для автоматической перезагрузки.

Расширение:

Обновляйте файлы в extension/ и перезагружайте расширение в Chrome (chrome://extensions/).



Структура проекта

Сервер:
server.js: Основной сервер (Express, SQLite3).
.env: Настройки порта (по умолчанию 3000).
profiles.db: База данных SQLite.
SavedPages/: Папка для MHTML-файлов.
dist/: Папка для исполняемых файлов.


Расширение:
manifest.json: Манифест Chrome-расширения.
index.html, main.jsx, App.jsx, ProfileContext.jsx, toastPromise.jsx, ProfileList.jsx, ProfileCard.jsx: React-компоненты.
background.js: Фоновая логика.
index.css: Стили (Tailwind CSS + кастомные).
icon16.png, icon48.png, icon128.png: Иконки расширения.



Скрипты

npm start: Запуск сервера.
npm run dev: Запуск сервера с nodemon.
npm run build: Компиляция сервера в исполняемый файл.

Зависимости

Сервер: express, sqlite3, uuid, dotenv.
Расширение: react, react-dom, react-toastify, tailwindcss (через CDN).

Примечания

Порт сервера настраивается в интерфейсе расширения (по умолчанию 3000). Убедитесь, что он совпадает с .env.
Используйте Node.js v18 или v20, так как node19 не поддерживается pkg.
Политика конфиденциальности обязательна для публикации в Chrome Web Store.

Устранение неполадок

Сервер не отвечает:
Проверьте, запущен ли сервер (npm start).
Убедитесь, что порт в .env совпадает с настройкой в расширении.


Ошибки компиляции:
Выполните npm rebuild sqlite3.
Используйте npx pkg --debug ....


Расширение не загружается:
Проверьте manifest.json и наличие иконок.
Убедитесь, что все файлы находятся в extension/.



Для дополнительной информации см. документацию Chrome по нативному обмену сообщениями.
Загрузка на GitHub

Инициализируйте репозиторий:
git init
git add .
git commit -m "Initial commit"


Создайте репозиторий на GitHub:

Перейдите на GitHub.
Создайте репозиторий (например, profile-tabs-manager).


Загрузите проект:
git remote add origin https://github.com/your-username/profile-tabs-manager.git
git branch -M main
git push -u origin main



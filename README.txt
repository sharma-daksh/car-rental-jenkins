CAR RENTAL REACT UI - INSTALLATION NOTES
========================================

This package adds a React + Vite frontend to your existing Spring Boot repository.
It does not modify Jenkins configuration or your existing car-management Java files.

PACKAGE CONTENTS
----------------
frontend/                  React + Vite application
backend-patch/             Local demo-only Spring Security configuration
scripts/build-frontend.ps1  Builds React and copies production files into Spring Boot static resources

1. EXTRACT
----------
Extract the ZIP directly into the repository folder:
C:\Users\Daksh\Desktop\car-rental-jenkins

The ZIP creates these paths directly at the repo root:
  frontend\
  backend-patch\
  scripts\build-frontend.ps1

If PowerShell asks whether to replace an existing scripts/build-frontend.ps1, choose Yes.

2. INSTALL THE DEMO SECURITY CONFIG
-----------------------------------
Copy:
  backend-patch\DemoSecurityConfig.java
To:
  src\main\java\com\carrental\config\DemoSecurityConfig.java

Create the config folder if it does not exist. This config is active ONLY with the
'demo' profile. It allows local demo API requests without Spring's temporary Basic Auth.
It is ONLY for local development, not production. In application-demo.properties add:
  server.address=127.0.0.1

This binds the demo service to the current PC only.

3. RUN REACT IN DEVELOPMENT
---------------------------
Keep the React frontend in its own frontend\ directory. Do not put source JSX files
inside src\main\resources\static.

From a NEW PowerShell window, run:
  cd C:\Users\Daksh\Desktop\car-rental-jenkins\frontend
  npm install
  npm run dev

Open http://127.0.0.1:5173

Vite proxies /api calls to http://127.0.0.1:8081. The Spring Boot app must be running
with the 'demo' profile in another PowerShell window.

4. BUILD REACT INTO SPRING BOOT
-------------------------------
After testing in Vite, from the repository root run:
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\build-frontend.ps1
  .\mvnw.cmd -B clean package

The script builds frontend/dist and copies the compiled React files into
src\main\resources\static. It removes only the old index.html, style.css and app.js
from the previous starter UI, then copies the React build. Spring Boot can then serve
the built UI at http://localhost:8081/.

5. API COVERAGE
---------------
The React UI calls these existing endpoints:
  GET    /api/cars
  POST   /api/cars
  PUT    /api/cars/{id}
  DELETE /api/cars/{id}

The dashboard and inventory are connected to the backend. Rentals, customers, reports,
and settings are intentionally shown as future work because their APIs are not yet
implemented in this repository.

Do not commit local H2 files under data/. The existing .gitignore ignores data/.

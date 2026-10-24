ROVE WORKSPACE — CUSTOMER MANAGEMENT + RENTAL MANAGEMENT
=======================================================

This is a patch for the existing public repository:
  https://github.com/sharma-daksh/car-rental-jenkins

WHAT IT ADDS
------------
Customer Management
- Add, list, search, edit and delete customer records.
- Fields: full name, phone, email (optional), driving licence (required), address.
- Email and driving licence numbers are unique.
- A customer cannot be deleted while rental history references that customer.

Rental Management
- Create a rental from an existing customer and an AVAILABLE vehicle.
- Validate required ids/dates and prevent past start dates, end dates before start dates,
  and renting vehicles that are not AVAILABLE.
- Snapshot the vehicle's daily price and calculate rental total (minimum 1 day).
- New rentals start as RESERVED; the vehicle becomes BOOKED.
- Change status to ACTIVE, COMPLETED, or CANCELLED.
- ACTIVE changes the vehicle to ACTIVE. COMPLETED/CANCELLED releases the vehicle to
  AVAILABLE unless another open rental still uses it or the vehicle is in maintenance.
- Rental table shows customer, vehicle, registration, dates, total, and status.

API ENDPOINTS
-------------
Customers
  GET     /api/customers
  GET     /api/customers/{id}
  POST    /api/customers
  PUT     /api/customers/{id}
  DELETE  /api/customers/{id}

Rentals
  GET     /api/rentals
  POST    /api/rentals
  PATCH   /api/rentals/{id}/status   body: {"status":"ACTIVE"}

INSTALL ON WINDOWS
------------------
1. Extract this ZIP directly into:
   C:\Users\Daksh\Desktop\car-rental-jenkins
   Keep folder paths. When asked, replace frontend/src/main.jsx and
   frontend/src/styles.css. New Java files should be added under src/main/java.

2. Open PowerShell in the repository root and package the updated UI and backend:
   cd "$HOME\Desktop\car-rental-jenkins"
   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-frontend.ps1
   .\mvnw.cmd -B clean test package
   (The build script runs npm install and npm run build, then copies the React output into Spring Boot static resources.)

3. Check Git changes and commit. Do not add local H2 files under data/:
   git status --short
   git add frontend/src/main.jsx frontend/src/styles.css src/main/java/com/carrental/controller/CustomerController.java src/main/java/com/carrental/controller/RentalController.java src/main/java/com/carrental/dto src/main/java/com/carrental/exception/ApiExceptionHandler.java src/main/java/com/carrental/model/Customer.java src/main/java/com/carrental/model/Rental.java src/main/java/com/carrental/repository/CustomerRepository.java src/main/java/com/carrental/repository/RentalRepository.java src/main/java/com/carrental/service/CarService.java src/main/java/com/carrental/service/CustomerService.java src/main/java/com/carrental/service/RentalService.java README-CUSTOMER-RENTAL-FEATURES.txt
   git commit -m "Implement customer and rental management"
   git push origin main

4. Trigger the existing car-rental-pipeline in Jenkins after push, then verify:
   http://localhost:8080  (Jenkins)
   http://localhost:8083  (current app URL from the startup script)

MANUAL ACCEPTANCE TEST
----------------------
1. Open Customers -> Add customer. Save a test customer; refresh and confirm it remains.
2. Edit the customer. Try adding a duplicate driving-licence value; expect a validation error.
3. Open Vehicles and confirm at least one vehicle has status Available.
4. Open Rentals -> New rental. Select the customer and vehicle and save a date range.
5. Confirm the rental appears as Reserved and the vehicle changes to Booked in Vehicles.
6. Change the rental to Active and confirm the vehicle changes to Active / on rent.
7. Change the rental to Completed. Confirm the vehicle becomes Available again.
8. Try deleting a customer used by a rental; the API should reject it and preserve history.

NOTES
-----
- The patch does not contain your H2 database and will not delete existing vehicle data.
- The browser UI calls the new APIs on the same Spring Boot origin (or Vite's /api proxy).
- This package was syntax-checked for JSX. A full npm/Maven build must be run on the project
  PC, where the existing dependencies and Maven wrapper are available.

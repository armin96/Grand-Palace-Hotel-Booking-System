
# Grand Palace Hotel - Booking System
<br><br>
Name : Seyedarmin Hosseinilargani
<br><br>
Student ID: GH1042143
<br><br><br>

Full-stack web application of a luxury hotel with room booking, user authentication, admin dashboard with analytics and map integration.
##  Features
### General Features
* **Responsive The whole world wide web site design is fit well on all devices Desktop, Mobile and Tablet using Bootstrap 5.**
* **User Authentication:** Secure Sign-up and Login system with JWT and Bcrypt.
* **User Dashboard:** Normal users are able to view their booking histories.
* **Room Listing** Room list with filters, details, prices and photos.
* **Booking Charges** Calculates costs in real time based on nhights, guests and additional services.
### Admin Features
* **Admin Panel:** Rooms (CRUD_)] Services & Users.
* **Dash of Analytics:** Monthy revenue line visual Chart (Chart.js) based in actual data of DB.
* **Reservations Management Visually confirm or delete the reservations of your guests.
### API Integration
* **Map Integration:** Uses Leaflet.js and OpenStreetMap to dynamically show the hotel location on a map.
---
## Tech Stack
* **Frontend:** HTML5, Bootstrap 5, Vue.js 3 (CDN)
* **Backend:** Node.js, Express.js
* **Database:** MongoDB (Mongoose ODM)
* **Tools:** Chart.js (Analytics), Leaflet (Maps), Multer (Image Uploads)
---
## Installation & Setup
Run the following commands to start the project locally:
### 1. Prerequisites
make sure you have installed:
* [Node.js](https://nodejs.org/) (v14 or later)
* MongoDB (Atlas URI is preconfigured in `server.js` for testing purposes)
3. Install Dependencies
Create a new project and install the following packages:<br>
Bash<br>
npm init -y<br>
npm install express mongoose bcryptjs jsonwebtoken cors multer<br>
4. Run the Server<br>
Launch the server side application:<br>
Bash<br>
node server.js<br>
Note: The app connects to a cloud MongoDB Atlas cluster. For demonstration purposes the connection string is hard coded in server.js.<br>
5. Access the Application<br>
In a web browser, go to:<br>
Home Page: http://localhost:3000/index.html<br>
Admin Panel: http://localhost:3000/admin.html<br>
Default Credentials (Seed Data)<br>
During the first run the app seeds the database with the following accounts if they are not already present:<br>
 Admin Account<br>
<br>Username: rezamar2002
Password: admin123<br>
Test User Account<br>
Email: ali@test.com<br>
Password 123456<br>
Details about API Integration<br>
Leaflet.js & OpenStreetMap1.<br>
Objective: To show the location of the hotel on the landing page without holding a credit card (unlike Google Maps).<br>
Implementation: is in index.html It displays an Interactive map with centered on Berlin coordinates with OSM tiles.<br>
2. Chart.js<br>
Objective: For business intelligence in the Admin Panel.<br>
Implementation: It is in admin.html. It retrieves booking information from the API, summarises total price by month, and draws a revenue bar chart. 
  

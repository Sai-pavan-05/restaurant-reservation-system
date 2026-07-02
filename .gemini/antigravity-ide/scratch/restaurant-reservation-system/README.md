# DineFlow - Restaurant Reservation Management System

DineFlow is a full-stack Restaurant Reservation Management System designed to handle table bookings, prevent double-bookings, enforce capacity limits, and provide role-based access for Customers and Administrators. 

This repository contains both the **Express API Backend** and the **Vite React Frontend**, optimized to run together or deploy as a single container.

---

## 🚀 Setup & Installation Instructions

### Prerequisites
* **Node.js** (v18.0.0 or higher recommended)
* **MongoDB** (A local MongoDB instance or a free [MongoDB Atlas](https://www.mongodb.com/products/platform/atlas-database) URI)

### Local Development Setup

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd restaurant-reservation-system
   ```

2. **Install Dependencies**
   You can install dependencies for both the backend and frontend in one command from the project root:
   ```bash
   npm run install-all
   ```

3. **Configure Environment Variables**
   * Navigate to `backend/.env` (created automatically) and verify the variables.
   * If you are using MongoDB Atlas, update `MONGODB_URI` inside `backend/.env` with your cluster connection string:
     ```env
     PORT=5000
     MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/dineflow
     JWT_SECRET=super_secret_restaurant_reservation_jwt_key_2026
     JWT_EXPIRE=24h
     NODE_ENV=development
     ```

4. **Seed the Database** (Optional)
   The system will automatically seed mock tables and accounts on first start if the database is empty. However, you can run it manually:
   ```bash
   npm run seed
   ```
   * **Test Accounts Seeded**:
     * **Administrator**: `admin@restaurant.com` / `AdminPass123!`
     * **Customer**: `customer@restaurant.com` / `CustomerPass123!`
     * **Tables**: 9 tables with seating capacities of 2, 4, 6, and 8.

5. **Start the Application**
   Run the backend server and frontend development server in separate terminal windows:
   
   * **Terminal 1 (Backend)**:
     ```bash
     npm run dev:backend
     ```
     *(Runs on `http://localhost:5000`)*
     
   * **Terminal 2 (Frontend)**:
     ```bash
     npm run dev:frontend
     ```
     *(Runs on `http://localhost:5173` - requests proxy to backend automatically)*

---

## 🧪 Programmatic Verification (Tests)

We have built an automated verification test suite to programmatically assert validation constraints. To run the tests, make sure your MongoDB URI is active and run:
```bash
npm run test --prefix backend
```
The test suite asserts:
1. **Capacity Validation**: Prevents booking a table for a guest count that exceeds the table capacity.
2. **Double Booking Prevention**: Enforces that overlapping bookings on the same table, date, and timeslot are rejected by the database.

---

## 🛠️ Reservation & Availability Logic

One of the core features of DineFlow is its robust booking-conflict prevention mechanism. 

### 1. The Capacity Check (API level)
When a customer attempts to book a table, the system queries the physical `Table` configuration. It verifies that the table's seating capacity is greater than or equal to the requested number of guests.
```javascript
if (table.capacity < guestsCount) {
  return res.status(400).json({ error: "Table cannot accommodate this number of guests" });
}
```

### 2. Double-Booking Prevention (Database level)
In a high-traffic production system, checking table availability in code (check-then-insert) introduces a race condition where two users could book the last table at the exact same millisecond. 

DineFlow solves this by implementing a **Mongoose Partial Unique Index** on the `Reservation` schema:
```javascript
ReservationSchema.index(
  { table: 1, date: 1, timeSlot: 1 },
  { unique: true, partialFilterExpression: { status: 'confirmed' } }
);
```
* **Why Partial?** If a customer cancels their booking, we change its status to `cancelled`. If the index was globally unique, the table could never be booked again on that date/timeslot because a record already exists. The `partialFilterExpression` ensures the unique constraint is **only enforced on 'confirmed' bookings**. Cancelled records are ignored by the index, freeing the table for new reservations.

### 3. Smart Table Auto-Assignment
If a customer doesn't specify a table number, the system automatically runs an optimization query:
1. Filters active tables where `capacity >= guestsCount`.
2. Excludes tables that have active reservations on the selected date and time slot.
3. Sorts available tables by capacity in **ascending order** to assign the optimal (smallest possible) table, saving larger tables for larger groups.

---

## 🔑 Role-Based Access Control (RBAC)

The system supports two distinct roles: `customer` and `admin`. Access to API routes is secured with JWT tokens and a role-enforcement middleware.

* **Customer Role**:
  * Authorized to create bookings, see their own reservation history, and cancel their own bookings.
  * Restricted from viewing other customers' bookings or modifying table assets.
* **Admin Role**:
  * Authorized to view all reservations across the restaurant.
  * Can filter reservations by specific dates.
  * Can cancel or edit any reservation (e.g. change dates, move guests to another table, change timeslot).
  * Can manage tables (create tables, edit capacities, toggle active/inactive status, delete unused tables).

---

## ☁️ Deployment Guidelines

The project includes a multi-stage `Dockerfile` and is fully configured for deployment on platforms like Render, Railway, Google Cloud Run, or Heroku.

### Multi-Stage Docker Strategy
* **Stage 1 (Frontend Builder)**: Installs npm packages in the React project and compiles code into static HTML/JS/CSS assets inside `frontend/dist`.
* **Stage 2 (Runner)**: Installs production-only dependencies in the Node.js project, copies the compiled static frontend, and runs the Express server on port `8080` (or `PORT` provided by host).
* **Serving Strategy**: The Express backend serves the React frontend statically in production mode:
  ```javascript
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend', 'dist', 'index.html'));
  });
  ```
  This creates a **single unified container** deployment, eliminating CORS errors and hosting costs for separate frontends.

### Deploying to Render
1. Create a new **Web Service** on Render pointing to your repository.
2. Select **Docker** as the Runtime environment.
3. Set the Environment Variables:
   * `MONGODB_URI` (Your MongoDB Atlas connection URI)
   * `JWT_SECRET` (A strong random string)
   * `NODE_ENV` = `production`
4. Render will automatically build the multi-stage Docker image and deploy your service to a public URL.

---

## ⚠️ Known Limitations & Areas for Improvement

1. **Hard-Coded Time Slots**: Currently, the system uses 6 fixed 2-hour time slots. 
   * *Improvement*: Allow administrators to define custom operating hours and dynamic slot sizes in the admin panel.
2. **Table Splitting/Combining**: The system assumes reservations map to a single table. It does not support joining two adjacent 2-seat tables for a group of 4.
   * *Improvement*: Add a table-joining algorithm to combine adjacent available tables if no single table has sufficient capacity.
3. **No Soft Block**: During manual table selection, if two users view the same table page, they can try to book it. One will fail at checkout.
   * *Improvement*: Implement WebSockets to broadcast live table availability or lock tables for 5 minutes during the checkout phase.
4. **Time Zone Shifts**: The reservation date is stored as a `YYYY-MM-DD` string to avoid standard MongoDB UTC offset bugs. However, system time checks (blocking past bookings) rely on server local time.
   * *Improvement*: Standardize restaurant bookings to the specific restaurant's local timezone (e.g., using `moment-timezone`).

# Finance Backend API

## Overview

This project is a backend system for managing financial data with role-based access control. It allows users to create and manage financial records like income and expenses, while also providing useful analytics through dashboard APIs.

The main focus of this project was to design clean APIs, implement proper access control, and handle data in a structured and reliable way.

---

## Tech Stack

* Node.js
* Express.js
* MongoDB (Mongoose)
* JWT Authentication
* Bcrypt for password hashing

---

## Features

### Authentication

* User registration and login
* JWT-based authentication
* Secure password storage using bcrypt

### Role-Based Access Control

The system supports three roles:

* **Viewer** → Can view records and basic data
* **Analyst** → Can access analytics and summaries
* **Admin** → Full access (create, update, delete, manage users)

---

### Financial Records

Users can:

* Create income/expense records
* View records with filters (date, category, type)
* Update and delete records (admin only)
* Paginate and search records

---

### Dashboard APIs (Key Feature)

The backend provides aggregated insights such as:

* Total income and expenses
* Net balance
* Category-wise breakdown
* Recent transactions
* Monthly trends and summaries

---

### Validation & Error Handling

* Input validation for all APIs
* Proper HTTP status codes
* Meaningful error messages

---

## Project Structure

```
src/
 ├── controllers/
 ├── routes/
 ├── middleware/
 ├── models/
 ├── config/
 └── utils/
```

The project follows a modular structure with clear separation of concerns.

---

## API Endpoints

### Auth

* POST `/api/auth/register`
* POST `/api/auth/login`
* GET `/api/auth/profile`

---

### Financial Records

* POST `/api/records`
* GET `/api/records`
* PUT `/api/records/:id`
* DELETE `/api/records/:id`

---

### Dashboard

* GET `/api/dashboard`
* GET `/api/dashboard/summary`
* GET `/api/dashboard/categories`
* GET `/api/dashboard/monthly`

---

## How to Run

1. Install dependencies:

```
npm install
```

2. Create `.env` file:

```
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/financeDB
JWT_SECRET=your_secret_key
```

3. Start server:

```
node index.js
```

---

## How I Tested the Project

I tested all APIs using Thunder Client:

* Registered and logged in users
* Verified JWT authentication
* Created and fetched financial records
* Tested role-based restrictions
* Validated dashboard analytics outputs

---

## Key Highlights

* Clean and maintainable backend structure
* Proper role-based access control
* Real-world dashboard analytics (not just CRUD)
* Good error handling and validation

---

## Future Improvements

* Add frontend dashboard
* Add unit and integration tests
* Deploy on cloud (Render / AWS)
* Add refresh tokens for authentication

---

## Final Note

This project focuses on backend design, data flow, and access control rather than just building APIs. The goal was to create a system that is easy to understand, extend, and maintain.

# Can-Am Court Reservation API Documentation

## Base URL
```
https://queuesystem-be.onrender.com/api
```

## Authentication
All admin operations require the following header:
```
x-admin-password: canamadmin
```

## Common Headers
```
accept: application/json, text/plain, */*
content-type: application/json
referer: https://can-am.vercel.app/
```

---

## Public Endpoints

### 1. Get Available Courts
**Endpoint:** `GET /courts`
**Description:** Fetches list of courts that are visible to public users
**Authentication:** None required

**Response Example:**
```json
{
  "success": true,
  "courts": [
    {
      "_id": "court_id",
      "name": "Court 11",
      "courtNumber": 11,
      "isVisible": true,
      "isAvailable": true,
      "currentReservation": null,
      "waitlist": [],
      "waitlistCount": 0,
      "timeToAvailable": 0
    }
  ]
}
```

### 2. User Registration
**Endpoint:** `POST /register`
**Description:** Register a new user with phone number
**Authentication:** None required

**Request Body:**
```json
{
  "phoneNumber": "12345"
}
```

**Response Example:**
```json
{
  "success": true,
  "user": {
    "phoneNumber": "12345",
    "animalName": "Uromastyx",
    "isApproved": false,
    "createdAt": "2024-01-01T12:00:00.000Z"
  },
  "isExisting": false
}
```

### 3. Court Reservation / Join Waitlist
**Endpoint:** `POST /reserve`
**Description:** Reserve an available court OR join waitlist for a court in use
**Authentication:** None required (but users must be approved)

**Request Body:**
```json
{
  "courtId": "court_id",
  "userIds": ["animalName1", "animalName2", "animalName3", "animalName4"],
  "type": "full",
  "option": "queue"
}
```

**Parameters:**
- `courtId`: MongoDB ObjectId of the target court
- `userIds`: Array of 2-4 approved animal names (2 for half court, 4 for full court)
- `type`: Reservation type (`"half"` for 2 players, `"full"` for 4 players)
- `option`: Always `"queue"` for waitlist system

**Behavior:**
- **Available Court**: Creates immediate reservation
- **Occupied Court**: Adds group to waitlist (first-come, first-served)
- **Waitlist**: Groups rotate every 30 minutes automatically

**Response Example:**
```json
{
  "success": true,
  "court": {
    "_id": "court_id",
    "name": "Court 11",
    "courtNumber": 11,
    "currentReservation": {
      "_id": "reservation_id",
      "courtId": "court_id",
      "userIds": ["animalName1", "animalName2", "animalName3", "animalName4"],
      "type": "full",
      "option": "queue",
      "startTime": "2024-01-01T12:00:00.000Z",
      "endTime": "2024-01-01T12:30:00.000Z"
    },
    "waitlist": [],
    "isAvailable": false,
    "waitlistCount": 0,
    "timeToAvailable": 1800
  }
}
```

---

## Admin Endpoints

### 4. Get All Courts (Admin)
**Endpoint:** `GET /courts/all`
**Description:** Fetches all courts including hidden ones (admin view)
**Authentication:** Admin password required

**Response Example:**
```json
{
  "success": true,
  "courts": [
    {
      "_id": "court_id",
      "name": "Court 1",
      "courtNumber": 1,
      "isVisible": false,
      "isAvailable": true,
      "currentReservation": null,
      "waitlist": [],
      "waitlistCount": 0,
      "timeToAvailable": 0
    }
  ]
}
```

### 5. Get All Users (Admin)
**Endpoint:** `GET /admin/users`
**Description:** Fetches all registered users with their approval status
**Authentication:** Admin password required

**Response Example:**
```json
{
  "success": true,
  "activeUsers": {
    "animalName1": {
      "phoneNumber": "12345",
      "animalName": "animalName1",
      "isApproved": true,
      "createdAt": "2024-01-01T12:00:00.000Z",
      "expiresAt": "2024-01-01T18:00:00.000Z"
    }
  },
  "idleUsers": {
    "animalName2": {
      "phoneNumber": "54321",
      "animalName": "animalName2",
      "isApproved": false,
      "createdAt": "2024-01-01T11:00:00.000Z"
    }
  }
}
```

### 6. Approve User (Admin)
**Endpoint:** `POST /admin/users/approve`
**Description:** Approve a user by their animal name
**Authentication:** Admin password required

**Request Body:**
```json
{
  "animalName": "Uromastyx"
}
```

**Response Example:**
```json
{
  "success": true,
  "message": "User approved successfully"
}
```

### 7. Toggle Court Visibility (Admin)
**Endpoint:** `POST /admin/toggle-court-visibility/{courtId}`
**Description:** Toggle court visibility between visible/hidden
**Authentication:** Admin password required

**URL Parameters:**
- `courtId` - The MongoDB ObjectId of the court (e.g., `6841fbeda6e050ee8a23c8f7`)

**Request Body:** None required (toggles current state)

**Response Example:**
```json
{
  "success": true,
  "message": "Court visibility toggled successfully"
}
```

### 8. Reset Court (Admin)
**Endpoint:** `POST /admin/reset-court/{courtId}`
**Description:** Reset a court that's currently in use, clearing all reservations and waitlists
**Authentication:** Admin password required

**URL Parameters:**
- `courtId` - The MongoDB ObjectId of the court (e.g., `6841fbeda6e050ee8a23c90a`)

**Request Body:** None required

**Response Example:**
```json
{
  "success": true,
  "message": "Court reset successfully"
}
```

### 9. Drop from Waitlist
**Endpoint:** `POST /waitlist/{courtId}/drop`
**Description:** Remove users from a court's waitlist
**Authentication:** None required (uses user verification)

**URL Parameters:**
- `courtId` - The MongoDB ObjectId of the court (e.g., `6841fbeda6e050ee8a23c90a`)

**Request Body:**
```json
{
  "users": [
    {
      "username": "Tuatara",
      "phoneNumber": "25801"
    },
    {
      "username": "Dugite",
      "phoneNumber": "25802"
    }
  ]
}
```

**Parameters:**
- `users`: Array of user objects to remove from waitlist (minimum 2 users required)
- `username`: The animal name identifier of the user
- `phoneNumber`: Last 5 digits of the user's registered phone number for verification

**Response Example:**
```json
{
  "success": true,
  "message": "Users removed from waitlist successfully"
}
```

**Business Logic:**
- Requires verification of username and phone number for each user
- Minimum 2 users must be specified (partial group removal not allowed)
- Only removes users that are currently in the waitlist for the specified court
- Maintains waitlist order for remaining users

---

## Data Models

### User Model
```json
{
  "phoneNumber": "string (5 digits)",
  "animalName": "string (unique identifier)",
  "isApproved": "boolean",
  "createdAt": "ISO datetime string",
  "expiresAt": "ISO datetime string (optional, 6-hour expiration)",
  "createdAtISO": "ISO datetime string (optional)"
}
```

### Court Model
```json
{
  "_id": "string (court identifier)",
  "name": "string (e.g., 'Court 11')",
  "courtNumber": "number (1-20)",
  "isVisible": "boolean (public visibility)",
  "isAvailable": "boolean",
  "currentReservation": "Reservation | null",
  "waitlist": "array of reservations",
  "waitlistCount": "number",
  "timeToAvailable": "number (seconds)"
}
```

### Reservation Model
```json
{
  "_id": "string (reservation identifier)",
  "courtId": "string",
  "userIds": "array of animal names (max 4)",
  "type": "string ('full' for 4 users)",
  "option": "string ('queue' for waitlist system)",
  "startTime": "ISO datetime string",
  "endTime": "ISO datetime string"
}
```

---

## Business Logic

### User Management
- Users register with 5-digit phone numbers
- System assigns unique animal names as identifiers
- Admin must approve users before they can make reservations
- Users have 6-hour expiration for automation scenarios

### Court System
- 20 courts total (Court 1-20)
- Courts can be hidden/visible to public
- Each court supports 4-user reservations
- 30-minute reservation slots with automatic rotation

### Reservation Flow
1. Users register and get approved by admin
2. Groups of 4 users can reserve available courts
3. If court is occupied, users join waitlist
4. Every 30 minutes, reservations automatically rotate
5. Current court users move to waitlist, next waitlist group gets court

### Automation Features
- Built-in 30-minute rotation system
- Redis-based session management
- Multi-court support with separate user sets
- 6-hour user expiration for conflict prevention

---

## Error Responses

### Common Error Format
```json
{
  "success": false,
  "error": "Error description",
  "message": "User-friendly error message"
}
```

### Common HTTP Status Codes
- `200` - Success
- `204` - No Content (OPTIONS requests)
- `304` - Not Modified (cached response)
- `400` - Bad Request
- `401` - Unauthorized (invalid admin password)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting & CORS

The API includes CORS support with OPTIONS preflight requests for:
- `POST /register`
- `GET /courts/all`
- `GET /admin/users`
- `POST /admin/users/approve`

All endpoints include proper CORS headers for cross-origin requests from the frontend application.
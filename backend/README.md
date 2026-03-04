# Campus Event Hub - Backend

A Node.js/Express backend for the Campus Event Hub application with MongoDB database and EJS templating.

## Features

- User authentication (Register & Login)
- Event management (Create, Read, Update, Delete)
- Event registration/unregistration
- User profiles and interest management
- Role-based access control (Student, Admin, Organizer)
- MongoDB integration with Mongoose
- EJS templating engine
- CORS enabled for frontend integration
- JWT token-based authentication

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

## Installation

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Setup Environment Variables**
   Create a `.env` file in the backend directory with:
   ```
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/campus-event-hub
   JWT_SECRET=your_secret_key_here
   JWT_EXPIRE=7d
   FRONTEND_URL=http://localhost:3000
   ```

3. **Start MongoDB**
   ```bash
   mongod
   ```
   (If using MongoDB Atlas, update MONGODB_URI in .env with your connection string)

## Running the Server

**Development Mode (with auto-reload)**
```bash
npm run dev
```

**Production Mode**
```bash
npm start
```

The server will run on `http://localhost:5000`

## Project Structure

```
backend/
├── config/
│   └── db.js          # Database connection
├── controllers/
│   ├── eventController.js    # Event logic
│   └── userController.js     # User & Auth logic
├── middleware/
│   ├── auth.js        # JWT authentication & authorization
│   └── errorHandler.js # Error handling
├── models/
│   ├── Event.js       # Event schema
│   └── User.js        # User schema
├── routes/
│   ├── events.js      # Event routes
│   └── users.js       # User routes
├── server.js          # Main server file
├── package.json       # Dependencies
└── .env              # Environment variables
```

## API Endpoints

### Authentication
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login user
- `GET /api/users/me` - Get current user (Protected)
- `PUT /api/users/update-profile` - Update user profile (Protected)
- `GET /api/users/:id` - Get user by ID (Protected)

### Events
- `GET /api/events` - Get all events
- `GET /api/events/:id` - Get event by ID
- `POST /api/events` - Create event (Protected, Organizer/Admin)
- `PUT /api/events/:id` - Update event (Protected, Organizer/Admin)
- `DELETE /api/events/:id` - Delete event (Protected, Organizer/Admin)
- `POST /api/events/:id/register` - Register for event (Protected)
- `POST /api/events/:id/unregister` - Unregister from event (Protected)

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

## Database Models

### User
- name, email, password, role
- department, rollNumber, phoneNumber
- profileImage, bio
- interestedCategories
- registeredEvents (populated with event details)

### Event
- title, description, date, time, location
- category, capacity, registeredUsers
- organizer information
- attendees list
- tags, status

## Error Handling

The API returns consistent error responses:
```json
{
  "success": false,
  "error": "Error message here"
}
```

## Dependencies

- `express` - Web framework
- `mongoose` - MongoDB ODM
- `mongodb` - MongoDB driver
- `ejs` - Templating engine
- `dotenv` - Environment variables
- `cors` - CORS middleware
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT authentication
- `multer` - File upload handling
- `express-validator` - Input validation

## Development Dependencies

- `nodemon` - Auto-reload during development

## Notes

- Always validate and sanitize input before saving to database
- Keep JWT_SECRET secure and never commit to version control
- Use HTTPS in production
- Implement rate limiting for API endpoints
- Add request logging for debugging

## Future Enhancements

- Email verification
- Password reset functionality
- Event search and filtering
- Pagination for event list
- Image upload for events
- Notifications system
- Admin dashboard
- Analytics and reporting

---

For frontend integration, refer to the main README.md in the project root.

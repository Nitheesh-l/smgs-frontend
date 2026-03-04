# SMGS Frontend

This is a React + TypeScript + Vite frontend for the SMGS (Student Management System). It provides login, dashboards, and management interfaces for students, faculty, and admins.

## Environment Setup

Create a `.env` file in `client/` with:

```env
VITE_API_BASE=http://localhost:5000
```

For production (deployed backend), use the backend URL:
```env
VITE_API_BASE=https://your-backend-domain.com
```

> **Note:** Ensure `VITE_API_BASE` does NOT have a trailing slash.

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```
   Opens at `http://localhost:5173`

## Features by Role

### Student
- View dashboard with attendance, marks, and timetable
- Check attendance record
- View marks for different subjects
- Personal profile

### Faculty
- Record attendance for students
- Enter marks (unit tests, internals, externals, lab)
- View class information
- Manage students in their class

### Admin
- **Create faculty accounts** (via admin dashboard at `/admin`)
- Manage all faculty and student accounts
- View system statistics
- Access all management features

## Admin Dashboard

Only admin accounts can access the admin dashboard. To use it:

1. **Log in** with admin credentials:
   - Email: `admin@smgs.com`
   - Password: `Admin@123456` (default, should be changed in production)

2. **Access admin dashboard:**
   - Click "Admin Dashboard" button on home page
   - Or navigate to `/admin` directly

3. **Create faculty accounts:**
   - Fill in faculty name, email, and temporary password
   - Enter your admin password to verify
   - System creates the faculty account
   - Faculty can then log in and change password

## Build

```bash
npm run build
```

Output is in `dist/`.

## Testing

```bash
npm run test
```

## Deployment

See `../DEPLOY.md` for detailed deployment instructions (Vercel, Render, Railway).

### Key Environment Variables for Deployment

- `VITE_API_BASE` - Backend server URL (set in platform UI, not in `.env`)
  - Example: `https://smgs-backend-xxxxx.vercel.app`
  - Must NOT end with `/`

## Technology Stack

- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **UI Components:** shadcn/ui (Tailwind CSS)
- **State Management:** React Context (useAuth hook)
- **HTTP Client:** Fetch API with custom wrapper (`src/utils/api.ts`)
- **Routing:** React Router v6

## Important Notes

- **Faculty cannot self-register.** Only admins can create faculty accounts via the dashboard.
- **Session tokens** are stored in localStorage; they persist between page reloads.
- **CORS** is handled by backend; frontend requests are proxied through API utility.
- **Responsive design** works on desktop, tablet, and mobile devices.

## Troubleshooting

### API calls fail with "Failed to load resource"
- Check that `VITE_API_BASE` is set correctly and does NOT end with `/`
- Verify backend is running or deployed
- Check CORS settings on backend (should default to `*`)

### Can't log in to admin account
- Ensure backend seed script has been run: `cd ../server && npm run seed:admin`
- Check that admin password has not been changed (default: `Admin@123456`)
- Verify database connection (`MONGODB_URI` env var on backend)

### "You don't have admin access" after login
- Check that logged-in user's `role` is `admin` (in user profile in database)
- Seed admin account again if role is incorrect

## Backend Server

A minimal Express + MongoDB backend is available under the `server/` folder. It exposes `api/*` endpoints used by the frontend.

See [server/README.md](../server/README.md) for setup and API documentation.

## License

MIT


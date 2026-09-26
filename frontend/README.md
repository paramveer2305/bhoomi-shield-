# Bhoomi Shield Frontend

AI-powered Land Dispute Early Warning & Cadastral Risk Intelligence System - Frontend Application

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Routing**: React Router v7

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API running on `http://localhost:8000`

## Installation

```bash
# Install dependencies
npm install
```

## Configuration

The API base URL is configured in `src/api/axios.ts`:

```typescript
const API_BASE_URL = 'http://localhost:8000/api';
```

To change the backend URL, update this constant.

## Development

```bash
# Start development server
npm run dev
```

The app will be available at `http://localhost:5173` (default Vite port).

## Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── api/                    # API client modules
│   ├── axios.ts           # Axios instance with interceptors
│   ├── auth.ts            # Authentication endpoints
│   ├── parcels.ts         # Parcel management endpoints
│   ├── documents.ts       # Document upload endpoints
│   ├── risk.ts            # Risk analysis endpoints
│   ├── alerts.ts          # Alert management endpoints
│   ├── cases.ts           # Case management endpoints
│   ├── verification.ts    # Verification endpoints
│   └── health.ts          # Health check endpoint
├── components/            # Reusable components
│   └── ProtectedRoute.tsx # Route guard component
├── context/               # React context providers
│   └── AuthContext.tsx    # Authentication state management
├── layouts/               # Layout components
│   └── DashboardLayout.tsx # Main dashboard layout
├── pages/                 # Page components
│   ├── auth/             # Authentication pages
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx
│   ├── parcels/          # Parcel pages
│   ├── cases/            # Case pages
│   ├── alerts/           # Alert pages
│   ├── DashboardHome.tsx
│   └── UnauthorizedPage.tsx
├── types/                 # TypeScript type definitions
│   └── index.ts          # All API types and interfaces
├── App.tsx               # Root component with routing
├── main.tsx              # Application entry point
└── index.css             # Global styles with Tailwind
```

## Features

### Authentication
- **Login**: Secure authentication with JWT tokens
- **Register**: User registration with role selection (Citizen, Officer, Admin)
- **Session Management**: Automatic token refresh and session persistence
- **Protected Routes**: Role-based access control

### Dashboard Layout
- **Responsive Sidebar**: Navigation with role-based menu items
- **User Profile**: Display current user information
- **Quick Actions**: Context-aware action buttons

### API Integration
- **Axios Interceptors**: 
  - Request: Auto-attach Bearer token from localStorage
  - Response: Normalize error responses
- **Type Safety**: Complete TypeScript interfaces for all API models
- **Error Handling**: Standardized error format across all API calls

### Compliance
All user-facing text uses non-accusatory, decision-support terminology:
- "potential inconsistency" instead of "fraud"
- "risk signal" instead of "alert"
- "requires verification" instead of "suspicious"
- "verification recommended" instead of "must investigate"

## Available Pages

- **Dashboard** (`/`): Overview with stats and recent activity
- **Parcels** (`/parcels`): Land parcel management
- **Cases** (`/cases`): Verification case tracking (Officer/Admin only)
- **Alerts** (`/alerts`): Risk signal monitoring
- **Login** (`/login`): User authentication
- **Register** (`/register`): New user registration

## User Roles

1. **Citizen**: Can view own parcels and alerts
2. **Officer**: Can manage cases and perform verifications
3. **Admin**: Full system access

## API Endpoints Used

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- `GET /api/parcels/` - List parcels
- `GET /api/parcels/{id}` - Get parcel details
- `GET /api/parcels/{id}/timeline` - Get parcel timeline
- `POST /api/documents/upload` - Upload document
- `GET /api/risk/{parcel_id}` - Get risk analysis
- `GET /api/alerts/` - List alerts
- `GET /api/cases/` - List cases
- `POST /api/verification/` - Submit verification

## Environment Variables

Currently using hardcoded configuration. For production, create a `.env` file:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

And update `src/api/axios.ts` to use:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

Proprietary - All rights reserved

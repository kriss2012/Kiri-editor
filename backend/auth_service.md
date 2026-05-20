# Auth Service

## Overview

Handles user registration, login, JWT token generation/validation, and role-based access control.

## Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create a new user account |
| POST | `/auth/login` | Authenticate and return JWT token |
| POST | `/auth/logout` | Invalidate token |
| GET | `/auth/me` | Get current user profile |
| POST | `/auth/refresh` | Refresh access token |

## JWT Token Structure

```json
{
  "header": { "alg": "HS256", "typ": "JWT" },
  "payload": {
    "user_id": 21,
    "email": "user@example.com",
    "role": "developer",
    "iat": 1712345678,
    "exp": 1712349278
  }
}
```

## Security

- Passwords hashed with **bcrypt** (salt rounds: 12)
- Access token expires in **1 hour**
- Refresh token expires in **7 days**
- Stored in **HttpOnly cookies**

## Role-Based Access Control

| Role | Permissions |
|---|---|
| `admin` | Full access to all resources |
| `developer` | Create/edit projects and files, run agents |
| `viewer` | Read-only access to projects |

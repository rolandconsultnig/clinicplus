# Authentication Guide

## 🔐 Overview

Clinic+ uses **JWT (JSON Web Tokens)** for stateless authentication with role-based access control (RBAC).

---

## 🚀 Quick Start

### 1. Create Test User

Run the setup script to create a test user:

```bash
python setup_test_data.py
```

**Default Test Credentials:**
- **Username**: `test_user`
- **Password**: `test_password123`

### 2. Login via API

```bash
curl -X POST http://localhost:5000/api/auth/jwt/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test_user", "password": "test_password123"}'
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 86400,
  "user": {
    "id": 1,
    "username": "test_user",
    "user_type": "admin",
    "roles": [...]
  }
}
```

### 3. Use Token in Requests

```bash
curl -X GET http://localhost:5000/api/auth/jwt/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 📋 Authentication Flow

### Frontend (React)

1. **User enters credentials** → `LoginForm` component
2. **API call** → `apiService.login(username, password)`
3. **Token stored** → `localStorage.setItem('auth_token', token)`
4. **User data stored** → `localStorage.setItem('auth_user', JSON.stringify(user))`
5. **Auto-check on load** → `useEffect` checks for stored token
6. **Token validation** → Calls `getProfile()` to verify token

### Backend (Flask)

1. **Login endpoint** → `/api/auth/jwt/login` (POST)
2. **Password verification** → `JWTManager.authenticate_user()`
3. **Token generation** → `JWTManager.generate_token()`
4. **Token includes**:
   - User ID, username, user_type
   - Facility ID (if specified)
   - Roles and permissions
   - Device fingerprint (zero-trust)
   - Expiration (24 hours)

---

## 🔑 API Endpoints

### Authentication

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/auth/jwt/login` | POST | Login with username/password | No |
| `/api/auth/jwt/refresh-token` | POST | Refresh JWT token | Yes |
| `/api/auth/jwt/verify-token` | POST | Verify token validity | No |
| `/api/auth/jwt/profile` | GET | Get current user profile | Yes |
| `/api/auth/jwt/facilities` | GET | Get user's accessible facilities | Yes |
| `/api/auth/jwt/switch-facility` | POST | Switch active facility context | Yes |
| `/api/auth/jwt/permissions` | GET | Get user's permissions | Yes |
| `/api/auth/jwt/check-permission` | POST | Check specific permission | Yes |

---

## 🛡️ Security Features

### 1. **JWT Tokens**
- Stateless authentication
- 24-hour expiration
- Signed with secret key
- Includes user roles and permissions

### 2. **Password Hashing**
- Uses `bcrypt` for password hashing
- Passwords never stored in plain text
- `UserAccount.set_password()` handles hashing

### 3. **Role-Based Access Control (RBAC)**
- Users have roles (e.g., "Physician", "Nurse", "Admin")
- Roles have permissions (e.g., "view_patients", "create_appointments")
- Decorators: `@role_required(['Physician'])`

### 4. **Device Fingerprinting**
- Zero-trust security
- Tracks device characteristics
- Can require device verification

### 5. **Tenant Isolation**
- Multi-tenant architecture
- Data isolation by facility/organization
- `@tenant_isolation_required` decorator

---

## 👤 User Types

| Type | Description | Default Roles |
|------|-------------|---------------|
| `patient` | Patient user | Patient |
| `provider` | Healthcare provider | Physician, Nurse, etc. |
| `admin` | System administrator | System Administrator |
| `staff` | Clinic staff | Staff |

---

## 🔧 Creating Users Programmatically

```python
from src.models.user import db
from src.models.auth import UserAccount, Role, UserRole
from src.models.provider import Facility

# Create user
user = UserAccount(
    username="new_user",
    email="user@example.com",
    user_type="provider",
    facility_id=facility.id,
    is_active=True,
    is_verified=True
)
user.set_password("secure_password")
db.session.add(user)
db.session.flush()

# Assign role
role = Role.query.filter_by(role_name="Physician").first()
user_role = UserRole(
    user_account_id=user.id,
    role_id=role.id,
    facility_id=facility.id,
    is_active=True
)
db.session.add(user_role)
db.session.commit()
```

---

## 🧪 Testing Authentication

### Test Login

```python
import requests

response = requests.post(
    'http://localhost:5000/api/auth/jwt/login',
    json={
        'username': 'test_user',
        'password': 'test_password123'
    }
)

if response.status_code == 200:
    data = response.json()
    token = data['token']
    print(f"✅ Login successful! Token: {token[:50]}...")
else:
    print(f"❌ Login failed: {response.json()}")
```

### Test Protected Endpoint

```python
headers = {'Authorization': f'Bearer {token}'}
response = requests.get(
    'http://localhost:5000/api/auth/jwt/profile',
    headers=headers
)

if response.status_code == 200:
    print(f"✅ Profile: {response.json()}")
else:
    print(f"❌ Error: {response.json()}")
```

---

## 🐛 Troubleshooting

### 401 Unauthorized

**Causes:**
- Invalid or expired token
- Missing Authorization header
- Wrong password
- User account inactive

**Solutions:**
1. Check token expiration (24 hours)
2. Verify Authorization header format: `Bearer TOKEN`
3. Re-login to get new token
4. Check user account status

### 403 Forbidden

**Causes:**
- Insufficient permissions
- Role not assigned
- Facility access denied

**Solutions:**
1. Check user roles: `GET /api/auth/jwt/permissions`
2. Verify role has required permission
3. Check facility access

### Token Not Working

**Causes:**
- Token expired
- Secret key changed
- Token format incorrect

**Solutions:**
1. Refresh token: `POST /api/auth/jwt/refresh-token`
2. Re-login
3. Verify token format in Authorization header

---

## 📝 Frontend Integration

### Login Component

```jsx
const handleSubmit = async (e) => {
  e.preventDefault()
  const result = await apiService.login(username, password)
  
  if (result.success) {
    // Token and user stored automatically
    onLogin(result.user)
  } else {
    setError(result.error)
  }
}
```

### Protected Route

```jsx
useEffect(() => {
  const checkAuth = async () => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      const result = await apiService.getProfile()
      if (result.success) {
        setUser(result.user)
      } else {
        // Token invalid, redirect to login
        apiService.logout()
      }
    }
  }
  checkAuth()
}, [])
```

### API Calls with Auth

```jsx
// apiService automatically adds Authorization header
const result = await apiService.getPatients()
```

---

## 🔐 Best Practices

1. **Never store passwords in plain text**
2. **Always use HTTPS in production**
3. **Set appropriate token expiration**
4. **Implement token refresh**
5. **Log authentication events**
6. **Use strong password requirements**
7. **Implement account lockout after failed attempts**
8. **Enable MFA for sensitive accounts**

---

## 📚 Related Files

- **Backend Auth**: `src/auth/jwt_manager.py`
- **Auth Routes**: `src/routes/auth_jwt.py`
- **User Model**: `src/models/auth.py`
- **Frontend Service**: `src/services/apiService.js`
- **Login Component**: `src/App.jsx` (LoginForm)

---

## ✅ Quick Checklist

- [ ] Test user created (`python setup_test_data.py`)
- [ ] Can login via API
- [ ] Token stored in localStorage
- [ ] Protected routes require token
- [ ] Token refresh works
- [ ] Logout clears token
- [ ] Roles and permissions working

---

## 🆘 Need Help?

1. Check Flask logs for errors
2. Verify database has users
3. Test API endpoints directly
4. Check browser console for frontend errors
5. Verify token format in Authorization header


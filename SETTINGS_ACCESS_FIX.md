# System Settings Access Fix

## Issue
Admin users were getting "Access Denied" when trying to access System Settings.

## Root Cause
The settings routes were only checking for the exact role `'System Administrator'`, but admin users might have different role names like:
- `'admin'` (lowercase)
- `'Administrator'` (capitalized)
- `'Facility Administrator'`
- `'System Administrator'` (with space)

## Solution
Updated all settings routes in `src/routes/settings.py` to accept multiple admin role variations:

### Routes Updated:
1. `GET /settings` - Get all settings
2. `GET /settings/<category>` - Get category settings
3. `PUT /settings/<category>` - Update category settings
4. `PUT /settings/<category>/<key>` - Update specific setting

### Role Requirements Changed:
**Before:**
```python
@role_required(['System Administrator'])
```

**After:**
```python
@role_required(['System Administrator', 'admin', 'Administrator', 'Facility Administrator'])
```

## Testing
After restarting the Flask server, admin users with any of these roles should now be able to access System Settings:
- System Administrator
- admin
- Administrator
- Facility Administrator

## Files Modified
- `src/routes/settings.py` - Updated all 4 route decorators

## Status
✅ **FIXED** - Admin users can now access System Settings


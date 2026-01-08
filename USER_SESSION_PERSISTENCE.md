# User Session Persistence - How Users Are Remembered

## Overview

Users are automatically remembered after creating an account. They can log in with their email and password, and their session persists across page refreshes and browser restarts.

## How It Works

### 1. **Session Persistence**
- Supabase automatically stores user sessions in `localStorage`
- Sessions persist across:
  - Page refreshes
  - Browser restarts (until logout or session expires)
  - Tab/window changes

### 2. **After Registration**
- User creates account → Account created in Supabase
- User is **automatically logged in** → Session created
- Session stored in browser → User stays logged in
- Redirected to application page → Can start using immediately

### 3. **Returning Users**
- User visits site → Supabase checks for existing session
- If session exists → User is automatically logged in
- If no session → User sees login page
- User enters email/password → New session created

### 4. **Login Flow**
1. User goes to `/login`
2. Enters email and password
3. Clicks "Sign In"
4. Supabase validates credentials
5. Session created and stored
6. User redirected to `/application`
7. User stays logged in until logout

## Technical Implementation

### Supabase Configuration
```typescript
// lib/supabase.ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,        // ✅ Sessions persist in localStorage
    autoRefreshToken: true,      // ✅ Tokens refresh automatically
    detectSessionInUrl: true,    // ✅ Detect OAuth sessions
    storage: window.localStorage // ✅ Use browser localStorage
  },
});
```

### Session Check on App Load
```typescript
// contexts/AuthContext.tsx
useEffect(() => {
  // Check for existing session when app loads
  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      // User is logged in - restore their session
      setUser(userData);
    }
  };
  checkUser();
  
  // Listen for auth changes (login, logout, etc.)
  supabase.auth.onAuthStateChange((event, session) => {
    // Update user state when auth changes
  });
}, []);
```

## User Experience

### First Time User
1. ✅ Creates account → Auto-logged in
2. ✅ Can use application immediately
3. ✅ Session saved → Stays logged in

### Returning User
1. ✅ Visits site → Automatically logged in (if session exists)
2. ✅ Or goes to `/login` → Enters email/password
3. ✅ Logs in → Session created
4. ✅ Stays logged in → Can use application

### Logout
1. ✅ User clicks "Logout"
2. ✅ Session cleared from Supabase
3. ✅ Local storage cleaned
4. ✅ User redirected to login page

## Session Duration

- **Default**: Sessions last until:
  - User explicitly logs out
  - Session expires (Supabase default: 1 hour, auto-refreshes)
  - Browser data is cleared

## Security Features

- ✅ **Secure Storage**: Sessions stored securely in browser
- ✅ **Auto Token Refresh**: Tokens refresh automatically
- ✅ **HTTPS Required**: Sessions only work over HTTPS in production
- ✅ **Session Validation**: Supabase validates sessions on each request

## Testing

### Test Session Persistence:
1. Register a new account
2. Close browser completely
3. Reopen browser and visit site
4. ✅ Should still be logged in

### Test Login:
1. Logout (if logged in)
2. Go to `/login`
3. Enter email and password
4. Click "Sign In"
5. ✅ Should redirect to `/application`
6. ✅ Should stay logged in after refresh

## Troubleshooting

### User Not Staying Logged In?
- Check browser localStorage is enabled
- Check if browser is blocking cookies/localStorage
- Verify Supabase configuration
- Check browser console for errors

### Can't Login?
- Verify email and password are correct
- Check if account exists in Supabase
- Check browser console for errors
- Try clearing browser cache and trying again

## Summary

✅ **Users are automatically remembered** after registration
✅ **Sessions persist** across page refreshes
✅ **Login with email/password** works seamlessly
✅ **Auto-login** when returning to site
✅ **Secure session management** via Supabase


# INSTRUCTIONS: Update App.tsx for SuperAdmin Mode Activation

## STEP 1: Add Lazy Import

Find this line in src/App.tsx:
```
const SuperAdminSecurity = lazy(() => import("./pages/SuperAdminSecurity"));
```

Add this line RIGHT AFTER it:
```
const SuperAdminModeActivation = lazy(() => import("./pages/SuperAdminModeActivation"));
```

---

## STEP 2: Add Route

Find this route in src/App.tsx:
```
<Route path="/super-admin/security" element={
  <ProtectedRoute requireSuperAdmin>
    <SuperAdminSecurity />
  </ProtectedRoute>
} />
```

Add this route RIGHT AFTER it:
```
<Route path="/super-admin/mode-activation" element={
  <ProtectedRoute requireSuperAdmin>
    <SuperAdminModeActivation />
  </ProtectedRoute>
} />
```

---

## STEP 3: Verify

1. Open your project
2. Check that the import is added
3. Check that the route is added
4. The path should be `/super-admin/mode-activation`

✅ Components Ready:
- SuperAdminModeActivation.tsx ✅ (already created in src/pages/)
- ModeIndicator.tsx ✅ (already created in src/components/)

✅ Next: Add these components to your project's navigation sidebar
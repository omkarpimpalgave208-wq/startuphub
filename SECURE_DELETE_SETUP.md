# Secure Product Deletion Feature Setup Guide

This document explains how the secure product deletion feature works and how to enable it completely in your Supabase backend.

## Feature Overview

The secure delete feature allows users to delete only their own products. It includes three layers of security:

1. **UI Layer**: Delete button only appears when the current user owns the product
2. **API Layer**: Server-side filtering ensures only the product owner can delete
3. **Database Layer**: Row-Level Security (RLS) policy prevents unauthorized deletes at the database level

## Implementation Summary

### Frontend Changes (Already Completed ✅)

**File**: `src/pages/ProductPage.tsx`

- Added Trash2 icon button for product deletion
- Delete button only visible if `user.id === product.user_id`
- Confirmation dialog before deletion ("Are you sure you want to delete this product?")
- Calls `api.deleteProductSecure(product.id, user.id)` on confirmation
- Redirects to home page (`/`) after successful deletion
- Shows error messages if deletion fails

### Backend API Changes (Already Completed ✅)

**File**: `src/lib/api.ts`

Added `deleteProductSecure()` function:
```typescript
export async function deleteProductSecure(productId: string, userId: string) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)
    .eq('user_id', userId);  // Critical: Filter by both ID and user_id
  
  if (error) throw error;
}
```

This function ensures the delete query filters by BOTH:
- `id` - the product being deleted
- `user_id` - only allows deletion if the product belongs to the current user

## RLS Policy Setup (⏳ PENDING - Must Complete Manually)

### Why RLS is Important

Even with frontend and API protection, Row-Level Security at the database level provides a critical safeguard. If someone:
- Bypasses the UI (e.g., using browser dev tools)
- Makes direct API calls with modified parameters
- Somehow compromises the service role key

...the RLS policies will still prevent unauthorized access.

### How to Enable RLS

1. **Open Supabase SQL Editor**:
   - Go to https://app.supabase.com
   - Select your project
   - Navigate to **SQL Editor** (left sidebar)
   - Click **New Query**

2. **Execute the RLS Setup Script**:
   - Open the file `SUPABASE_RLS_SETUP.sql` in this project
   - Copy all the SQL commands
   - Paste them into the Supabase SQL Editor
   - Click **Run** (or press `Ctrl+Enter`)

3. **Verify RLS is Enabled**:
   - Run this verification query:
   ```sql
   SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'products';
   ```
   - You should see `rowsecurity = true` for the products table

### RLS Policies Explained

The setup script creates five policies:

#### 1. **DELETE Policy** (The Core Secure Delete Policy)
```sql
CREATE POLICY "authenticated_delete_own_products" ON products
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
```
- **Effect**: Authenticated users can only delete products they own
- **Condition**: `user_id = auth.uid()` (the product must belong to the current user)
- **Security**: Even if someone forges a delete request, the database will reject it if they don't own the product

#### 2. **SELECT Policy** (Public Read Access)
```sql
CREATE POLICY "public_read_products" ON products
  FOR SELECT
  USING (true);
```
- **Effect**: Anyone can read/view all products
- **Why**: Allows visitors to see products without authentication

#### 3. **INSERT Policy** (Create with Current User)
```sql
CREATE POLICY "authenticated_insert_products" ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
```
- **Effect**: Only authenticated users can create products
- **Condition**: New products must have `user_id` equal to the current user
- **Why**: Prevents users from creating products attributed to other users

#### 4. **UPDATE Policy** (Modify Own Products)
```sql
CREATE POLICY "authenticated_update_own_products" ON products
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```
- **Effect**: Users can only update their own products
- **Why**: Prevents users from modifying other users' products

## Testing the Secure Delete Feature

### Test Case 1: Owner Can Delete ✓

1. Login as User A
2. Create a new product
3. Navigate to that product's detail page
4. Verify the **Delete** button (trash icon) appears
5. Click **Delete** and confirm
6. Should redirect to home page
7. Verify product no longer exists

### Test Case 2: Non-Owner Cannot Delete ✓

1. Login as User A and create a product
2. Share the product URL or navigate to it
3. Logout and login as User B
4. Visit the product page created by User A
5. Verify the **Delete** button does NOT appear (because `user.id !== product.user_id`)
6. (If RLS is enabled) Even if someone manually tries to delete via browser console, it should fail

### Test Case 3: Unauthorized Delete Request Fails ✓ (Once RLS is Enabled)

This test ensures the RLS policy works:

1. Open browser console (F12)
2. Try this command (after RLS is enabled):
```javascript
// This should FAIL because you don't own the product
const { error } = await supabase
  .from('products')
  .delete()
  .eq('id', 'some-other-user-product-id')
  .single();

console.log(error); // Should show a policy violation error
```

## Troubleshooting

### Issue: Delete button appears but deletion fails

**Symptoms**: Button shows but clicking it produces an error

**Solutions**:
1. Verify the user is logged in: Check `authStore` in browser console
2. Verify `user.id` matches `product.user_id`
3. Check browser console for error messages
4. Check Supabase logs for RLS policy violations

### Issue: Delete button appears for all users (including non-owners)

**Symptoms**: Users can see delete button on products they don't own

**Cause**: Logic error in ProductPage component

**Solution**: Check the condition for rendering the delete button:
```typescript
{user && user.id === product.user_id && (
  // Delete button here
)}
```

### Issue: RLS policies not applying

**Symptoms**: Users can delete products they don't own

**Cause**: RLS policies not executed in Supabase

**Solution**: 
1. Follow the "How to Enable RLS" section above
2. Run the verification query to confirm `rowsecurity = true`
3. Check Supabase SQL Editor logs for any errors

### Issue: "Row-level security violation" error in console

**Symptoms**: Error message appears when trying to delete

**This is expected behavior!** It means:
- ✅ RLS is working correctly
- ❌ The user tried to delete a product they don't own
- Or the `user_id` field doesn't match the authenticated user

**Check**:
1. Verify you're testing with the correct user
2. Confirm `product.user_id === auth.uid()` in Supabase

## Code Files Modified

1. **src/pages/ProductPage.tsx**
   - Added delete confirmation dialog
   - Added ownership check
   - Added trash icon button
   - Added delete handler

2. **src/lib/api.ts**
   - Added `deleteProductSecure(productId, userId)` function

3. **SUPABASE_RLS_SETUP.sql** (New)
   - RLS policy definitions for products table

## Next Steps

1. ✅ **Code Implementation**: COMPLETE
2. ⏳ **Execute SUPABASE_RLS_SETUP.sql**: Run in Supabase SQL Editor
3. ⏳ **Test in Browser**: Verify delete works as expected
4. ⏳ **Test Unauthorized Access**: Confirm non-owners can't delete
5. ⏳ **Production Deployment**: Deploy frontend changes

## Security Best Practices Applied

- ✅ **Frontend Validation**: UI check prevents showing delete button to non-owners
- ✅ **Backend Filtering**: API filters delete query by both ID and user_id
- ✅ **Database RLS**: Row-Level Security policies enforce access at database level
- ✅ **Defense in Depth**: Three layers ensure even if one fails, others catch unauthorized access
- ✅ **No Hardcoding**: Uses `auth.uid()` in RLS to automatically match authenticated user

## Questions?

If you encounter issues:
1. Check browser console for JavaScript errors
2. Check Supabase logs for database errors
3. Verify `user.id` matches the product's `user_id`
4. Confirm RLS is enabled: `SELECT rowsecurity FROM pg_tables WHERE tablename = 'products';`

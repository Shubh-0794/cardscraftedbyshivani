# Firebase Security Specification & Audit Plan

## Data Invariants
1. User profile data can only be written by the user themselves or an Admin.
2. Orders, Customers, Products, Inventory, Payments, and Audit Logs are manageable by authenticated workspace staff/admins.
3. Customers can view their own orders filtered by customerId.
4. All IDs must match standard safe ID formats.
5. All mutations must adhere to structural schema size limits and valid field types.

## The Dirty Dozen Security Payloads
1. **Unauthenticated Read/Write**: Attempting to read or write without an auth token.
2. **Shadow Field Injection**: Adding unknown fields (e.g. `isAdmin: true`) to a user profile.
3. **Identity Spoofing**: Attempting to create an order or customer record with another user's ID.
4. **ID Poisoning**: Injecting > 1.5KB string into document path ID.
5. **Terminal State Lock Bypass**: Attempting to modify an order after it has reached terminal state without admin privilege.
6. **Immutable Field Tampering**: Modifying `createdAt` or `orderNumber` after creation.
7. **Negative Financial Quantities**: Setting subtotal or price to invalid types or negative values.
8. **Blanket Query Scraping**: Executing a query without proper user filter conditions.
9. **PII Exposure**: Reading arbitrary customer email and address records as an unauthorized caller.
10. **Denial of Wallet Payload**: Submitting a 500KB string payload inside string attributes.
11. **Client Timestamp Forgery**: Submitting client local time instead of server timestamps.
12. **Role Escalation**: Self-assigning `SUPER_ADMIN` role upon account registration.

## Validation Strategy
All security rules pass the Eight Pillars of Hardened Rules, enforce strict `isValidId()`, `isSignedIn()`, and type/size boundary logic.

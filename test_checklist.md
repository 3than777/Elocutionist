# Testing Checklist for Each Feature

## Comprehensive Testing Checklist

For every feature implementation, go through this checklist and test everything that applies:

- [ ] **Happy path works**: Normal use case succeeds with valid input
- [ ] **Returns correct status codes**: Proper HTTP status codes for each scenario
- [ ] **Validation errors return 400**: Invalid input data returns Bad Request
- [ ] **Missing auth returns 401**: Protected routes require authentication
- [ ] **Wrong user returns 403**: Users can only access their own resources
- [ ] **Not found returns 404**: Non-existent resources return Not Found
- [ ] **Server errors return 500**: Database/system errors handled gracefully
- [ ] **Response format matches expected schema**: Consistent JSON response structure
- [ ] **Data persists to database correctly**: Changes are saved and retrievable
- [ ] **Curl commands saved to test-commands.md**: Working test commands documented

## Usage Instructions

After implementing each feature:

1. **Run through applicable checklist items**
2. **Document test commands in test-commands.md**
3. **Verify all status codes and error handling**
4. **Test authentication and authorization**
5. **Confirm data persistence**
6. **Mark completed items with [x]**

## Authentication Token for Testing

Use this token for testing protected routes:

```
Token for testing protected routes: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODdjMGY0ZDkyNTcxMmFlNmJiZDZmYmMiLCJlbWFpbCI6Im5ld3VzZXJAZXhhbXBsZS5jb20iLCJpYXQiOjE3NTI5NjA4NDUsImV4cCI6MTc1MzA0NzI0NX0.YCBrPrnyh9xoYwTwWrMSZvtwryMZiCDza_MXUJvxGVA
```

## Feature Testing Template

```markdown
### [Feature Name] Testing Results

- [ ] Happy path works
- [ ] Returns correct status codes  
- [ ] Validation errors return 400
- [ ] Missing auth returns 401
- [ ] Wrong user returns 403
- [ ] Not found returns 404
- [ ] Server errors return 500
- [ ] Response format matches expected schema
- [ ] Data persists to database correctly
- [ ] Curl commands saved to test-commands.md

**Notes:** [Add any specific testing notes or issues here]
```

## Status Code Reference

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Validation errors, malformed data |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Valid auth but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource (e.g., email exists) |
| 500 | Internal Server Error | Database errors, system failures |

## Common Testing Scenarios

### Authentication Testing
- Valid token → Success
- Missing token → 401
- Invalid/expired token → 401
- Token for different user → 403 (if applicable)

### Validation Testing
- Missing required fields → 400
- Invalid data types → 400
- Data exceeding limits → 400
- Invalid formats (email, etc.) → 400

### Database Testing
- Create → Verify in database
- Read → Correct data returned
- Update → Changes persisted
- Delete → Resource removed

### Error Handling Testing
- Database connection failure → 500
- External service failure → 500
- Malformed JSON → 400
- Network timeouts → 500 
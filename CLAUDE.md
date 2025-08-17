# Development Guidelines for Claude

## Core Philosophy

**TEST-DRIVEN DEVELOPMENT IS NON-NEGOTIABLE.** Every line of production code must be written in response to a failing test. No exceptions.

I follow TDD with behavior-driven testing and functional programming principles. All work should be done in small, incremental changes maintaining a working state.

## Quick Reference

**Key Principles:**
- Write tests first (TDD)
- Test behavior, not implementation
- No `any` types or type assertions
- Immutable data only
- Small, pure functions
- TypeScript strict mode always
- Use real schemas/types in tests, never redefine them

**Preferred Tools:**
- **Language**: TypeScript (strict mode)
- **Testing**: Jest/Vitest + React Testing Library
- **State Management**: Prefer immutable patterns

## Testing Principles

### Behavior-Driven Testing
- **No "unit tests"** - verify expected behavior through public API exclusively
- No 1:1 mapping between test files and implementation files
- **Coverage**: 100% expected, based on business behavior not implementation
- Tests must document expected business behavior

### Testing Tools
- **Jest/Vitest** for testing frameworks
- **React Testing Library** for React components
- **MSW** for API mocking when needed
- All test code follows same TypeScript strict mode rules

### Test Organization
```
src/
  features/
    payment/
      payment-processor.ts
      payment-validator.ts
      payment-processor.test.ts // Validator is implementation detail
```

### Test Data Pattern
Use factory functions with optional overrides:
```typescript
const getMockPaymentRequest = (
  overrides?: Partial<PaymentRequest>
): PaymentRequest => ({
  amount: 100,
  cardId: "card_123",
  ...getMockCardDetails(),
  ...overrides,
});
```

## TypeScript Guidelines

### Strict Mode Requirements
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```
- **No `any`** - use `unknown` if type truly unknown
- **No type assertions** unless absolutely necessary
- **Prefer `type` over `interface`**
- Create domain-specific branded types for safety

### Schema-First Development with Zod
Define schemas first, derive types:
```typescript
import { z } from "zod";

const PaymentSchema = z.object({
  amount: z.number().positive(),
  cardId: z.string().min(1),
  metadata: z.record(z.unknown()).optional()
});

type Payment = z.infer<typeof PaymentSchema>;

export const parsePayment = (data: unknown): Payment => 
  PaymentSchema.parse(data);
```

**CRITICAL**: Tests must import real schemas from main project:
```typescript
// ❌ WRONG - Defining schemas in tests
const TestSchema = z.object({...});

// ✅ CORRECT - Import from shared location
import { PaymentSchema, type Payment } from "@your-org/schemas";
```

## Code Style

### Functional Programming
- **No data mutation** - immutable structures only
- **Pure functions** wherever possible
- **Composition** for code reuse
- Avoid heavy FP abstractions unless clearly beneficial
- Use array methods over imperative loops

### Code Structure
- **No nested if/else** - use early returns/guard clauses
- **Max 2 levels nesting**
- Small, single-responsibility functions
- Flat, readable code over clever abstractions

### Naming Conventions
- **Functions**: `camelCase`, verb-based
- **Types**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE` for true constants
- **Files**: `kebab-case.ts`
- **Test files**: `*.test.ts` or `*.spec.ts`

### No Comments in Code
Code should be self-documenting. Extract to well-named functions instead:
```typescript
// Avoid
if (payment.amount > 100 && payment.card.type === "credit") {
  // Apply 3D secure for credit cards over £100
}

// Good
const requires3DSecure = (payment: Payment): boolean => {
  const SECURE_THRESHOLD = 100;
  return payment.amount > SECURE_THRESHOLD && payment.card.type === "credit";
};
```

### Prefer Options Objects
Use for function parameters by default:
```typescript
// Avoid
const createPayment = (amount: number, currency: string, cardId: string): Payment => {};

// Good
type CreatePaymentOptions = {
  amount: number;
  currency: string;
  cardId: string;
};
const createPayment = (options: CreatePaymentOptions): Payment => {};
```

## Development Workflow

### TDD Process - THE FUNDAMENTAL PRACTICE

Follow Red-Green-Refactor strictly:

1. **Red**: Write failing test. NO PRODUCTION CODE until test fails.
2. **Green**: Write MINIMUM code to pass test.
3. **Refactor**: Assess improvement opportunities. Only refactor if it adds value.

**Common Violations to Avoid:**
- Writing production code without failing test first
- Writing multiple tests before making first pass
- Writing more code than needed to pass current test
- Skipping refactor assessment when code could improve

### Refactoring Guidelines

#### 1. Commit Before Refactoring
```bash
git add .
git commit -m "feat: add payment validation"
# Now safe to refactor
```

#### 2. Abstract Based on Semantic Meaning
Only abstract code sharing same semantic meaning:
```typescript
// Different concepts - DON'T abstract despite similar structure
const validatePaymentAmount = (amount: number): boolean => 
  amount > 0 && amount <= 10000;

const validateTransferAmount = (amount: number): boolean => 
  amount > 0 && amount <= 10000;

// Same concept - SAFE to abstract
const formatPersonName = (first: string, last: string): string => 
  `${first} ${last}`.trim();
// Use for all user/customer/employee names
```

#### 3. DRY = Don't Repeat Knowledge
DRY is about knowledge, not code structure:
```typescript
// NOT a DRY violation - different business rules
const validateUserAge = (age: number): boolean => age >= 18 && age <= 100;
const validateRating = (rating: number): boolean => rating >= 1 && rating <= 5;

// IS a DRY violation - same knowledge duplicated
const FREE_SHIPPING_THRESHOLD = 50; // Define once
const calculateShipping = (total: number): number => 
  total > FREE_SHIPPING_THRESHOLD ? 0 : 5.99;
```

#### 4. Maintain External APIs
Refactoring must never break existing consumers.

#### 5. Verify and Commit
After refactoring:
```bash
npm test          # Must pass
npm run lint      # Must pass
npm run typecheck # Must pass
git commit -m "refactor: extract validation helpers"
```

### Commit Guidelines
- Each commit = complete, working change
- Use conventional commits: `feat:`, `fix:`, `refactor:`, `test:`
- Include test changes with feature changes

### Pull Request Standards
- All tests/linting/checks must pass
- Small increments maintaining working state
- Focus on single feature/fix
- Describe behavior change, not implementation

## Working with Claude

### Expectations
1. **ALWAYS FOLLOW TDD** - No production code without failing test
2. **Think deeply** before edits
3. **Understand full context**
4. **Ask clarifying questions** when ambiguous
5. **Think from first principles**
6. **Assess refactoring after every green**
7. **Update CLAUDE.md with learnings** at end of every change

### Code Changes
- Start with failing test - always
- Assess refactoring after green (only if adds value)
- Verify tests/analysis pass before commit
- Respect existing patterns
- Maintain test coverage for all behavior
- Keep changes small and incremental

## Example Patterns

### Error Handling
```typescript
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

const processPayment = (payment: Payment): Result<ProcessedPayment> => {
  if (!isValid(payment)) 
    return { success: false, error: new Error("Invalid") };
  return { success: true, data: execute(payment) };
};
```

### Testing Behavior
Test through public API, achieve 100% coverage via business behavior:
```typescript
describe("Payment processing", () => {
  it("should reject negative amounts", () => {
    const payment = getMockPayment({ amount: -100 });
    const result = processPayment(payment);
    expect(result.success).toBe(false);
    expect(result.error.message).toBe("Invalid amount");
  });
});
```

### React Component Testing
```typescript
describe("PaymentForm", () => {
  it("should show error for invalid amount", async () => {
    render(<PaymentForm />);
    await userEvent.type(screen.getByLabelText("Amount"), "-100");
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(screen.getByText("Amount must be positive")).toBeInTheDocument();
  });
});
```

## Common Anti-patterns
```typescript
// Avoid: Mutation
items.push(newItem);

// Good: Immutable
return [...items, newItem];

// Avoid: Nested conditionals
if (user) {
  if (user.isActive) {
    if (user.hasPermission) {}
  }
}

// Good: Early returns
if (!user?.isActive || !user.hasPermission) return;
```

## Project-Specific Learnings

### Avatar System Implementation
1. **Dependencies**: Use `--legacy-peer-deps` for Three.js packages
2. **Backend Testing**: Mock middleware and models with proper exports
3. **ESLint**: Test files need separate config for Jest globals
4. **Architecture**: Service layer for 3D assets, cache to avoid reloads

### Avatar Component Development
1. **Architecture**: Separate concerns (container/3D/UI/environment)
2. **Testing**: Mock Three.js components as divs, test behavior not rendering
3. **React Three Fiber**: Use lowercase primitives, check method existence
4. **Performance**: Implement quality settings, throttle in lower modes

## Summary
Write clean, testable, functional code through small, safe increments. Every change driven by a test describing desired behavior, implementing simplest solution. Favor simplicity and readability over cleverness.
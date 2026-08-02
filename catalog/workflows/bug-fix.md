# Bug fix

Diagnose and correct a reproducible defect.

## Procedure

1. Confirm the expected and observed behavior and build a tight pass/fail loop.
2. Reproduce and minimize before ranking falsifiable hypotheses. Instrument one
   variable at a time instead of applying speculative fixes.
3. Record root cause, focused fix, regression evidence, original-reproduction
   verification, cleanup, and remaining risk.
4. Use `aif-verification-gate` before claiming the defect fixed.
5. Stop when the stated output is reviewed or a blocking decision is recorded.

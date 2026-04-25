# Gate Policy

## Gate Types
1. Scope Gate
2. Architecture Gate
3. Build Readiness Gate
4. Integration Gate
5. Validation Gate
6. Release Gate

## 1. Scope Gate
Required before architecture work begins.
Pass criteria:
- business objective is explicit
- input/output behavior is defined
- long-name policy is defined or intentionally deferred with risk noted
- mobile delivery expectation is explicit
- quality expectations are measurable

## 2. Architecture Gate
Required before implementation planning.
Pass criteria:
- rendering strategy selected
- API pattern selected
- storage stance defined
- persistence stance defined
- asset versioning approach defined
- open risks documented

## 3. Build Readiness Gate
Required before build agents start implementation.
Pass criteria:
- contracts are stable
- templates are versioned
- rendering bounding box is defined
- acceptance criteria per component are clear

## 4. Integration Gate
Required before QA full validation.
Pass criteria:
- API and UI contracts match
- rendering output fits UI assumptions
- file download behavior is consistent
- error semantics are aligned

## 5. Validation Gate
Required before release readiness.
Pass criteria:
- functional tests pass
- Arabic rendering cases pass
- mobile preview and download pass
- observability requirements are implemented
- no unresolved severity-1 or severity-2 defects

## 6. Release Gate
Required before production release.
Pass criteria:
- deployment plan approved
- rollback path defined
- alerts defined
- rate limiting enabled
- logs and metrics verified

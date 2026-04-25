# Security Policy

## Input Protection
- validate all fields server-side
- reject malformed email input
- sanitize and normalize name input
- enforce request payload size limits

## Service Protection
- apply rate limiting on generation endpoint
- log rejected requests for abuse analysis when appropriate
- do not expose sensitive storage credentials to the client

## Asset Protection
- template and font versions must be controlled
- runtime must fail safely if asset integrity is broken

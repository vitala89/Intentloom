# Compatibility Policy

Intentloom generates only documented provider formats. The compatibility matrix is the public status source: officially supported, shared-standard, generated adapter, experimental, or unsupported. Experimental and unsupported capabilities are reported, never emulated silently.

Intentloom requires Node.js 22 or newer. Node 22 is the directly verified minimum;
Node 24 is part of the complete CI matrix. All workspace packages use the same
engine range and the packed CLI targets Node 22.

The public alpha artifact is `intentloom`, which exposes the `intentloom` command. The
workspace libraries remain private and are not a supported import API.
Publication and continued use of that command name are contingent on the npm
authorization, naming/trademark, and cross-ecosystem command-collision gates in
`docs/releases/PUBLISH_AUTHORIZATION_CHECKLIST.md`; this policy does not claim
exclusive command-name ownership.

Stored metadata paths follow the host-independent contract in
`docs/reference/PATHS.md`. A simulated Windows path test is evidence for path
semantics, not proof of execution on Windows; only a real Windows CI run can
establish that host result.

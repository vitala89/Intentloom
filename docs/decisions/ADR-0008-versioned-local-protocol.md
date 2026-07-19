# ADR-0008: Versioned local protocol contract

## Status

Accepted

## Context

Platform Foundation needs a transport-independent contract before a local daemon
can exist. The contract must not pull process, socket, credential, or filesystem
behavior into the application layer, and it must not turn private workspace
packages into a public import API.

`doctorProject` is an existing read-only application operation with stable
findings and exit semantics. It is the safest first operation for a future local
daemon boundary.

## Decision

Use a private `@intentloom/protocol` workspace package containing JSON-RPC 2.0
compatible request and response types plus parsing and serialization helpers.
The first method is `intentloom.project.doctor.v1`; its version is encoded in the
method name and repeated as `protocolVersion: 1` in request and result payloads.
Requests require an explicit root, profile, and adapter list. The protocol owns
only wire validation; path safety, catalog loading, filesystem access, and doctor
semantics stay in the application layer.

The future daemon MVP operation is read-only doctor. This decision does not add a
transport, listener, daemon binary, session secret, token store, CLI mode, or
public protocol package.

## Consequences

Unknown methods, malformed JSON-RPC envelopes, invalid parameters, and unknown
protocol versions are rejected with JSON-RPC-compatible error classifications.
Serialization and parsing tests are the Phase 3 compatibility gate. Adding a new
operation or changing a versioned method requires an explicit compatibility
decision and tests; existing v1 payloads are not silently reinterpreted.

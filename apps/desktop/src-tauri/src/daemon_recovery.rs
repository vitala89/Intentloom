use std::io::{self, ErrorKind};

/// Process ownership as observed by this Desktop instance.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ChildState {
    None,
    Alive,
    Dead,
}

/// Result of probing the existing local endpoint.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProbeOutcome {
    #[allow(dead_code)]
    Success,
    StaleConnect,
    TemporaryFailure,
    AuthenticationFailed,
    Inaccessible,
    AuthenticatedRpcFailure,
}

/// Next lifecycle step. Endpoint removal is allowed only for the named recover
/// actions, and only for this Desktop instance's private runtime endpoint.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EnsureAction {
    Probe,
    ReuseExisting,
    LaunchOwned,
    RecoverStaleAndLaunch,
    ReclaimDeadChildAndLaunch,
    ReplaceUnownedSessionAndLaunch,
    FailKeepEndpoint,
}

pub fn next_action_before_probe(child: ChildState, endpoint_present: bool) -> EnsureAction {
    match child {
        ChildState::Dead => EnsureAction::ReclaimDeadChildAndLaunch,
        ChildState::Alive => EnsureAction::Probe,
        ChildState::None if endpoint_present => EnsureAction::Probe,
        ChildState::None => EnsureAction::LaunchOwned,
    }
}

pub fn next_action_after_probe(child: ChildState, probe: ProbeOutcome) -> EnsureAction {
    match probe {
        ProbeOutcome::Success => EnsureAction::ReuseExisting,
        ProbeOutcome::StaleConnect => stale_connect_action(child),
        ProbeOutcome::TemporaryFailure | ProbeOutcome::Inaccessible => {
            EnsureAction::FailKeepEndpoint
        }
        ProbeOutcome::AuthenticationFailed => EnsureAction::FailKeepEndpoint,
        ProbeOutcome::AuthenticatedRpcFailure => authenticated_failure_action(child),
    }
}

#[cfg(test)]
pub fn resolve_ensure(
    child: ChildState,
    endpoint_present: bool,
    probe: Option<ProbeOutcome>,
) -> EnsureAction {
    let before = next_action_before_probe(child, endpoint_present);
    if before != EnsureAction::Probe {
        return before;
    }
    next_action_after_probe(child, probe.unwrap_or(ProbeOutcome::TemporaryFailure))
}

pub fn is_recoverable_stale_connect(error: &io::Error) -> bool {
    matches!(
        error.kind(),
        ErrorKind::ConnectionRefused
            | ErrorKind::NotFound
            | ErrorKind::ConnectionReset
            | ErrorKind::BrokenPipe
            | ErrorKind::NotConnected
            | ErrorKind::AddrNotAvailable
    )
}

pub fn classify_connect_error(error: &io::Error) -> ProbeOutcome {
    if is_recoverable_stale_connect(error) {
        ProbeOutcome::StaleConnect
    } else if matches!(
        error.kind(),
        ErrorKind::TimedOut | ErrorKind::Interrupted | ErrorKind::WouldBlock
    ) {
        ProbeOutcome::TemporaryFailure
    } else if error.kind() == ErrorKind::PermissionDenied {
        ProbeOutcome::Inaccessible
    } else {
        ProbeOutcome::TemporaryFailure
    }
}

fn stale_connect_action(child: ChildState) -> EnsureAction {
    match child {
        ChildState::None => EnsureAction::RecoverStaleAndLaunch,
        ChildState::Alive | ChildState::Dead => EnsureAction::ReclaimDeadChildAndLaunch,
    }
}

fn authenticated_failure_action(child: ChildState) -> EnsureAction {
    match child {
        ChildState::None => EnsureAction::ReplaceUnownedSessionAndLaunch,
        ChildState::Alive => EnsureAction::FailKeepEndpoint,
        ChildState::Dead => EnsureAction::ReclaimDeadChildAndLaunch,
    }
}

#[cfg(test)]
mod tests {
    use super::{
        next_action_after_probe, next_action_before_probe, resolve_ensure, ChildState,
        EnsureAction, ProbeOutcome,
    };

    #[test]
    fn missing_endpoint_launches_owned_daemon() {
        assert_eq!(
            resolve_ensure(ChildState::None, false, None),
            EnsureAction::LaunchOwned
        );
    }

    #[test]
    fn live_endpoint_success_reuses_existing_daemon() {
        assert_eq!(
            resolve_ensure(ChildState::None, true, Some(ProbeOutcome::Success)),
            EnsureAction::ReuseExisting
        );
        assert_eq!(
            next_action_before_probe(ChildState::None, true),
            EnsureAction::Probe
        );
    }

    #[test]
    fn stale_endpoint_recovers_instead_of_looping() {
        assert_eq!(
            resolve_ensure(ChildState::None, true, Some(ProbeOutcome::StaleConnect)),
            EnsureAction::RecoverStaleAndLaunch
        );
        assert_eq!(
            resolve_ensure(ChildState::Alive, true, Some(ProbeOutcome::Success)),
            EnsureAction::ReuseExisting
        );
    }

    #[test]
    fn owned_dead_child_reclaims_and_launches() {
        assert_eq!(
            resolve_ensure(ChildState::Dead, true, None),
            EnsureAction::ReclaimDeadChildAndLaunch
        );
        assert_eq!(
            next_action_after_probe(ChildState::Alive, ProbeOutcome::StaleConnect),
            EnsureAction::ReclaimDeadChildAndLaunch
        );
    }

    #[test]
    fn leftover_authenticated_rpc_failure_replaces_unowned_session() {
        assert_eq!(
            resolve_ensure(
                ChildState::None,
                true,
                Some(ProbeOutcome::AuthenticatedRpcFailure)
            ),
            EnsureAction::ReplaceUnownedSessionAndLaunch
        );
    }

    #[test]
    fn authentication_failure_does_not_replace_endpoint() {
        assert_eq!(
            resolve_ensure(
                ChildState::None,
                true,
                Some(ProbeOutcome::AuthenticationFailed)
            ),
            EnsureAction::FailKeepEndpoint
        );
    }

    #[test]
    fn owned_alive_rpc_failure_keeps_endpoint() {
        assert_eq!(
            next_action_after_probe(ChildState::Alive, ProbeOutcome::AuthenticatedRpcFailure),
            EnsureAction::FailKeepEndpoint
        );
    }

    #[test]
    fn temporary_failure_does_not_delete_endpoint() {
        assert_eq!(
            resolve_ensure(ChildState::None, true, Some(ProbeOutcome::TemporaryFailure)),
            EnsureAction::FailKeepEndpoint
        );
        assert_eq!(
            resolve_ensure(ChildState::None, true, Some(ProbeOutcome::Inaccessible)),
            EnsureAction::FailKeepEndpoint
        );
    }
}

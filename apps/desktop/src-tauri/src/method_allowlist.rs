pub fn is_inception_method(method: &str) -> bool {
    matches!(
        method,
        "intentloom.inception.session.create.v1"
            | "intentloom.inception.session.get.v1"
            | "intentloom.inception.questions.list.v1"
            | "intentloom.inception.answer.record.v1"
            | "intentloom.inception.state.summarize.v1"
            | "intentloom.inception.conflicts.identify.v1"
            | "intentloom.inception.session.export.v1"
            | "intentloom.inception.session.delete.v1"
    )
}

pub fn is_foundation_method(method: &str) -> bool {
    matches!(
        method,
        "intentloom.foundation.workshop.create.v1"
            | "intentloom.foundation.workshop.get.v1"
            | "intentloom.foundation.questions.list.v1"
            | "intentloom.foundation.answer.record.v1"
            | "intentloom.foundation.understanding.summarize.v1"
            | "intentloom.foundation.conflicts.identify.v1"
            | "intentloom.foundation.readiness.evaluate.v1"
            | "intentloom.foundation.workshop.export.v1"
            | "intentloom.foundation.workshop.delete.v1"
            | "intentloom.foundation.discovery.questions.v1"
            | "intentloom.foundation.discovery.turn.v1"
            | "intentloom.foundation.blueprint.propose.v1"
            | "intentloom.foundation.blueprint.compare.v1"
            | "intentloom.foundation.blueprint.approve.v1"
            | "intentloom.foundation.blueprint.revoke.v1"
            | "intentloom.foundation.scaffold.prepare.v1"
            | "intentloom.foundation.scaffold.get.v1"
            | "intentloom.foundation.scaffold.compare.v1"
            | "intentloom.foundation.scaffold.validate.v1"
            | "intentloom.foundation.scaffold.apply.v1"
            | "intentloom.foundation.scaffold.rollback.v1"
            | "intentloom.existing-project.workspace.prepare.v1"
            | "intentloom.existing-project.adoption.plan.v1"
            | "intentloom.existing-project.adoption.decisions.v1"
            | "intentloom.existing-project.adoption.prepare.v1"
            | "intentloom.existing-project.adoption.revalidate.v1"
            | "intentloom.existing-project.adoption.approve.v1"
            | "intentloom.feature-intent.workspace.prepare.v1"
            | "intentloom.feature-intent.workspace.analyze.v1"
            | "intentloom.bounded-execution.workspace.prepare.v1"
            | "intentloom.bounded-execution.workspace.execute.v1"
            | "intentloom.continuous-loop.workspace.prepare.v1"
            | "intentloom.continuous-loop.workspace.execute.v1"
    )
}

#[cfg(test)]
mod tests {
    use super::{is_foundation_method, is_inception_method};

    #[test]
    fn allows_continuous_loop_methods_without_wildcard() {
        assert!(is_foundation_method(
            "intentloom.continuous-loop.workspace.prepare.v1"
        ));
        assert!(is_foundation_method(
            "intentloom.continuous-loop.workspace.execute.v1"
        ));
        assert!(is_foundation_method(
            "intentloom.existing-project.adoption.plan.v1"
        ));
        assert!(is_foundation_method(
            "intentloom.existing-project.adoption.decisions.v1"
        ));
        assert!(is_foundation_method(
            "intentloom.existing-project.adoption.prepare.v1"
        ));
        assert!(is_foundation_method(
            "intentloom.existing-project.adoption.revalidate.v1"
        ));
        assert!(is_foundation_method(
            "intentloom.existing-project.adoption.approve.v1"
        ));
        assert!(!is_foundation_method(
            "intentloom.existing-project.adoption.apply.v1"
        ));
        assert!(!is_foundation_method(
            "intentloom.continuous-loop.workspace.*"
        ));
        assert!(!is_inception_method(
            "intentloom.continuous-loop.workspace.prepare.v1"
        ));
    }
}

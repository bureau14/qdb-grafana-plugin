#!/usr/bin/env python3
"""Buildkite dynamic pipeline generator for qdb-grafana-plugin.

Usage:
    python3 pipeline.py           # emit pipeline YAML to stdout
    python3 pipeline.py check     # validate without emitting
"""

from __future__ import annotations

import dataclasses
import sys
from pathlib import Path

from buildkite_sdk import CommandStep, Pipeline

sys.path.insert(0, str(Path(__file__).parent / "tools"))
from qdb_pipeline import (  # noqa: E402
    Platform,
    apply_docker,
    get_git_ref,
    load_template,
    merge_env,
    select_platforms,
    set_artifact_plugin_options,
    validate_pipeline,
)

STEPS_DIR = Path(__file__).parent / "steps"

_LINUX = {"docker_image": "bureau14/builder:rhel7"}
PLATFORMS: list[Platform] = [
    dataclasses.replace(platform, **_LINUX)
    for platform in select_platforms("linux-amd64-core2")
]
BUILD_TYPES = ["Release"]

GO_VERSION_SLUG = "124"

AGENT_ENV: dict[str, str] = {
    "NODE_VERSION": "16.20.2",
    "NODEJS_CMD": "$$QDB_CICD_AGENT_NODEJS_PATH",
    "NODE_GYP_CMD": "$$QDB_CICD_AGENT_NODE_GYP_PATH",
    "GOPATH": f"$$QDB_CICD_AGENT_GO{GO_VERSION_SLUG}_PATH",
    "GOROOT": f"$$QDB_CICD_AGENT_GO{GO_VERSION_SLUG}_ROOT",
    "GOFLAGS": "-buildvcs=false",
}


def _env(platform: Platform, build_type: str) -> dict[str, str]:
    """Compose the Buildkite environment for the sole supported target."""
    return merge_env(
        AGENT_ENV,
        {"CMAKE_BUILD_TYPE": build_type},
        platform=platform,
    )


def generate_pipeline() -> Pipeline:
    """Generate the single Linux amd64 Release build-and-test job."""
    pipeline = Pipeline()
    git_ref = get_git_ref()

    for platform in PLATFORMS:
        for build_type in BUILD_TYPES:
            slug = platform.slug(build_type.lower())
            template_vars = {
                "slug": slug,
                "queue": platform.queue(),
                "name": slug.replace("-", " ").title(),
            }
            artifact_options = {
                "download": {
                    "variant": slug,
                    "git-ref": git_ref,
                    "by_project": {
                        "qdb-api-rest": {"variant": f"{slug}-go{GO_VERSION_SLUG}"}
                    },
                },
                "upload": {
                    "variant": slug,
                    "git-ref": git_ref,
                },
            }

            step = load_template(STEPS_DIR / "_build.yml", **template_vars)
            step["env"] = _env(platform, build_type)
            apply_docker(step, platform.docker_image)
            set_artifact_plugin_options(step, artifact_options)
            pipeline.add_step(CommandStep.from_dict(step))

    return pipeline


def main() -> None:
    command = sys.argv[1] if len(sys.argv) > 1 else "generate"

    try:
        pipeline = generate_pipeline()
    except Exception as error:
        print(f"[FAIL] Pipeline generation failed: {error}", file=sys.stderr)
        sys.exit(1)

    if command == "generate":
        print(pipeline.to_yaml())
    elif command == "check":
        errors = validate_pipeline(pipeline)
        if errors:
            for error in errors:
                print(f"[FAIL] {error}", file=sys.stderr)
            sys.exit(1)
        print(f"[OK] Pipeline valid: {len(pipeline.steps)} steps")
    else:
        print(f"Unknown command: {command}", file=sys.stderr)
        print("Usage: pipeline.py [generate|check]", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

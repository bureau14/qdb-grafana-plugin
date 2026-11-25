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
    run,
    select_platforms,
    set_artifact_plugin_options,
)

STEPS_DIR = Path(__file__).parent / "steps"

_LINUX = {}
PLATFORMS: list[Platform] = [
    dataclasses.replace(platform, **_LINUX)
    for platform in select_platforms("linux-amd64-core2")
]
BUILD_TYPES = ["Release"]

GO_VERSION_SLUG = "127"  # Go 1.27

AGENT_ENV: dict[str, str] = {
    "NODE_VERSION": "16",
    "NODEJS_CMD": "$$QDB_CICD_AGENT_NODEJS_PATH",
    "NODE_GYP_CMD": "$$QDB_CICD_AGENT_NODE_GYP_PATH",
    "GOPATH": f"$$QDB_CICD_AGENT_GO{GO_VERSION_SLUG}_PATH",
    "GOROOT": f"$$QDB_CICD_AGENT_GO{GO_VERSION_SLUG}_ROOT",
    "GOFLAGS": "-buildvcs=false",
    "GRAFANA_PLUGIN_SIGNING_TOKEN_SSM_PARAM": "/services/buildkite/credentials/grafana/signing-token",
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
                "download": {"variant": slug, "git_ref": git_ref},
                "upload": {"variant": slug},
            }

            step = load_template(STEPS_DIR / "_build.yml", **template_vars)
            env = _env(platform, build_type)
            env.update(step.get("env") or {})
            step["env"] = env
            set_artifact_plugin_options(step, artifact_options)
            pipeline.add_step(CommandStep.from_dict(step))

    return pipeline


if __name__ == "__main__":
    run(generate_pipeline)

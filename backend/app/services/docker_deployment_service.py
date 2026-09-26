import logging
import shutil
import subprocess
import sys
import tempfile
import time
import uuid
from pathlib import Path
from typing import TextIO


class log_callback:
    """Simple callable logger used to report deployment progress."""

    def __init__(
        self,
        logger: logging.Logger | None = None,
        stream: TextIO | None = None,
    ):
        self.logger = logger or logging.getLogger("releaseforge.deployments")
        self.stream = stream or sys.stdout

    def __call__(self, message: str, level: str = "INFO") -> None:
        level_name = str(level).upper()
        log_level = getattr(logging, level_name, logging.INFO)
        self.logger.log(log_level, message)
        print(f"[{level_name}] {message}", file=self.stream, flush=True)

    def info(self, message: str) -> None:
        self.__call__(message, "INFO")

    def warning(self, message: str) -> None:
        self.__call__(message, "WARNING")

    def error(self, message: str) -> None:
        self.__call__(message, "ERROR")

    def close(self) -> None:
        if self.stream is not None and not self.stream.closed:
            self.stream.flush()


class DockerDeploymentError(Exception):
    pass


def deploy_repository(
    repository_url: str,
    branch: str = "main",
    deployment_id: str | None = None,
    log_callback=None,
):
    if not repository_url:
        raise DockerDeploymentError("Repository URL is required")

    if not shutil.which("docker"):
        raise DockerDeploymentError(
            "Docker is not installed or not available"
        )

    if not shutil.which("git"):
        raise DockerDeploymentError(
            "Git is not installed or not available"
        )

    deployment_id = deployment_id or str(uuid.uuid4())

    image_tag = f"releaseforge:{deployment_id}"
    container_name = f"releaseforge-{deployment_id}"

    workdir = Path(
        tempfile.mkdtemp(prefix="releaseforge-")
    )

    try:
        repo_dir = workdir / "repo"
        if log_callback:
            log_callback("Cloning repository...")

        clone_result = subprocess.run(
            [
                "git",
                "clone",
                "--depth",
                "1",
                "--branch",
                branch,
                repository_url,
                str(repo_dir),
            ],
            capture_output=True,
            text=True,
            timeout=120,
        )

        if clone_result.returncode != 0:
            raise DockerDeploymentError(
                f"Git clone failed: "
                f"{clone_result.stderr.strip()}"
            )

        dockerfile = repo_dir / "Dockerfile"

        if not dockerfile.exists():
            raise DockerDeploymentError(
                "Repository does not contain a Dockerfile"
            )

        if log_callback:
            log_callback("Building Docker image...")

        build_result = subprocess.run(
            [
                "docker",
                "build",
                "-t",
                image_tag,
                str(repo_dir),
            ],
            capture_output=True,
            text=True,
            timeout=600,
        )

        if build_result.returncode != 0:
            raise DockerDeploymentError(
                "Docker build failed:\n"
                + build_result.stderr.strip()
            )

        if log_callback:
            log_callback("Starting Docker container...")

        run_result = subprocess.run(
            [
                "docker",
                "run",
                "-d",
                "--name",
                container_name,
                "-p",
                "0:8000",
                image_tag,
            ],
            capture_output=True,
            text=True,
            timeout=120,
        )

        if run_result.returncode != 0:
            raise DockerDeploymentError(
                "Docker container failed to start:\n"
                + run_result.stderr.strip()
            )

        container_id = run_result.stdout.strip()

        port_result = subprocess.run(
            [
                "docker",
                "port",
                container_name,
                "8000",
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )

        if port_result.returncode != 0:
            raise DockerDeploymentError(
                "Could not determine container port"
            )

        port_output = port_result.stdout.strip()
        host_port = port_output.split(":")[-1]

        time.sleep(3)

        if log_callback:
            log_callback("Running health check...")

        health_result = subprocess.run(
            [
                "curl",
                "-f",
                f"http://127.0.0.1:{host_port}/health",
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )

        if health_result.returncode != 0:
            logs_result = subprocess.run(
                [
                    "docker",
                    "logs",
                    container_name,
                ],
                capture_output=True,
                text=True,
                timeout=30,
            )

            raise DockerDeploymentError(
                "Health check failed.\n"
                + logs_result.stdout
                + logs_result.stderr
            )

        if log_callback:
            log_callback("Health check passed. Application is live.")

        return {
            "status": "success",
            "image": image_tag,
            "container": container_name,
            "container_id": container_id,
            "repository": repository_url,
            "branch": branch,
            "port": host_port,
            "url": f"http://localhost:{host_port}",
            "logs": (
                "Repository cloned successfully.\n"
                "Docker image built successfully.\n"
                "Container started successfully.\n"
                "Health check passed.\n"
                "Application is live.\n"
            ),
        }

    except subprocess.TimeoutExpired as exc:
        raise DockerDeploymentError(
            f"Deployment command timed out: {exc}"
        ) from exc

    finally:
        shutil.rmtree(
            workdir,
            ignore_errors=True,
        )


def cleanup_docker_resources(
    container_name: str | None = None,
    image_name: str | None = None,
):
    if not shutil.which("docker"):
        return

    if container_name:
        subprocess.run(
            [
                "docker",
                "rm",
                "-f",
                container_name,
            ],
            capture_output=True,
            text=True,
            timeout=60,
        )

    if image_name:
        subprocess.run(
            [
                "docker",
                "rmi",
                "-f",
                image_name,
            ],
            capture_output=True,
            text=True,
            timeout=60,
        )

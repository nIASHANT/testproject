from app.services.github_service import (
    get_github_repository_contents,
    get_github_file_content,
)


def analyze_repository(repo_url: str, branch: str):
    contents = get_github_repository_contents(repo_url)

    names = [item["name"] for item in contents]

    summary = {
        "repository": repo_url,
        "branch": branch,
        "detected_files": names,

        "language": "Unknown",
        "framework": "Unknown",
        "package_manager": "Unknown",

        "docker": False,
        "docker_compose": False,
        "github_actions": False,
        "readme": False,
        "tests": False,

        "install_command": None,
        "build_command": None,
        "start_command": None,

        "deployment_ready": False,
        "score": 0,
    }

    # JavaScript / TypeScript
    if "package.json" in names:
        summary["language"] = "JavaScript/TypeScript"

        if "package-lock.json" in names:
            summary["package_manager"] = "npm"
        elif "yarn.lock" in names:
            summary["package_manager"] = "yarn"
        elif "pnpm-lock.yaml" in names:
            summary["package_manager"] = "pnpm"
        else:
            summary["package_manager"] = "npm"

        pkg = get_github_file_content(
            repo_url,
            "package.json",
            branch,
        )["content"].lower()

        if "next" in pkg:
            summary["framework"] = "Next.js"
            summary["build_command"] = "npm run build"
            summary["start_command"] = "npm run start"
        elif "react" in pkg:
            summary["framework"] = "React"
            summary["build_command"] = "npm run build"
            summary["start_command"] = "npm start"
        elif "express" in pkg:
            summary["framework"] = "Express"
            summary["start_command"] = "npm start"

        if summary["package_manager"] == "yarn":
            summary["install_command"] = "yarn install"
        elif summary["package_manager"] == "pnpm":
            summary["install_command"] = "pnpm install"
        else:
            summary["install_command"] = "npm install"

    # Python
    elif (
        "pyproject.toml" in names
        or "setup.py" in names
        or "requirements.txt" in names
        or "requirements-dev.txt" in names
    ):
        summary["language"] = "Python"

        if "pyproject.toml" in names:
            summary["package_manager"] = "Poetry / PEP 621"
        elif (
            "requirements.txt" in names
            or "requirements-dev.txt" in names
        ):
            summary["package_manager"] = "pip"

        # Detect framework/library
        if "requirements.txt" in names:
            req = get_github_file_content(
                repo_url,
                "requirements.txt",
                branch,
            )["content"].lower()

            if "fastapi" in req:
                summary["framework"] = "FastAPI"
            elif "django" in req:
                summary["framework"] = "Django"
            elif "flask" in req:
                summary["framework"] = "Flask"

        if summary["framework"] == "Unknown" and "pyproject.toml" in names:
            pyproject = get_github_file_content(
                repo_url,
                "pyproject.toml",
                branch,
            )["content"].lower()

            if "fastapi" in pyproject:
                summary["framework"] = "FastAPI"
            elif "django" in pyproject:
                summary["framework"] = "Django"
            elif "flask" in pyproject:
                summary["framework"] = "Flask"
            else:
                summary["framework"] = "Python Library"

        # Python commands
        if "pyproject.toml" in names:
            summary["install_command"] = "pip install -e ."
        elif "requirements.txt" in names:
            summary["install_command"] = "pip install -r requirements.txt"
        else:
            summary["install_command"] = (
                "pip install -r requirements-dev.txt"
            )

        if summary["framework"] == "FastAPI":
            summary["start_command"] = (
                "uvicorn app.main:app --host 0.0.0.0 --port 8000"
            )
        elif summary["framework"] == "Flask":
            summary["start_command"] = "flask run"
        elif summary["framework"] == "Django":
            summary["start_command"] = (
                "python manage.py runserver 0.0.0.0:8000"
            )
        else:
            summary["start_command"] = "python -m <your_module>"

    # Go
    elif "go.mod" in names:
        summary["language"] = "Go"
        summary["install_command"] = "go mod download"
        summary["build_command"] = "go build ./..."
        summary["start_command"] = "go run ."

    # Rust
    elif "Cargo.toml" in names:
        summary["language"] = "Rust"
        summary["install_command"] = "cargo build"
        summary["build_command"] = "cargo build --release"
        summary["start_command"] = "cargo run"

    # Deployment readiness detection
    if "Dockerfile" in names:
        summary["docker"] = True

    if (
        "docker-compose.yml" in names
        or "docker-compose.yaml" in names
    ):
        summary["docker_compose"] = True

    if ".github" in names:
        summary["github_actions"] = True

    if "README.md" in names or "README.rst" in names:
        summary["readme"] = True

    if "tests" in names or "test" in names:
        summary["tests"] = True

    score = 0

    if summary["readme"]:
        score += 15

    if summary["tests"]:
        score += 20

    if summary["github_actions"]:
        score += 20

    if summary["docker"]:
        score += 25

    if summary["docker_compose"]:
        score += 10

    if summary["language"] != "Unknown":
        score += 10

    summary["score"] = score
    summary["deployment_ready"] = score >= 50

    return summary

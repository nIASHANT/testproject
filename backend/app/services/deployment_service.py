from app.services.analysis_service import analyze_repository


def generate_deployment_plan(repo_url: str, branch: str):
    analysis = analyze_repository(repo_url, branch)

    language = analysis["language"]
    framework = analysis["framework"]

    if language == "Python":
        if framework == "FastAPI":
            platform = "Railway or Render"
            runtime = "Python 3.10+"
            install = analysis["install_command"]
            start = (
                "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
            )
        elif framework == "Django":
            platform = "Render"
            runtime = "Python 3.10+"
            install = analysis["install_command"]
            start = (
                "python manage.py migrate && "
                "gunicorn project.wsgi"
            )
        elif framework == "Flask":
            platform = "Render"
            runtime = "Python 3.10+"
            install = analysis["install_command"]
            start = "gunicorn app:app"
        else:
            platform = "Railway"
            runtime = "Python"
            install = analysis["install_command"]
            start = analysis["start_command"]

    elif language == "JavaScript/TypeScript":
        if framework == "Next.js":
            platform = "Vercel"
        else:
            platform = "Railway"

        runtime = "Node.js 18+"
        install = analysis["install_command"]
        start = analysis["start_command"]

    elif language == "Go":
        platform = "Railway"
        runtime = "Go 1.22+"
        install = analysis["install_command"]
        start = analysis["start_command"]

    elif language == "Rust":
        platform = "Railway"
        runtime = "Rust stable"
        install = analysis["install_command"]
        start = analysis["start_command"]

    else:
        platform = "Docker"
        runtime = "Container"
        install = None
        start = None

    steps = [
        f"Connect the GitHub repository to {platform}.",
        "Select the default branch.",
        f"Use runtime: {runtime}.",
    ]

    if install:
        steps.append(f"Install command: {install}")

    if start:
        steps.append(f"Start command: {start}")

    steps.append("Set required environment variables.")
    steps.append("Deploy and verify the health endpoint.")

    return {
        "platform": platform,
        "runtime": runtime,
        "install_command": install,
        "start_command": start,
        "deployment_ready": analysis["deployment_ready"],
        "score": analysis["score"],
        "steps": steps,
    }

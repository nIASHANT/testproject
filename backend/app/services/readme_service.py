from app.services.analysis_service import analyze_repository
from app.services.github_service import get_github_repository_metadata


def generate_readme(repo_url: str, branch: str):
    analysis = analyze_repository(repo_url, branch)
    metadata = get_github_repository_metadata(repo_url)

    project_name = metadata["repo"]
    description = metadata["description"] or "Project description"

    install = analysis["install_command"] or "Install dependencies"
    build = analysis["build_command"]
    start = analysis["start_command"] or "Run the application"

    readme = f"# {project_name}\n\n"
    readme += f"{description}\n\n"

    readme += "## Tech Stack\n\n"
    readme += f"- Language: {analysis['language']}\n"
    readme += f"- Framework: {analysis['framework']}\n"
    readme += f"- Package Manager: {analysis['package_manager']}\n\n"

    readme += "## Installation\n\n"
    readme += "```bash\n"
    readme += install + "\n"
    readme += "```\n\n"

    if build:
        readme += "## Build\n\n"
        readme += "```bash\n"
        readme += build + "\n"
        readme += "```\n\n"

    readme += "## Run\n\n"
    readme += "```bash\n"
    readme += start + "\n"
    readme += "```\n\n"

    readme += "## Project Information\n\n"
    readme += f"- Default Branch: {branch}\n"
    readme += (
        "- Deployment Ready: "
        + ("Yes" if analysis["deployment_ready"] else "No")
        + "\n"
    )
    readme += f"- Readiness Score: {analysis['score']}/100\n\n"

    readme += "## Repository\n\n"
    readme += repo_url + "\n"

    return {
        "repository": repo_url,
        "branch": branch,
        "readme": readme,
    }

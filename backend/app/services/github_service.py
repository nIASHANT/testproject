import requests


def validate_github_repository(
    repo_url: str,
    branch: str,
):
    parts = repo_url.rstrip("/").split("/")

    if len(parts) < 5:
        raise ValueError("Invalid GitHub repository URL")

    if parts[2] != "github.com":
        raise ValueError("Only GitHub repositories are supported")

    owner = parts[3]
    repo = parts[4]

    github_api_url = f"https://api.github.com/repos/{owner}/{repo}"

    response = requests.get(
        github_api_url,
        timeout=10,
    )

    if response.status_code == 404:
        raise ValueError("GitHub repository not found")

    if response.status_code != 200:
        raise ValueError("Unable to validate GitHub repository")

    branch_api_url = (
        f"https://api.github.com/repos/{owner}/{repo}/branches/{branch}"
    )

    branch_response = requests.get(
        branch_api_url,
        timeout=10,
    )

    if branch_response.status_code == 404:
        raise ValueError(
            f"GitHub branch '{branch}' not found"
        )

    if branch_response.status_code != 200:
        raise ValueError(
            "Unable to validate GitHub branch"
        )

    return {
        "owner": owner,
        "repo": repo,
        "branch": branch,
    }


def get_github_repository_metadata(
    repo_url: str,
):
    parts = repo_url.rstrip("/").split("/")

    if len(parts) < 5:
        raise ValueError("Invalid GitHub repository URL")

    if parts[2] != "github.com":
        raise ValueError("Only GitHub repositories are supported")

    owner = parts[3]
    repo = parts[4]

    github_api_url = f"https://api.github.com/repos/{owner}/{repo}"

    response = requests.get(
        github_api_url,
        timeout=10,
    )

    if response.status_code == 404:
        raise ValueError("GitHub repository not found")

    if response.status_code != 200:
        raise ValueError(
            "Unable to fetch GitHub repository metadata"
        )

    data = response.json()

    return {
        "owner": data["owner"]["login"],
        "repo": data["name"],
        "description": data["description"],
        "default_branch": data["default_branch"],
        "language": data["language"],
        "stars": data["stargazers_count"],
        "forks": data["forks_count"],
        "open_issues": data["open_issues_count"],
        "private": data["private"],
    }



def get_github_repository_contents(
    repo_url: str,
    path: str = "",
):
    parts = repo_url.rstrip("/").split("/")

    if len(parts) < 5:
        raise ValueError("Invalid GitHub repository URL")

    if parts[2] != "github.com":
        raise ValueError("Only GitHub repositories are supported")

    owner = parts[3]
    repo = parts[4]

    github_api_url = (
        f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    )

    response = requests.get(
        github_api_url,
        timeout=10,
    )

    if response.status_code == 404:
        raise ValueError("Repository path not found")

    if response.status_code != 200:
        raise ValueError(
            "Unable to fetch GitHub repository contents"
        )

    return response.json()

def get_github_file_content(
    repo_url: str,
    path: str,
    branch: str = "main",
):
    parts = repo_url.rstrip("/").split("/")

    if len(parts) < 5:
        raise ValueError("Invalid GitHub repository URL")

    if parts[2] != "github.com":
        raise ValueError("Only GitHub repositories are supported")

    owner = parts[3]
    repo = parts[4]

    github_api_url = (
        f"https://api.github.com/repos/"
        f"{owner}/{repo}/contents/{path}"
    )

    response = requests.get(
        github_api_url,
        params={"ref": branch},
        timeout=10,
    )

    if response.status_code == 404:
        raise ValueError("File not found")

    if response.status_code != 200:
        raise ValueError(
            "Unable to fetch GitHub file"
        )

    data = response.json()

    if data.get("type") != "file":
        raise ValueError("The provided path is not a file")

    import base64

    content = base64.b64decode(
        data["content"]
    ).decode("utf-8")

    return {
        "name": data["name"],
        "path": data["path"],
        "size": data["size"],
        "content": content,
    }

def get_latest_commit_sha(
    repo_url: str,
    branch: str = "main",
):
    parts = repo_url.rstrip("/").split("/")

    if len(parts) < 5:
        raise ValueError("Invalid GitHub repository URL")

    if parts[2] != "github.com":
        raise ValueError("Only GitHub repositories are supported")

    owner = parts[3]
    repo = parts[4]

    github_api_url = (
        f"https://api.github.com/repos/"
        f"{owner}/{repo}/branches/{branch}"
    )

    response = requests.get(
        github_api_url,
        timeout=10,
    )

    if response.status_code == 404:
        raise ValueError(
            f"GitHub branch '{branch}' not found"
        )

    if response.status_code != 200:
        raise ValueError(
            "Unable to fetch latest GitHub commit"
        )

    data = response.json()

    commit_sha = data.get("commit", {}).get("sha")

    if not commit_sha:
        raise ValueError(
            "Latest GitHub commit SHA not found"
        )

    return commit_sha



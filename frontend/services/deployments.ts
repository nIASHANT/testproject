import api from "@/services/api";

export type DeploymentEnvironment = {
  id: string;
  project_id: string;
  name: string;
  branch: string;
  platform: string | null;
  status: string;
  variables: string | null;
  created_at: string;
};

export type Deployment = {
  id: string;
  environment_id: string;
  commit_sha: string | null;
  branch: string | null;
  status: string;
  platform: string | null;
  logs: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  deployment_url: string | null;
  created_at: string;
};

export async function getEnvironments(projectId: string) {
  const response = await api.get(
    `/deployment-environments/project/${projectId}`
  );
  return response.data as DeploymentEnvironment[];
}

export async function createEnvironment(data: {
  project_id: string;
  name: string;
  branch: string;
  platform?: string | null;
  status?: string;
  variables?: string | null;
}) {
  const response = await api.post(
    "/deployment-environments",
    data
  );
  return response.data as DeploymentEnvironment;
}

export async function updateEnvironment(
  environmentId: string,
  data: {
    name?: string;
    branch?: string;
    platform?: string | null;
    status?: string;
    variables?: string | null;
  }
) {
  const response = await api.put(
    `/deployment-environments/${environmentId}`,
    data
  );
  return response.data as DeploymentEnvironment;
}

export async function deleteEnvironment(environmentId: string) {
  return api.delete(
    `/deployment-environments/${environmentId}`
  );
}

export async function getDeployments(environmentId: string) {
  const response = await api.get(
    `/deployments/environment/${environmentId}`
  );
  return response.data as Deployment[];
}

export async function createDeployment(data: {
  environment_id: string;
  commit_sha?: string | null;
  branch?: string | null;
  platform?: string | null;
}) {
  const response = await api.post(
    "/deployments",
    data
  );
  return response.data as Deployment;
}

export async function updateDeployment(
  deploymentId: string,
  data: {
    status?: string;
    commit_sha?: string;
    branch?: string;
    platform?: string;
    logs?: string;
    started_at?: string;
    completed_at?: string;
    duration_seconds?: number;
  }
) {
  const response = await api.put(
    `/deployments/${deploymentId}`,
    data
  );
  return response.data as Deployment;
}

export async function redeployDeployment(
  deploymentId: string
) {
  const response = await api.post(
    `/deployments/${deploymentId}/redeploy`
  );

  return response.data as Deployment;
}

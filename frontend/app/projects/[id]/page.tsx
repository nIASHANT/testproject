"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import api from "@/services/api";
import {
  createDeployment,
  createEnvironment,
  deleteEnvironment,
  getDeployments,
  getEnvironments,
  redeployDeployment,
  updateEnvironment,
  type Deployment,
  type DeploymentEnvironment,
} from "@/services/deployments";

import { getCurrentUser, CurrentUser } from "@/services/auth";

import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Code2,
  Download,
  Edit3,
  ExternalLink,
  File,
  FileCode2,
  FileText,
  Folder,
  FolderOpen,
  GitBranch,
  HardDrive,
  Loader2,
  RotateCcw,
  Package,
  Play,
  Plus,
  RefreshCw,
  Rocket,
  Server,
  ShieldCheck,
  Terminal,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react";



type Repository = {
  id: string;
  project_id: string;
  repo_url: string;
  branch: string;
  provider?: string;
};

type Project = {
  id: string;
  name: string;
  description?: string;
};

type ProjectFile = {
  id: string;
  project_id: string;
  original_filename: string;
  content_type: string | null;
  size: number;
  created_at: string;
};

type DeploymentPlan = {
  platform?: string;
  runtime?: string;
  score?: number;
  steps?: string[];
};

type AnalysisData = {
  detected_files?: string[];
  [key: string]: any;
};

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();

  const projectId = params.id as string;

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [project, setProject] =
    useState<Project | null>(null);

  // Repository
  const [repoUrl, setRepoUrl] = useState(
    "https://github.com/psf/requests"
  );

  const [branch, setBranch] = useState("main");

  const [repository, setRepository] =
    useState<Repository | null>(null);

  const [connecting, setConnecting] =
    useState(false);

  // Analysis
  const [analysis, setAnalysis] =
    useState<AnalysisData | null>(null);

  const [analysisLoading, setAnalysisLoading] =
    useState(false);

  // README
  const [readme, setReadme] =
    useState<string | null>(null);

  const [readmeLoading, setReadmeLoading] =
    useState(false);

  // Deployment
  const [deployment, setDeployment] =
    useState<DeploymentPlan | null>(null);

  const [deploymentLoading, setDeploymentLoading] =
    useState(false);

      // Deployment Center
  const [environments, setEnvironments] = useState<
    DeploymentEnvironment[]
  >([]);

  const [selectedEnvironment, setSelectedEnvironment] =
    useState<DeploymentEnvironment | null>(null);

  const [deployments, setDeployments] = useState<Deployment[]>(
    []
  );

  
  const currentDeployment = useMemo(() => {
    return deployments.find(
      (deployment) =>
        deployment.status === "success" &&
        deployment.deployment_url
    ) || null;
  }, [deployments]);



  const [selectedDeployment, setSelectedDeployment] =
  useState<Deployment | null>(null);

  const [deploymentCenterLoading, setDeploymentCenterLoading] =
    useState(false);

  const [environmentModalOpen, setEnvironmentModalOpen] =
    useState(false);

  const [editingEnvironment, setEditingEnvironment] =
    useState<DeploymentEnvironment | null>(null);

  const [environmentForm, setEnvironmentForm] = useState({
    name: "",
    branch: "main",
    platform: "",
    status: "active",
    variables: "",
  });

  const [savingEnvironment, setSavingEnvironment] =
    useState(false);

  const [deployingEnvironmentId, setDeployingEnvironmentId] =
  useState<string | null>(null);

const [redeployingDeploymentId, setRedeployingDeploymentId] =
  useState<string | null>(null);

  // Files
  const [files, setFiles] =
    useState<ProjectFile[]>([]);

  const [uploading, setUploading] =
    useState(false);

  const [uploadProgress, setUploadProgress] =
    useState(0);

  const [loadingFiles, setLoadingFiles] =
    useState(false);

  const [deletingFileId, setDeletingFileId] =
    useState<string | null>(null);

  const [error, setError] = useState("");

  const canOperate =
    currentUser?.role === "admin" ||
    currentUser?.role === "operator";

  const canDelete =
    currentUser?.role === "admin";

  async function loadCurrentUser() {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
    } catch {
      router.push("/");
    }
  }

  async function loadProject() {
    try {
      const response = await api.get("/projects");

      const found = response.data.find(
        (item: Project) => item.id === projectId
      );

      if (found) {
        setProject(found);
      }
    } catch (err: any) {
      console.error(
        "Failed to load project:",
        err.response?.data || err.message
      );
    }
  }

  async function loadRepository() {
    try {
      const response = await api.get(
        `/repositories/project/${projectId}`
      );

      setRepository(response.data);

      if (response.data?.repo_url) {
        setRepoUrl(response.data.repo_url);
      }

      if (response.data?.branch) {
        setBranch(response.data.branch);
      }
    } catch (err: any) {
      console.log(
        "Repository not connected:",
        err.response?.data || err.message
      );
    }
  }

  async function loadFiles() {
    setLoadingFiles(true);

    try {
      const response = await api.get(
        `/projects/${projectId}/files`
      );

      setFiles(response.data);
    } catch (err: any) {
      console.error(
        "Failed to load files:",
        err.response?.data || err.message
      );
    } finally {
      setLoadingFiles(false);
    }
  }

  useEffect(() => {
    loadCurrentUser();
    loadProject();
    loadRepository();
    loadFiles();
    loadDeploymentCenter();
  }, [projectId]);
  
  
  useEffect(() => {
    if (!selectedEnvironment?.id) {
      return;
    }

    const envId = selectedEnvironment.id;

    let cancelled = false;

    async function pollDeployments() {
      try {
        const history = await getDeployments(envId);

        if (!cancelled) {
          setDeployments(history);
        }
      } catch (err) {
        console.error(
          "Deployment polling failed:",
          err
        );
      }
    }

    const hasActiveDeployment = deployments.some(
      (deployment) =>
        deployment.status === "queued" ||
        deployment.status === "building" ||
        deployment.status === "deploying"
    );

    if (!hasActiveDeployment) {
      return;
    }

    const interval = setInterval(
      pollDeployments,
      3000
    );

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedEnvironment?.id, deployments]);

  
useEffect(() => {
  if (!selectedDeployment?.id) {
    return;
  }

  if (
    selectedDeployment.status === "success" ||
    selectedDeployment.status === "failed"
  ) {
    return;
  }

  let cancelled = false;

  async function pollSelectedDeployment() {
    try {
      const response = await api.get(
        `/deployments/${selectedDeployment!.id}`
      );

      if (!cancelled) {
        setSelectedDeployment(response.data);
      }
    } catch (err) {
      console.error(
        "Deployment detail polling failed:",
        err
      );
    }
  }

  const interval = setInterval(
    pollSelectedDeployment,
    2000
  );

  return () => {
    cancelled = true;
    clearInterval(interval);
  };
}, [
  selectedDeployment?.id,
  selectedDeployment?.status,
]);



  async function analyzeRepository(
    repositoryId: string
  ) {
    setAnalysisLoading(true);

    try {
      const response = await api.get(
        `/repositories/${repositoryId}/analyze`
      );

      setAnalysis(response.data);
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function generateReadme(
    repositoryId: string
  ) {
    setReadmeLoading(true);

    try {
      const response = await api.get(
        `/repositories/${repositoryId}/generate-readme`
      );

      setReadme(
        response.data?.readme ||
          response.data
      );
    } catch (err) {
      console.error(
        "README generation failed:",
        err
      );
    } finally {
      setReadmeLoading(false);
    }
  }

  async function generateDeploymentPlan(
    repositoryId: string
  ) {
    setDeploymentLoading(true);

    try {
      const response = await api.get(
        `/repositories/${repositoryId}/generate-deployment-plan`
      );

      setDeployment(response.data);
    } catch (err) {
      console.error(
        "Deployment plan failed:",
        err
      );
    } finally {
      setDeploymentLoading(false);
    }
  }

    async function loadDeploymentCenter() {
    setDeploymentCenterLoading(true);

    try {
      const data = await getEnvironments(projectId);

      setEnvironments(data);

      if (data.length > 0) {
        const current =
          selectedEnvironment &&
          data.find(
            (environment) =>
              environment.id === selectedEnvironment.id
          );

        const nextEnvironment =
          current || data[0];

        setSelectedEnvironment(nextEnvironment);

        const history =
          await getDeployments(nextEnvironment.id);

        setDeployments(history);
      } else {
        setSelectedEnvironment(null);
        setDeployments([]);
      }
    } catch (err: any) {
      console.error(
        "Deployment Center load failed:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.detail ||
          "Failed to load deployment environments"
      );
    } finally {
      setDeploymentCenterLoading(false);
    }
  }

  async function selectEnvironment(
    environment: DeploymentEnvironment
  ) {
    setSelectedEnvironment(environment);

    try {
      const data = await getDeployments(environment.id);
      setDeployments(data);
    } catch (err: any) {
      console.error(
        "Deployment history failed:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.detail ||
          "Failed to load deployment history"
      );
    }
  }

  function openCreateEnvironment() {
    setEditingEnvironment(null);

    setEnvironmentForm({
      name: "",
      branch: repository?.branch || branch || "main",
      platform: deployment?.platform || "",
      status: "active",
      variables: "",
    });

    setEnvironmentModalOpen(true);
  }

  function openEditEnvironment(
    environment: DeploymentEnvironment
  ) {
    setEditingEnvironment(environment);

    setEnvironmentForm({
      name: environment.name,
      branch: environment.branch,
      platform: environment.platform || "",
      status: environment.status,
      variables: environment.variables || "",
    });

    setEnvironmentModalOpen(true);
  }

  async function saveEnvironment() {
    if (!environmentForm.name.trim()) {
      setError("Environment name is required.");
      return;
    }

    if (!environmentForm.branch.trim()) {
      setError("Branch is required.");
      return;
    }

    setSavingEnvironment(true);

    try {
      if (editingEnvironment) {
        await updateEnvironment(
          editingEnvironment.id,
          {
            name: environmentForm.name.trim(),
            branch: environmentForm.branch.trim(),
            platform:
              environmentForm.platform.trim() || null,
            status: environmentForm.status,
            variables:
              environmentForm.variables.trim() || null,
          }
        );
      } else {
        await createEnvironment({
          project_id: projectId,
          name: environmentForm.name.trim(),
          branch: environmentForm.branch.trim(),
          platform:
            environmentForm.platform.trim() || null,
          status: environmentForm.status,
          variables:
            environmentForm.variables.trim() || null,
        });
      }

      setEnvironmentModalOpen(false);
      await loadDeploymentCenter();
    } catch (err: any) {
      console.error(
        "Environment save failed:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.detail ||
          "Failed to save environment"
      );
    } finally {
      setSavingEnvironment(false);
    }
  }

  async function removeEnvironment(
    environment: DeploymentEnvironment
  ) {
    const confirmed = window.confirm(
      `Delete "${environment.name}" environment?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteEnvironment(environment.id);
      await loadDeploymentCenter();
    } catch (err: any) {
      console.error(
        "Environment delete failed:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.detail ||
          "Failed to delete environment"
      );
    }
  }

  async function deployToEnvironment(
    environment: DeploymentEnvironment
  ) {
    setDeployingEnvironmentId(environment.id);

    try {
      await createDeployment({
        environment_id: environment.id,
        commit_sha: null,
        branch: environment.branch,
        platform: environment.platform,
      });

      setSelectedEnvironment(environment);

      const history =
        await getDeployments(environment.id);

      setDeployments(history);
    } catch (err: any) {
      console.error(
        "Deployment failed:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.detail ||
          "Failed to create deployment"
      );
    } finally {
      setDeployingEnvironmentId(null);
    }
  }

  async function redeploy(item: Deployment) {
    setRedeployingDeploymentId(item.id);

    try {
      setError("");

      await redeployDeployment(item.id);

      const history =
        await getDeployments(item.environment_id);

      setDeployments(history);
    } catch (err: any) {
      console.error(
        "Redeploy failed:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.detail ||
          "Failed to redeploy"
      );
    } finally {
      setRedeployingDeploymentId(null);
    }
  }

  async function connectRepository() {
    if (!repoUrl.trim()) {
      alert("Please enter repository URL");
      return;
    }

    if (!branch.trim()) {
      alert("Please enter branch");
      return;
    }

    setConnecting(true);
    setError("");

    try {
      let repositoryData: Repository;

      try {
        const response = await api.post(
          "/repositories",
          {
            project_id: projectId,
            repo_url: repoUrl.trim(),
            branch: branch.trim(),
          }
        );

        repositoryData = response.data;
      } catch (err: any) {
        const detail =
          err.response?.data?.detail;

        if (
          detail ===
            "Repository already connected" ||
          JSON.stringify(detail).includes(
            "already connected"
          )
        ) {
          const existing =
            await api.get(
              `/repositories/project/${projectId}`
            );

          repositoryData = existing.data;
        } else {
          throw err;
        }
      }

      setRepository(repositoryData);

      await Promise.all([
        analyzeRepository(
          repositoryData.id
        ),
        generateReadme(
          repositoryData.id
        ),
        generateDeploymentPlan(
          repositoryData.id
        ),
      ]);

      alert(
        "Repository connected successfully"
      );
    } catch (err: any) {
      console.error(
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.detail
          ? JSON.stringify(
              err.response.data.detail
            )
          : "Failed to connect repository"
      );
    } finally {
      setConnecting(false);
    }
  }

  async function uploadFiles(
    selectedFiles: FileList | File[]
  ) {
    const fileArray =
      Array.from(selectedFiles);

    if (fileArray.length === 0) {
      return;
    }

    const MAX_FILE_SIZE =
      50 * 1024 * 1024;

    const tooLarge = fileArray.find(
      (file) =>
        file.size > MAX_FILE_SIZE
    );

    if (tooLarge) {
      alert(
        `"${tooLarge.name}" is larger than 50 MB.`
      );
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      let completed = 0;

      for (const file of fileArray) {
        const formData = new FormData();

        formData.append(
          "file",
          file
        );

        await api.post(
          `/projects/${projectId}/files`,
          formData,
          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },

            onUploadProgress: (
              progressEvent
            ) => {
              if (progressEvent.total) {
                const currentProgress =
                  Math.round(
                    (progressEvent.loaded /
                      progressEvent.total) *
                      100
                  );

                const overallProgress =
                  Math.round(
                    ((completed +
                      currentProgress / 100) /
                      fileArray.length) *
                      100
                  );

                setUploadProgress(
                  overallProgress
                );
              }
            },
          }
        );

        completed++;

        setUploadProgress(
          Math.round(
            (completed /
              fileArray.length) *
              100
          )
        );
      }

      await loadFiles();

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      alert(
        `${fileArray.length} file${
          fileArray.length > 1
            ? "s"
            : ""
        } uploaded successfully`
      );
    } catch (err: any) {
      console.error(
        "Upload failed:",
        err.response?.data ||
          err.message
      );

      alert(
        err.response?.data?.detail ||
          "Failed to upload file"
      );
    } finally {
      setUploading(false);

      setTimeout(() => {
        setUploadProgress(0);
      }, 500);
    }
  }

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    if (event.target.files) {
      uploadFiles(
        event.target.files
      );
    }
  }

  async function downloadFile(
    file: ProjectFile
  ) {
    try {
      const response =
        await api.get(
          `/projects/${projectId}/files/${file.id}/download`,
          {
            responseType: "blob",
          }
        );

      const blob =
        new Blob([response.data]);

      const url =
        window.URL.createObjectURL(
          blob
        );

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        file.original_filename;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(
        url
      );
    } catch (err: any) {
      console.error(
        "Download failed:",
        err.response?.data ||
          err.message
      );

      alert(
        "Failed to download file"
      );
    }
  }

  async function deleteFile(
    file: ProjectFile
  ) {
    const confirmed =
      window.confirm(
        `Delete "${file.original_filename}"?`
      );

    if (!confirmed) {
      return;
    }

    setDeletingFileId(file.id);

    try {
      await api.delete(
        `/projects/${projectId}/files/${file.id}`
      );

      await loadFiles();
    } catch (err: any) {
      console.error(
        "Delete failed:",
        err.response?.data ||
          err.message
      );

      alert(
        err.response?.data?.detail ||
          "Failed to delete file"
      );
    } finally {
      setDeletingFileId(null);
    }
  }

  function formatFileSize(
    bytes: number
  ) {
    if (bytes === 0) {
      return "0 Bytes";
    }

    const units = [
      "Bytes",
      "KB",
      "MB",
      "GB",
    ];

    const index = Math.min(
      Math.floor(
        Math.log(bytes) /
          Math.log(1024)
      ),
      units.length - 1
    );

    return (
      (
        bytes /
        Math.pow(1024, index)
      ).toFixed(
        index === 0 ? 0 : 2
      ) +
      " " +
      units[index]
    );
  }

  function getFileIcon(
    contentType: string | null,
    filename: string
  ) {
    const extension =
      filename
        .split(".")
        .pop()
        ?.toLowerCase();

    if (
      contentType?.includes("json") ||
      extension === "json"
    ) {
      return <Code2 size={19} />;
    }

    if (
      contentType?.includes("text") ||
      [
        "md",
        "txt",
        "py",
        "js",
        "ts",
        "tsx",
        "jsx",
        "css",
        "html",
      ].includes(
        extension || ""
      )
    ) {
      return <FileCode2 size={19} />;
    }

    return <File size={19} />;
  }

  const detectedFiles =
    analysis?.detected_files || [];

  const analysisEntries =
    analysis
      ? Object.entries(analysis).filter(
          ([key]) =>
            key !== "detected_files"
        )
      : [];

  const totalStorage = useMemo(
    () =>
      files.reduce(
        (total, file) =>
          total + file.size,
        0
      ),
    [files]
  );

  const projectTitle =
    project?.name ||
    "Project Workspace";

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900">

      <div className="flex min-h-screen">

        {/* SIDEBAR */}

        <aside className="hidden w-64 shrink-0 flex-col bg-[#0f172a] text-white lg:flex">

          <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 shadow-lg shadow-indigo-500/20">
              <Activity size={21} />
            </div>

            <div>
              <div className="font-bold tracking-tight">
                ReleaseForge
              </div>

              <div className="text-[11px] text-slate-400">
                Deployment Platform
              </div>
            </div>

          </div>

          <div className="flex-1 px-4 py-6">

            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Workspace
            </p>

            <nav className="space-y-1">

              <button
                onClick={() =>
                  router.push(
                    "/dashboard"
                  )
                }
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <FolderOpen size={18} />
                Dashboard
              </button>

              <button
                className="flex w-full items-center gap-3 rounded-xl bg-indigo-500/15 px-3 py-3 text-sm font-medium text-indigo-300"
              >
                <Folder size={18} />
                Project
              </button>

              <button
                onClick={() =>
                  document
                    .getElementById(
                      "repository"
                    )
                    ?.scrollIntoView({
                      behavior: "smooth",
                    })
                }
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <GitBranch size={18} />
                Repository
              </button>

              <button
                onClick={() =>
                  document
                    .getElementById(
                      "files"
                    )
                    ?.scrollIntoView({
                      behavior: "smooth",
                    })
                }
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <FileText size={18} />
                Files
              </button>

            </nav>

            <p className="mb-3 mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Intelligence
            </p>

            <nav className="space-y-1">

              <button
                onClick={() =>
                  document
                    .getElementById(
                      "analysis"
                    )
                    ?.scrollIntoView({
                      behavior: "smooth",
                    })
                }
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <Zap size={18} />
                Analysis
              </button>

              <button
                onClick={() =>
                  document
                    .getElementById(
                      "deployment"
                    )
                    ?.scrollIntoView({
                      behavior: "smooth",
                    })
                }
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <Rocket size={18} />
                Deployment
              </button>

            </nav>

          </div>

          <div className="border-t border-white/10 p-4">

            <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-sm font-bold">
                {currentUser?.full_name
                  ?.charAt(0)
                  .toUpperCase() ||
                  "U"}
              </div>

              <div className="min-w-0">

                <p className="truncate text-sm font-medium">
                  {currentUser?.full_name ||
                    "User"}
                </p>

                <p className="text-xs capitalize text-slate-400">
                  {currentUser?.role ||
                    "reader"}
                </p>

              </div>

            </div>

          </div>

        </aside>

        {/* MAIN */}

        <section className="min-w-0 flex-1">

          {/* HEADER */}

          <header className="border-b border-slate-200 bg-white">

            <div className="px-6 py-5 lg:px-10">

              <button
                onClick={() =>
                  router.push(
                    "/dashboard"
                  )
                }
                className="mb-5 flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
              >
                <ArrowLeft size={16} />
                Back to Dashboard
              </button>

              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

                <div className="flex items-start gap-4">

                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <FolderKanbanIcon />
                  </div>

                  <div className="min-w-0">

                    <div className="mb-1 flex items-center gap-2 text-xs font-medium text-indigo-600">
                      <ShieldCheck size={14} />
                      Project Workspace
                    </div>

                    <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                      {projectTitle}
                    </h1>

                    <p className="mt-1 max-w-3xl text-sm text-slate-500">
                      {project?.description ||
                        "Manage your repository, project files, analysis and deployment configuration."}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">

                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[11px] text-slate-500">
                        {projectId}
                      </span>

                      {repository && (
                        <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Repository connected
                        </span>
                      )}

                    </div>

                  </div>

                </div>

                <div className="flex flex-wrap gap-2">

                  <button
                    onClick={() => {
                      loadRepository();
                      loadFiles();
                    }}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    <RefreshCw size={16} />
                    Refresh
                  </button>

                  {repository && (
                    <a
                      href={repository.repo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Open Repository
                      <ExternalLink
                        size={15}
                      />
                    </a>
                  )}

                </div>

              </div>

            </div>

          </header>

          <div className="px-6 py-8 lg:px-10">

            {/* ERROR */}

            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">

                <CircleDot
                  size={17}
                  className="mt-0.5 shrink-0"
                />

                <div className="flex-1">
                  {error}
                </div>

                <button
                  onClick={() =>
                    setError("")
                  }
                  className="text-red-400 hover:text-red-700"
                >
                  <X size={16} />
                </button>

              </div>
            )}

            {/* PROJECT METRICS */}

            <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

              <MiniMetric
                label="Repository"
                value={
                  repository
                    ? "Connected"
                    : "Not connected"
                }
                icon={
                  <GitBranch size={19} />
                }
                positive={
                  !!repository
                }
              />

              <MiniMetric
                label="Project Files"
                value={files.length}
                icon={
                  <FileText size={19} />
                }
              />

              <MiniMetric
                label="Storage Used"
                value={formatFileSize(
                  totalStorage
                )}
                icon={
                  <HardDrive size={19} />
                }
              />

              <MiniMetric
                label="Branch"
                value={
                  repository?.branch ||
                  branch ||
                  "main"
                }
                icon={
                  <GitBranch size={19} />
                }
              />

            </div>

            {/* REPOSITORY */}

            <section
              id="repository"
              className="mb-8"
            >

              <SectionHeading
                eyebrow="SOURCE CONTROL"
                title="Repository"
                description="Connect and inspect the project's GitHub repository."
                icon={
                  <GitBranch size={18} />
                }
              />

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

                {repository ? (

                  <div className="p-6">

                    <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">

                      <div className="flex min-w-0 items-start gap-4">

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                          <GitBranch size={22} />
                        </div>

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <h3 className="font-bold text-slate-900">
                              GitHub Repository
                            </h3>

                            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                              <CheckCircle2
                                size={11}
                              />
                              CONNECTED
                            </span>

                          </div>

                          <a
                            href={
                              repository.repo_url
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block max-w-2xl truncate text-sm text-indigo-600 hover:underline"
                          >
                            {
                              repository.repo_url
                            }
                          </a>

                        </div>

                      </div>

                      <div className="flex flex-wrap gap-3">

                        <div className="rounded-xl bg-slate-50 px-4 py-3">

                          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Branch
                          </div>

                          <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
                            <GitBranch
                              size={15}
                            />
                            {
                              repository.branch
                            }
                          </div>

                        </div>

                        <a
                          href={
                            repository.repo_url
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700"
                        >
                          View on GitHub
                          <ArrowUpRight
                            size={15}
                          />
                        </a>

                      </div>

                    </div>

                    <div className="mt-6 grid gap-3 border-t border-slate-100 pt-5 md:grid-cols-3">

                      <ActionButton
                        onClick={() =>
                          analyzeRepository(
                            repository.id
                          )
                        }
                        loading={
                          analysisLoading
                        }
                        icon={
                          <Zap size={16} />
                        }
                        label="Run Analysis"
                      />

                      <ActionButton
                        onClick={() =>
                          generateReadme(
                            repository.id
                          )
                        }
                        loading={
                          readmeLoading
                        }
                        icon={
                          <FileText
                            size={16}
                          />
                        }
                        label="Generate README"
                      />

                      <ActionButton
                        onClick={() =>
                          generateDeploymentPlan(
                            repository.id
                          )
                        }
                        loading={
                          deploymentLoading
                        }
                        icon={
                          <Rocket size={16} />
                        }
                        label="Generate Deployment"
                      />

                    </div>

                  </div>

                ) : (

                  <div className="p-6">

                    <div className="mb-6 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 p-5">

                      <div className="flex items-start gap-4">

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                          <GitBranch size={21} />
                        </div>

                        <div>
                          <h3 className="font-bold text-slate-900">
                            Connect a GitHub repository
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            Connect your source repository to unlock analysis, README generation and deployment planning.
                          </p>
                        </div>

                      </div>

                    </div>

                    {!canOperate && (
                      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                        Your current role does not have permission to connect a repository.
                      </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-[1fr_220px_auto]">

                      <div>

                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Repository URL
                        </label>

                        <div className="relative">

                          <GitBranch
                            size={17}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                          />

                          <input
                            value={repoUrl}
                            onChange={(e) =>
                              setRepoUrl(
                                e.target.value
                              )
                            }
                            disabled={
                              !canOperate
                            }
                            placeholder="https://github.com/user/repository"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                          />

                        </div>

                      </div>

                      <div>

                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Branch
                        </label>

                        <div className="relative">

                          <GitBranch
                            size={17}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                          />

                          <input
                            value={branch}
                            onChange={(e) =>
                              setBranch(
                                e.target.value
                              )
                            }
                            disabled={
                              !canOperate
                            }
                            placeholder="main"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                          />

                        </div>

                      </div>

                      <div className="flex items-end">

                        <button
                          onClick={
                            connectRepository
                          }
                          disabled={
                            connecting ||
                            !canOperate
                          }
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
                        >
                          {connecting ? (
                            <>
                              <Loader2
                                size={16}
                                className="animate-spin"
                              />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <Zap size={16} />
                              Connect
                            </>
                          )}
                        </button>

                      </div>

                    </div>

                  </div>

                )}

              </div>

            </section>

            {/* FILES */}

            <section
              id="files"
              className="mb-8"
            >

              <SectionHeading
                eyebrow="PROJECT STORAGE"
                title="Project Files"
                description="Upload, download and manage files attached to this project."
                icon={
                  <FileText size={18} />
                }
                action={
                  canOperate ? (
                    <button
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      disabled={uploading}
                      className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {uploading ? (
                        <>
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                          Uploading {uploadProgress}%
                        </>
                      ) : (
                        <>
                          <Upload size={16} />
                          Upload Files
                        </>
                      )}
                    </button>
                  ) : undefined
                }
              />

              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={
                  handleFileChange
                }
              />

              {uploading && (
                <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4">

                  <div className="mb-2 flex items-center justify-between text-xs font-semibold text-indigo-700">

                    <span>
                      Uploading files...
                    </span>

                    <span>
                      {uploadProgress}%
                    </span>

                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-indigo-100">

                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                      style={{
                        width: `${uploadProgress}%`,
                      }}
                    />

                  </div>

                </div>
              )}

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                {loadingFiles ? (

                  <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    Loading project files...
                  </div>

                ) : files.length === 0 ? (

                  <div className="p-12 text-center">

                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <FileText size={25} />
                    </div>

                    <h3 className="font-bold text-slate-800">
                      No files uploaded
                    </h3>

                    <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                      Upload project assets, configuration files or documents. Maximum file size is 50 MB.
                    </p>

                    {canOperate && (
                      <button
                        onClick={() =>
                          fileInputRef.current?.click()
                        }
                        className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        Upload First File
                      </button>
                    )}

                  </div>

                ) : (

                  <div>

                    <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-4">

                      <div className="flex items-center justify-between">

                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <Folder
                            size={17}
                            className="text-indigo-500"
                          />
                          Files
                        </div>

                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 shadow-sm">
                          {files.length}{" "}
                          {files.length === 1
                            ? "file"
                            : "files"}
                        </span>

                      </div>

                    </div>

                    <div className="divide-y divide-slate-100">

                      {files.map(
                        (file) => (
                          <div
                            key={file.id}
                            className="group flex flex-col gap-4 px-6 py-5 transition hover:bg-slate-50 md:flex-row md:items-center md:justify-between"
                          >

                            <div className="flex min-w-0 items-center gap-4">

                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                {getFileIcon(
                                  file.content_type,
                                  file.original_filename
                                )}
                              </div>

                              <div className="min-w-0">

                                <p
                                  className="truncate font-semibold text-slate-800"
                                  title={
                                    file.original_filename
                                  }
                                >
                                  {
                                    file.original_filename
                                  }
                                </p>

                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">

                                  <span>
                                    {formatFileSize(
                                      file.size
                                    )}
                                  </span>

                                  {file.content_type && (
                                    <>
                                      <span>
                                        •
                                      </span>

                                      <span>
                                        {
                                          file.content_type
                                        }
                                      </span>
                                    </>
                                  )}

                                  <span>
                                    •
                                  </span>

                                  <span>
                                    Uploaded{" "}
                                    {new Date(
                                      file.created_at
                                    ).toLocaleDateString()}
                                  </span>

                                </div>

                              </div>

                            </div>

                            <div className="flex shrink-0 items-center gap-2">

                              <button
                                onClick={() =>
                                  downloadFile(
                                    file
                                  )
                                }
                                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                              >
                                <Download
                                  size={14}
                                />
                                Download
                              </button>

                              {canDelete && (
                                <button
                                  onClick={() =>
                                    deleteFile(
                                      file
                                    )
                                  }
                                  disabled={
                                    deletingFileId ===
                                    file.id
                                  }
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  title="Delete file"
                                >
                                  {deletingFileId ===
                                  file.id ? (
                                    <Loader2
                                      size={15}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Trash2
                                      size={15}
                                    />
                                  )}
                                </button>
                              )}

                            </div>

                          </div>
                        )
                      )}

                    </div>

                  </div>

                )}

              </div>

            </section>

            {/* ANALYSIS */}

            <section
              id="analysis"
              className="mb-8"
            >

              <SectionHeading
                eyebrow="AI INSIGHTS"
                title="Repository Analysis"
                description="Detected technologies and repository structure."
                icon={
                  <Zap size={18} />
                }
                action={
                  repository ? (
                    <button
                      onClick={() =>
                        analyzeRepository(
                          repository.id
                        )
                      }
                      disabled={
                        analysisLoading
                      }
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                    >
                      <RefreshCw
                        size={15}
                        className={
                          analysisLoading
                            ? "animate-spin"
                            : ""
                        }
                      />
                      Re-analyze
                    </button>
                  ) : undefined
                }
              />

              {!repository ? (

                <EmptyState
                  icon={
                    <GitBranch size={23} />
                  }
                  title="Connect a repository first"
                  description="Repository analysis becomes available after a GitHub repository is connected."
                />

              ) : analysisLoading ? (

                <LoadingCard text="Analyzing repository..." />

              ) : !analysis ? (

                <EmptyState
                  icon={
                    <Zap size={23} />
                  }
                  title="Analysis not available"
                  description="Run repository analysis to inspect the project structure."
                  action={
                    <button
                      onClick={() =>
                        analyzeRepository(
                          repository.id
                        )
                      }
                      className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                      Run Analysis
                    </button>
                  }
                />

              ) : (

                <div className="grid gap-6 xl:grid-cols-3">

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">

                    <div className="mb-5 flex items-center justify-between">

                      <div>
                        <h3 className="font-bold text-slate-900">
                          Detected Files
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          Files discovered in the connected repository.
                        </p>
                      </div>

                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600">
                        {detectedFiles.length}
                      </span>

                    </div>

                    {detectedFiles.length >
                    0 ? (

                      <div className="grid gap-2 sm:grid-cols-2">

                        {detectedFiles.map(
                          (
                            filename,
                            index
                          ) => (
                            <div
                              key={`${filename}-${index}`}
                              className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3"
                            >

                              <FileCode2
                                size={17}
                                className="shrink-0 text-indigo-500"
                              />

                              <span
                                className="truncate font-mono text-xs text-slate-600"
                                title={
                                  filename
                                }
                              >
                                {filename}
                              </span>

                            </div>
                          )
                        )}

                      </div>

                    ) : (
                      <p className="text-sm text-slate-500">
                        No detected files returned.
                      </p>
                    )}

                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                    <div className="mb-5">

                      <h3 className="font-bold text-slate-900">
                        Analysis Summary
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Repository analysis metadata.
                      </p>

                    </div>

                    <div className="space-y-3">

                      {analysisEntries.length >
                      0 ? (
                        analysisEntries.map(
                          ([key, value]) => (
                            <div
                              key={key}
                              className="rounded-xl bg-slate-50 p-3"
                            >

                              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                {key.replace(
                                  /_/g,
                                  " "
                                )}
                              </p>

                              <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                                {typeof value ===
                                "object"
                                  ? JSON.stringify(
                                      value
                                    )
                                  : String(
                                      value
                                    )}
                              </p>

                            </div>
                          )
                        )
                      ) : (
                        <p className="text-sm text-slate-500">
                          Analysis completed successfully.
                        </p>
                      )}

                    </div>

                  </div>

                </div>

              )}

            </section>

            {/* README + DEPLOYMENT */}

            <div className="grid gap-6 xl:grid-cols-2">

              {/* README */}

              <section id="readme">

                <SectionHeading
                  eyebrow="DOCUMENTATION"
                  title="Generated README"
                  description="AI-generated documentation for the repository."
                  icon={
                    <FileText size={18} />
                  }
                  action={
                    repository ? (
                      <button
                        onClick={() =>
                          generateReadme(
                            repository.id
                          )
                        }
                        disabled={
                          readmeLoading
                        }
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                      >
                        <RefreshCw
                          size={15}
                          className={
                            readmeLoading
                              ? "animate-spin"
                              : ""
                          }
                        />
                        Generate
                      </button>
                    ) : undefined
                  }
                />

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                  {readmeLoading ? (

                    <LoadingCard text="Generating README..." />

                  ) : readme ? (

                    <div className="max-h-[520px] overflow-auto bg-[#0f172a] p-6">

                      <pre className="whitespace-pre-wrap font-mono text-xs leading-6 text-slate-300">
                        {readme}
                      </pre>

                    </div>

                  ) : (

                    <EmptyState
                      icon={
                        <FileText size={23} />
                      }
                      title="README not generated"
                      description={
                        repository
                          ? "Generate project documentation from the connected repository."
                          : "Connect a repository to generate documentation."
                      }
                      action={
                        repository ? (
                          <button
                            onClick={() =>
                              generateReadme(
                                repository.id
                              )
                            }
                            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                          >
                            Generate README
                          </button>
                        ) : undefined
                      }
                    />

                  )}

                </div>

              </section>

              {/* DEPLOYMENT */}

              <section id="deployment">

                <SectionHeading
                  eyebrow="RELEASE ENGINE"
                  title="Deployment Plan"
                  description="Recommended deployment configuration and execution steps."
                  icon={
                    <Rocket size={18} />
                  }
                  action={
                    repository ? (
                      <button
                        onClick={() =>
                          generateDeploymentPlan(
                            repository.id
                          )
                        }
                        disabled={
                          deploymentLoading
                        }
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                      >
                        <RefreshCw
                          size={15}
                          className={
                            deploymentLoading
                              ? "animate-spin"
                              : ""
                          }
                        />
                        Regenerate
                      </button>
                    ) : undefined
                  }
                />

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                  {deploymentLoading ? (

                    <LoadingCard text="Generating deployment plan..." />

                  ) : deployment ? (

                    <div className="p-6">

                      <div className="grid gap-3 sm:grid-cols-3">

                        <DeploymentMetric
                          label="Platform"
                          value={
                            deployment.platform ||
                            "N/A"
                          }
                          icon={
                            <Server size={17} />
                          }
                        />

                        <DeploymentMetric
                          label="Runtime"
                          value={
                            deployment.runtime ||
                            "N/A"
                          }
                          icon={
                            <Package
                              size={17}
                            />
                          }
                        />

                        <DeploymentMetric
                          label="Score"
                          value={
                            deployment.score ??
                            "N/A"
                          }
                          icon={
                            <ShieldCheck
                              size={17}
                            />
                          }
                        />

                      </div>

                      {deployment.steps &&
                        deployment.steps.length >
                          0 && (
                          <div className="mt-6">

                            <h3 className="mb-4 font-bold text-slate-900">
                              Deployment Steps
                            </h3>

                            <div className="space-y-3">

                              {deployment.steps.map(
                                (
                                  step,
                                  index
                                ) => (
                                  <div
                                    key={index}
                                    className="flex gap-3"
                                  >

                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                                      {index +
                                        1}
                                    </div>

                                    <div className="flex-1 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                                      {step}
                                    </div>

                                  </div>
                                )
                              )}

                            </div>

                          </div>
                        )}

                      <button
                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        <Play size={15} />
                        Ready for Deployment
                        <ChevronRight
                          size={15}
                        />
                      </button>

                    </div>

                  ) : (

                    <EmptyState
                      icon={
                        <Rocket size={23} />
                      }
                      title="Deployment plan not generated"
                      description={
                        repository
                          ? "Generate a deployment plan based on the repository."
                          : "Connect a repository to generate a deployment plan."
                      }
                      action={
                        repository ? (
                          <button
                            onClick={() =>
                              generateDeploymentPlan(
                                repository.id
                              )
                            }
                            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                          >
                            Generate Plan
                          </button>
                        ) : undefined
                      }
                    />

                  )}

                </div>

              </section>

            </div>

            {/* DEPLOYMENT CENTER */}

<section
  id="deployment-center"
  className="mt-8"
>
  <SectionHeading
    eyebrow="DEPLOYMENT CENTER"
    title="Environments & Releases"
    description="Manage deployment environments and track releases for this project."
    icon={<Rocket size={18} />}
    action={
      canOperate ? (
        <button
          onClick={openCreateEnvironment}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          <Plus size={15} />
          New Environment
        </button>
      ) : undefined
    }
  />

  <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

    {deploymentCenterLoading ? (
      <LoadingCard text="Loading deployment environments..." />
    ) : environments.length === 0 ? (
      <EmptyState
        icon={<Server size={23} />}
        title="No deployment environments"
        description={
          canOperate
            ? "Create an environment such as Development, Staging, or Production."
            : "No deployment environments have been configured for this project."
        }
        action={
          canOperate ? (
            <button
              onClick={openCreateEnvironment}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Plus size={15} />
              Create Environment
            </button>
          ) : undefined
        }
      />
    ) : (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {environments.map((environment) => (
          <div
            key={environment.id}
            className={`rounded-2xl border p-5 transition ${
              selectedEnvironment?.id === environment.id
                ? "border-indigo-300 bg-indigo-50/40"
                : "border-slate-200 bg-slate-50/50"
            }`}
          >
            <div className="flex items-start justify-between gap-3">

              <button
                onClick={() => selectEnvironment(environment)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                    <Server size={17} />
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-slate-900">
                      {environment.name}
                    </h3>

                    <p className="mt-0.5 text-xs text-slate-500">
                      {environment.branch}
                    </p>
                  </div>
                </div>
              </button>

              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                {environment.status}
              </span>

            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">

              <div className="rounded-xl bg-white p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Branch
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-700">
                  {environment.branch}
                </p>
              </div>

              <div className="rounded-xl bg-white p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Platform
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-700">
                  {environment.platform || "Not set"}
                </p>
              </div>

            </div>

            {canOperate && (
              <div className="mt-4 flex gap-2">

                <button
                  onClick={() =>
                    deployToEnvironment(environment)
                  }
                  disabled={
                    deployingEnvironmentId ===
                    environment.id
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {deployingEnvironmentId ===
                  environment.id ? (
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
                  ) : (
                    <Rocket size={14} />
                  )}

                  Deploy
                </button>

                <button
                  onClick={() =>
                    openEditEnvironment(environment)
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                >
                  <Edit3 size={15} />
                </button>

                {currentUser?.role === "admin" && (
                  <button
                    onClick={() =>
                      removeEnvironment(environment)
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={15} />
                  </button>
                )}

              </div>
            )}

          </div>
        ))}
      </div>
    )}

  </div>

    {/* DEPLOYMENT HISTORY */}

  {selectedEnvironment && (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">

      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">
            RELEASE HISTORY
          </p>

          <h3 className="mt-1 text-lg font-bold text-slate-900">
            Deployment History
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Recent deployments for {selectedEnvironment.name}.
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Activity size={18} />
        </div>
      </div>

      <div className="p-6">

        
        {currentDeployment && (
          <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    size={18}
                    className="text-green-600"
                  />

                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
                    CURRENT DEPLOYMENT
                  </p>
                </div>

                <h4 className="mt-2 text-lg font-bold text-slate-900">
                  Live deployment
                </h4>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                  <span>
                    Branch:{" "}
                    <strong className="text-slate-700">
                      {currentDeployment.branch || "N/A"}
                    </strong>
                  </span>

                  <span>
                    Status:{" "}
                    <strong className="text-green-600">
                      {currentDeployment.status}
                    </strong>
                  </span>
                </div>

                {currentDeployment.deployment_url && (
                  <p className="mt-2 truncate text-xs text-slate-400">
                    {currentDeployment.deployment_url}
                  </p>
                )}
              </div>

              {currentDeployment.deployment_url && (
                <a
                  href={currentDeployment.deployment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  <ExternalLink size={15} />
                  Open Live App
                </a>
              )}
            </div>
          </div>
        )}


        {deployments.length === 0 ? (

          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">

            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
              <Rocket size={20} />
            </div>

            <h4 className="mt-3 text-sm font-bold text-slate-800">
              No deployments yet
            </h4>

            <p className="mt-1 text-sm text-slate-500">
              Deploy this environment to create your first release.
            </p>

          </div>

        ) : (

          <div className="space-y-3">

            {deployments.map((item) => (

              <div
                key={item.id}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
              >

                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                  <div className="flex items-start gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                      {item.status === "success" ? (
                        <CheckCircle2 size={18} />
                      ) : item.status === "failed" ? (
                        <X size={18} />
                      ) : (
                        <CircleDot size={18} />
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">

                        <h4 className="text-sm font-bold text-slate-900">
                          Deployment
                        </h4>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                            item.status === "success"
                              ? "bg-emerald-50 text-emerald-700"
                              : item.status === "failed"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {item.status}
                        </span>

                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">

                        <span className="flex items-center gap-1">
                          <GitBranch size={13} />
                          {item.branch || selectedEnvironment.branch}
                        </span>

                        <span>
                          Platform:{" "}
                          {item.platform ||
                            selectedEnvironment.platform ||
                            "N/A"}
                        </span>

                        {item.commit_sha && (
                          <span>
                            Commit: {item.commit_sha.slice(0, 8)}
                          </span>
                        )}

                      </div>
                    </div>

                  </div>

                  <div className="text-left md:text-right">

                    <p className="flex items-center gap-1 text-xs text-slate-500 md:justify-end">
                      <Clock3 size={13} />
                      {new Date(item.created_at).toLocaleString()}
                    </p>

                      {item.duration_seconds !== null && (
                        <p className="mt-1 text-xs font-semibold text-slate-600">
                          Duration: {item.duration_seconds}s
                        </p>
                      )}

                      {canOperate && (
                        <button
                          type="button"
                          onClick={() => redeploy(item)}
                          disabled={redeployingDeploymentId === item.id}
                          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {redeployingDeploymentId === item.id ? (
                            <>
                              <Loader2
                                size={14}
                                className="animate-spin"
                              />
                              Redeploying...
                            </>
                          ) : (
                            <>
                              <RotateCcw size={14} />
                              Redeploy
                            </>
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedDeployment(item)}
                        className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        <ExternalLink size={14} />
                        Details
                      </button>

                  </div>

                </div>

                {item.logs && (
                  <div className="mt-4 rounded-xl bg-slate-950 p-4">

                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-300">
                      <Terminal size={14} />
                      Deployment Logs
                    </div>

                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-5 text-slate-400">
                      {item.logs}
                    </pre>

                  </div>
                )}

              </div>

            ))}

          </div>

        )}

      </div>
    </div>
  )}

</section>

          </div>

        </section>

      </div>


        {environmentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">
                    DEPLOYMENT ENVIRONMENT
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    {editingEnvironment
                      ? "Edit Environment"
                      : "Create Environment"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Configure where and how this project should be deployed.
                  </p>
                </div>

                <button
                  onClick={() => setEnvironmentModalOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-5 p-6">

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Environment Name
                  </label>

                  <input
                    value={environmentForm.name}
                    onChange={(e) =>
                      setEnvironmentForm({
                        ...environmentForm,
                        name: e.target.value,
                      })
                    }
                    placeholder="Development"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Branch
                    </label>

                    <div className="relative">
                      <GitBranch
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        value={environmentForm.branch}
                        onChange={(e) =>
                          setEnvironmentForm({
                            ...environmentForm,
                            branch: e.target.value,
                          })
                        }
                        placeholder="main"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Platform
                    </label>

                    <input
                      value={environmentForm.platform}
                      onChange={(e) =>
                        setEnvironmentForm({
                          ...environmentForm,
                          platform: e.target.value,
                        })
                      }
                      placeholder="Vercel / AWS / Docker"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                    />
                  </div>

                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </label>

                  <select
                    value={environmentForm.status}
                    onChange={(e) =>
                      setEnvironmentForm({
                        ...environmentForm,
                        status: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Environment Variables
                    </label>

                    <span className="text-[10px] text-slate-400">
                      Optional
                    </span>
                  </div>

                  <textarea
                    value={environmentForm.variables}
                    onChange={(e) =>
                      setEnvironmentForm({
                        ...environmentForm,
                        variables: e.target.value,
                      })
                    }
                    rows={5}
                    placeholder={'DATABASE_URL=...\nAPI_KEY=...'}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs leading-5 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>

              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">

                <button
                  onClick={() => setEnvironmentModalOpen(false)}
                  disabled={savingEnvironment}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  onClick={saveEnvironment}
                  disabled={savingEnvironment}
                  className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingEnvironment ? (
                    <>
                      <Loader2
                        size={15}
                        className="animate-spin"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      {editingEnvironment
                        ? "Save Changes"
                        : "Create Environment"}
                    </>
                  )}
                </button>

              </div>

            </div>
          </div>
        )}
                

        {selectedDeployment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">

              <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">
                    DEPLOYMENT DETAILS
                  </p>

                  <h3 className="mt-1 text-lg font-bold text-slate-900">
                    Deployment
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {selectedDeployment.id}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDeployment(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="max-h-[75vh] overflow-y-auto p-6">

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                  <DeploymentMetric
                    label="Status"
                    value={selectedDeployment.status}
                    icon={<Activity size={14} />}
                  />

                  <DeploymentMetric
                    label="Branch"
                    value={selectedDeployment.branch || "N/A"}
                    icon={<GitBranch size={14} />}
                  />

                  <DeploymentMetric
                    label="Platform"
                    value={selectedDeployment.platform || "N/A"}
                    icon={<Server size={14} />}
                  />

                  <DeploymentMetric
                    label="Commit"
                    value={
                      selectedDeployment.commit_sha
                        ? selectedDeployment.commit_sha.slice(0, 8)
                        : "N/A"
                    }
                    icon={<GitBranch size={14} />}
                  />

                  <DeploymentMetric
                    label="Duration"
                    value={
                      selectedDeployment.duration_seconds !== null
                        ? `${selectedDeployment.duration_seconds}s`
                        : "N/A"
                    }
                    icon={<Clock3 size={14} />}
                  />

                  <DeploymentMetric
                    label="Created"
                    value={new Date(
                      selectedDeployment.created_at
                    ).toLocaleString()}
                    icon={<Activity size={14} />}
                  />

                </div>
                
                {selectedDeployment.deployment_url && (
                  <div className="mt-6">
                    <a
                      href={selectedDeployment.deployment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    >
                      <ExternalLink size={16} />
                      Open Live App
                    </a>

                    <p className="mt-2 text-xs text-slate-500">
                      {selectedDeployment.deployment_url}
                    </p>
                  </div>
                )}


                <div className="mt-6 space-y-4">

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                      Timeline
                    </p>

                    <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">

                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="text-slate-500">
                          Started
                        </span>

                        <span className="font-semibold text-slate-700">
                          {selectedDeployment.started_at
                            ? new Date(
                                selectedDeployment.started_at
                              ).toLocaleString()
                            : "N/A"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="text-slate-500">
                          Completed
                        </span>

                        <span className="font-semibold text-slate-700">
                          {selectedDeployment.completed_at
                            ? new Date(
                                selectedDeployment.completed_at
                              ).toLocaleString()
                            : "N/A"}
                        </span>
                      </div>

                    </div>
                  </div>

                  {selectedDeployment.logs && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                        Deployment Logs
                      </p>

                      <div className="mt-3 rounded-xl bg-slate-950 p-4">

                        <pre className="max-h-80 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-5 text-slate-400">
                          {selectedDeployment.logs}
                        </pre>

                      </div>
                    </div>
                  )}

                </div>

              </div>

              <div className="flex justify-end border-t border-slate-200 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setSelectedDeployment(null)}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        )}

    </main>
  );
}

function FolderKanbanIcon() {
  return (
    <div className="relative">
      <FolderOpen size={25} />
      <span className="absolute -bottom-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-indigo-600 text-white">
        <span className="h-1 w-1 rounded-full bg-white" />
      </span>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  icon,
  positive,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-start justify-between">

        <div>
          <p className="text-xs font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 truncate text-xl font-bold text-slate-900">
            {value}
          </p>

          {positive !== undefined && (
            <p
              className={`mt-1 text-xs font-medium ${
                positive
                  ? "text-emerald-600"
                  : "text-slate-400"
              }`}
            >
              {positive
                ? "Ready"
                : "Action required"}
            </p>
          )}
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          {icon}
        </div>

      </div>

    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  icon,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">

      <div className="min-w-0">

        <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600">
          {icon}
          {eyebrow}
        </div>

        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>

      </div>

      {action}

    </div>
  );
}

function ActionButton({
  onClick,
  loading,
  icon,
  label,
}: {
  onClick: () => void;
  loading: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <Loader2
          size={16}
          className="animate-spin"
        />
      ) : (
        icon
      )}

      {loading
        ? "Working..."
        : label}
    </button>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">

      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        {icon}
      </div>

      <h3 className="font-bold text-slate-800">
        {title}
      </h3>

      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>

      {action && (
        <div className="mt-5">
          {action}
        </div>
      )}

    </div>
  );
}

function LoadingCard({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex min-h-[220px] items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500 shadow-sm">
      <Loader2
        size={19}
        className="animate-spin text-indigo-600"
      />
      {text}
    </div>
  );
}

function DeploymentMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">

      <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
        {icon}
        {label}
      </div>

      <p className="mt-2 truncate text-sm font-bold text-slate-800">
        {value}
      </p>

    </div>
  );
}
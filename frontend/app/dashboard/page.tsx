"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { getCurrentUser, CurrentUser } from "@/services/auth";

import {
  Activity,
  BarChart3,
  Database,
  FileText,
  FolderKanban,
  HardDrive,
  LayoutDashboard,
  Plus,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
  X,
  ArrowUpRight,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type ProjectStats = {
  id: string;
  name: string;
  created_by: {
    user_id: string;
    name: string;
    email: string;
  };
  file_count: number;
  storage_bytes: number;
  storage_mb: number;
};

type UserStats = {
  user_id: string;
  name: string;
  email: string;
  project_count: number;
};

type DashboardStats = {
  total_users: number;
  total_active_users: number;
  total_projects: number;
  total_files: number;
  total_storage_bytes: number;
  total_storage_mb: number;
  projects: ProjectStats[];
  projects_by_user: UserStats[];
};

type Project = {
  id: string;
  name: string;
  description?: string;
};

const PIE_COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#8b5cf6",
];

function formatStorage(bytes: number) {
  if (bytes === 0) return "0 MB";

  const units = ["B", "KB", "MB", "GB", "TB"];

  let value = bytes;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
  }

  if (index === 0) {
    return `${Math.round(value)} ${units[index]}`;
  }

  return `${value.toFixed(value >= 100 ? 0 : 2)} ${units[index]}`;
}

export default function DashboardPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] =
    useState<DashboardStats | null>(null);

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const [error, setError] = useState("");
  const [statsError, setStatsError] = useState("");

  const [showCreate, setShowCreate] = useState(false);

  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] =
    useState("");

  const [creating, setCreating] = useState(false);

  const [deletingProjectId, setDeletingProjectId] =
    useState<string | null>(null);

  async function loadProjects() {
    try {
      setLoading(true);

      const response = await api.get("/projects");

      setProjects(response.data);
      setError("");
    } catch (err: any) {
      console.error(err.response?.data || err.message);

      setError(
        err.response?.data?.detail ||
          "Unable to load projects."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      setStatsLoading(true);

      const response = await api.get<DashboardStats>(
        "/dashboard/stats"
      );

      setStats(response.data);
      setStatsError("");
    } catch (err: any) {
      console.error(err.response?.data || err.message);

      setStatsError(
        err.response?.data?.detail ||
          "Unable to load dashboard analytics."
      );
    } finally {
      setStatsLoading(false);
    }
  }

  async function loadDashboard() {
    try {
      const user = await getCurrentUser();

      setCurrentUser(user);

      await Promise.all([
        loadProjects(),
        loadStats(),
      ]);
    } catch (err: any) {
      console.error(err.response?.data || err.message);

      router.push("/");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function createProject() {
    if (!projectName.trim()) {
      alert("Project name is required.");
      return;
    }

    try {
      setCreating(true);

      await api.post("/projects", {
        name: projectName.trim(),
        description: projectDescription.trim(),
      });

      setProjectName("");
      setProjectDescription("");
      setShowCreate(false);

      await Promise.all([
        loadProjects(),
        loadStats(),
      ]);
    } catch (err: any) {
      console.error(err.response?.data || err.message);

      alert(
        err.response?.data?.detail ||
          "Failed to create project."
      );
    } finally {
      setCreating(false);
    }
  }

  async function deleteProject(projectId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this project? This will also delete its uploaded files."
    );

    if (!confirmed) return;

    try {
      setDeletingProjectId(projectId);

      await api.delete(`/projects/${projectId}`);

      await Promise.all([
        loadProjects(),
        loadStats(),
      ]);
    } catch (err: any) {
      console.error(err.response?.data || err.message);

      alert(
        err.response?.data?.detail ||
          "Failed to delete project."
      );
    } finally {
      setDeletingProjectId(null);
    }
  }

  const canCreateProject =
    currentUser?.role === "admin" ||
    currentUser?.role === "operator";

  const canDeleteProject =
    currentUser?.role === "admin";

  const projectsByUserChart = useMemo(() => {
    if (!stats) return [];

    return stats.projects_by_user.map((user) => ({
      name:
        user.name.length > 14
          ? `${user.name.slice(0, 14)}...`
          : user.name,
      projects: user.project_count,
    }));
  }, [stats]);

  const filesPerProjectChart = useMemo(() => {
    if (!stats) return [];

    return stats.projects.map((project) => ({
      name:
        project.name.length > 14
          ? `${project.name.slice(0, 14)}...`
          : project.name,
      files: project.file_count,
    }));
  }, [stats]);

  const storagePerProjectChart = useMemo(() => {
    if (!stats) return [];

    return stats.projects.map((project) => ({
      name:
        project.name.length > 14
          ? `${project.name.slice(0, 14)}...`
          : project.name,
      storage: project.storage_mb,
    }));
  }, [stats]);

  const storageDistribution = useMemo(() => {
    if (!stats) return [];

    return stats.projects
      .filter((project) => project.storage_mb > 0)
      .map((project) => ({
        name: project.name,
        value: project.storage_mb,
      }));
  }, [stats]);

  if (loading && !currentUser) {
    return (
      <main className="min-h-screen bg-[#f8fafc]">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-sm text-slate-500">
            Loading ReleaseForge...
          </div>
        </div>
      </main>
    );
  }

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
                className="flex w-full items-center gap-3 rounded-xl bg-indigo-500/15 px-3 py-3 text-sm font-medium text-indigo-300"
              >
                <LayoutDashboard size={18} />
                Dashboard
              </button>

              <button
                onClick={() => {
                  document
                    .getElementById("projects")
                    ?.scrollIntoView({
                      behavior: "smooth",
                    });
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <FolderKanban size={18} />
                Projects
              </button>

              <button
                onClick={() => {
                  document
                    .getElementById("analytics")
                    ?.scrollIntoView({
                      behavior: "smooth",
                    });
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <BarChart3 size={18} />
                Analytics
              </button>

              {currentUser?.role === "admin" && (
                <button
                  onClick={() => router.push("/users")}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                  <Users size={18} />
                  Users
                </button>
              )}

            </nav>

            <p className="mb-3 mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              System
            </p>

            <nav className="space-y-1">

              <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white">
                <Database size={18} />
                Infrastructure
              </button>

              <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white">
                <Settings size={18} />
                Settings
              </button>

            </nav>

          </div>

          {/* User */}

          <div className="border-t border-white/10 p-4">

            <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-sm font-bold">
                {currentUser?.full_name
                  ?.charAt(0)
                  .toUpperCase()}
              </div>

              <div className="min-w-0">

                <p className="truncate text-sm font-medium">
                  {currentUser?.full_name}
                </p>

                <p className="text-xs capitalize text-slate-400">
                  {currentUser?.role}
                </p>

              </div>

            </div>

          </div>

        </aside>

        {/* MAIN */}

        <section className="min-w-0 flex-1">

          {/* TOP BAR */}

          <header className="border-b border-slate-200 bg-white">

            <div className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between lg:px-10">

              <div>

                <div className="mb-1 flex items-center gap-2 text-xs font-medium text-indigo-600">
                  <ShieldCheck size={14} />
                  Workspace Overview
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                  Good to see you,{" "}
                  {currentUser?.full_name?.split(" ")[0]} 👋
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Monitor your projects, files and infrastructure.
                </p>

              </div>

              <div className="flex items-center gap-3">

                {currentUser?.role === "admin" && (
                  <button
                    onClick={() => router.push("/users")}
                    className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 sm:flex"
                  >
                    <Users size={16} />
                    Users
                  </button>
                )}

                {canCreateProject && (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
                  >
                    <Plus size={17} />
                    New Project
                  </button>
                )}

              </div>

            </div>

          </header>

          <div className="px-6 py-8 lg:px-10">

            {/* ERROR */}

            {statsError && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {statsError}
              </div>
            )}

            {/* STAT CARDS */}

            {statsLoading ? (
              <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                Loading analytics...
              </div>
            ) : stats ? (
              <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                <MetricCard
                  title="Total Users"
                  value={stats.total_users}
                  subtitle={`${stats.total_active_users} active users`}
                  icon={<Users size={20} />}
                  iconClass="bg-indigo-50 text-indigo-600"
                />

                <MetricCard
                  title="Total Projects"
                  value={stats.total_projects}
                  subtitle="All projects"
                  icon={<FolderKanban size={20} />}
                  iconClass="bg-blue-50 text-blue-600"
                />

                <MetricCard
                  title="Total Files"
                  value={stats.total_files}
                  subtitle="Uploaded files"
                  icon={<FileText size={20} />}
                  iconClass="bg-emerald-50 text-emerald-600"
                />

                <MetricCard
                  title="Total Storage"
                  value={formatStorage(
                    stats.total_storage_bytes
                  )}
                  subtitle={`${stats.total_storage_mb} MB used`}
                  icon={<HardDrive size={20} />}
                  iconClass="bg-amber-50 text-amber-600"
                />

              </div>
            ) : null}

            {/* ANALYTICS */}

            {stats && (
              <section id="analytics" className="mb-8">

                <div className="mb-5 flex items-end justify-between">

                  <div>
                    <h2 className="text-xl font-bold tracking-tight">
                      Analytics
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Real-time overview of your ReleaseForge workspace.
                    </p>
                  </div>

                  <div className="hidden items-center gap-2 text-xs text-emerald-600 sm:flex">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Live data
                  </div>

                </div>

                <div className="grid gap-6 xl:grid-cols-3">

                  {/* Projects */}

                  <AnalyticsCard
                    title="Projects by User"
                    description="Project ownership distribution"
                    className="xl:col-span-2"
                  >
                    <div className="h-[310px]">

                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >
                        <BarChart
                          data={projectsByUserChart}
                          margin={{
                            top: 10,
                            right: 20,
                            left: -15,
                            bottom: 10,
                          }}
                        >

                          <CartesianGrid
                            strokeDasharray="4 4"
                            vertical={false}
                          />

                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                          />

                          <YAxis
                            allowDecimals={false}
                            axisLine={false}
                            tickLine={false}
                          />

                          <Tooltip
                            cursor={{
                              fill: "#f8fafc",
                            }}
                            contentStyle={{
                              borderRadius: "12px",
                              border: "1px solid #e2e8f0",
                              boxShadow:
                                "0 10px 30px rgba(15,23,42,0.08)",
                            }}
                          />

                          <Bar
                            dataKey="projects"
                            fill="#6366f1"
                            radius={[
                              8,
                              8,
                              0,
                              0,
                            ]}
                            barSize={34}
                          />

                        </BarChart>
                      </ResponsiveContainer>

                    </div>
                  </AnalyticsCard>

                  {/* Storage */}

                  <AnalyticsCard
                    title="Storage Distribution"
                    description="Usage across projects"
                  >
                    <div className="h-[310px]">

                      {storageDistribution.length > 0 ? (
                        <ResponsiveContainer
                          width="100%"
                          height="100%"
                        >
                          <PieChart>

                            <Pie
                              data={storageDistribution}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="45%"
                              innerRadius={70}
                              outerRadius={105}
                              paddingAngle={4}
                              stroke="none"
                            >

                              {storageDistribution.map(
                                (_, index) => (
                                  <Cell
                                    key={`storage-${index}`}
                                    fill={
                                      PIE_COLORS[
                                        index %
                                          PIE_COLORS.length
                                      ]
                                    }
                                  />
                                )
                              )}

                            </Pie>

                            <Tooltip
                              formatter={(value) =>
                                `${Number(value).toFixed(
                                  2
                                )} MB`
                              }
                              contentStyle={{
                                borderRadius: "12px",
                                border:
                                  "1px solid #e2e8f0",
                              }}
                            />

                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <div className="text-center">
                            <HardDrive
                              className="mx-auto mb-2 text-slate-300"
                              size={32}
                            />

                            <p className="text-sm text-slate-500">
                              No storage data yet
                            </p>
                          </div>
                        </div>
                      )}

                    </div>

                    {storageDistribution.length > 0 && (
                      <div className="space-y-2 border-t border-slate-100 pt-4">

                        {storageDistribution
                          .slice(0, 4)
                          .map((item, index) => (
                            <div
                              key={item.name}
                              className="flex items-center justify-between text-xs"
                            >

                              <div className="flex min-w-0 items-center gap-2">

                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{
                                    background:
                                      PIE_COLORS[
                                        index %
                                          PIE_COLORS.length
                                      ],
                                  }}
                                />

                                <span className="truncate text-slate-600">
                                  {item.name}
                                </span>

                              </div>

                              <span className="font-semibold text-slate-800">
                                {item.value.toFixed(2)} MB
                              </span>

                            </div>
                          ))}

                      </div>
                    )}

                  </AnalyticsCard>

                  {/* Files */}

                  <AnalyticsCard
                    title="Files per Project"
                    description="Uploaded file distribution"
                    className="xl:col-span-3"
                  >
                    <div className="h-[300px]">

                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >
                        <BarChart
                          data={filesPerProjectChart}
                          margin={{
                            top: 10,
                            right: 20,
                            left: -15,
                            bottom: 10,
                          }}
                        >

                          <CartesianGrid
                            strokeDasharray="4 4"
                            vertical={false}
                          />

                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                          />

                          <YAxis
                            allowDecimals={false}
                            axisLine={false}
                            tickLine={false}
                          />

                          <Tooltip
                            cursor={{
                              fill: "#f8fafc",
                            }}
                            contentStyle={{
                              borderRadius: "12px",
                              border: "1px solid #e2e8f0",
                            }}
                          />

                          <Bar
                            dataKey="files"
                            fill="#22c55e"
                            radius={[
                              8,
                              8,
                              0,
                              0,
                            ]}
                            barSize={34}
                          />

                        </BarChart>
                      </ResponsiveContainer>

                    </div>
                  </AnalyticsCard>

                  {/* Storage per project */}

                  <AnalyticsCard
                    title="Storage per Project"
                    description="Disk usage by project"
                    className="xl:col-span-3"
                  >
                    <div className="h-[300px]">

                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >
                        <BarChart
                          data={storagePerProjectChart}
                          margin={{
                            top: 10,
                            right: 20,
                            left: -15,
                            bottom: 10,
                          }}
                        >

                          <CartesianGrid
                            strokeDasharray="4 4"
                            vertical={false}
                          />

                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                          />

                          <YAxis
                            axisLine={false}
                            tickLine={false}
                          />

                          <Tooltip
                            formatter={(value) =>
                              `${Number(value).toFixed(
                                2
                              )} MB`
                            }
                            cursor={{
                              fill: "#f8fafc",
                            }}
                            contentStyle={{
                              borderRadius: "12px",
                              border: "1px solid #e2e8f0",
                            }}
                          />

                          <Bar
                            dataKey="storage"
                            fill="#f59e0b"
                            radius={[
                              8,
                              8,
                              0,
                              0,
                            ]}
                            barSize={34}
                          />

                        </BarChart>
                      </ResponsiveContainer>

                    </div>
                  </AnalyticsCard>

                </div>

              </section>
            )}

            {/* PROJECT DETAILS */}

            <section className="mb-8">

              <div className="mb-5">
                <h2 className="text-xl font-bold tracking-tight">
                  Project Details
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Raw project-level analytics.
                </p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                {statsLoading ? (
                  <div className="p-6 text-sm text-slate-500">
                    Loading project statistics...
                  </div>
                ) : stats &&
                  stats.projects.length > 0 ? (
                  <div className="overflow-x-auto">

                    <table className="w-full min-w-[850px] text-left text-sm">

                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">

                        <tr>
                          <th className="px-6 py-4">
                            Project
                          </th>

                          <th className="px-6 py-4">
                            Created By
                          </th>

                          <th className="px-6 py-4">
                            Files
                          </th>

                          <th className="px-6 py-4">
                            Storage
                          </th>

                          <th className="px-6 py-4">
                            Project ID
                          </th>
                        </tr>

                      </thead>

                      <tbody className="divide-y divide-slate-100">

                        {stats.projects.map(
                          (project) => (
                            <tr
                              key={project.id}
                              className="transition hover:bg-slate-50"
                            >

                              <td className="px-6 py-5">

                                <div className="flex items-center gap-3">

                                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                    <FolderKanban
                                      size={17}
                                    />
                                  </div>

                                  <div>
                                    <p className="font-semibold text-slate-900">
                                      {project.name}
                                    </p>

                                    <p className="text-xs text-slate-400">
                                      Project
                                    </p>
                                  </div>

                                </div>

                              </td>

                              <td className="px-6 py-5">

                                <p className="font-medium text-slate-700">
                                  {project.created_by.name}
                                </p>

                                <p className="text-xs text-slate-400">
                                  {project.created_by.email}
                                </p>

                              </td>

                              <td className="px-6 py-5">

                                <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                  {project.file_count}
                                </span>

                              </td>

                              <td className="px-6 py-5">

                                <p className="font-semibold text-slate-700">
                                  {formatStorage(
                                    project.storage_bytes
                                  )}
                                </p>

                                <p className="text-xs text-slate-400">
                                  {project.storage_bytes.toLocaleString()} bytes
                                </p>

                              </td>

                              <td className="px-6 py-5">

                                <code className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] text-slate-500">
                                  {project.id.slice(
                                    0,
                                    8
                                  )}
                                  ...
                                </code>

                              </td>

                            </tr>
                          )
                        )}

                      </tbody>

                    </table>

                  </div>
                ) : (
                  <div className="p-6 text-sm text-slate-500">
                    No project analytics available.
                  </div>
                )}

              </div>

            </section>

            {/* PROJECTS */}

            <section id="projects">

              <div className="mb-5 flex items-end justify-between">

                <div>
                  <h2 className="text-xl font-bold tracking-tight">
                    Your Projects
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Manage repositories, files and deployments.
                  </p>
                </div>

                {canCreateProject && (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="hidden items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 sm:flex"
                  >
                    <Plus size={16} />
                    New project
                  </button>
                )}

              </div>

              {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
                  Loading projects...
                </div>
              ) : projects.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">

                  <FolderKanban
                    size={40}
                    className="mx-auto mb-3 text-slate-300"
                  />

                  <h3 className="font-semibold text-slate-800">
                    No projects yet
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Create your first ReleaseForge project.
                  </p>

                  {canCreateProject && (
                    <button
                      onClick={() =>
                        setShowCreate(true)
                      }
                      className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                      Create Project
                    </button>
                  )}

                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

                  {projects.map((project) => {

                    const projectStats =
                      stats?.projects.find(
                        (item) =>
                          item.id === project.id
                      );

                    return (
                      <div
                        key={project.id}
                        className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-slate-200/50"
                      >

                        <div className="h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400" />

                        <div className="p-6">

                          <div className="mb-5 flex items-start justify-between">

                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                              <FolderKanban size={21} />
                            </div>

                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                              Active
                            </span>

                          </div>

                          <h3 className="text-lg font-bold text-slate-900">
                            {project.name}
                          </h3>

                          <p className="mt-2 min-h-[40px] line-clamp-2 text-sm leading-5 text-slate-500">
                            {project.description ||
                              "No project description provided."}
                          </p>

                          <div className="mt-5 grid grid-cols-2 gap-3">

                            <div className="rounded-xl bg-slate-50 p-3">
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <FileText size={14} />
                                Files
                              </div>

                              <p className="mt-1 text-lg font-bold text-slate-900">
                                {projectStats?.file_count ??
                                  0}
                              </p>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-3">
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <HardDrive size={14} />
                                Storage
                              </div>

                              <p className="mt-1 text-lg font-bold text-slate-900">
                                {formatStorage(
                                  projectStats?.storage_bytes ??
                                    0
                                )}
                              </p>
                            </div>

                          </div>

                          <div className="mt-5 flex gap-2">

                            <button
                              onClick={() =>
                                router.push(
                                  `/projects/${project.id}`
                                )
                              }
                              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                              Open Project
                              <ArrowUpRight size={15} />
                            </button>

                            {canDeleteProject && (
                              <button
                                onClick={() =>
                                  deleteProject(
                                    project.id
                                  )
                                }
                                disabled={
                                  deletingProjectId ===
                                  project.id
                                }
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Delete project"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}

                          </div>

                        </div>

                      </div>
                    );
                  })}

                </div>
              )}

            </section>

          </div>

        </section>

      </div>

      {/* CREATE PROJECT MODAL */}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">

          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">

              <div>

                <h2 className="text-lg font-bold text-slate-900">
                  Create Project
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Add a new project to your workspace.
                </p>

              </div>

              <button
                onClick={() => setShowCreate(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>

            </div>

            <div className="space-y-5 p-6">

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Project Name
                </label>

                <input
                  value={projectName}
                  onChange={(e) =>
                    setProjectName(e.target.value)
                  }
                  placeholder="e.g. Production API"
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Description
                </label>

                <textarea
                  value={projectDescription}
                  onChange={(e) =>
                    setProjectDescription(
                      e.target.value
                    )
                  }
                  placeholder="What is this project about?"
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                />

              </div>

            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">

              <button
                onClick={() => setShowCreate(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                onClick={createProject}
                disabled={creating}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating
                  ? "Creating..."
                  : "Create Project"}
              </button>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  iconClass,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

      <div className="flex items-start justify-between">

        <div>

          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {subtitle}
          </p>

        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>

      </div>

    </div>
  );
}

function AnalyticsCard({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}
    >

      <div className="mb-5">

        <h3 className="font-bold text-slate-900">
          {title}
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>

      </div>

      {children}

    </div>
  );
}
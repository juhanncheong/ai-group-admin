import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  Check,
  ChevronDown,
  Clock,
  FileImage,
  FileText,
  Loader2,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Save,
  ScrollText,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import Shell from "../components/Shell";
import { api } from "../api";
import { useTheme } from "../context/ThemeContext";

const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

const CACHE_KEYS = {
  accounts: "telegramScripts:accounts",
  scripts: "telegramScripts:scripts",
  runs: "telegramScripts:runs",
  targetChats: "telegramScripts:targetChats",
  selectedScriptId: "telegramScripts:selectedScriptId",
  targetSourceAccountId: "telegramScripts:targetSourceAccountId",
  activeView: "telegramScripts:activeView",
};

function cacheGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.time) return null;

    if (Date.now() - parsed.time > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch (_) {
    return null;
  }
}

function cacheSet(key, data) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        time: Date.now(),
        data,
      }),
    );
  } catch (_) {}
}

function rememberValue(key, value) {
  try {
    if (value === undefined || value === null) return;
    localStorage.setItem(key, String(value));
  } catch (_) {}
}

function getRememberedValue(key, fallback = "") {
  try {
    return localStorage.getItem(key) || fallback;
  } catch (_) {
    return fallback;
  }
}

function createEmptyStep(order = 1) {
  return {
    order,
    telegramAccountId: "",
    type: "text",
    text: "",
    imageUrl: "",
    imageFile: null,
    imagePreviewUrl: "",
    caption: "",
    gapSecondsAfter: 0,
  };
}

export default function TelegramScripts() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [activeView, setActiveView] = useState(() =>
    getRememberedValue(CACHE_KEYS.activeView, "scripts"),
  );

  const [accounts, setAccounts] = useState(() => {
    return cacheGet(CACHE_KEYS.accounts) || [];
  });

  const [scripts, setScripts] = useState(() => {
    return cacheGet(CACHE_KEYS.scripts) || [];
  });

  const [runs, setRuns] = useState(() => {
    return cacheGet(CACHE_KEYS.runs) || [];
  });

  const [targetChats, setTargetChats] = useState(() => {
    const accountId = getRememberedValue(CACHE_KEYS.targetSourceAccountId, "");
    if (!accountId) return [];

    return cacheGet(`${CACHE_KEYS.targetChats}:${accountId}`) || [];
  });

  const [loading, setLoading] = useState(false);
  const [savingScript, setSavingScript] = useState(false);
  const [creatingRun, setCreatingRun] = useState(false);
  const [loadingTargetChats, setLoadingTargetChats] = useState(false);
  const [actionId, setActionId] = useState("");

  const [scriptModalOpen, setScriptModalOpen] = useState(false);
  const [targetModalOpen, setTargetModalOpen] = useState(false);

  const [editingScriptId, setEditingScriptId] = useState("");
  const [scriptName, setScriptName] = useState("");
  const [description, setDescription] = useState("");
  const [gapSpeedMode, setGapSpeedMode] = useState("normal");
  const [steps, setSteps] = useState([createEmptyStep(1)]);

  const [selectedScriptId, setSelectedScriptId] = useState(() =>
    getRememberedValue(CACHE_KEYS.selectedScriptId, ""),
  );

  const [targetSourceAccountId, setTargetSourceAccountId] = useState(() =>
    getRememberedValue(CACHE_KEYS.targetSourceAccountId, ""),
  );
  const [targetTelegramChatId, setTargetTelegramChatId] = useState("");
  const [targetTitle, setTargetTitle] = useState("");
  const [runMode, setRunMode] = useState("send_now");
  const [startAt, setStartAt] = useState("");

  const connectedAccounts = useMemo(() => {
    return accounts.filter(
      (account) => account.isConnected && account.status === "connected",
    );
  }, [accounts]);

  const selectedScript = useMemo(() => {
    return scripts.find((script) => script._id === selectedScriptId);
  }, [scripts, selectedScriptId]);

  const accountOptions = useMemo(() => {
    return connectedAccounts.map((account) => ({
      value: account._id,
      label: accountLabel(account),
    }));
  }, [connectedAccounts]);

  const scriptOptions = useMemo(() => {
    return scripts.map((script) => ({
      value: script._id,
      label: script.name || "Untitled script",
      description: `${script.steps?.length || 0} step(s)`,
    }));
  }, [scripts]);

  const targetChatOptions = useMemo(() => {
    return targetChats.map((chat) => ({
      value: String(chat.chatId),
      label: chat.title || "Untitled group",
      description: chat.type || "group",
    }));
  }, [targetChats]);

  useEffect(() => {
    loadPageData({
      silent: accounts.length > 0 || scripts.length > 0 || runs.length > 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (targetSourceAccountId) {
      const cached = cacheGet(
        `${CACHE_KEYS.targetChats}:${targetSourceAccountId}`,
      );

      if (Array.isArray(cached)) {
        setTargetChats(cached);
        loadTargetChats(targetSourceAccountId, { silent: true });
      } else {
        loadTargetChats(targetSourceAccountId, { silent: false });
      }
    } else {
      setTargetChats([]);
      setTargetTelegramChatId("");
      setTargetTitle("");
    }
  }, [targetSourceAccountId]);

  useEffect(() => {
    rememberValue(CACHE_KEYS.activeView, activeView);
  }, [activeView]);

  useEffect(() => {
    rememberValue(CACHE_KEYS.selectedScriptId, selectedScriptId);
  }, [selectedScriptId]);

  useEffect(() => {
    rememberValue(CACHE_KEYS.targetSourceAccountId, targetSourceAccountId);
  }, [targetSourceAccountId]);

  async function loadPageData(options = {}) {
    const cachedAccounts = cacheGet(CACHE_KEYS.accounts);
    const cachedScripts = cacheGet(CACHE_KEYS.scripts);
    const cachedRuns = cacheGet(CACHE_KEYS.runs);

    const hasCache =
      Array.isArray(cachedAccounts) ||
      Array.isArray(cachedScripts) ||
      Array.isArray(cachedRuns);

    const silent = options.silent ?? hasCache;

    try {
      if (Array.isArray(cachedAccounts)) setAccounts(cachedAccounts);
      if (Array.isArray(cachedScripts)) setScripts(cachedScripts);
      if (Array.isArray(cachedRuns)) setRuns(cachedRuns);

      if (!silent) {
        setLoading(true);
      }

      const [accountsRes, scriptsRes, runsRes] = await Promise.all([
        api.get("/api/telegram-auth/accounts"),
        api.get("/api/telegram-scripts"),
        api.get("/api/telegram-scripts/runs"),
      ]);

      const accountList = Array.isArray(accountsRes.data?.data)
        ? accountsRes.data.data
        : [];

      const scriptList = Array.isArray(scriptsRes.data?.data)
        ? scriptsRes.data.data
        : [];

      const runList = Array.isArray(runsRes.data?.data)
        ? runsRes.data.data
        : [];

      cacheSet(CACHE_KEYS.accounts, accountList);
      cacheSet(CACHE_KEYS.scripts, scriptList);
      cacheSet(CACHE_KEYS.runs, runList);

      setAccounts(accountList);
      setScripts(scriptList);
      setRuns(runList);

      setSelectedScriptId((current) => {
        if (current && scriptList.some((script) => script._id === current)) {
          return current;
        }

        return scriptList[0]?._id || "";
      });

      setTargetSourceAccountId((current) => {
        if (
          current &&
          accountList.some(
            (account) =>
              account._id === current &&
              account.isConnected &&
              account.status === "connected",
          )
        ) {
          return current;
        }

        const firstConnected = accountList.find(
          (account) => account.isConnected && account.status === "connected",
        );

        return firstConnected?._id || "";
      });
    } catch (err) {
      console.error("Load Telegram scripts page error:", err);

      if (!silent) {
        toast.error(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Failed to load Telegram scripts",
        );
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  async function loadTargetChats(accountId, options = {}) {
    if (!accountId) return;

    const cacheKey = `${CACHE_KEYS.targetChats}:${accountId}`;
    const cached = cacheGet(cacheKey);
    const hasCache = Array.isArray(cached);
    const silent = options.silent ?? hasCache;

    try {
      if (hasCache) {
        setTargetChats(cached);
      }

      if (!silent) {
        setLoadingTargetChats(true);
      }

      const res = await api.get(
        `/api/telegram-chats?telegramAccountId=${accountId}`,
      );

      const chatList = Array.isArray(res.data?.data) ? res.data.data : [];

      const groupsOnly = chatList.filter((chat) =>
        ["group", "supergroup"].includes(String(chat.type || "").toLowerCase()),
      );

      cacheSet(cacheKey, groupsOnly);
      setTargetChats(groupsOnly);

      setTargetTelegramChatId((current) => {
        if (
          current &&
          groupsOnly.some((chat) => String(chat.chatId) === String(current))
        ) {
          return current;
        }

        return "";
      });

      setTargetTitle((current) => {
        if (!targetTelegramChatId) return current;

        const selected = groupsOnly.find(
          (chat) => String(chat.chatId) === String(targetTelegramChatId),
        );

        return selected?.title || "";
      });
    } catch (err) {
      console.error("Load target chats error:", err);

      if (!silent) {
        toast.error(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Failed to load target groups",
        );
      }
    } finally {
      if (!silent) {
        setLoadingTargetChats(false);
      }
    }
  }

  function accountLabel(account) {
    return account?.label?.trim() || account?.phoneNumber || "Telegram Account";
  }

  function resetForm() {
    setEditingScriptId("");
    setScriptName("");
    setDescription("");
    setGapSpeedMode("normal");
    setSteps([createEmptyStep(1)]);
  }

  function openAddScriptModal() {
    resetForm();
    setScriptModalOpen(true);
  }

  function addStep() {
    setSteps((prev) => [...prev, createEmptyStep(prev.length + 1)]);
  }

  function removeStep(index) {
    setSteps((prev) => {
      const next = prev.filter((_, itemIndex) => itemIndex !== index);

      return next.length
        ? next.map((step, stepIndex) => ({
            ...step,
            order: stepIndex + 1,
          }))
        : [createEmptyStep(1)];
    });
  }

  function updateStep(index, patch) {
    setSteps((prev) =>
      prev.map((step, itemIndex) =>
        itemIndex === index ? { ...step, ...patch } : step,
      ),
    );
  }

  function buildCleanSteps() {
    return steps.map((step, index) => ({
      order: index + 1,
      telegramAccountId: String(step.telegramAccountId || "").trim(),
      type: String(step.type || "text").trim(),
      text: String(step.text || "").trim(),
      imageUrl: String(step.imageUrl || "").trim(),
      imageFile: step.imageFile || null,
      imagePreviewUrl: step.imagePreviewUrl || "",
      caption: String(step.caption || "").trim(),
      gapSecondsAfter: Math.max(Number(step.gapSecondsAfter) || 0, 0),
    }));
  }

  function validateScriptForm(cleanSteps) {
    if (!scriptName.trim()) {
      toast.error("Script name is required");
      return false;
    }

    for (const step of cleanSteps) {
      if (!step.telegramAccountId) {
        toast.error(`Please select Telegram account for step ${step.order}`);
        return false;
      }

      if (step.type === "text" && !step.text) {
        toast.error(`Text is required for step ${step.order}`);
        return false;
      }

      if (step.type === "image" && !step.imageUrl && !step.imageFile) {
        toast.error(`Image is required for step ${step.order}`);
        return false;
      }
    }

    return true;
  }

  async function uploadStepImages(cleanSteps) {
    const uploadedSteps = [];

    for (const step of cleanSteps) {
      if (step.type !== "image" || !step.imageFile) {
        uploadedSteps.push({
          ...step,
          imageFile: undefined,
          imagePreviewUrl: undefined,
        });
        continue;
      }

      const formData = new FormData();
      formData.append("image", step.imageFile);

      const res = await api.post(
        "/api/telegram-scripts/upload-image",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      uploadedSteps.push({
        ...step,
        imageUrl: res.data?.imageUrl || "",
        imageFile: undefined,
        imagePreviewUrl: undefined,
      });
    }

    return uploadedSteps;
  }

  async function saveScript(e) {
    e.preventDefault();

    const cleanSteps = buildCleanSteps();

    if (!validateScriptForm(cleanSteps)) return;

    try {
      setSavingScript(true);

      const uploadedSteps = await uploadStepImages(cleanSteps);

      const payload = {
        name: scriptName.trim(),
        description: description.trim(),
        gapSpeedMode,
        steps: uploadedSteps,
      };

      if (editingScriptId) {
        await api.put(`/api/telegram-scripts/${editingScriptId}`, payload);
        toast.success("Script updated");
      } else {
        await api.post("/api/telegram-scripts", payload);
        toast.success("Script created");
      }

      resetForm();
      setScriptModalOpen(false);
      setActiveView("scripts");
      await loadPageData();
    } catch (err) {
      console.error("Save script error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to save script",
      );
    } finally {
      setSavingScript(false);
    }
  }

  function editScript(script) {
    setEditingScriptId(script._id);
    setScriptName(script.name || "");
    setDescription(script.description || "");
    setGapSpeedMode(script.gapSpeedMode || "normal");

    const cleanSteps =
      Array.isArray(script.steps) && script.steps.length
        ? script.steps.map((step, index) => ({
            order: index + 1,
            telegramAccountId:
              step.telegramAccountId?._id || step.telegramAccountId || "",
            type: step.type || "text",
            text: step.text || "",
            imageUrl: step.imageUrl || "",
            imageFile: null,
            imagePreviewUrl: step.imageUrl || "",
            caption: step.caption || "",
            gapSecondsAfter: Number(step.gapSecondsAfter) || 0,
          }))
        : [createEmptyStep(1)];

    setSteps(cleanSteps);
    setScriptModalOpen(true);
  }

  async function deleteScript(scriptId) {
    const yes = window.confirm("Delete this script?");
    if (!yes) return;

    try {
      setActionId(scriptId);

      await api.delete(`/api/telegram-scripts/${scriptId}`);

      toast.success("Script deleted");
      await loadPageData();
    } catch (err) {
      console.error("Delete script error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to delete script",
      );
    } finally {
      setActionId("");
    }
  }

  async function createScriptRun(e) {
    e.preventDefault();

    if (!selectedScriptId) {
      toast.error("Please select script");
      return;
    }

    if (!targetTelegramChatId) {
      toast.error("Please select target group");
      return;
    }

    if (runMode === "schedule_later" && !startAt) {
      toast.error("Start date/time is required");
      return;
    }

    try {
      setCreatingRun(true);

      const payload = {
        scriptId: selectedScriptId,
        targetTelegramChatId,
        targetTitle,
        mode: runMode,
      };

      if (runMode === "schedule_later") {
        payload.startAt = new Date(startAt).toISOString();
      }

      await api.post("/api/telegram-scripts/runs", payload);

      toast.success(
        runMode === "send_now"
          ? "Script added to scheduler"
          : "Script scheduled",
      );

      setStartAt("");
      setTargetModalOpen(false);
      setActiveView("runs");
      await loadPageData();
    } catch (err) {
      console.error("Create script run error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to create script run",
      );
    } finally {
      setCreatingRun(false);
    }
  }

  async function cancelRun(runId) {
    try {
      setActionId(runId);

      await api.patch(`/api/telegram-scripts/runs/${runId}/cancel`);

      toast.success("Script run cancelled");
      await loadPageData();
    } catch (err) {
      console.error("Cancel run error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to cancel run",
      );
    } finally {
      setActionId("");
    }
  }

  return (
    <Shell title="Telegram Scripts">
      <div
        className={`-mx-3 -my-3 min-h-[calc(100vh-78px)] px-6 py-6 ${
          isDark ? "bg-[#202127]" : "bg-[#f4efe6]"
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                isDark
                  ? "bg-white/[0.06] text-white/65"
                  : "bg-white text-[#6d6254]"
              }`}
            >
              <ScrollText className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <div
                className={`text-[11px] font-medium uppercase tracking-[0.18em] ${
                  isDark ? "text-white/38" : "text-[#8a8176]"
                }`}
              >
                Telegram automation
              </div>

              <h2
                className={`mt-0.5 truncate text-[22px] font-semibold tracking-[-0.04em] ${
                  isDark ? "text-white" : "text-[#201d19]"
                }`}
              >
                Telegram Scripts
              </h2>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <ViewToggle
              isDark={isDark}
              activeView={activeView}
              setActiveView={setActiveView}
              scriptsCount={scripts.length}
              runsCount={runs.length}
            />

            <button
              type="button"
              onClick={() => loadPageData({ silent: false })}
              disabled={loading}
              className={topSoftButtonClass(isDark)}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Refresh
            </button>

            <button
              type="button"
              onClick={openAddScriptModal}
              className={topPrimaryButtonClass()}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Script
            </button>

            <button
              type="button"
              onClick={() => setTargetModalOpen(true)}
              className={topPrimaryButtonClass()}
            >
              <Play className="h-3.5 w-3.5" />
              Schedule Script
            </button>
          </div>
        </div>

        <div
          className={`mt-5 overflow-hidden rounded-[24px] border ${
            isDark
              ? "border-white/[0.06] bg-[#282a30]"
              : "border-[#eee4d5] bg-white"
          }`}
        >
          {activeView === "scripts" ? (
            <ScriptsTable
              isDark={isDark}
              scripts={scripts}
              actionId={actionId}
              onEdit={editScript}
              onDelete={deleteScript}
              onCreate={openAddScriptModal}
            />
          ) : (
            <RunsTable
              isDark={isDark}
              runs={runs}
              actionId={actionId}
              onCancel={cancelRun}
            />
          )}
        </div>

        <Modal
          isDark={isDark}
          open={scriptModalOpen}
          onClose={() => {
            if (!savingScript) {
              setScriptModalOpen(false);
              resetForm();
            }
          }}
          title={editingScriptId ? "Edit script" : "Add script"}
          description="Save the message sequence only. The group is selected later when you run the script."
          maxWidth="max-w-4xl"
        >
          <form onSubmit={saveScript} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={labelClass(isDark)}>Script name</label>
                <input
                  value={scriptName}
                  onChange={(e) => setScriptName(e.target.value)}
                  placeholder="Script A"
                  className={inputClass(isDark)}
                />
              </div>

              <div>
                <label className={labelClass(isDark)}>Description</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional admin note"
                  className={inputClass(isDark)}
                />
              </div>

              <div>
                <label className={labelClass(isDark)}>Speed</label>

                <CustomSelect
                  isDark={isDark}
                  value={gapSpeedMode}
                  placeholder="Select speed"
                  options={[
                    {
                      value: "quick",
                      label: "Quick",
                      description: "2-5 min between steps",
                    },
                    {
                      value: "normal",
                      label: "Normal",
                      description: "4-10 min between steps",
                    },
                    {
                      value: "slow",
                      label: "Slow",
                      description: "6-15 min between steps",
                    },
                  ]}
                  onChange={setGapSpeedMode}
                />
              </div>
            </div>

            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className={`rounded-[20px] border p-4 ${
                    isDark
                      ? "border-white/[0.08] bg-[#2b2c33]"
                      : "border-[#eadfce] bg-[#f7f2ea]"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className={smallTitleClass(isDark)}>
                      Step {index + 1}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeStep(index)}
                      className={iconDangerButton(isDark)}
                      title="Remove step"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelClass(isDark)}>
                        Sending account
                      </label>

                      <CustomSelect
                        isDark={isDark}
                        value={step.telegramAccountId}
                        placeholder="Select account"
                        options={accountOptions}
                        emptyText="No connected accounts"
                        onChange={(value) =>
                          updateStep(index, {
                            telegramAccountId: value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className={labelClass(isDark)}>Type</label>

                      <CustomSelect
                        isDark={isDark}
                        value={step.type}
                        placeholder="Select type"
                        options={[
                          {
                            value: "text",
                            label: "Text",
                            description: "Send a text message",
                          },
                          {
                            value: "image",
                            label: "Image",
                            description: "Send image by URL",
                          },
                        ]}
                        onChange={(value) => updateStep(index, { type: value })}
                      />
                    </div>
                  </div>

                  {step.type === "text" ? (
                    <div className="mt-3">
                      <label className={labelClass(isDark)}>Text message</label>
                      <textarea
                        value={step.text}
                        onChange={(e) =>
                          updateStep(index, { text: e.target.value })
                        }
                        rows={4}
                        placeholder="Yoga class starts at 10am"
                        className={`${inputClass(isDark)} min-h-[120px] resize-none py-3 leading-6`}
                      />
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <div
                        className={`rounded-[16px] border p-3 ${
                          isDark
                            ? "border-white/[0.08] bg-[#24252b]"
                            : "border-[#eadfce] bg-[#fbf7f0]"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <label className={labelClass(isDark)}>Image</label>

                          {(step.imageFile ||
                            step.imageUrl ||
                            step.imagePreviewUrl) && (
                            <button
                              type="button"
                              onClick={() =>
                                updateStep(index, {
                                  imageFile: null,
                                  imagePreviewUrl: "",
                                  imageUrl: "",
                                })
                              }
                              className="text-[11px] text-red-300"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        {(step.imagePreviewUrl || step.imageUrl) && (
                          <img
                            src={
                              step.imagePreviewUrl || getImageSrc(step.imageUrl)
                            }
                            alt="Step preview"
                            className="mb-3 max-h-56 w-full rounded-[14px] object-cover"
                          />
                        )}

                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];

                            if (!file) return;

                            if (file.size > 5 * 1024 * 1024) {
                              toast.error("Image must be smaller than 5MB");
                              return;
                            }

                            updateStep(index, {
                              imageFile: file,
                              imagePreviewUrl: URL.createObjectURL(file),
                              imageUrl: "",
                            });
                          }}
                          className="block w-full text-[12px] opacity-80"
                        />

                        <div className={hintClass(isDark)}>
                          Choose an image file. It will upload when you save the
                          script.
                        </div>
                      </div>

                      <div>
                        <label className={labelClass(isDark)}>Caption</label>
                        <input
                          value={step.caption}
                          onChange={(e) =>
                            updateStep(index, { caption: e.target.value })
                          }
                          placeholder="Optional caption"
                          className={inputClass(isDark)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={addStep}
                className={secondaryButton(isDark)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add step
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!savingScript) {
                      setScriptModalOpen(false);
                      resetForm();
                    }
                  }}
                  className={secondaryButton(isDark)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingScript}
                  className={primaryButtonInline()}
                >
                  {savingScript ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {editingScriptId ? "Save Changes" : "Save Script"}
                </button>
              </div>
            </div>
          </form>
        </Modal>

        <Modal
          isDark={isDark}
          open={targetModalOpen}
          onClose={() => {
            if (!creatingRun) {
              setTargetModalOpen(false);
            }
          }}
          title="Schedule script"
          description="Choose a saved script and target group. The normal scheduler will send each script step."
          maxWidth="max-w-3xl"
        >
          <form onSubmit={createScriptRun} className="space-y-4">
            <div>
              <label className={labelClass(isDark)}>Script</label>

              <CustomSelect
                isDark={isDark}
                value={selectedScriptId}
                placeholder="Select script"
                options={scriptOptions}
                emptyText="No scripts saved"
                onChange={(value) => setSelectedScriptId(value)}
              />
            </div>

            {selectedScript && (
              <ScriptPreview script={selectedScript} isDark={isDark} />
            )}

            <div>
              <label className={labelClass(isDark)}>
                Load target groups from account
              </label>

              <CustomSelect
                isDark={isDark}
                value={targetSourceAccountId}
                placeholder="Select account"
                options={accountOptions}
                emptyText="No connected accounts"
                onChange={(value) => setTargetSourceAccountId(value)}
              />

              <div className={hintClass(isDark)}>
                This only loads the group list. Each script account must also be
                inside the selected group.
              </div>
            </div>

            <div>
              <label className={labelClass(isDark)}>Target group</label>

              <CustomSelect
                isDark={isDark}
                value={targetTelegramChatId}
                placeholder={
                  !targetSourceAccountId
                    ? "Select account first"
                    : loadingTargetChats
                      ? "Loading groups..."
                      : "Select group"
                }
                options={targetChatOptions}
                emptyText="No groups synced"
                disabled={!targetSourceAccountId || loadingTargetChats}
                loading={loadingTargetChats}
                onChange={(value) => {
                  const selected = targetChats.find(
                    (chat) => String(chat.chatId) === String(value),
                  );

                  setTargetTelegramChatId(value);
                  setTargetTitle(selected?.title || "");
                }}
              />
            </div>

            <div>
              <label className={labelClass(isDark)}>Run mode</label>

              <div className="grid grid-cols-2 gap-2">
                {[
                  ["send_now", "Send now"],
                  ["schedule_later", "Schedule later"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRunMode(value)}
                    className={`min-h-[42px] rounded-[14px] px-3 text-[12px] transition ${
                      runMode === value
                        ? "bg-[#d8c49a] text-[#171717]"
                        : isDark
                          ? "bg-[#292a2f] text-white/55 hover:bg-white/[0.06]"
                          : "bg-[#f7f2ea] text-[#70675c] hover:bg-[#efe6d8]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {runMode === "schedule_later" && (
              <div>
                <label className={labelClass(isDark)}>Start date/time</label>
                <input
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  type="datetime-local"
                  className={inputClass(isDark)}
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!creatingRun) {
                    setTargetModalOpen(false);
                  }
                }}
                className={secondaryButton(isDark)}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  creatingRun || !selectedScriptId || !targetTelegramChatId
                }
                className={primaryButtonInline()}
              >
                {creatingRun ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : runMode === "send_now" ? (
                  <Play className="h-4 w-4" />
                ) : (
                  <CalendarClock className="h-4 w-4" />
                )}
                {runMode === "send_now" ? "Run Script Now" : "Schedule Script"}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </Shell>
  );
}

function ViewToggle({
  isDark,
  activeView,
  setActiveView,
  scriptsCount,
  runsCount,
}) {
  const items = [
    ["scripts", "Saved Scripts", scriptsCount],
    ["runs", "Recent Runs", runsCount],
  ];

  return (
    <div
      className={`inline-flex h-10 items-center rounded-[14px] border p-1 ${
        isDark
          ? "border-white/[0.07] bg-white/[0.045]"
          : "border-[#eee4d5] bg-white"
      }`}
    >
      {items.map(([value, label, count]) => {
        const active = activeView === value;

        return (
          <button
            key={value}
            type="button"
            onClick={() => setActiveView(value)}
            className={`inline-flex h-8 min-w-[136px] items-center justify-center gap-2 rounded-[10px] px-3 text-[12px] font-medium leading-none transition ${
              active
                ? "bg-[#d8c49a] text-[#171717] shadow-[0_8px_18px_rgba(216,196,154,0.14)]"
                : isDark
                  ? "text-white/48 hover:bg-white/[0.05] hover:text-white/75"
                  : "text-[#70675c] hover:bg-[#f7f2ea] hover:text-[#201d19]"
            }`}
          >
            <span className="leading-none">{label}</span>

            <span
              className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold leading-none ${
                active
                  ? "bg-[#171717]/10 text-[#171717]"
                  : isDark
                    ? "bg-white/[0.07] text-white/45"
                    : "bg-[#f7f2ea] text-[#8d8375]"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ScriptsTable({
  isDark,
  scripts,
  actionId,
  onEdit,
  onDelete,
  onCreate,
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse">
        <thead>
          <tr
            className={
              isDark
                ? "border-b border-white/[0.05] bg-[#24252b] text-white/42"
                : "border-b border-[#eee4d5] bg-[#fbf8f2] text-[#8a8176]"
            }
          >
            <Th>Script name</Th>
            <Th>Steps</Th>
            <Th>Description</Th>
            <Th align="right">Actions</Th>
          </tr>
        </thead>

        <tbody>
          {scripts.map((script) => (
            <tr key={script._id} className={tableRowClass(isDark)}>
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] ${
                      isDark
                        ? "bg-white/[0.06] text-white/55"
                        : "bg-[#f7f2ea] text-[#746b61]"
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <div
                      className={`truncate text-[13px] font-medium ${
                        isDark ? "text-white" : "text-[#201d19]"
                      }`}
                    >
                      {script.name || "Untitled script"}
                    </div>

                    <div className={hintClass(isDark)}>ID: {script._id}</div>
                  </div>
                </div>
              </td>

              <td className="px-5 py-4">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] ${
                    isDark
                      ? "bg-white/[0.06] text-white/55"
                      : "bg-[#f7f2ea] text-[#70675c]"
                  }`}
                >
                  {script.steps?.length || 0} step(s)
                </span>
              </td>

              <td className="px-5 py-4">
                <div
                  className={`max-w-[420px] truncate text-[12px] ${
                    isDark ? "text-white/45" : "text-[#70675c]"
                  }`}
                >
                  {script.description || "No description"}
                </div>
              </td>

              <td className="px-5 py-4">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(script)}
                    disabled={actionId === script._id}
                    className={iconButton(isDark)}
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(script._id)}
                    disabled={actionId === script._id}
                    className={iconDangerButton(isDark)}
                    title="Delete"
                  >
                    {actionId === script._id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </td>
            </tr>
          ))}

          {!scripts.length && (
            <tr>
              <td colSpan={4} className="px-5 py-16 text-center">
                <EmptyTableState
                  isDark={isDark}
                  icon={<FileText className="h-6 w-6" />}
                  title="No scripts saved"
                  text="Click Add Script to create your first reusable Telegram script."
                  buttonText="Add Script"
                  onClick={onCreate}
                />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function RunsTable({ isDark, runs, actionId, onCancel }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse">
        <thead>
          <tr
            className={
              isDark
                ? "border-b border-white/[0.05] bg-[#24252b] text-white/42"
                : "border-b border-[#eee4d5] bg-[#fbf8f2] text-[#8a8176]"
            }
          >
            <Th>Status</Th>
            <Th>Script</Th>
            <Th>Target</Th>
            <Th>Start</Th>
            <Th align="right">Action</Th>
          </tr>
        </thead>

        <tbody>
          {runs.map((run) => {
            const canCancel = ["pending", "running"].includes(run.status);

            return (
              <tr key={run._id} className={tableRowClass(isDark)}>
                <td className="px-5 py-4">
                  <StatusBadge status={run.status} isDark={isDark} />
                </td>

                <td className="px-5 py-4">
                  <div
                    className={`text-[13px] font-medium ${
                      isDark ? "text-white" : "text-[#201d19]"
                    }`}
                  >
                    {run.scriptId?.name || "Unknown script"}
                  </div>

                  {run.error && (
                    <div className="mt-1 max-w-[320px] truncate text-[11px] text-red-300">
                      {run.error}
                    </div>
                  )}
                </td>

                <td className="px-5 py-4">
                  <div
                    className={`max-w-[360px] truncate text-[12px] ${
                      isDark ? "text-white/50" : "text-[#70675c]"
                    }`}
                  >
                    {run.targetTitle || run.targetTelegramChatId || "-"}
                  </div>
                </td>

                <td className="px-5 py-4">
                  <div
                    className={`text-[12px] ${
                      isDark ? "text-white/50" : "text-[#70675c]"
                    }`}
                  >
                    {formatDate(run.startAt)}
                  </div>
                </td>

                <td className="px-5 py-4">
                  <div className="flex justify-end">
                    {canCancel ? (
                      <button
                        type="button"
                        onClick={() => onCancel(run._id)}
                        disabled={actionId === run._id}
                        className={iconDangerButton(isDark)}
                        title="Cancel run"
                      >
                        {actionId === run._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                      </button>
                    ) : (
                      <span className={hintClass(isDark)}>-</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}

          {!runs.length && (
            <tr>
              <td colSpan={5} className="px-5 py-16 text-center">
                <EmptyTableState
                  isDark={isDark}
                  icon={<Clock className="h-6 w-6" />}
                  title="No script runs"
                  text="Run a script to see recent activity here."
                />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function CustomSelect({
  isDark,
  value,
  onChange,
  options = [],
  placeholder = "Select option",
  emptyText = "No options",
  disabled = false,
  loading = false,
}) {
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedOption = options.find(
    (option) => String(option.value) === String(value),
  );

  const filteredOptions = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery) return options;

    return options.filter((option) => {
      const label = String(option.label || "").toLowerCase();
      const description = String(option.description || "").toLowerCase();

      return label.includes(cleanQuery) || description.includes(cleanQuery);
    });
  }, [options, query]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!wrapRef.current) return;

      if (!wrapRef.current.contains(event.target)) {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        className={`flex min-h-[48px] w-full items-center justify-between gap-3 rounded-[16px] border px-4 text-left text-[14px] outline-none transition ${
          disabled
            ? "cursor-not-allowed opacity-60"
            : isDark
              ? "hover:bg-[#202126]"
              : "hover:bg-white"
        } ${
          isDark
            ? "border-white/[0.10] bg-[#24252b] text-white focus:border-[#d8c49a]/70 focus:ring-4 focus:ring-[#d8c49a]/10"
            : "border-[#eadfce] bg-[#fbf7f0] text-[#201d19] focus:border-[#d8c49a] focus:ring-4 focus:ring-[#d8c49a]/16"
        }`}
      >
        <span className="min-w-0">
          <span
            className={`block truncate ${
              selectedOption
                ? isDark
                  ? "text-white"
                  : "text-[#201d19]"
                : isDark
                  ? "text-white/28"
                  : "text-[#aaa096]"
            }`}
          >
            {loading
              ? "Loading..."
              : selectedOption
                ? selectedOption.label
                : placeholder}
          </span>

          {selectedOption?.description && (
            <span
              className={`mt-0.5 block truncate text-[11px] ${
                isDark ? "text-white/35" : "text-[#8d8375]"
              }`}
            >
              {selectedOption.description}
            </span>
          )}
        </span>

        {loading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin opacity-60" />
        ) : (
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition ${
              open ? "rotate-180" : ""
            } ${isDark ? "text-white/35" : "text-[#8d8375]"}`}
          />
        )}
      </button>

      {open && !disabled && (
        <div
          className={`absolute left-0 right-0 top-[calc(100%+8px)] z-[80] overflow-hidden rounded-[18px] border shadow-2xl ${
            isDark
              ? "border-white/[0.08] bg-[#202126]"
              : "border-[#efe6d8] bg-white"
          }`}
        >
          <div className="p-2">
            <div
              className={`flex min-h-[38px] items-center gap-2 rounded-[13px] px-3 ${
                isDark ? "bg-[#292a2f]" : "bg-[#f7f2ea]"
              }`}
            >
              <Search
                className={`h-3.5 w-3.5 ${
                  isDark ? "text-white/35" : "text-[#8d8375]"
                }`}
              />

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className={`w-full bg-transparent text-[12px] outline-none ${
                  isDark
                    ? "text-white placeholder:text-white/25"
                    : "text-[#201d19] placeholder:text-[#aaa096]"
                }`}
              />
            </div>
          </div>

          <div className="max-h-[240px] overflow-y-auto p-2 pt-0">
            {filteredOptions.map((option) => {
              const active = String(option.value) === String(value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-[13px] px-3 text-left transition ${
                    active
                      ? "bg-[#d8c49a] text-[#171717]"
                      : isDark
                        ? "text-white/65 hover:bg-white/[0.06]"
                        : "text-[#201d19] hover:bg-[#f7f2ea]"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px]">
                      {option.label}
                    </span>

                    {option.description && (
                      <span
                        className={`mt-0.5 block truncate text-[11px] ${
                          active
                            ? "text-[#171717]/60"
                            : isDark
                              ? "text-white/35"
                              : "text-[#8d8375]"
                        }`}
                      >
                        {option.description}
                      </span>
                    )}
                  </span>

                  {active && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}

            {!filteredOptions.length && (
              <div
                className={`flex min-h-[90px] items-center justify-center rounded-[14px] px-3 text-center text-[12px] ${
                  isDark
                    ? "bg-white/[0.03] text-white/35"
                    : "bg-[#f7f2ea] text-[#8d8375]"
                }`}
              >
                {emptyText}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Modal({
  isDark,
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = "max-w-2xl",
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5">
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />

      <div
        className={`relative z-[71] flex max-h-[92vh] w-full ${maxWidth} flex-col overflow-hidden rounded-[26px] shadow-2xl ${
          isDark ? "bg-[#34343c]" : "bg-white"
        }`}
      >
        <div
          className={`flex items-start justify-between gap-3 border-b p-4 sm:p-5 ${
            isDark ? "border-white/[0.07]" : "border-[#f1e8db]"
          }`}
        >
          <div>
            <h3 className={titleClass(isDark)}>{title}</h3>

            {description && (
              <p className={paragraphClass(isDark)}>{description}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className={iconButton(isDark)}
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}

function ScriptPreview({ script, isDark }) {
  return (
    <div
      className={`rounded-[18px] p-3 ${
        isDark ? "bg-[#292a2f]" : "bg-[#f7f2ea]"
      }`}
    >
      <div className={smallTitleClass(isDark)}>{script.name}</div>

      <div className={hintClass(isDark)}>
        Speed: {script.gapSpeedMode || "normal"}
      </div>

      <div className="mt-2 space-y-2">
        {(script.steps || []).map((step, index) => {
          const account =
            step.telegramAccountId?.label ||
            step.telegramAccountId?.phoneNumber ||
            "Unknown account";

          return (
            <div
              key={step._id || index}
              className={`rounded-[14px] px-3 py-2 text-[11px] ${
                isDark
                  ? "bg-white/[0.04] text-white/55"
                  : "bg-white text-[#70675c]"
              }`}
            >
              <div className="flex items-center gap-2">
                {step.type === "image" ? (
                  <FileImage className="h-3.5 w-3.5" />
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
                Step {index + 1}: {account}
              </div>

              <div className="mt-1 truncate opacity-75">
                {step.type === "image"
                  ? step.caption || step.imageUrl
                  : step.text}
              </div>

              <div className="mt-1 opacity-50">Uses script speed setting</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status, isDark }) {
  const map = {
    pending: "Pending",
    running: "Running",
    completed: "Completed",
    failed: "Failed",
    cancelled: "Cancelled",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-normal ${
        status === "completed"
          ? "bg-emerald-400/10 text-emerald-300"
          : status === "running"
            ? "bg-[#d8c49a]/14 text-[#e6d4ae]"
            : status === "failed" || status === "cancelled"
              ? "bg-red-400/10 text-red-300"
              : isDark
                ? "bg-white/[0.06] text-white/50"
                : "bg-white text-[#70675c]"
      }`}
    >
      {map[status] || status}
    </span>
  );
}

function EmptyTableState({ isDark, icon, title, text, buttonText, onClick }) {
  return (
    <div className="mx-auto max-w-sm text-center">
      <div
        className={`mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] ${
          isDark
            ? "bg-white/[0.06] text-white/45"
            : "bg-[#f7f2ea] text-[#746b61]"
        }`}
      >
        {icon}
      </div>

      <div
        className={`mt-3 text-sm font-medium ${
          isDark ? "text-white" : "text-[#201d19]"
        }`}
      >
        {title}
      </div>

      <p
        className={`mt-1 text-xs leading-5 ${
          isDark ? "text-white/42" : "text-[#70675c]"
        }`}
      >
        {text}
      </p>

      {buttonText && onClick && (
        <button
          type="button"
          onClick={onClick}
          className={luxuryPrimaryButtonClass("mx-auto mt-5")}
        >
          <Plus className="h-3.5 w-3.5" />
          {buttonText}
        </button>
      )}
    </div>
  );
}

function Th({ children, align = "left" }) {
  return (
    <th
      className={`px-5 py-4 text-${align} text-[11px] font-semibold uppercase tracking-[0.16em]`}
    >
      {children}
    </th>
  );
}

function tableRowClass(isDark) {
  return `border-b last:border-b-0 ${
    isDark
      ? "border-white/[0.045] text-white hover:bg-white/[0.03]"
      : "border-[#eee4d5]/80 text-[#201d19] hover:bg-[#fbf8f2]"
  }`;
}

function titleClass(isDark) {
  return `text-[20px] font-medium tracking-[-0.04em] ${
    isDark ? "text-white" : "text-[#201d19]"
  }`;
}

function smallTitleClass(isDark) {
  return `text-[13px] font-medium ${isDark ? "text-white" : "text-[#201d19]"}`;
}

function paragraphClass(isDark) {
  return `mt-1 max-w-xl text-xs leading-5 ${
    isDark ? "text-white/42" : "text-[#70675c]"
  }`;
}

function labelClass(isDark) {
  return `mb-1.5 block text-[12px] font-normal ${
    isDark ? "text-white/55" : "text-[#70675c]"
  }`;
}

function hintClass(isDark) {
  return `mt-1.5 text-[11px] ${isDark ? "text-white/32" : "text-[#8d8375]"}`;
}

function inputClass(isDark) {
  return `min-h-[48px] w-full rounded-[16px] border px-4 text-[14px] outline-none transition ${
    isDark
      ? "border-white/[0.10] bg-[#24252b] text-white placeholder:text-white/38 focus:border-[#d8c49a]/70 focus:bg-[#202126] focus:ring-4 focus:ring-[#d8c49a]/10"
      : "border-[#eadfce] bg-[#fbf7f0] text-[#201d19] placeholder:text-[#8d8375] focus:border-[#d8c49a] focus:bg-white focus:ring-4 focus:ring-[#d8c49a]/16"
  }`;
}

function luxuryPrimaryButtonClass(extra = "") {
  return `inline-flex min-h-[38px] items-center justify-center gap-2 rounded-[14px] bg-[#d8c49a] px-4 text-[12px] font-semibold text-[#171717] shadow-[0_10px_24px_rgba(216,196,154,0.12)] transition hover:bg-[#e4d1a9] disabled:cursor-not-allowed disabled:opacity-60 ${extra}`;
}

function topPrimaryButtonClass(extra = "") {
  return `inline-flex h-10 items-center justify-center gap-2 rounded-[14px] bg-[#d8c49a] px-4 text-[12px] font-semibold leading-none text-[#171717] shadow-[0_8px_18px_rgba(216,196,154,0.12)] transition hover:bg-[#e4d1a9] disabled:cursor-not-allowed disabled:opacity-60 ${extra}`;
}

function topSoftButtonClass(isDark) {
  return `inline-flex h-10 items-center justify-center gap-2 rounded-[14px] px-4 text-[12px] font-medium leading-none transition disabled:cursor-not-allowed disabled:opacity-60 ${
    isDark
      ? "border border-white/[0.07] bg-white/[0.045] text-white/58 hover:bg-white/[0.08] hover:text-white/75"
      : "border border-[#eee4d5] bg-white text-[#5c5348] hover:bg-[#f7f2ea]"
  }`;
}

function primaryButtonInline() {
  return "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-[14px] bg-[#d8c49a] px-4 text-[13px] font-medium text-[#171717] transition hover:bg-[#e4d1a9] disabled:cursor-not-allowed disabled:opacity-60";
}

function secondaryButton(isDark) {
  return `inline-flex min-h-[38px] items-center justify-center gap-2 rounded-[13px] px-3 text-[12px] font-normal transition ${
    isDark
      ? "bg-white/[0.055] text-white/55 hover:bg-white/[0.08]"
      : "bg-[#f7f2ea] text-[#70675c] hover:bg-[#efe6d8]"
  } disabled:cursor-not-allowed disabled:opacity-60`;
}

function iconButton(isDark) {
  return `inline-flex h-8 w-8 items-center justify-center rounded-xl transition disabled:opacity-60 ${
    isDark
      ? "bg-white/[0.07] text-white/55 hover:bg-white/10"
      : "bg-white text-[#5c5348] hover:bg-[#efe6d8]"
  }`;
}

function iconDangerButton(isDark) {
  return `inline-flex h-8 w-8 items-center justify-center rounded-xl transition disabled:opacity-60 ${
    isDark
      ? "bg-red-400/10 text-red-300 hover:bg-red-400/15"
      : "bg-red-50 text-red-600 hover:bg-red-100"
  }`;
}

function getBackendBaseUrl() {
  const baseUrl = String(api?.defaults?.baseURL || "").replace(/\/+$/, "");
  return baseUrl.replace(/\/api$/, "");
}

function getImageSrc(imageUrl = "") {
  const cleanUrl = String(imageUrl || "").trim();

  if (!cleanUrl) return "";

  if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
    return cleanUrl;
  }

  const backendBaseUrl = getBackendBaseUrl();
  const uploadPath = cleanUrl.startsWith("/") ? cleanUrl : `/${cleanUrl}`;

  return backendBaseUrl ? `${backendBaseUrl}${uploadPath}` : uploadPath;
}

function formatDate(value) {
  if (!value) return "No date";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

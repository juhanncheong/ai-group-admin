import { useEffect, useState } from "react";
import Shell from "../components/Shell";
import { toast } from "react-toastify";
import { useTheme } from "../context/ThemeContext";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://slimy-xenia-jayjay122-018fd7f8.koyeb.app";

const CONTENT_KEYS = [
  { key: "terms", label: "Terms & Conditions" },
  { key: "privacy-security", label: "Privacy & Security" },
  { key: "platform-rules", label: "Platform Rules" },
];

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function emptySection() {
  return { heading: "", paragraphsText: "" };
}

export default function Content() {
  const { theme } = useTheme();

  const mutedText = theme === "dark" ? "text-white/50" : "text-gray-500";
  const softText = theme === "dark" ? "text-white/70" : "text-gray-600";
  const strongText = theme === "dark" ? "text-white" : "text-gray-900";

  const cardClass =
    theme === "dark"
      ? "rounded-2xl border border-white/10 bg-white/5 p-4"
      : "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm";

  const subCardClass =
    theme === "dark"
      ? "rounded-2xl border border-white/10 bg-white/5 p-3"
      : "rounded-2xl border border-gray-200 bg-gray-50 p-3";

  const inputClass =
    theme === "dark"
      ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 outline-none focus:border-white/20"
      : "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-gray-400";

  const textareaClass =
    theme === "dark"
      ? "w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 outline-none focus:border-white/20"
      : "w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-gray-400";

  const buttonClass =
    theme === "dark"
      ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10"
      : "rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-gray-50";

  const primaryButtonClass =
    theme === "dark"
      ? "rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs text-white/85 hover:bg-white/15"
      : "rounded-xl border border-gray-900 bg-gray-900 px-4 py-2 text-xs text-white hover:bg-gray-800";

  const [activeKey, setActiveKey] = useState("terms");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    summary: "",
    version: "v1.0",
    lastUpdated: "",
    isPublished: true,
    sections: [emptySection()],
  });

  function getAuthHeaders() {
    const token = localStorage.getItem("admin_token");
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  }

  async function fetchJSON(url, options = {}) {
    const auth = getAuthHeaders();

    if (!auth) {
      localStorage.removeItem("admin_token");
      window.location.href = "/admin/login";
      throw new Error("Please login again.");
    }

    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...auth,
      },
    });

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error("Server returned non-JSON response.");
    }

    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem("admin_token");
        window.location.href = "/admin/login";
      }
      throw new Error(data?.message || `Request failed (${res.status})`);
    }

    return data;
  }

  function applyContentToForm(content) {
    const sections =
      Array.isArray(content?.sections) && content.sections.length
        ? content.sections.map((section) => ({
            heading: section?.heading || "",
            paragraphsText: Array.isArray(section?.paragraphs)
              ? section.paragraphs.join("\n\n")
              : "",
          }))
        : [emptySection()];

    setForm({
      title: content?.title || "",
      summary: content?.summary || "",
      version: content?.version || "v1.0",
      lastUpdated: content?.lastUpdated
        ? new Date(content.lastUpdated).toISOString().slice(0, 10)
        : "",
      isPublished:
        typeof content?.isPublished === "boolean" ? content.isPublished : true,
      sections,
    });
  }

  async function loadContent(key) {
    setLoading(true);

    try {
      const data = await fetchJSON(`${API_BASE}/api/admin/content/${key}`);
      applyContentToForm(data?.content || {});
    } catch (e) {
      toast.error(e.message || "Failed to load content");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContent(activeKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  function updateSection(index, patch) {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, i) =>
        i === index ? { ...section, ...patch } : section
      ),
    }));
  }

  function addSection() {
    setForm((prev) => ({
      ...prev,
      sections: [...prev.sections, emptySection()],
    }));
  }

  function removeSection(index) {
    setForm((prev) => {
      const next = prev.sections.filter((_, i) => i !== index);
      return {
        ...prev,
        sections: next.length ? next : [emptySection()],
      };
    });
  }

  async function saveContent() {
    setSaving(true);

    try {
      const cleanedSections = form.sections
        .map((section) => ({
          heading: String(section.heading || "").trim(),
          paragraphs: String(section.paragraphsText || "")
            .split(/\n{2,}/)
            .map((p) => p.trim())
            .filter(Boolean),
        }))
        .filter((section) => section.heading || section.paragraphs.length);

      if (!String(form.title || "").trim()) {
        throw new Error("Title is required.");
      }

      await fetchJSON(`${API_BASE}/api/admin/content/${activeKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: String(form.title || "").trim(),
          summary: String(form.summary || "").trim(),
          version: String(form.version || "v1.0").trim(),
          lastUpdated: form.lastUpdated || null,
          isPublished: !!form.isPublished,
          sections: cleanedSections,
        }),
      });

      toast.success("Content saved successfully");
      await loadContent(activeKey);
    } catch (e) {
      toast.error(e.message || "Failed to save content");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell title="Content Management">
      <div className="flex flex-col gap-4">
        <div className={`text-xs ${mutedText}`}>
          Manage Terms, Privacy & Security, and Platform Rules content for the
          user settings pages.
        </div>

        <div className="flex flex-wrap gap-2">
          {CONTENT_KEYS.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveKey(item.key)}
              className={classNames(
                "rounded-xl border px-3 py-2 text-xs transition",
                activeKey === item.key
                  ? theme === "dark"
                    ? "border-white/15 bg-white/10 text-white"
                    : "border-gray-400 bg-gray-100 text-gray-900"
                  : theme === "dark"
                  ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className={cardClass}>
          {loading ? (
            <div className={`text-sm ${softText}`}>Loading content...</div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className={subCardClass}>
                  <div className={`text-xs font-semibold ${strongText}`}>Title</div>
                  <input
                    value={form.title}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    className={`mt-2 ${inputClass}`}
                    placeholder="Enter page title"
                  />
                </div>

                <div className={subCardClass}>
                  <div className={`text-xs font-semibold ${strongText}`}>Version</div>
                  <input
                    value={form.version}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, version: e.target.value }))
                    }
                    className={`mt-2 ${inputClass}`}
                    placeholder="v1.0"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className={subCardClass}>
                  <div className={`text-xs font-semibold ${strongText}`}>Last Updated</div>
                  <input
                    type="date"
                    value={form.lastUpdated}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        lastUpdated: e.target.value,
                      }))
                    }
                    className={`mt-2 ${inputClass}`}
                  />
                </div>

                <div className={`${subCardClass} flex items-center justify-between`}>
                  <div>
                    <div className={`text-xs font-semibold ${strongText}`}>Published</div>
                    <div className={`mt-1 text-[11px] ${mutedText}`}>
                      If turned off, public page will not return this content
                    </div>
                  </div>

                  <label className={`inline-flex items-center gap-2 text-xs ${softText}`}>
                    <input
                      type="checkbox"
                      checked={!!form.isPublished}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          isPublished: e.target.checked,
                        }))
                      }
                    />
                    {form.isPublished ? "Published" : "Hidden"}
                  </label>
                </div>
              </div>

              <div className={subCardClass}>
                <div className={`text-xs font-semibold ${strongText}`}>Summary</div>
                <textarea
                  value={form.summary}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, summary: e.target.value }))
                  }
                  rows={3}
                  className={`mt-2 ${textareaClass}`}
                  placeholder="Short page summary"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`text-sm font-semibold ${strongText}`}>Sections</div>
                  <button
                    onClick={addSection}
                    className={primaryButtonClass}
                  >
                    + Add Section
                  </button>
                </div>

                {form.sections.map((section, index) => (
                  <div
                    key={index}
                    className={cardClass}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className={`text-xs font-semibold ${strongText}`}>
                        Section {index + 1}
                      </div>

                      <button
                        onClick={() => removeSection(index)}
                        className={buttonClass}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className={`text-xs font-semibold ${strongText}`}>Heading</div>
                        <input
                          value={section.heading}
                          onChange={(e) =>
                            updateSection(index, { heading: e.target.value })
                          }
                          className={`mt-2 ${inputClass}`}
                          placeholder="Example: 1. Acceptance of Terms"
                        />
                      </div>

                      <div>
                        <div className={`text-xs font-semibold ${strongText}`}>
                          Paragraphs
                        </div>
                        <div className={`mt-1 text-[11px] ${mutedText}`}>
                          Separate paragraphs with one empty line
                        </div>
                        <textarea
                          value={section.paragraphsText}
                          onChange={(e) =>
                            updateSection(index, {
                              paragraphsText: e.target.value,
                            })
                          }
                          rows={8}
                          className={`mt-2 w-full resize-y rounded-xl border ${
                            theme === "dark"
                              ? "border-white/10 bg-white/5 text-white/90 focus:border-white/20"
                              : "border-gray-300 bg-white text-gray-900 focus:border-gray-400"
                          } px-3 py-2 text-xs outline-none`}
                          placeholder={`First paragraph...\n\nSecond paragraph...`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  disabled={loading || saving}
                  onClick={() => loadContent(activeKey)}
                  className={`${buttonClass} disabled:opacity-50`}
                >
                  Refresh
                </button>

                <button
                  disabled={loading || saving}
                  onClick={saveContent}
                  className={`${primaryButtonClass} disabled:opacity-50`}
                >
                  {saving ? "Saving..." : "Save Content"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
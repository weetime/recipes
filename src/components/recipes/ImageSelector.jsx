"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Copy, Check, Info, ChevronDown } from "lucide-react";
import { TooltipProvider, InfoTip } from "@/components/ui/tooltip";
import {
  buildMatrix,
  cardHasData,
  frameworkVersionsForCard,
  backendsForSelection,
  generateImageList,
} from "@/lib/gpustack-matrix";

// ── Local UI primitives ───────────────────────────────────────────────
// Mirrors the styling of CommandBuilder.jsx's internal Pill/CopyButton (which
// aren't exported). Kept self-contained so this page never touches that file.

function CopyButton({ text, label = "Copy", className = "" }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
        copied
          ? "bg-green-500/20 text-green-600 dark:text-green-400"
          : "bg-foreground/10 text-foreground/60 hover:bg-foreground/15 hover:text-foreground/90"
      } ${className}`}
    >
      {copied ? (
        <>
          <Check size={12} /> Copied
        </>
      ) : (
        <>
          <Copy size={12} /> {label}
        </>
      )}
    </button>
  );
}

function Pill({ active, onClick, title, disabled, className = "", children }) {
  const style = disabled
    ? "border-dashed border-border/40 text-muted-foreground/30 cursor-not-allowed bg-muted/20 line-through decoration-muted-foreground/30"
    : active
      ? "border-vllm-blue bg-vllm-blue/5 text-foreground ring-1 ring-vllm-blue/20 shadow-sm"
      : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 hover:bg-muted/30";
  const btn = (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className={`inline-flex items-center justify-center rounded-lg border px-2.5 py-1.5 text-xs transition-all ${style} ${className}`}
    >
      {children}
    </button>
  );
  return title ? <InfoTip content={title}>{btn}</InfoTip> : btn;
}

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest inline-flex items-center gap-1">
        {label}
        {hint && (
          <InfoTip content={hint}>
            <span className="cursor-help text-muted-foreground/60 hover:text-muted-foreground transition-colors">
              <Info size={11} />
            </span>
          </InfoTip>
        )}
      </div>
      {children}
    </div>
  );
}

function CheckRow({ checked, onChange, label, hint }) {
  return (
    <label
      className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
        checked ? "border-vllm-blue/40 bg-vllm-blue/5" : "border-border hover:bg-muted/30"
      }`}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-vllm-blue mt-0.5" />
      <div className="min-w-0 flex-1 inline-flex items-center gap-1">
        <span className="text-xs font-medium">{label}</span>
        {hint && (
          <InfoTip content={hint}>
            <span className="cursor-help text-muted-foreground/60 hover:text-muted-foreground transition-colors">
              <Info size={11} />
            </span>
          </InfoTip>
        )}
      </div>
    </label>
  );
}

// Key uniquely identifying a framework-version option (Ascend pairs version+chip).
const fwKeyOf = (o) => `${o.value}::${o.chip ?? ""}`;

// Strip a generated command list down to bare image refs (for the offline guide).
function refsFromCommands(text) {
  return text
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.replace(/^docker pull(?: --platform \S+)? /, ""));
}

// ── Offline-install guide (3-tab, ported from upstream app.js) ─────────

function CodeBlock({ children }) {
  return (
    <pre className="rounded-md bg-[var(--code-bg)] text-[var(--code-fg)] p-3 mt-1.5 overflow-x-auto whitespace-pre text-[11px] leading-relaxed font-mono">
      {children}
    </pre>
  );
}

function InlineCode({ children }) {
  return <code className="font-mono text-[11px] bg-muted/60 px-1 py-0.5 rounded">{children}</code>;
}

const OFFLINE_TABS = [
  { id: "save", label: "Image File Import (Save & Load)" },
  { id: "tag", label: "Push to Private Registry (Tag & Push)" },
  { id: "auto", label: "Automated Image Sync" },
];

const AIR_GAPPED_DOCS = "https://docs.gpustack.ai/latest/installation/air-gapped/#container-images";

function OfflineGuide({ serverImages, workerImages, tagPushCommands, registryHost, version }) {
  const [tab, setTab] = useState("save");

  const runWith = (registryRef, systemRegistry) =>
    `sudo docker run -d --name gpustack \\\n` +
    `    --restart unless-stopped \\\n` +
    `    -p 80:80 \\\n` +
    `    -p 10161:10161 \\\n` +
    `    --volume gpustack-data:/var/lib/gpustack \\\n` +
    `    ${registryRef}/gpustack/gpustack:${version} \\\n` +
    `    --system-default-container-registry ${systemRegistry}`;

  return (
    <div>
      {/* Tab bar */}
      <div className="flex flex-wrap gap-x-5 border-b border-border/60">
        {OFFLINE_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 py-2 text-xs font-medium transition-colors ${
              tab === t.id
                ? "border-vllm-blue text-vllm-blue"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="py-3 text-xs text-muted-foreground leading-relaxed">
        {tab === "save" && (
          <div className="space-y-2.5">
            <p>Suitable for completely air-gapped environments, importing images via files.</p>
            <ol className="list-decimal pl-5 space-y-3 marker:text-muted-foreground/70">
              <li>Pull images on a machine with internet access (refer to commands above).</li>
              <li>
                Export images to tar files:
                <CodeBlock>{`docker save -o gpustack-server-images.tar ${serverImages}\n\ndocker save -o gpustack-worker-images.tar ${workerImages}`}</CodeBlock>
              </li>
              <li>Copy files to the offline machine.</li>
              <li>
                Import images by node role:
                <div className="mt-2 font-semibold text-foreground/80">Server Node:</div>
                <CodeBlock>docker load -i gpustack-server-images.tar</CodeBlock>
                <div className="mt-2 font-semibold text-foreground/80">Worker Node:</div>
                <CodeBlock>docker load -i gpustack-worker-images.tar</CodeBlock>
                <div className="mt-2 font-semibold text-foreground/80">Server + Worker Node:</div>
                <CodeBlock>{`docker load -i gpustack-server-images.tar\ndocker load -i gpustack-worker-images.tar`}</CodeBlock>
              </li>
              <li>
                When running GPUStack Server and Worker containers, specify the container registry using the{" "}
                <InlineCode>--system-default-container-registry</InlineCode> parameter:
                <CodeBlock>{runWith(registryHost, registryHost)}</CodeBlock>
              </li>
            </ol>
          </div>
        )}

        {tab === "tag" && (
          <div className="space-y-2.5">
            <p>Suitable for scenarios where a private registry (e.g., Harbor, Nexus) exists.</p>
            <ol className="list-decimal pl-5 space-y-3 marker:text-muted-foreground/70">
              <li>Pull images on a machine with internet access (refer to commands above).</li>
              <li>
                Retag and push to the private registry:
                <CodeBlock>{`export PrivateRegistry=<your-private-registry>\n${tagPushCommands}`}</CodeBlock>
              </li>
              <li>
                Specify the image registry via start parameters when running containers:
                <CodeBlock>{runWith("$PrivateRegistry", "$PrivateRegistry")}</CodeBlock>
              </li>
            </ol>
          </div>
        )}

        {tab === "auto" && (
          <div className="space-y-2.5">
            <p>For more automated sync methods, GPUStack provides image management commands:</p>
            <ul className="space-y-1.5">
              <li>
                <InlineCode>gpustack copy-images</InlineCode>: Sync images from source to destination registry
              </li>
              <li>
                <InlineCode>gpustack save-images</InlineCode>: Download and save images to local path
              </li>
              <li>
                <InlineCode>gpustack load-images</InlineCode>: Import images from local packages
              </li>
              <li>
                <InlineCode>gpustack list-images</InlineCode>: List image manifest for current version
              </li>
            </ul>
            <p>
              All commands support filtering and custom config. For details, refer to{" "}
              <a href={AIR_GAPPED_DOCS} target="_blank" rel="noreferrer" className="text-vllm-blue hover:underline font-medium">
                Prepare Container Images →
              </a>
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end border-t border-border/60 pt-3">
        <a href={AIR_GAPPED_DOCS} target="_blank" rel="noreferrer" className="text-vllm-blue hover:underline">
          View full air-gapped docs →
        </a>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

export function ImageSelector({ data, config }) {
  const versions = data.versions || [];

  const [gpustackVersion, setGpustackVersion] = useState(versions[0] || "");
  const images = data.imagesByVersion[gpustackVersion] || [];
  const matrix = useMemo(() => buildMatrix(images), [images]);

  const firstCardWithData = (m) => config.cards.find((c) => cardHasData(m, c.id))?.id || config.cards[0]?.id || "";

  const [card, setCard] = useState(() => firstCardWithData(matrix));
  const fwOptions = useMemo(() => frameworkVersionsForCard(images, card), [images, card]);

  const [frameworkVersion, setFrameworkVersion] = useState(() => fwOptions[0]?.value || "");
  const [chipType, setChipType] = useState(() => fwOptions[0]?.chip ?? null);
  const [backends, setBackends] = useState([]);
  const [optional, setOptional] = useState([]);
  const [arch, setArch] = useState(() => (card === "ascend" ? "arm64" : "amd64"));
  const [registry, setRegistry] = useState("docker-hub");
  const [component, setComponent] = useState("all");

  // Repair an invalid GPU card when the version (and thus matrix) changes.
  useEffect(() => {
    if (!cardHasData(matrix, card)) setCard(firstCardWithData(matrix));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matrix]);

  // Keep the framework-version selection valid as card/version changes; reset
  // backends whenever the option set shifts (matches upstream's reset-on-change).
  useEffect(() => {
    const exists = fwOptions.some((o) => o.value === frameworkVersion && (o.chip ?? null) === (chipType ?? null));
    if (!exists) {
      const first = fwOptions[0];
      setFrameworkVersion(first?.value || "");
      setChipType(first?.chip ?? null);
      setBackends([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fwOptions]);

  // Ascend images are arm64; everything else defaults to amd64 (upstream behaviour).
  useEffect(() => {
    setArch(card === "ascend" ? "arm64" : "amd64");
  }, [card]);

  const backendOptions = useMemo(
    () => backendsForSelection(images, card, frameworkVersion, chipType),
    [images, card, frameworkVersion, chipType],
  );

  const pickCard = (c) => {
    if (!cardHasData(matrix, c.id)) return;
    setCard(c.id);
  };
  const pickFrameworkOption = (o) => {
    setFrameworkVersion(o.value);
    setChipType(o.chip ?? null);
    setBackends([]);
  };
  const toggle = (list, setList, id) =>
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const state = { card, frameworkVersion, chipType, backends, optional, arch, registry, component };
  const command = useMemo(
    () => generateImageList(state, images, gpustackVersion),
    [images, gpustackVersion, card, frameworkVersion, chipType, backends, optional, arch, registry, component],
  );

  // Offline-install image lists (registry/arch-aware, role-split).
  const serverRefs = useMemo(
    () => refsFromCommands(generateImageList({ ...state, component: "server" }, images, gpustackVersion)),
    [images, gpustackVersion, card, frameworkVersion, chipType, backends, optional, arch, registry],
  );
  const workerRefs = useMemo(
    () => refsFromCommands(generateImageList({ ...state, component: "worker" }, images, gpustackVersion)),
    [images, gpustackVersion, card, frameworkVersion, chipType, backends, optional, arch, registry],
  );

  // Offline-install guide values (registry/version-aware; substituted into the tabs).
  const serverImages = serverRefs.join(" ") || "<server images>";
  const workerImages = workerRefs.join(" ") || "<worker images>";
  const registryHost = config.registries[registry]?.registry || "docker.io";
  const tagPushCommands = useMemo(() => {
    const allRefs = refsFromCommands(
      generateImageList(
        { card, frameworkVersion, chipType, backends, optional, arch, registry, component: "all" },
        images,
        gpustackVersion,
      ),
    );
    if (!allRefs.length) return "# Select a configuration above to generate commands";
    return allRefs
      .map((img) => {
        const idx = img.lastIndexOf(":");
        const namePart = idx >= 0 ? img.slice(0, idx) : img;
        const tagPart = idx >= 0 ? img.slice(idx + 1) : "latest";
        const shortName = namePart.includes("/") ? namePart.split("/").pop() : namePart;
        const dest = `gpustack/${shortName}:${tagPart}`;
        return `docker tag ${img} $PrivateRegistry/${dest}\ndocker push $PrivateRegistry/${dest}`;
      })
      .join("\n");
  }, [images, gpustackVersion, card, frameworkVersion, chipType, backends, optional, arch, registry]);

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 items-start">
        {/* ── Left: Configuration ── */}
        <div className="min-w-0 rounded-xl border border-border bg-card p-5 flex flex-col gap-5">
          <h2 className="text-base font-semibold tracking-tight">Configuration</h2>

          <Field label="GPU Type">
            <div className="grid grid-cols-2 gap-2">
              {config.cards.map((c) => (
                <Pill
                  key={c.id}
                  active={c.id === card}
                  disabled={!cardHasData(matrix, c.id)}
                  title={c.note}
                  onClick={() => pickCard(c)}
                  className="w-full"
                >
                  {c.label}
                </Pill>
              ))}
            </div>
          </Field>

          <Field label="Framework Version">
            <select
              value={fwOptions.length ? fwKeyOf({ value: frameworkVersion, chip: chipType }) : ""}
              onChange={(e) => {
                const o = fwOptions.find((x) => fwKeyOf(x) === e.target.value);
                if (o) pickFrameworkOption(o);
              }}
              disabled={fwOptions.length === 0}
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-vllm-blue/40 disabled:opacity-50"
            >
              {fwOptions.length === 0 && <option value="">—</option>}
              {fwOptions.map((o) => (
                <option key={fwKeyOf(o)} value={fwKeyOf(o)}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Inference Backend" hint="Leave all unchecked to include every backend image; check to narrow.">
            {backendOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No inference backend images for this selection.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {backendOptions.map((b) => (
                  <CheckRow
                    key={b.id}
                    checked={backends.includes(b.id)}
                    onChange={() => toggle(backends, setBackends, b.id)}
                    label={b.label}
                  />
                ))}
              </div>
            )}
          </Field>

          <Field label="Optional Images">
            <div className="flex flex-col gap-1.5">
              {config.optionalImages.map((o) => (
                <CheckRow
                  key={o.id}
                  checked={optional.includes(o.id)}
                  onChange={() => toggle(optional, setOptional, o.id)}
                  label={o.label}
                  hint={o.hint}
                />
              ))}
            </div>
          </Field>
        </div>

        {/* ── Right: Required Images ── */}
        <div className="min-w-0 rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-base font-semibold tracking-tight">Required Images</h2>
            <Field label="GPUStack Version">
              <select
                value={gpustackVersion}
                onChange={(e) => setGpustackVersion(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-vllm-blue/40"
              >
                {versions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Architecture">
              <div className="flex flex-wrap gap-1.5">
                {config.architectures.map((a) => (
                  <Pill key={a.id} active={a.id === arch} onClick={() => setArch(a.id)}>
                    {a.label}
                  </Pill>
                ))}
              </div>
            </Field>
            <Field label="Registry">
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(config.registries).map(([key, r]) => (
                  <Pill key={key} active={key === registry} onClick={() => setRegistry(key)}>
                    {r.name}
                  </Pill>
                ))}
              </div>
            </Field>
          </div>

          {/* Command block */}
          <div className="rounded-2xl overflow-hidden bg-[var(--command-bg)] border border-border">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
              <div className="flex gap-0.5 bg-foreground/5 rounded-md p-0.5">
                {config.components.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setComponent(t.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      component === t.id
                        ? "bg-foreground/10 text-[var(--command-fg)]"
                        : "text-[var(--command-fg)]/50 hover:text-[var(--command-fg)]/80"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <CopyButton text={command} label="Copy" />
            </div>
            <pre className="px-4 py-3 text-xs leading-relaxed font-mono text-[var(--command-fg)] overflow-x-auto whitespace-pre">
              {command.split("\n").map((line, i) => (
                <div key={i} className={line.startsWith("#") ? "text-[var(--command-fg)]/45" : ""}>
                  {line || " "}
                </div>
              ))}
            </pre>
          </div>

          {/* Offline install */}
          <details className="group rounded-xl border border-border">
            <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer text-sm font-medium list-none">
              Need offline installation?
              <ChevronDown size={14} className="ml-auto group-open:rotate-180 transition-transform" />
            </summary>
            <div className="px-4 pb-4 pt-1 border-t border-border/60">
              <OfflineGuide
                serverImages={serverImages}
                workerImages={workerImages}
                tagPushCommands={tagPushCommands}
                registryHost={registryHost}
                version={gpustackVersion}
              />
            </div>
          </details>
        </div>
      </div>
    </TooltipProvider>
  );
}


"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { MessagesSquare, X } from "lucide-react";

// Footer trigger + centered modal for the WeChat community group. The QR is
// black-on-white, so it always sits on a white plate to stay scannable in dark
// mode. Closes on ESC, backdrop click, or the X.
export default function CommunityModal() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 font-medium text-vllm-blue hover:text-vllm-blue-hover transition-colors"
      >
        <MessagesSquare size={13} strokeWidth={2} />
        微信交流群
      </button>

      {mounted && open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm [animation:qr-modal-fade-in_0.15s_ease-out]"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="加入交流群"
          >
            <div
              className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background shadow-2xl [animation:qr-modal-pop-in_0.22s_cubic-bezier(0.16,1,0.3,1)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* accent hairline at the top */}
              <div className="h-1 w-full bg-gradient-to-r from-vllm-blue to-vllm-yellow" />

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="关闭"
                className="absolute right-3.5 top-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>

              <div className="px-7 pb-7 pt-6 text-center">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">加入交流群</h2>
                <p className="mx-auto mt-2 max-w-[16rem] text-[13px] leading-relaxed text-muted-foreground">
                  交流大模型产线部署经验 —— 推理引擎选型、性能调优、硬件适配、线上踩坑排雷。
                </p>

                <div className="mt-6 inline-block rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/[0.06]">
                  <img
                    src="/community-qr.png"
                    alt="微信交流群二维码"
                    width={208}
                    height={208}
                    className="block h-52 w-52 rounded-md"
                  />
                </div>

                <p className="mt-4 text-xs text-muted-foreground">
                  微信扫一扫,加入 <span className="font-medium text-foreground">weetime</span> 交流群
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

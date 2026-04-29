import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

const iosSteps = [
  {
    step: 1,
    title: "Open in Safari",
    desc: "Make sure you're using Safari on your iPhone or iPad — this won't work in Chrome or other browsers.",
    emoji: "🧭",
    detail: "Look for the compass icon. Safari is the default Apple browser.",
  },
  {
    step: 2,
    title: "Tap the Share button",
    desc: 'At the bottom of the screen, tap the Share icon — it looks like a box with an arrow pointing up.',
    emoji: "⬆️",
    detail: 'It\'s the icon at the center-bottom of Safari\'s toolbar.',
  },
  {
    step: 3,
    title: 'Tap "Add to Home Screen"',
    desc: 'Scroll down in the Share menu and tap "Add to Home Screen".',
    emoji: "➕",
    detail: 'You may need to scroll down in the list of options to find it.',
  },
  {
    step: 4,
    title: "Tap Add",
    desc: 'Give the app a name (or keep the default) and tap "Add" in the top right corner.',
    emoji: "✅",
    detail: "The app icon will now appear on your home screen like a native app!",
  },
];

const androidSteps = [
  {
    step: 1,
    title: "Open in Chrome",
    desc: "Make sure you're using Chrome on your Android device for the best experience.",
    emoji: "🌐",
    detail: "Chrome is the recommended browser for Android.",
  },
  {
    step: 2,
    title: "Tap the menu (⋮)",
    desc: "Tap the three-dot menu icon in the top-right corner of Chrome.",
    emoji: "⋮",
    detail: "The menu icon is in the upper-right corner of the browser.",
  },
  {
    step: 3,
    title: 'Tap "Add to Home screen"',
    desc: 'Find and tap "Add to Home screen" from the dropdown menu.',
    emoji: "📲",
    detail: "You might also see an 'Install App' option — either works!",
  },
  {
    step: 4,
    title: "Confirm",
    desc: 'Tap "Add" on the confirmation dialog. The app will appear on your home screen.',
    emoji: "✅",
    detail: "You can now launch 1K Blessings like a native app anytime!",
  },
];

export default function InstallSlideshow({ open, onClose }) {
  const [platform, setPlatform] = useState("ios");
  const [step, setStep] = useState(0);

  const steps = platform === "ios" ? iosSteps : androidSteps;
  const current = steps[step];

  const next = () => setStep(s => Math.min(s + 1, steps.length - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const switchPlatform = (p) => {
    setPlatform(p);
    setStep(0);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="font-serif text-lg font-medium">Add to Home Screen</DialogTitle>
        </DialogHeader>

        {/* Platform toggle */}
        <div className="flex gap-1 mx-5 mt-3 bg-muted/40 rounded-xl p-1">
          {["ios", "android"].map(p => (
            <button
              key={p}
              onClick={() => switchPlatform(p)}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all min-h-[40px]",
                platform === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              {p === "ios" ? "📱 iPhone / iPad" : "🤖 Android"}
            </button>
          ))}
        </div>

        {/* Step card */}
        <div className="mx-5 mt-4 mb-2 bg-muted/30 rounded-2xl border border-border p-6 text-center min-h-[220px] flex flex-col items-center justify-center gap-3">
          <div className="text-6xl">{current.emoji}</div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Step {current.step} of {steps.length}</p>
            <h3 className="font-serif text-lg font-medium mb-2">{current.title}</h3>
            <p className="text-sm text-foreground leading-relaxed">{current.desc}</p>
          </div>
          <p className="text-xs text-muted-foreground italic">{current.detail}</p>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 mb-2">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={cn("rounded-full transition-all", i === step ? "w-4 h-2 bg-primary" : "w-2 h-2 bg-muted-foreground/30")}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2 px-5 pb-5">
          <button
            onClick={prev}
            disabled={step === 0}
            className="p-2.5 rounded-xl border border-border hover:bg-muted disabled:opacity-30 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 text-center">
            {step === steps.length - 1 ? (
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold min-h-[44px]"
              >
                Got it! 🎉
              </button>
            ) : (
              <button
                onClick={next}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold min-h-[44px]"
              >
                Next →
              </button>
            )}
          </div>
          <button
            onClick={next}
            disabled={step === steps.length - 1}
            className="p-2.5 rounded-xl border border-border hover:bg-muted disabled:opacity-30 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
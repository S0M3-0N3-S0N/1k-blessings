import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

const STEPS = {
  ios: {
    en: [
      { emoji: "🧭", title: "Open Safari", desc: "Make sure you're using Safari — the blue compass icon. This won't work in Chrome or other browsers.", bg: "from-blue-500/20 to-cyan-500/10" },
      { emoji: "⬆️", title: "Tap Share", desc: "At the bottom of Safari, tap the Share button — a box with an arrow pointing up.", bg: "from-orange-500/20 to-amber-500/10" },
      { emoji: "📋", title: "Scroll & Find", desc: 'Scroll down in the menu that pops up and find "Add to Home Screen".', bg: "from-violet-500/20 to-purple-500/10" },
      { emoji: "✅", title: "Tap Add!", desc: 'Tap "Add" in the top-right corner. The app icon will appear on your home screen!', bg: "from-emerald-500/20 to-green-500/10" },
    ],
    es: [
      { emoji: "🧭", title: "Abre Safari", desc: "Asegúrate de usar Safari — el icono de la brújula azul. No funciona en Chrome u otros navegadores.", bg: "from-blue-500/20 to-cyan-500/10" },
      { emoji: "⬆️", title: "Toca Compartir", desc: "En la parte inferior de Safari, toca el botón Compartir — una caja con una flecha apuntando hacia arriba.", bg: "from-orange-500/20 to-amber-500/10" },
      { emoji: "📋", title: "Desplázate y Encuentra", desc: 'Desliza hacia abajo en el menú y encuentra "Agregar a pantalla de inicio".', bg: "from-violet-500/20 to-purple-500/10" },
      { emoji: "✅", title: "¡Toca Agregar!", desc: 'Toca "Agregar" en la esquina superior derecha. ¡El ícono aparecerá en tu pantalla de inicio!', bg: "from-emerald-500/20 to-green-500/10" },
    ],
    fr: [
      { emoji: "🧭", title: "Ouvre Safari", desc: "Assure-toi d'utiliser Safari — l'icône boussole bleue. Ça ne fonctionne pas dans Chrome.", bg: "from-blue-500/20 to-cyan-500/10" },
      { emoji: "⬆️", title: "Appuie sur Partager", desc: "En bas de Safari, appuie sur le bouton Partager — une boîte avec une flèche vers le haut.", bg: "from-orange-500/20 to-amber-500/10" },
      { emoji: "📋", title: "Fais défiler", desc: "Fais défiler le menu et trouve « Sur l'écran d'accueil ».", bg: "from-violet-500/20 to-purple-500/10" },
      { emoji: "✅", title: "Appuie sur Ajouter!", desc: "Appuie sur « Ajouter » en haut à droite. L'icône apparaîtra sur ton écran d'accueil!", bg: "from-emerald-500/20 to-green-500/10" },
    ],
    zh: [
      { emoji: "🧭", title: "打开 Safari", desc: "请确保使用 Safari 浏览器（蓝色指南针图标）。在 Chrome 中无法使用此功能。", bg: "from-blue-500/20 to-cyan-500/10" },
      { emoji: "⬆️", title: "点击分享", desc: "在 Safari 底部，点击分享按钮 — 一个带向上箭头的方框。", bg: "from-orange-500/20 to-amber-500/10" },
      { emoji: "📋", title: "向下滚动", desc: '在弹出的菜单中向下滚动，找到"添加到主屏幕"。', bg: "from-violet-500/20 to-purple-500/10" },
      { emoji: "✅", title: "点击添加！", desc: '点击右上角的"添加"。应用图标将出现在您的主屏幕上！', bg: "from-emerald-500/20 to-green-500/10" },
    ],
  },
  android: {
    en: [
      { emoji: "🌐", title: "Open Chrome", desc: "Open this app in Google Chrome on your Android phone for the best experience.", bg: "from-blue-500/20 to-indigo-500/10" },
      { emoji: "⋮", title: "Tap the Menu", desc: "Tap the three-dot menu (⋮) in the top-right corner of Chrome.", bg: "from-slate-500/20 to-gray-500/10" },
      { emoji: "📲", title: "Add to Home Screen", desc: 'Tap "Add to Home screen" or "Install App" from the dropdown menu.', bg: "from-violet-500/20 to-purple-500/10" },
      { emoji: "✅", title: "Confirm!", desc: 'Tap "Add" on the dialog. The app will launch like a native app from your home screen!', bg: "from-emerald-500/20 to-green-500/10" },
    ],
    es: [
      { emoji: "🌐", title: "Abre Chrome", desc: "Abre esta app en Google Chrome en tu Android para la mejor experiencia.", bg: "from-blue-500/20 to-indigo-500/10" },
      { emoji: "⋮", title: "Toca el Menú", desc: "Toca el menú de tres puntos (⋮) en la esquina superior derecha de Chrome.", bg: "from-slate-500/20 to-gray-500/10" },
      { emoji: "📲", title: "Agregar a Pantalla", desc: 'Toca "Agregar a pantalla de inicio" en el menú desplegable.', bg: "from-violet-500/20 to-purple-500/10" },
      { emoji: "✅", title: "¡Confirmar!", desc: '¡Toca "Agregar" en el diálogo. La app se lanzará como una app nativa!', bg: "from-emerald-500/20 to-green-500/10" },
    ],
    fr: [
      { emoji: "🌐", title: "Ouvre Chrome", desc: "Ouvre cette app dans Google Chrome sur Android pour la meilleure expérience.", bg: "from-blue-500/20 to-indigo-500/10" },
      { emoji: "⋮", title: "Appuie sur le Menu", desc: "Appuie sur les trois points (⋮) en haut à droite de Chrome.", bg: "from-slate-500/20 to-gray-500/10" },
      { emoji: "📲", title: "Ajouter à l'écran", desc: "Appuie sur « Ajouter à l'écran d'accueil » dans le menu.", bg: "from-violet-500/20 to-purple-500/10" },
      { emoji: "✅", title: "Confirme!", desc: "Appuie sur « Ajouter ». L'app se lancera comme une app native!", bg: "from-emerald-500/20 to-green-500/10" },
    ],
    zh: [
      { emoji: "🌐", title: "打开 Chrome", desc: "在 Android 手机上用 Google Chrome 打开此应用，以获得最佳体验。", bg: "from-blue-500/20 to-indigo-500/10" },
      { emoji: "⋮", title: "点击菜单", desc: "点击 Chrome 右上角的三点菜单（⋮）。", bg: "from-slate-500/20 to-gray-500/10" },
      { emoji: "📲", title: "添加到主屏幕", desc: '从下拉菜单中点击"添加到主屏幕"或"安装应用"。', bg: "from-violet-500/20 to-purple-500/10" },
      { emoji: "✅", title: "确认！", desc: '在对话框中点击"添加"。应用将像原生应用一样从主屏幕启动！', bg: "from-emerald-500/20 to-green-500/10" },
    ],
  },
};

const PLATFORM_LABELS = {
  en: { ios: "📱 iPhone / iPad", android: "🤖 Android" },
  es: { ios: "📱 iPhone / iPad", android: "🤖 Android" },
  fr: { ios: "📱 iPhone / iPad", android: "🤖 Android" },
  zh: { ios: "📱 iPhone / iPad", android: "🤖 Android" },
};

const DONE_LABEL = { en: "Got it! 🎉", es: "¡Entendido! 🎉", fr: "Compris ! 🎉", zh: "明白了！🎉" };
const NEXT_LABEL = { en: "Next →", es: "Siguiente →", fr: "Suivant →", zh: "下一步 →" };
const TITLE = { en: "Add to Home Screen", es: "Agregar a Pantalla de Inicio", fr: "Ajouter à l'écran d'accueil", zh: "添加到主屏幕" };

export default function InstallSlideshow({ open, onClose }) {
  const { lang } = useLanguage();
  const l = lang in STEPS.ios ? lang : "en";
  const [platform, setPlatform] = useState("ios");
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState(1);
  const autoRef = useRef(null);

  const steps = STEPS[platform][l];
  const current = steps[step];

  // Auto-advance every 4 seconds
  useEffect(() => {
    if (!open) return;
    autoRef.current = setInterval(() => {
      setDirection(1);
      setStep(s => (s + 1) % steps.length);
    }, 4000);
    return () => clearInterval(autoRef.current);
  }, [open, platform, steps.length]);

  const goTo = (i, dir = 1) => {
    clearInterval(autoRef.current);
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setStep(i);
      setAnimating(false);
    }, 180);
  };

  const next = () => goTo((step + 1) % steps.length, 1);
  const prev = () => goTo((step - 1 + steps.length) % steps.length, -1);

  const switchPlatform = (p) => {
    setPlatform(p);
    setStep(0);
    clearInterval(autoRef.current);
  };

  const progressPct = ((step + 1) / steps.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="font-serif text-lg font-medium">{TITLE[l]}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Platform toggle */}
        <div className="flex gap-1 mx-5 bg-muted/40 rounded-xl p-1">
          {["ios", "android"].map(p => (
            <button
              key={p}
              onClick={() => switchPlatform(p)}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all min-h-[40px]",
                platform === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              {PLATFORM_LABELS[l][p]}
            </button>
          ))}
        </div>

        {/* Animated Step Card */}
        <div className="mx-5 mt-4 relative overflow-hidden rounded-2xl" style={{ minHeight: 260 }}>
          <div
            className={cn(
              `bg-gradient-to-br ${current.bg} border border-border rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4 transition-all duration-300`,
              animating
                ? direction > 0 ? "opacity-0 translate-x-4" : "opacity-0 -translate-x-4"
                : "opacity-100 translate-x-0"
            )}
            style={{ minHeight: 260 }}
          >
            {/* Animated emoji */}
            <div
              className="text-7xl select-none"
              style={{ animation: "bounce-subtle 2s ease-in-out infinite" }}
            >
              {current.emoji}
            </div>

            {/* Step counter */}
            <div className="flex gap-1 items-center">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i, i > step ? 1 : -1)}
                  className={cn(
                    "rounded-full transition-all duration-300",
                    i === step ? "w-5 h-2 bg-primary" : "w-2 h-2 bg-foreground/20"
                  )}
                />
              ))}
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
                {step + 1} / {steps.length}
              </p>
              <h3 className="font-serif text-xl font-medium mb-2">{current.title}</h3>
              <p className="text-sm text-foreground/80 leading-relaxed">{current.desc}</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mx-5 mt-3 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-[4000ms] ease-linear"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2 px-5 py-4">
          <button
            onClick={prev}
            className="p-2.5 rounded-xl border border-border hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={step === steps.length - 1 ? onClose : next}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold min-h-[44px] transition-all hover:bg-primary/90"
          >
            {step === steps.length - 1 ? DONE_LABEL[l] : NEXT_LABEL[l]}
          </button>
          <button
            onClick={next}
            className="p-2.5 rounded-xl border border-border hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <style>{`
          @keyframes bounce-subtle {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
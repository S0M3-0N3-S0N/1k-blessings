import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

const CONTENT = {
  en: {
    title: "Add to Home Screen",
    iosLabel: "📱 iPhone / iPad",
    androidLabel: "🤖 Android",
    stepLabel: "Step",
    of: "of",
    gotIt: "Got it! 🎉",
    next: "Next →",
    ios: [
      { emoji: "🧭", title: "Open in Safari", desc: 'Make sure you\'re using Safari on your iPhone or iPad — this won\'t work in Chrome.', detail: "Look for the compass icon. Safari is the default Apple browser." },
      { emoji: "⬆️", title: "Tap the Share button", desc: "At the bottom of Safari, tap the Share icon — a box with an arrow pointing up.", detail: "It's the icon at the center-bottom of Safari's toolbar." },
      { emoji: "➕", title: 'Tap "Add to Home Screen"', desc: 'Scroll down in the Share menu and tap "Add to Home Screen".', detail: "You may need to scroll down in the list of options to find it." },
      { emoji: "✅", title: "Tap Add", desc: 'Give the app a name (or keep the default) and tap "Add" in the top-right corner.', detail: "The app icon will now appear on your home screen like a native app!" },
    ],
    android: [
      { emoji: "🌐", title: "Open in Chrome", desc: "Make sure you're using Chrome on your Android device for the best experience.", detail: "Chrome is the recommended browser for Android." },
      { emoji: "⋮", title: "Tap the menu (⋮)", desc: "Tap the three-dot menu icon in the top-right corner of Chrome.", detail: "The menu icon is in the upper-right corner of the browser." },
      { emoji: "📲", title: 'Tap "Add to Home screen"', desc: 'Find and tap "Add to Home screen" from the dropdown menu.', detail: "You might also see an 'Install App' option — either works!" },
      { emoji: "✅", title: "Confirm", desc: 'Tap "Add" on the confirmation dialog. The app will appear on your home screen.', detail: "You can now launch 1K Blessings like a native app anytime!" },
    ],
  },
  es: {
    title: "Agregar a Pantalla de Inicio",
    iosLabel: "📱 iPhone / iPad",
    androidLabel: "🤖 Android",
    stepLabel: "Paso",
    of: "de",
    gotIt: "¡Entendido! 🎉",
    next: "Siguiente →",
    ios: [
      { emoji: "🧭", title: "Abrir en Safari", desc: "Asegúrate de usar Safari en tu iPhone o iPad — no funcionará en Chrome.", detail: "Busca el ícono de la brújula. Safari es el navegador predeterminado de Apple." },
      { emoji: "⬆️", title: "Toca el botón Compartir", desc: "En la parte inferior de Safari, toca el ícono Compartir — una caja con una flecha apuntando hacia arriba.", detail: "Está en la parte central inferior de la barra de herramientas de Safari." },
      { emoji: "➕", title: 'Toca "Agregar a Inicio"', desc: 'Desplázate hacia abajo en el menú Compartir y toca "Agregar a pantalla de inicio".', detail: "Es posible que debas desplazarte hacia abajo para encontrarlo." },
      { emoji: "✅", title: "Toca Agregar", desc: 'Dale un nombre a la app (o conserva el predeterminado) y toca "Agregar" en la esquina superior derecha.', detail: "¡El ícono de la app aparecerá en tu pantalla de inicio como una app nativa!" },
    ],
    android: [
      { emoji: "🌐", title: "Abrir en Chrome", desc: "Asegúrate de usar Chrome en tu dispositivo Android para la mejor experiencia.", detail: "Chrome es el navegador recomendado para Android." },
      { emoji: "⋮", title: "Toca el menú (⋮)", desc: "Toca el ícono de tres puntos en la esquina superior derecha de Chrome.", detail: "El ícono de menú está en la esquina superior derecha del navegador." },
      { emoji: "📲", title: 'Toca "Agregar a pantalla de inicio"', desc: 'Busca y toca "Agregar a pantalla de inicio" en el menú desplegable.', detail: "También podrías ver la opción 'Instalar app' — ¡cualquiera funciona!" },
      { emoji: "✅", title: "Confirmar", desc: 'Toca "Agregar" en el diálogo de confirmación. La app aparecerá en tu pantalla de inicio.', detail: "¡Ahora puedes abrir 1K Blessings como una app nativa en cualquier momento!" },
    ],
  },
  fr: {
    title: "Ajouter à l'écran d'accueil",
    iosLabel: "📱 iPhone / iPad",
    androidLabel: "🤖 Android",
    stepLabel: "Étape",
    of: "sur",
    gotIt: "Compris ! 🎉",
    next: "Suivant →",
    ios: [
      { emoji: "🧭", title: "Ouvrir dans Safari", desc: "Assurez-vous d'utiliser Safari sur votre iPhone ou iPad — cela ne fonctionne pas dans Chrome.", detail: "Cherchez l'icône de boussole. Safari est le navigateur Apple par défaut." },
      { emoji: "⬆️", title: "Appuyez sur Partager", desc: "En bas de Safari, appuyez sur l'icône Partager — une boîte avec une flèche vers le haut.", detail: "C'est l'icône au centre-bas de la barre d'outils de Safari." },
      { emoji: "➕", title: '"Sur l\'écran d\'accueil"', desc: 'Faites défiler vers le bas dans le menu Partager et appuyez sur "Sur l\'écran d\'accueil".', detail: "Vous devrez peut-être faire défiler vers le bas pour le trouver." },
      { emoji: "✅", title: "Appuyez sur Ajouter", desc: 'Donnez un nom à l\'app (ou gardez celui par défaut) et appuyez sur "Ajouter" en haut à droite.', detail: "L'icône de l'app apparaîtra sur votre écran d'accueil comme une app native !" },
    ],
    android: [
      { emoji: "🌐", title: "Ouvrir dans Chrome", desc: "Assurez-vous d'utiliser Chrome sur votre appareil Android pour la meilleure expérience.", detail: "Chrome est le navigateur recommandé pour Android." },
      { emoji: "⋮", title: "Appuyez sur le menu (⋮)", desc: "Appuyez sur l'icône à trois points en haut à droite de Chrome.", detail: "L'icône de menu est dans le coin supérieur droit du navigateur." },
      { emoji: "📲", title: '"Ajouter à l\'écran d\'accueil"', desc: 'Trouvez et appuyez sur "Ajouter à l\'écran d\'accueil" dans le menu déroulant.', detail: "Vous pouvez aussi voir l'option 'Installer l'app' — les deux fonctionnent !" },
      { emoji: "✅", title: "Confirmer", desc: 'Appuyez sur "Ajouter" dans la boîte de dialogue. L\'app apparaîtra sur votre écran d\'accueil.', detail: "Vous pouvez maintenant lancer 1K Blessings comme une app native !" },
    ],
  },
  zh: {
    title: "添加到主屏幕",
    iosLabel: "📱 iPhone / iPad",
    androidLabel: "🤖 Android",
    stepLabel: "第",
    of: "/",
    gotIt: "明白了！🎉",
    next: "下一步 →",
    ios: [
      { emoji: "🧭", title: "在 Safari 中打开", desc: "请确保在 iPhone 或 iPad 上使用 Safari 浏览器 — 在 Chrome 中不支持此功能。", detail: "查找指南针图标。Safari 是 Apple 的默认浏览器。" },
      { emoji: "⬆️", title: "点击分享按钮", desc: "在 Safari 底部，点击分享图标 — 一个带有向上箭头的方框。", detail: "它位于 Safari 工具栏中央底部。" },
      { emoji: "➕", title: '点击"添加到主屏幕"', desc: '在分享菜单中向下滚动，点击"添加到主屏幕"。', detail: "您可能需要向下滚动才能找到该选项。" },
      { emoji: "✅", title: "点击添加", desc: '为应用命名（或保留默认名称），然后点击右上角的"添加"。', detail: "应用图标将出现在您的主屏幕上，就像原生应用一样！" },
    ],
    android: [
      { emoji: "🌐", title: "在 Chrome 中打开", desc: "请确保在 Android 设备上使用 Chrome 浏览器以获得最佳体验。", detail: "Chrome 是 Android 推荐的浏览器。" },
      { emoji: "⋮", title: "点击菜单 (⋮)", desc: "点击 Chrome 右上角的三点菜单图标。", detail: "菜单图标位于浏览器右上角。" },
      { emoji: "📲", title: '点击"添加到主屏幕"', desc: '在下拉菜单中找到并点击"添加到主屏幕"。', detail: '您也可能看到"安装应用"选项 — 两者均可使用！' },
      { emoji: "✅", title: "确认", desc: '在确认对话框中点击"添加"。应用将出现在您的主屏幕上。', detail: "现在您可以随时像使用原生应用一样启动 1K Blessings！" },
    ],
  },
};

export default function InstallSlideshow({ open, onClose }) {
  const { lang } = useLanguage();
  const [platform, setPlatform] = useState("ios");
  const [step, setStep] = useState(0);

  const c = CONTENT[lang] || CONTENT.en;
  const steps = platform === "ios" ? c.ios : c.android;
  const current = steps[step];

  const next = () => setStep(s => Math.min(s + 1, steps.length - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const switchPlatform = (p) => { setPlatform(p); setStep(0); };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="font-serif text-lg font-medium">{c.title}</DialogTitle>
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
              {p === "ios" ? c.iosLabel : c.androidLabel}
            </button>
          ))}
        </div>

        {/* Step card */}
        <div className="mx-5 mt-4 mb-2 bg-muted/30 rounded-2xl border border-border p-6 text-center min-h-[220px] flex flex-col items-center justify-center gap-3">
          <div className="text-6xl">{current.emoji}</div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
              {c.stepLabel} {step + 1} {c.of} {steps.length}
            </p>
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
              <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold min-h-[44px]">
                {c.gotIt}
              </button>
            ) : (
              <button onClick={next} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold min-h-[44px]">
                {c.next}
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
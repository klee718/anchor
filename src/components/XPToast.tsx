import { useEffect, useState } from "react";

interface Props {
  amount: number;
  onDone: () => void;
}

export default function XPToast({ amount, onDone }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onDone();
    }, 1400);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed bottom-24 right-6 z-50 animate-xp-fly rounded-xl bg-[#1C1209] px-4 py-2 text-sm font-bold text-[#C8A261] shadow-lg">
      ✦ +{amount} XP
    </div>
  );
}

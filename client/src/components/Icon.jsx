import { ArrowLeft, Bell, Home, MessageCircle, Plus, ShieldCheck, User } from "lucide-react";

const ICONS = {
  feed: Home,
  plus: Plus,
  account: User,
  alerts: Bell,
  chat: MessageCircle,
  verify: ShieldCheck,
  back: ArrowLeft
};

export function Icon({ name, size = 22 }) {
  const Glyph = ICONS[name];
  return Glyph ? <Glyph size={size} /> : null;
}

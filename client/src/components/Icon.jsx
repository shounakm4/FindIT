import { ArrowLeft, Bell, Home, Plus, User } from "lucide-react";

const ICONS = {
  feed: Home,
  plus: Plus,
  account: User,
  alerts: Bell,
  back: ArrowLeft
};

export function Icon({ name, size = 22 }) {
  const Glyph = ICONS[name];
  return Glyph ? <Glyph size={size} /> : null;
}

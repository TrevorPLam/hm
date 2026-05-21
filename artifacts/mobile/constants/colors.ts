type Palette = {
  text: string;
  tint: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  userBubble: string;
  userBubbleText: string;
  assistantBubble: string;
  assistantBubbleText: string;
};

type Colors = {
  light: Palette;
  dark?: Palette;
  radius: number;
};

const colors: Colors = {
  light: {
    text: "#0D0D0D",
    tint: "#1A73E8",
    background: "#FFFFFF",
    foreground: "#0D0D0D",
    card: "#F5F5F5",
    cardForeground: "#0D0D0D",
    primary: "#1A73E8",
    primaryForeground: "#FFFFFF",
    secondary: "#EBEBEB",
    secondaryForeground: "#0D0D0D",
    muted: "#F0F0F0",
    mutedForeground: "#8A8A8A",
    accent: "#1A73E8",
    accentForeground: "#FFFFFF",
    destructive: "#EF4444",
    destructiveForeground: "#FFFFFF",
    border: "#E5E5E5",
    input: "#EFEFEF",
    userBubble: "#1A73E8",
    userBubbleText: "#FFFFFF",
    assistantBubble: "#F0F0F0",
    assistantBubbleText: "#0D0D0D",
  },
  dark: {
    text: "#F5F5F5",
    tint: "#4A9EFF",
    background: "#0D0D0D",
    foreground: "#F5F5F5",
    card: "#1A1A1A",
    cardForeground: "#F5F5F5",
    primary: "#4A9EFF",
    primaryForeground: "#FFFFFF",
    secondary: "#252525",
    secondaryForeground: "#F5F5F5",
    muted: "#1E1E1E",
    mutedForeground: "#888888",
    accent: "#4A9EFF",
    accentForeground: "#FFFFFF",
    destructive: "#EF4444",
    destructiveForeground: "#FFFFFF",
    border: "#2A2A2A",
    input: "#1E1E1E",
    userBubble: "#4A9EFF",
    userBubbleText: "#FFFFFF",
    assistantBubble: "#1E1E1E",
    assistantBubbleText: "#F5F5F5",
  },
  radius: 16,
};

export default colors;

import { Image, Text, type ImageSourcePropType, type ImageStyle, type StyleProp, type TextStyle } from 'react-native';

type Props = {
  /** A generated icon, when one exists for this id yet — undefined falls back to `emoji`. */
  source: ImageSourcePropType | undefined;
  emoji: string;
  imageStyle: StyleProp<ImageStyle>;
  emojiStyle: StyleProp<TextStyle>;
};

// The "Gemini-generated icon if we have one, emoji if we don't" branch used by every
// icon-bearing HUD element (QuestWidget's quest buttons, StatBar, StatUpToast) — previously each
// wrote out its own identical `source ? <Image/> : <Text>` pair (§38).
export default function IconOrEmoji({ source, emoji, imageStyle, emojiStyle }: Props) {
  return source ? (
    <Image source={source} style={imageStyle} resizeMode="contain" />
  ) : (
    <Text style={emojiStyle}>{emoji}</Text>
  );
}

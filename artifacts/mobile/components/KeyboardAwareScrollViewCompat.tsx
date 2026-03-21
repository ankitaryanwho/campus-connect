import { Platform, ScrollView } from "react-native";
import type { ScrollViewProps } from "react-native";

type Props = ScrollViewProps & {
  children?: React.ReactNode;
};

export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = "handled",
  ...props
}: Props) {
  return (
    <ScrollView keyboardShouldPersistTaps={keyboardShouldPersistTaps} {...props}>
      {children}
    </ScrollView>
  );
}

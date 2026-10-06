import { Redirect } from "expo-router";

// For now, open the Home tab straight away.
// Later this will check whether the user is logged in.
export default function Index() {
  return <Redirect href="/(user)/home" />;
}
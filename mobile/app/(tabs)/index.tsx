// import { Redirect } from "expo-router";

// export default function Index() {
//   return <Redirect href="./login" />;
// }

import { Redirect } from "expo-router";

export default function Index() {
  // If the user lands on /(tabs), send them to /(tabs)/home
  return <Redirect href="/(tabs)/home" />;
}
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../app/login";
import SignupScreen from "../app/signup";
import ForgotPasswordScreen from "../app/forgot-password";
import MapsScreen from "../app/(tabs)/maps";

const Stack = createNativeStackNavigator();

export type RootStackParamList = {
    Login: undefined;
    Signup: undefined;
    ForgotPassword: undefined;
    Maps: undefined;
}

export default function StackNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="Maps" component={MapsScreen} />
    </Stack.Navigator>
  );
}

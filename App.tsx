import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import AdminDashboard from './src/screens/AdminDashboard';
import UserDashboard from './src/screens/UserDashboard';
import { initializeApp } from './src/utils/storage';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  AdminDashboard: undefined;
  UserDashboard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
    initializeApp();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#1A0A3E" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
          <Stack.Screen name="UserDashboard" component={UserDashboard} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

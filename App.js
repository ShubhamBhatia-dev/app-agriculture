import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';


import LoadingScreen from './components/Loading';
import Language from './components/Language';
import Chat from './components/chat';
import Home from './components/home';
import UserSelectionScreen from './components/Selection';
import Vendor from './components/Vendor';
import Address from './components/Address';
import PhoneAuthScreen from './components/Number';
import UserSettings from './components/userSettings';


const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Loading">
        <Stack.Screen
          name="Loading"
          component={LoadingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Selection"
          component={UserSelectionScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Language"
          component={Language}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Chat"
          component={Chat}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Address"
          component={Address}
          options={{ headerShown: false }} />
        <Stack.Screen
          name="Vendor"
          component={Vendor}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Number"
          component={PhoneAuthScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="userSettings"
          component={UserSettings}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} ></Stack.Screen>

      </Stack.Navigator>
    </NavigationContainer>
  );
}
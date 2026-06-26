import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Colors } from './constants/colors';
import TodayScreen from './app/TodayScreen';
import SearchScreen from './app/SearchScreen';
import WeightScreen from './app/WeightScreen';
import SettingsScreen from './app/SettingsScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }) {
  return (
    <Text style={{ fontSize: 20 }}>
      {label === 'Today' ? '📋' : label === 'Search' ? '🔍' : label === 'Weight' ? '⚖️' : '⚙️'}
    </Text>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <NavigationContainer>
      <StatusBar style="light" backgroundColor={Colors.background} />
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.border,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textSecondary,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
          headerStyle: {
            backgroundColor: Colors.background,
            borderBottomColor: Colors.border,
            borderBottomWidth: 1,
          },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 17,
          },
        }}
      >
        <Tab.Screen
          name="Today"
          component={TodayScreen}
          options={{
            title: 'Heute',
            tabBarIcon: ({ focused }) => <TabIcon label="Today" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Search"
          component={SearchScreen}
          options={{
            title: 'Hinzufügen',
            tabBarIcon: ({ focused }) => <TabIcon label="Search" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Weight"
          component={WeightScreen}
          options={{
            title: 'Gewicht',
            tabBarIcon: ({ focused }) => <TabIcon label="Weight" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Einstellungen',
            tabBarIcon: ({ focused }) => <TabIcon label="Settings" focused={focused} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
    </GestureHandlerRootView>
  );
}

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import FeedScreen from '../screens/FeedScreen';
import FriendsScreen from '../screens/FriendsScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { AppTabsParamList } from '../types/navigation';
import { palette } from '../theme/tokens';

const Tab = createBottomTabNavigator<AppTabsParamList>();

const AppTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, focused, size }) => {
          const iconSize = focused ? 26 : 24;
          return <Icon name={iconNameForRoute(route.name)} size={iconSize} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Friends" component={FriendsScreen} />
      <Tab.Screen
        name="Create"
        component={CreatePostScreen}
        options={{ tabBarLabel: 'Create' }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const iconNameForRoute = (route: keyof AppTabsParamList): string => {
  switch (route) {
    case 'Feed':
      return 'home';
    case 'Friends':
      return 'people';
    case 'Create':
      return 'add-circle';
    case 'Profile':
      return 'person';
    default:
      return 'ellipse';
  }
};

export default AppTabs;

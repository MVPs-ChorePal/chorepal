import { Tabs, useSegments } from 'expo-router';
import { Text, View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, radius } from '../../constants/theme';

const ChildTabItem = ({ label, icon, isActive }: { label: string, icon: string, isActive: boolean }) => {
  const activeColor = colors.brand.primary;
  const activeBg = colors.brand.primarySubtle;
  const inactiveColor = colors.text.secondary;

  return (
    <View style={[styles.pill, isActive && { backgroundColor: activeBg }]}>
      <Ionicons 
        name={isActive ? icon : (`${icon}-outline` as any)} 
        size={22} 
        color={isActive ? activeColor : inactiveColor} 
      />
      <Text style={[styles.tabText, { color: isActive ? activeColor : inactiveColor }]}>
        {label}
      </Text>
    </View>
  );
};

export default function ChildLayout() {
  const segments = useSegments();
  
  //check if the user is in the 'chores' folder
  const isChoresActive = segments[1] === 'chores';

  return (
    <Tabs screenOptions={{
      headerShown: false,
      animation: 'none',
      tabBarShowLabel: false, 
      tabBarStyle: styles.tabBar,
      tabBarItemStyle: {
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
      },
      tabBarIconStyle: {
        width: '100%',
        height: '100%',
        marginTop: 0,
      }
    }}>
      <Tabs.Screen name="home" options={{
        tabBarIcon: ({ focused }) => <ChildTabItem label="HOME" icon="home" isActive={focused} />
      }} />
      
      <Tabs.Screen name="chores/index" options={{
        title: 'chores',
        tabBarIcon: () => <ChildTabItem label="CHORES" icon="list" isActive={isChoresActive} />
      }} />

      <Tabs.Screen name="rewards" options={{
        tabBarIcon: ({ focused }) => <ChildTabItem label="REWARDS" icon="gift" isActive={focused} />
      }} />
      <Tabs.Screen name="account" options={{
        tabBarIcon: ({ focused }) => <ChildTabItem label="ACCOUNT" icon="happy" isActive={focused} />
      }} />

      <Tabs.Screen name="chores/[id]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface.white,
    borderTopWidth: 0,
    height: 100,
    elevation: 0,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderTopLeftRadius: radius.medium,
    borderTopRightRadius: radius.medium,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 20,
  },
  pill: {
    width: 85,
    height: 65,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.card,
  },
  tabText: {
    ...typography.captionStrong,
    marginTop: 4,
  }
});
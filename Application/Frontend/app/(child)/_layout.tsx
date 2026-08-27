import { Tabs } from 'expo-router';
import { Text, View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ChildTabItem = ({ label, icon, isActive }: { label: string, icon: string, isActive: boolean }) => {
  const activeColor = '#000000';
  const activeBg = '#FFD700';
  const inactiveColor = '#8E8E93';

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
        tabBarIcon: ({ focused }) => (
          <ChildTabItem label="HOME" icon="home" isActive={focused} />
        )
      }} />
      <Tabs.Screen name="chores" options={{
        tabBarIcon: ({ focused }) => (
          <ChildTabItem label="CHORES" icon="list" isActive={focused} />
        )
      }} />
      <Tabs.Screen name="rewards" options={{
        tabBarIcon: ({ focused }) => (
          <ChildTabItem label="REWARDS" icon="gift" isActive={focused} />
        )
      }} />
      <Tabs.Screen name="account" options={{
        tabBarIcon: ({ focused }) => (
          <ChildTabItem label="ACCOUNT" icon="happy" isActive={focused} />
        )
      }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFF',
    borderTopWidth: 0,
    height: 100, 
    elevation: 0,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
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
    borderRadius: 25,
  },
  tabText: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  }
});
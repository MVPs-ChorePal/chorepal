import { Tabs, useSegments } from 'expo-router';
import { Text, View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TabItem = ({ label, icon, isActive }: { label: string, icon: string, isActive: boolean }) => {
  const activeColor = '#005DA7'; 
  const activeBg = '#E8F0FE';    
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

export default function ParentLayout() {
  const segments = useSegments();
  const isChoresActive = segments[1] === 'chores';

  return (
    <Tabs screenOptions={{
      headerShown: false,
      animation: 'none',
      tabBarShowLabel: false, 
      tabBarStyle: styles.tabBar,
      //centers the entire tab slot vertically
      tabBarItemStyle: {
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
      },
      //removes default margins from the icon container
      tabBarIconStyle: {
        width: '100%',
        height: '100%',
        marginTop: 0,
      }
    }}>
      <Tabs.Screen name="home" options={{
        tabBarIcon: ({ focused }) => (
          <TabItem label="HOME" icon="home" isActive={focused} />
        )
      }} />
      <Tabs.Screen name="chores/index" options={{
        title: 'chores',
        tabBarIcon: () => (
          <TabItem label="CHORES" icon="list" isActive={isChoresActive} />
        )
      }} />
      <Tabs.Screen name="rewards" options={{
        tabBarIcon: ({ focused }) => (
          <TabItem label="REWARDS" icon="star" isActive={focused} />
        )
      }} />
      <Tabs.Screen name="account" options={{
        tabBarIcon: ({ focused }) => (
          <TabItem label="ACCOUNT" icon="person" isActive={focused} />
        )
      }} />
      <Tabs.Screen name="chores/create-chore" options={{ href: null }} />
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
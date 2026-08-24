import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';

export default function ChildLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: '#EDF0FF',
        borderTopWidth: 0,
        height: 70,
        elevation: 0,
        shadowOpacity: 0,
      },
    }}>
      <Tabs.Screen name="home" options={{
        tabBarLabel: ({ focused }) => (
          <View style={{ borderBottomWidth: 2, borderBottomColor: focused ? '#FFD700' : 'transparent', paddingBottom: 4 }}>
            <Text style={{ color: focused ? '#FFD700' : '#AAA', fontSize: 13, fontWeight: '500' }}>home</Text>
          </View>
        )
      }} />
      <Tabs.Screen name="chores" options={{
        tabBarLabel: ({ focused }) => (
          <View style={{ borderBottomWidth: 2, borderBottomColor: focused ? '#FFD700' : 'transparent', paddingBottom: 4 }}>
            <Text style={{ color: focused ? '#FFD700' : '#AAA', fontSize: 13, fontWeight: '500' }}>chores</Text>
          </View>
        )
      }} />
      <Tabs.Screen name="rewards" options={{
        tabBarLabel: ({ focused }) => (
          <View style={{ borderBottomWidth: 2, borderBottomColor: focused ? '#FFD700' : 'transparent', paddingBottom: 4 }}>
            <Text style={{ color: focused ? '#FFD700' : '#AAA', fontSize: 13, fontWeight: '500' }}>rewards</Text>
          </View>
        )
      }} />
      <Tabs.Screen name="account" options={{
        tabBarLabel: ({ focused }) => (
          <View style={{ borderBottomWidth: 2, borderBottomColor: focused ? '#FFD700' : 'transparent', paddingBottom: 4 }}>
            <Text style={{ color: focused ? '#FFD700' : '#AAA', fontSize: 13, fontWeight: '500' }}>account</Text>
          </View>
        )
      }} />
    </Tabs>
  );
}
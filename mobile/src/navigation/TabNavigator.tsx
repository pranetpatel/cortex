import React from 'react'
import { Platform, View, Text, StyleSheet } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { colors } from '../theme/colors'
import { RootTabParamList, RootStackParamList } from '../types'

// ── Screens ────────────────────────────────────────────────────────────────────
import { ClipsScreen }        from '../screens/ClipsScreen'
import { NotesScreen }        from '../screens/NotesScreen'
import { EssayScreen }        from '../screens/EssayScreen'
import { GraphScreen }        from '../screens/GraphScreen'
import { ChatScreen }         from '../screens/ChatScreen'
import { ClipDetailScreen }   from '../screens/ClipDetailScreen'
import { NoteEditorScreen }   from '../screens/NoteEditorScreen'
import { EssayEditorScreen }  from '../screens/EssayEditorScreen'
import { SettingsScreen }     from '../screens/SettingsScreen'

const isIPad = Platform.OS === 'ios' && (Platform as any).isPad

// ── Tab / Drawer icons (text-based, no icon lib needed) ────────────────────────
const TAB_ICONS: Record<string, string> = {
  Clips: '◈', Notes: '◻', Write: '✑', Graph: '◎', AI: '✦',
}

// ── Bottom tab (phone + Android) ───────────────────────────────────────────────
const Tab = createBottomTabNavigator<RootTabParamList>()

function PhoneTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color }) => (
          <Text style={{ fontSize: 18, color }}>{TAB_ICONS[route.name]}</Text>
        ),
        tabBarActiveTintColor:   colors.accentClip,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bgSurface,
          borderTopColor:  colors.border,
        },
        tabBarLabelStyle: { fontSize: 11 },
        headerStyle:      { backgroundColor: colors.bgSurface },
        headerTintColor:  colors.textPrimary,
        headerTitleStyle: { fontWeight: '700' },
      })}
    >
      <Tab.Screen name="Clips" component={ClipsScreen} />
      <Tab.Screen name="Notes" component={NotesScreen} />
      <Tab.Screen name="Write" component={EssayScreen} />
      <Tab.Screen name="Graph" component={GraphScreen} />
      <Tab.Screen name="AI"    component={ChatScreen}  />
    </Tab.Navigator>
  )
}

// ── Drawer sidebar (iPad) ──────────────────────────────────────────────────────
const Drawer = createDrawerNavigator<RootTabParamList>()

function IPadDrawer() {
  return (
    <Drawer.Navigator
      drawerType="permanent"
      drawerContent={(props) => (
        <DrawerContentScrollView
          {...props}
          style={{ backgroundColor: colors.bgSidebar }}
        >
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarLogo}>◈ Cortex</Text>
          </View>
          <DrawerItemList {...props} />
        </DrawerContentScrollView>
      )}
      screenOptions={({ route }) => ({
        drawerIcon: ({ color }) => (
          <Text style={{ fontSize: 18, color }}>{TAB_ICONS[route.name]}</Text>
        ),
        drawerActiveTintColor:      colors.accentClip,
        drawerInactiveTintColor:    colors.textSecondary,
        drawerActiveBackgroundColor:'rgba(245,158,66,0.10)',
        drawerStyle:                { backgroundColor: colors.bgSidebar, width: 220 },
        drawerLabelStyle:           { fontSize: 14, fontWeight: '500' },
        headerStyle:                { backgroundColor: colors.bgSurface },
        headerTintColor:            colors.textPrimary,
        headerTitleStyle:           { fontWeight: '700' },
      })}
    >
      <Drawer.Screen name="Clips" component={ClipsScreen} />
      <Drawer.Screen name="Notes" component={NotesScreen} />
      <Drawer.Screen name="Write" component={EssayScreen} />
      <Drawer.Screen name="Graph" component={GraphScreen} />
      <Drawer.Screen name="AI"    component={ChatScreen}  />
    </Drawer.Navigator>
  )
}

// ── Root stack (wraps tabs + modal screens) ────────────────────────────────────
const Stack = createNativeStackNavigator<RootStackParamList>()

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle:      { backgroundColor: colors.bgSurface },
        headerTintColor:  colors.textPrimary,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle:     { backgroundColor: colors.bgPrimary },
      }}
    >
      <Stack.Screen
        name="Tabs"
        component={isIPad ? IPadDrawer : PhoneTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="ClipDetail"   component={ClipDetailScreen}  options={{ title: 'Clip' }} />
      <Stack.Screen name="NoteEditor"   component={NoteEditorScreen}   options={{ title: 'Note' }} />
      <Stack.Screen name="EssayEditor"  component={EssayEditorScreen}  options={{ title: 'Essay' }} />
      <Stack.Screen name="Settings"     component={SettingsScreen}     options={{ title: 'Settings' }} />
    </Stack.Navigator>
  )
}

const styles = StyleSheet.create({
  sidebarHeader: {
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  sidebarLogo: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accentClip,
    letterSpacing: -0.5,
  },
})

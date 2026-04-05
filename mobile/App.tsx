import React, { useEffect, useState } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationContainer } from '@react-navigation/native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  useFonts,
} from '@expo-google-fonts/dm-sans'
import { initDatabase } from './src/services/database'
import { RootNavigator } from './src/navigation/TabNavigator'
import { colors } from './src/theme/colors'

const NAV_THEME = {
  dark: true,
  colors: {
    primary:      colors.accentClip,
    background:   colors.bgPrimary,
    card:         colors.bgSurface,
    text:         colors.textPrimary,
    border:       colors.border,
    notification: colors.accentClip,
  },
}

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  })
  const [dbReady, setDbReady] = useState(false)

  useEffect(() => {
    try {
      initDatabase()
    } catch (e) {
      console.error('[App] DB init failed:', e)
    } finally {
      setDbReady(true)
    }
  }, [])

  if (!fontsLoaded || !dbReady) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.accentClip} size="large" />
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <NavigationContainer theme={NAV_THEME}>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  splash: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

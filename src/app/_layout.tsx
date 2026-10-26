import { Stack } from 'expo-router';

import { DataProvider } from '@/data/DataProvider';

export default function RootLayout() {
  return (
    <DataProvider>
      <Stack screenOptions={{ headerTitleAlign: 'center' }} />
    </DataProvider>
  );
}

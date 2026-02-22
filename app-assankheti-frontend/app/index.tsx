// Import Redirect component from Expo Router
// Redirect is used to navigate to another route automatically
// without rendering any UI on the screen
import { Redirect } from 'expo-router';

// This is the root component of the frontend application
// It represents the "/" (root) route and runs as soon as the app starts
export default function RootIndex() {

  // Immediately redirect the user from the root route ("/")
  // to the "/splash" screen when the app launches
  return <Redirect href="/splash" />;
}

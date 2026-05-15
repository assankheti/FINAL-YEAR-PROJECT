import { Redirect } from 'expo-router';

export default function BusinessCommunityAliasPage() {
  return <Redirect href={{ pathname: '/community-dashboard', params: { userType: 'businessman' } }} />;
}

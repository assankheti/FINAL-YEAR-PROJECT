import { Redirect } from 'expo-router';

export default function UserCommunityAliasPage() {
  return <Redirect href={{ pathname: '/community-dashboard', params: { userType: 'simple-user' } }} />;
}

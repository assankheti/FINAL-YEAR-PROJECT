import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ThreeDotMenu from '@/components/ThreeDotMenu';
import DeleteConfirmation from '@/components/DeleteConfirmation';

export default function ProductActionsPage() {
  const params = useLocalSearchParams<{ productId?: string }>();
  const productId = params?.productId ?? 'unknown';
  const router = useRouter();

  const [menuVisible, setMenuVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontWeight: '900', fontSize: 18 }}>Product Actions</Text>
      <Text style={{ color: '#6b7280', marginTop: 8 }}>Product: {productId}</Text>

      <TouchableOpacity style={styles.openBtn} onPress={() => setMenuVisible(true)}>
        <Text style={{ color: '#fff', fontWeight: '900' }}>Open Actions</Text>
      </TouchableOpacity>

      <ThreeDotMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        title="Actions"
        subtitle={`Product ${productId}`}
        options={[
          { key: 'edit', icon: 'edit-3', label: 'Edit', onPress: () => router.push(`/add-product?mode=edit&productId=${productId}`) },
          { key: 'delete', icon: 'trash-2', label: 'Delete', destructive: true, onPress: () => setConfirmVisible(true) },
          { key: 'share', icon: 'share', label: 'Share', onPress: () => {} },
        ]}
      />

      <DeleteConfirmation
        visible={confirmVisible}
        onCancel={() => setConfirmVisible(false)}
        onConfirm={() => {
          setConfirmVisible(false);
          setMenuVisible(false);
          router.replace('/farmer-products');
        }}
        title="Delete product"
        message="This will permanently remove the product from your listings."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  openBtn: { marginTop: 18, backgroundColor: '#0d5c4b', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
});

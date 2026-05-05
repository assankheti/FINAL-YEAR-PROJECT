import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { API_BASE } from '@/config/env';
import { useT } from '@/contexts/LanguageContext';

type Props = {
  productId?: string;
  productName?: string;
  productPrice?: number;
  productUnit?: string;
  productImageUrl?: string;
  productEmoji?: string;
};

function resolveImageUri(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return API_BASE + url;
}

/**
 * Sticky product summary shown at the top of a DM thread when
 * `context_type=product`. Today the data is passed in via navigation params
 * from the product-buy screen; once a real product detail endpoint exists
 * we'll fetch by productId here.
 */
export default function PinnedProductCard({
  productId,
  productName,
  productPrice,
  productUnit,
  productImageUrl,
  productEmoji,
}: Props) {
  const t = useT();
  const imgUri = resolveImageUri(productImageUrl);

  return (
    <View style={styles.card}>
      <View style={styles.thumbWrap}>
        {imgUri ? (
          <Image source={{ uri: imgUri }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <Text style={styles.emoji}>{productEmoji || '📦'}</Text>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.label}>
          {t({ english: 'About this product', urdu: 'اس مصنوع کے بارے میں' })}
        </Text>
        <Text style={styles.name} numberOfLines={1}>
          {productName || t({ english: 'Product', urdu: 'مصنوع' })}
        </Text>
        {typeof productPrice === 'number' ? (
          <Text style={styles.price}>
            Rs {productPrice.toLocaleString()}
            {productUnit ? ` / ${productUnit}` : ''}
          </Text>
        ) : null}
        {productId ? (
          <Text style={styles.id}>#{productId}</Text>
        ) : null}
      </View>
      <Feather name="package" size={18} color="#0d5c4b" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ecfdf5',
    borderBottomWidth: 1,
    borderBottomColor: '#a7f3d0',
  },
  thumbWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  thumb: { width: '100%', height: '100%' },
  emoji: { fontSize: 22 },
  label: { fontSize: 11, fontWeight: '800', color: '#065f46', letterSpacing: 0.6 },
  name: { fontSize: 14, fontWeight: '900', color: '#111827', marginTop: 2 },
  price: { fontSize: 13, fontWeight: '800', color: '#0d5c4b', marginTop: 2 },
  id: { fontSize: 10, fontWeight: '700', color: '#6b7280', marginTop: 2 },
});

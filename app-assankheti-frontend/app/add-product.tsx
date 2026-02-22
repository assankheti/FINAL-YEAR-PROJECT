import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { coerceAppLanguage, useLanguage, useT } from '@/contexts/LanguageContext';
import {
    Alert,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Category = 'grains' | 'veggies' | 'fruits' | 'others';

type Unit = 'kg' | 'g' | 'bag' | 'bundle' | 'piece' | 'dozen';

export default function AddProductPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { textLanguage: ctxTextLanguage, voiceLanguage: ctxVoiceLanguage } = useLanguage();
  const textLanguage = coerceAppLanguage(params?.textLanguage, ctxTextLanguage);
  const voiceLanguage = coerceAppLanguage(params?.voiceLanguage, ctxVoiceLanguage);
  const t = useT();

  const readParam = (key: string) => {
    const v = (params as any)?.[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const mode = (readParam('mode') as string) ?? 'add';
  const isEdit = mode === 'edit';

  const { width } = useWindowDimensions();
  const contentMaxWidth = Math.min(520, width);

  const [images, setImages] = useState<string[]>([]);
  const [formData, setFormData] = useState(() => {
    const name = (readParam('name') as string) ?? '';
    const price = (readParam('price') as string) ?? '';
    const unitParam = (readParam('unit') as string) ?? '';
    const stock = (readParam('stock') as string) ?? '';
    const description = (readParam('description') as string) ?? '';
    const minOrder = (readParam('minOrder') as string) ?? '';
    const deliveryArea = (readParam('deliveryArea') as string) ?? '';
    const categoryParam = (readParam('category') as string) ?? '';

    const unit: Unit = (['kg', 'g', 'bag', 'bundle', 'piece', 'dozen'] as const).includes(unitParam as any) ? (unitParam as Unit) : 'kg';
    const category: Category = (['grains', 'veggies', 'fruits', 'others'] as const).includes(categoryParam as any) ? (categoryParam as Category) : 'grains';

    return {
      name,
      category,
      price,
      unit,
      stock,
      description,
      minOrder,
      deliveryArea,
    };
  });

  const strings = useMemo(
    () =>
      ({
        title: { urdu: 'نئی مصنوعات شامل کریں', english: 'Add New Product' },
        editTitle: { urdu: 'مصنوعات میں تبدیلی کریں', english: 'Edit Product' },
        subtitle: { urdu: 'نئی مصنوعات شامل کریں', english: 'Add product details' },
        images: { urdu: 'تصاویر', english: 'Product Images' },
        addPhoto: { urdu: 'تصویر شامل کریں', english: 'Add Photo' },
        imageHint: { urdu: 'زیادہ سے زیادہ 5 تصاویر شامل کریں', english: 'Add up to 5 images. First image will be the cover.' },
        name: { urdu: 'نام', english: 'Product Name' },
        category: { urdu: 'زمرہ', english: 'Category' },
        price: { urdu: 'قیمت', english: 'Price' },
        unit: { urdu: 'یونٹ', english: 'Unit' },
        stock: { urdu: 'اسٹاک', english: 'Available Stock' },
        minOrder: { urdu: 'کم از کم آرڈر', english: 'Minimum Order' },
        delivery: { urdu: 'ڈیلیوری علاقہ', english: 'Delivery Area' },
        description: { urdu: 'تفصیل', english: 'Description' },
        cancel: { urdu: 'منسوخ', english: 'Cancel' },
        publish: { urdu: 'شائع کریں', english: 'Publish' },
        update: { urdu: 'اپڈیٹ کریں', english: 'Update' },
      }) as const,
    []
  );

  const categories = useMemo(
    () =>
      [
        { value: 'grains' as const, label: { english: 'Grains', urdu: 'اناج' } },
        { value: 'veggies' as const, label: { english: 'Vegetables', urdu: 'سبزیاں' } },
        { value: 'fruits' as const, label: { english: 'Fruits', urdu: 'پھل' } },
        { value: 'others' as const, label: { english: 'Others', urdu: 'دیگر' } },
      ],
    []
  );

  const units: Unit[] = useMemo(() => (isEdit ? ['kg'] : ['kg', 'g', 'bag', 'bundle', 'piece', 'dozen']), [isEdit]);


  const pickImages = async () => {
    if (images.length >= 5) return;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        t({ english: 'Permission needed', urdu: 'اجازت درکار ہے' }),
        t({ english: 'Please allow photo library access.', urdu: 'براہِ کرم فوٹو لائبریری تک رسائی کی اجازت دیں۔' })
      );
      return;
    }

    const selectionLimit = Math.max(1, 5 - images.length);

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit,
    } as any);

    if (result.canceled) return;

    const uris = (result.assets ?? []).map((a) => a.uri).filter(Boolean);
    setImages((prev) => [...prev, ...uris].slice(0, 5));
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCancel = () => {
    router.back();
  };

  const handlePublish = () => {
    // Backend submit not requested yet.
    if (isEdit) {
      router.back();
      return;
    }

    router.replace({
      pathname: '/farmer-dashboard',
      params: {
        tab: 'shop',
        textLanguage,
        voiceLanguage,
      },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f1e8' }}>
      <View style={{ flex: 1 }}>
        <LinearGradient
          colors={['#0d5c4b', '#10b981']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={[styles.headerRow, { justifyContent: 'space-between' }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{t(isEdit ? strings.editTitle : strings.title)}</Text>
            </View>

            <TouchableOpacity onPress={handleCancel} style={styles.backBtn} activeOpacity={0.9} accessibilityLabel="Back">
              <Feather name="arrow-left" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 24 }]} showsVerticalScrollIndicator={false}>
          <View style={[styles.sectionWrap, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
            {/* Images */}
            <Text style={styles.label}>
              {t(strings.images)}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 8 }}>
              {images.map((uri, index) => (
                <View key={`${uri}-${index}`} style={styles.thumbWrap}>
                  <Image source={{ uri }} style={styles.thumbImg} />
                  <TouchableOpacity onPress={() => removeImage(index)} style={styles.thumbRemove} activeOpacity={0.9}>
                    <Feather name="x" size={14} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ))}

              {images.length < 5 ? (
                <TouchableOpacity onPress={pickImages} style={styles.addPhotoBox} activeOpacity={0.9}>
                  <Feather name="plus" size={22} color="#6b7280" />
                  <Text style={styles.addPhotoText}>{t(strings.addPhoto)}</Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>
            <Text style={styles.hint}>{t(strings.imageHint)}</Text>

            {/* Name */}
            <Text style={[styles.label, { marginTop: 14 }]}>
              {t(strings.name)}
            </Text>
            <TextInput
              value={formData.name}
              onChangeText={(v) => setFormData((p) => ({ ...p, name: v }))}
              placeholder={t({ english: 'e.g., Fresh Basmati Rice', urdu: 'مثال: تازہ باسمتی چاول' })}
              placeholderTextColor="#9ca3af"
              style={styles.input}
            />

            {/* Category */}
            <Text style={[styles.label, { marginTop: 14 }]}>
              {t(strings.category)}
            </Text>
            <View style={styles.chipRow}>
              {categories.map((cat) => {
                const selected = formData.category === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    onPress={() => setFormData((p) => ({ ...p, category: cat.value }))}
                    style={[styles.chip, selected ? styles.chipActive : null]}
                    activeOpacity={0.9}
                  >
                    <Text style={[styles.chipText, selected ? styles.chipTextActive : null]}>{t(cat.label)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Price & Unit */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>
                  {t(strings.price)}
                </Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceSymbol}>$</Text>
                  <TextInput
                    value={formData.price}
                    onChangeText={(v) => setFormData((p) => ({ ...p, price: v.replace(/[^0-9.]/g, '') }))}
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                    style={[styles.input, { flex: 1, marginTop: 0, paddingLeft: 0, borderWidth: 0, backgroundColor: 'transparent' }]}
                  />
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>
                  {t(strings.unit)}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                  {units.map((u) => {
                    const selected = formData.unit === u;
                    return (
                      <TouchableOpacity
                        key={u}
                        onPress={() => setFormData((p) => ({ ...p, unit: u }))}
                        style={[styles.unitChip, selected ? styles.unitChipActive : null]}
                        activeOpacity={0.9}
                      >
                        <Text style={[styles.unitChipText, selected ? styles.unitChipTextActive : null]}>
                          {t({ english: `per ${u}`, urdu: `فی ${u}` })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {/* Stock */}
            <Text style={[styles.label, { marginTop: 14 }]}>
              {t(strings.stock)}
            </Text>
            <TextInput
              value={formData.stock}
              onChangeText={(v) => setFormData((p) => ({ ...p, stock: v.replace(/\D/g, '') }))}
              placeholder={t({ english: 'e.g., 500', urdu: 'مثال: 500' })}
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              style={styles.input}
            />

            {/* Minimum order */}
            <Text style={[styles.label, { marginTop: 14 }]}>
              {t(strings.minOrder)}
            </Text>
            <TextInput
              value={formData.minOrder}
              onChangeText={(v) => setFormData((p) => ({ ...p, minOrder: v }))}
              placeholder={t({ english: 'e.g., 10 kg', urdu: 'مثال: 10 کلو' })}
              placeholderTextColor="#9ca3af"
              style={styles.input}
            />

            {/* Delivery area */}
            <Text style={[styles.label, { marginTop: 14 }]}>
              {t(strings.delivery)}
            </Text>
            <TextInput
              value={formData.deliveryArea}
              onChangeText={(v) => setFormData((p) => ({ ...p, deliveryArea: v }))}
              placeholder={t({ english: 'e.g., Punjab, Pakistan', urdu: 'مثال: پنجاب، پاکستان' })}
              placeholderTextColor="#9ca3af"
              style={styles.input}
            />

            {/* Description */}
            <Text style={[styles.label, { marginTop: 14 }]}>
              {t(strings.description)}
            </Text>
            <TextInput
              value={formData.description}
              onChangeText={(v) => setFormData((p) => ({ ...p, description: v }))}
              placeholder={t({ english: 'Describe your product quality, freshness, etc.', urdu: 'اپنی مصنوعات کی کوالٹی، تازگی وغیرہ بیان کریں۔' })}
              placeholderTextColor="#9ca3af"
              multiline
              style={[styles.input, { height: 110, textAlignVertical: 'top', paddingTop: 12 }]}
            />

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
              <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={handleCancel} activeOpacity={0.9}>
                <Text style={[styles.btnText, styles.btnTextOutline]}>{t(strings.cancel)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handlePublish} activeOpacity={0.9}>
                <Feather name="save" size={18} color="#ffffff" />
                <Text style={[styles.btnText, { marginLeft: 8 }]}>{t(isEdit ? strings.update : strings.publish)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 22,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  content: { paddingHorizontal: 16, paddingTop: 16 },
  sectionWrap: { paddingHorizontal: 16 },

  label: { color: '#111827', fontWeight: '800' },
  labelMuted: { color: '#6b7280', fontWeight: '700' },
  hint: { color: '#6b7280', marginTop: 6, fontSize: 12 },

  thumbWrap: { width: 78, height: 78, borderRadius: 16, overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },
  thumbRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },

  addPhotoBox: {
    width: 78,
    height: 78,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e5e7eb',
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  addPhotoText: { marginTop: 6, fontSize: 10, color: '#6b7280', fontWeight: '800', textAlign: 'center' },

  input: {
    marginTop: 8,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    color: '#111827',
    fontWeight: '700',
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  chipActive: { backgroundColor: 'rgba(13,92,75,0.10)', borderColor: 'rgba(13,92,75,0.30)' },
  chipText: { color: '#111827', fontWeight: '800', fontSize: 12 },
  chipTextActive: { color: '#0d5c4b' },

  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  unitChipActive: { backgroundColor: '#0d5c4b', borderColor: '#0d5c4b' },
  unitChipText: { color: '#111827', fontWeight: '800', fontSize: 12 },
  unitChipTextActive: { color: '#ffffff' },

  priceRow: {
    marginTop: 8,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priceSymbol: { color: '#6b7280', fontWeight: '900' },

  btn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btnOutline: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb' },
  btnPrimary: { backgroundColor: '#0d5c4b' },
  btnText: { fontWeight: '900', color: '#ffffff' },
  btnTextOutline: { color: '#111827' },
});

import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { coerceAppLanguage, useLanguage, useT } from '@/contexts/LanguageContext';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createProduct,
  getProductOwnerId,
  updateProduct,
  type ProductCategory,
  type ProductUnit,
} from '@/lib/productsApi';

export default function AddProductPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { textLanguage: ctxTextLanguage, voiceLanguage: ctxVoiceLanguage } = useLanguage();
  const textLanguage = coerceAppLanguage(params?.textLanguage, ctxTextLanguage);
  const voiceLanguage = coerceAppLanguage(params?.voiceLanguage, ctxVoiceLanguage);
  const t = useT();
  const insets = useSafeAreaInsets();

  const readParam = (key: string) => {
    const v = (params as any)?.[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const mode = (readParam('mode') as string) ?? 'add';
  const isEdit = mode === 'edit';
  const productId = (readParam('productId') as string) ?? '';
  const farmerIdParam = (readParam('farmerId') as string) ?? '';
  const isLocalFallback = readParam('isLocalFallback') === '1';

  const { width } = useWindowDimensions();
  const isTiny = width < 350;
  const isCompact = width < 390;
  const horizontalPadding = Math.max(16, Math.min(26, Math.round(width * 0.055)));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 540);

  const [images, setImages] = useState<string[]>(() => {
    const rawImages = readParam('images') as string | undefined;
    if (!rawImages) return [];
    try {
      const parsed = JSON.parse(rawImages);
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string').slice(0, 5) : [];
    } catch {
      return [];
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(() => {
    const name = (readParam('name') as string) ?? '';
    const price = (readParam('price') as string) ?? '';
    const unitParam = (readParam('unit') as string) ?? '';
    const stock = (readParam('stock') as string) ?? '';
    const description = (readParam('description') as string) ?? '';
    const minOrder = (readParam('minOrder') as string) ?? '';
    const deliveryArea = (readParam('deliveryArea') as string) ?? '';
    const categoryParam = (readParam('category') as string) ?? '';

    const unit: ProductUnit = (['kg', 'g', 'bag', 'bundle', 'piece', 'dozen'] as const).includes(unitParam as any) ? (unitParam as ProductUnit) : 'kg';
    const category: ProductCategory = (['grains', 'veggies', 'fruits', 'others'] as const).includes(categoryParam as any) ? (categoryParam as ProductCategory) : 'grains';

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
        publishing: { urdu: 'شائع ہو رہا ہے...', english: 'Publishing...' },
        updating: { urdu: 'اپڈیٹ ہو رہا ہے...', english: 'Updating...' },
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

  const units: ProductUnit[] = useMemo(() => ['kg', 'g', 'bag', 'bundle', 'piece', 'dozen'], []);


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
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace({ pathname: '/farmer-products', params: { textLanguage, voiceLanguage } });
  };

  const handlePublish = async () => {
    const name = formData.name.trim();
    const price = Number(formData.price);
    const stock = Number(formData.stock);

    if (!name) {
      Alert.alert(t({ english: 'Product name required', urdu: 'مصنوعات کا نام ضروری ہے' }));
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      Alert.alert(t({ english: 'Enter a valid price', urdu: 'درست قیمت درج کریں' }));
      return;
    }

    if (!Number.isFinite(stock) || stock < 0) {
      Alert.alert(t({ english: 'Enter valid stock', urdu: 'درست اسٹاک درج کریں' }));
      return;
    }

    setIsSubmitting(true);
    try {
      const ownerId = farmerIdParam || (await getProductOwnerId());
      const payload = {
        farmer_id: ownerId,
        name,
        category: formData.category,
        price,
        unit: formData.unit,
        stock,
        min_order: formData.minOrder.trim(),
        delivery_area: formData.deliveryArea.trim(),
        description: formData.description.trim(),
        images,
        status: stock <= 0 ? 'sold' as const : 'active' as const,
      };

      if (isEdit && productId && !isLocalFallback) {
        await updateProduct(productId, {
          name: payload.name,
          category: payload.category,
          price: payload.price,
          unit: payload.unit,
          stock: payload.stock,
          min_order: payload.min_order,
          delivery_area: payload.delivery_area,
          description: payload.description,
          images: payload.images,
          status: payload.status,
        });
      } else {
        await createProduct(payload);
      }

      router.replace({
        pathname: '/farmer-products',
        params: {
          textLanguage,
          voiceLanguage,
        },
      });
    } catch (error) {
      Alert.alert(
        t({ english: isEdit ? 'Update failed' : 'Publish failed', urdu: isEdit ? 'اپڈیٹ نہیں ہوا' : 'شائع نہیں ہوا' }),
        error instanceof Error ? error.message : t({ english: 'Please try again.', urdu: 'دوبارہ کوشش کریں۔' })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.screen}
      >
        <LinearGradient
          colors={['#0d5c4b', '#10b981']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, isTiny ? styles.headerGradientTiny : null, { paddingHorizontal: horizontalPadding }]}
        >
          <View style={[styles.headerRow, isTiny ? styles.headerRowTiny : null, { maxWidth: contentMaxWidth }]}>
            <TouchableOpacity
              onPress={handleCancel}
              style={[styles.backBtn, isTiny ? styles.backBtnTiny : null]}
              activeOpacity={0.9}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t({ english: 'Back', urdu: 'واپس' })}
            >
              <Feather name="arrow-left" size={isTiny ? 17 : 18} color="#ffffff" />
            </TouchableOpacity>

            <View style={styles.headerCopy}>
              <Text style={[styles.headerTitle, isTiny ? styles.headerTitleTiny : null]} numberOfLines={1}>
                {t(isEdit ? strings.editTitle : strings.title)}
              </Text>
              <Text style={styles.headerSub} numberOfLines={1}>
                {t(strings.subtitle)}
              </Text>
            </View>

            <View style={[styles.headerIcon, isTiny ? styles.headerIconTiny : null]}>
              <Feather name={isEdit ? 'edit-3' : 'package'} size={isTiny ? 18 : 20} color="#ffffff" />
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingHorizontal: horizontalPadding, paddingBottom: Math.max(34, insets.bottom + 28) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.sectionWrap, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
            <View style={[styles.photoPanel, isTiny ? styles.photoPanelTiny : null]}>
              <View style={styles.photoHeader}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.label} numberOfLines={1}>
                    {t(strings.images)}
                  </Text>
                  <Text style={styles.hint} numberOfLines={2}>
                    {t(strings.imageHint)}
                  </Text>
                </View>
                <Text style={styles.photoCount}>{images.length}/5</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photoScroller}
              >
                {images.map((uri, index) => (
                  <View key={`${uri}-${index}`} style={[styles.thumbWrap, isTiny ? styles.thumbWrapTiny : null]}>
                    <Image source={{ uri }} style={styles.thumbImg} />
                    <TouchableOpacity onPress={() => removeImage(index)} style={styles.thumbRemove} activeOpacity={0.9}>
                      <Feather name="x" size={14} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                ))}

                {images.length < 5 ? (
                  <TouchableOpacity onPress={pickImages} style={[styles.addPhotoBox, isTiny ? styles.addPhotoBoxTiny : null]} activeOpacity={0.9}>
                    <Feather name="plus" size={22} color="#667085" />
                    <Text style={styles.addPhotoText} numberOfLines={2}>
                      {t(strings.addPhoto)}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </ScrollView>
            </View>

            <Text style={[styles.label, styles.fieldLabel]}>
              {t(strings.name)}
            </Text>
            <TextInput
              value={formData.name}
              onChangeText={(v) => setFormData((p) => ({ ...p, name: v }))}
              placeholder={t({ english: 'e.g., Fresh Basmati Rice', urdu: 'مثال: تازہ باسمتی چاول' })}
              placeholderTextColor="#9ca3af"
              style={styles.input}
            />

            <Text style={[styles.label, styles.fieldLabel]}>
              {t(strings.category)}
            </Text>
            <View style={styles.chipRow}>
              {categories.map((cat) => {
                const selected = formData.category === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    onPress={() => setFormData((p) => ({ ...p, category: cat.value }))}
                    style={[styles.chip, isTiny ? styles.chipTiny : null, selected ? styles.chipActive : null]}
                    activeOpacity={0.9}
                  >
                    <Text style={[styles.chipText, selected ? styles.chipTextActive : null]} numberOfLines={1}>
                      {t(cat.label)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[styles.priceUnitRow, isCompact ? styles.priceUnitRowStack : null]}>
              <View style={styles.priceColumn}>
                <Text style={styles.label}>
                  {t(strings.price)}
                </Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceSymbol}>Rs</Text>
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

              <View style={styles.unitColumn}>
                <Text style={styles.label}>
                  {t(strings.unit)}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitScroller}>
                  {units.map((u) => {
                    const selected = formData.unit === u;
                    return (
                      <TouchableOpacity
                        key={u}
                        onPress={() => setFormData((p) => ({ ...p, unit: u }))}
                        style={[styles.unitChip, selected ? styles.unitChipActive : null]}
                        activeOpacity={0.9}
                      >
                        <Text style={[styles.unitChipText, selected ? styles.unitChipTextActive : null]} numberOfLines={1}>
                          {t({ english: `per ${u}`, urdu: `فی ${u}` })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            <Text style={[styles.label, styles.fieldLabel]}>
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

            <Text style={[styles.label, styles.fieldLabel]}>
              {t(strings.minOrder)}
            </Text>
            <TextInput
              value={formData.minOrder}
              onChangeText={(v) => setFormData((p) => ({ ...p, minOrder: v }))}
              placeholder={t({ english: 'e.g., 10 kg', urdu: 'مثال: 10 کلو' })}
              placeholderTextColor="#9ca3af"
              style={styles.input}
            />

            <Text style={[styles.label, styles.fieldLabel]}>
              {t(strings.delivery)}
            </Text>
            <TextInput
              value={formData.deliveryArea}
              onChangeText={(v) => setFormData((p) => ({ ...p, deliveryArea: v }))}
              placeholder={t({ english: 'e.g., Punjab, Pakistan', urdu: 'مثال: پنجاب، پاکستان' })}
              placeholderTextColor="#9ca3af"
              style={styles.input}
            />

            <Text style={[styles.label, styles.fieldLabel]}>
              {t(strings.description)}
            </Text>
            <TextInput
              value={formData.description}
              onChangeText={(v) => setFormData((p) => ({ ...p, description: v }))}
              placeholder={t({ english: 'Describe your product quality, freshness, etc.', urdu: 'اپنی مصنوعات کی کوالٹی، تازگی وغیرہ بیان کریں۔' })}
              placeholderTextColor="#9ca3af"
              multiline
              style={[styles.input, styles.descriptionInput]}
            />

            <View style={[styles.actionRow, isTiny ? styles.actionRowTiny : null]}>
              <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={handleCancel} activeOpacity={0.9} disabled={isSubmitting}>
                <Text style={[styles.btnText, styles.btnTextOutline]} numberOfLines={1}>
                  {t(strings.cancel)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary, isSubmitting ? styles.btnDisabled : null]}
                onPress={handlePublish}
                activeOpacity={0.9}
                disabled={isSubmitting}
              >
                {isSubmitting ? <ActivityIndicator size="small" color="#ffffff" /> : <Feather name="save" size={18} color="#ffffff" />}
                <Text style={[styles.btnText, { marginLeft: 8 }]} numberOfLines={1}>
                  {t(isSubmitting ? (isEdit ? strings.updating : strings.publishing) : (isEdit ? strings.update : strings.publish))}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0d5c4b' },
  screen: { flex: 1, backgroundColor: '#f7faf6' },
  headerGradient: {
    paddingTop: 16,
    paddingBottom: 34,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerGradientTiny: { paddingTop: 14, paddingBottom: 30, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { width: '100%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRowTiny: { gap: 9 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnTiny: { width: 36, height: 36, borderRadius: 18 },
  headerCopy: { flex: 1, minWidth: 0 },
  headerTitle: { color: '#ffffff', fontSize: 22, lineHeight: 28, fontWeight: '900' },
  headerTitleTiny: { fontSize: 19, lineHeight: 25 },
  headerSub: { color: 'rgba(255,255,255,0.82)', marginTop: 2, fontSize: 13, fontWeight: '700' },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconTiny: { width: 36, height: 36, borderRadius: 14 },

  content: { marginTop: -18, paddingTop: 0 },
  sectionWrap: { paddingTop: 0 },

  photoPanel: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(13,92,75,0.07)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },
  photoPanelTiny: { borderRadius: 18, padding: 12 },
  photoHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  photoCount: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#ecfdf3',
    color: '#0d5c4b',
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  photoScroller: { gap: 10, paddingRight: 4 },

  label: { color: '#111827', fontWeight: '900', fontSize: 14 },
  fieldLabel: { marginTop: 16 },
  hint: { color: '#667085', marginTop: 4, fontSize: 12, lineHeight: 17, fontWeight: '600' },

  thumbWrap: { width: 78, height: 78, borderRadius: 16, overflow: 'hidden' },
  thumbWrapTiny: { width: 70, height: 70, borderRadius: 15 },
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
  addPhotoBoxTiny: { width: 70, height: 70, borderRadius: 15 },
  addPhotoText: { marginTop: 6, fontSize: 10, color: '#6b7280', fontWeight: '800', textAlign: 'center' },

  input: {
    marginTop: 8,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    color: '#111827',
    fontWeight: '800',
    fontSize: 14,
  },
  descriptionInput: { minHeight: 120, textAlignVertical: 'top', paddingTop: 14, lineHeight: 20 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
  },
  chipTiny: { minHeight: 40, paddingHorizontal: 12, paddingVertical: 9 },
  chipActive: { backgroundColor: 'rgba(13,92,75,0.10)', borderColor: 'rgba(13,92,75,0.30)' },
  chipText: { color: '#111827', fontWeight: '900', fontSize: 12 },
  chipTextActive: { color: '#0d5c4b' },

  priceUnitRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  priceUnitRowStack: { flexDirection: 'column' },
  priceColumn: { flex: 1, minWidth: 0 },
  unitColumn: { flex: 1, minWidth: 0 },
  unitScroller: { gap: 8, paddingVertical: 2, paddingRight: 10 },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  unitChipActive: { backgroundColor: '#0d5c4b', borderColor: '#0d5c4b' },
  unitChipText: { color: '#111827', fontWeight: '900', fontSize: 12 },
  unitChipTextActive: { color: '#ffffff' },

  priceRow: {
    marginTop: 8,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priceSymbol: { color: '#667085', fontWeight: '900', fontSize: 13 },

  actionRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionRowTiny: { gap: 10 },
  btn: {
    flex: 1,
    minHeight: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 10,
  },
  btnOutline: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb' },
  btnPrimary: {
    backgroundColor: '#0d5c4b',
    shadowColor: '#0d5c4b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { fontWeight: '900', color: '#ffffff' },
  btnTextOutline: { color: '#111827' },
});

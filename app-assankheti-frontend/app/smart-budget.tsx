import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import GreenHeader from '@/components/GreenHeader';
import { SafeAreaView } from 'react-native-safe-area-context';

type CropData = {
  fertilizers: string[];
  pesticides: string[];
  seeds: string[];
};

// Crop-dependent options
const cropOptions: Record<string, CropData> = {
  Wheat: {
    fertilizers: ['Urea', 'DAP', 'NPK'],
    pesticides: ['Fungicide', 'Insecticide'],
    seeds: ['Hybrid Wheat', 'Local Wheat'],
  },
  Rice: {
    fertilizers: ['NPK', 'Potash', 'Urea'],
    pesticides: ['Herbicide', 'Fungicide'],
    seeds: ['Hybrid Rice', 'Local Rice'],
  },
  Potato: {
    fertilizers: ['Potash', 'NPK'],
    pesticides: ['Insecticide', 'Fungicide'],
    seeds: ['Seed Potato A', 'Seed Potato B'],
  },
};

// 🇵🇰 Soil types for Pakistani farmers
const soilTypes = [
  'Loamy Soil',
  'Clay Soil',
  'Sandy Soil',
  'Silty Soil',
  'Alluvial Soil',
  'Saline Soil',
];

export default function SmartBudgetForm() {
  const router = useRouter();
  const [crop, setCrop] = useState('Select Crop');
  const [soilType, setSoilType] = useState('Select Soil Type');
  const [fertilizer, setFertilizer] = useState('Select Fertilizer');
  const [pesticide, setPesticide] = useState('Select Pesticide');
  const [seed, setSeed] = useState('Select Seed');
  const [area, setArea] = useState('');
  const [otherCosts, setOtherCosts] = useState('');

  const [open, setOpen] = useState<string | null>(null);

  const [result, setResult] = useState<any>(null);

  const renderDropdown = (
    label: string,
    value: string,
    options: string[],
    keyName: string,
    setValue: (v: string) => void
  ) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setOpen(open === keyName ? null : keyName)}
      >
        <Text style={styles.dropdownText}>{value}</Text>
        <Feather name="chevron-down" size={18} color="#2f6f5f" />
      </TouchableOpacity>

      {open === keyName && (
        <View style={styles.dropdownList}>
          {options.map((item) => (
            <TouchableOpacity
              key={item}
              style={styles.dropdownItem}
              onPress={() => {
                setValue(item);
                setOpen(null);
              }}
            >
              <Text>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const calculateBudget = () => {
    const areaNum = parseFloat(area) || 0;
    const otherNum = parseFloat(otherCosts) || 0;

    let soilFactor = 1;
    if (soilType === 'Saline Soil') soilFactor = 1.2;
    if (soilType === 'Loamy Soil') soilFactor = 0.9;

    const totalCost = areaNum * 5000 * soilFactor + otherNum;
    const expectedRevenue = areaNum * 10000;
    const profit = expectedRevenue - totalCost;

    setResult({ totalCost, expectedRevenue, profit });
  };

  const fertilizers = cropOptions[crop]?.fertilizers || [];
  const pesticides = cropOptions[crop]?.pesticides || [];
  const seeds = cropOptions[crop]?.seeds || [];

  return (
    <SafeAreaView style={styles.container}>
      <GreenHeader title={{ english: 'Smart Budget Calculator', urdu: 'سمارٹ بجٹ کیلکولیٹر' }} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>

      {/* Crop Type */}
      {renderDropdown('Crop Type', crop, Object.keys(cropOptions), 'crop', (val) => {
        setCrop(val);
        setFertilizer('Select Fertilizer');
        setPesticide('Select Pesticide');
        setSeed('Select Seed');
      })}

      {/* Soil Type */}
      {renderDropdown('Soil Type', soilType, soilTypes, 'soil', setSoilType)}

      {/* Land Area */}
      <View style={{ marginBottom: 12 }}>
        <Text style={styles.label}>Land Area (acre)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter area in acres"
          keyboardType="numeric"
          value={area}
          onChangeText={setArea}
        />
      </View>

      {/* Fertilizer */}
      {renderDropdown('Fertilizer', fertilizer, fertilizers, 'fertilizer', setFertilizer)}

      {/* Pesticide */}
      {renderDropdown('Pesticide', pesticide, pesticides, 'pesticide', setPesticide)}

      {/* Seed */}
      {renderDropdown('Seed', seed, seeds, 'seed', setSeed)}

      {/* Other Expenses */}
      <View style={{ marginBottom: 12 }}>
        <Text style={styles.label}>Other Expenses (Rs)</Text>
        <TextInput
          style={styles.input}
          placeholder="Any other cost"
          keyboardType="numeric"
          value={otherCosts}
          onChangeText={setOtherCosts}
        />
      </View>

      {/* Calculate */}
      <TouchableOpacity style={styles.button} onPress={calculateBudget}>
        <Feather name="command" size={18} color="#fff" />
        <Text style={styles.buttonText}> Calculate Budget</Text>
      </TouchableOpacity>

      {/* Result */}
      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>📊 Estimated Result</Text>
          <View style={styles.row}>
            <Text>Total Cost:</Text>
            <Text style={styles.cost}>Rs {result.totalCost}</Text>
          </View>
          <View style={styles.row}>
            <Text>Expected Revenue:</Text>
            <Text style={styles.revenue}>Rs {result.expectedRevenue}</Text>
          </View>
          <View style={styles.row}>
            <Text>Profit:</Text>
            <Text style={styles.profit}>Rs {result.profit}</Text>
          </View>
        </View>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

/* STYLES */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6faf7' },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1f4d3f',
    marginBottom: 20,
  },
  headerGradient: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 18,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: '700', flex: 1, textAlign: 'left' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  backButtonInline: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(31,77,63,0.08)' },
  backButtonInlineHeader: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
  label: { marginBottom: 6, fontWeight: '600', color: '#1f4d3f' },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#cfe3db',
  },
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#cfe3db',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: { color: '#374151' },
  dropdownList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cfe3db',
    marginTop: 4,
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  button: {
    backgroundColor: '#2f6f5f',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  buttonText: { color: '#fff', fontWeight: '700', marginLeft: 6 },
  resultCard: {
    marginTop: 20,
    backgroundColor: '#e9f5ef',
    padding: 16,
    borderRadius: 14,
  },
  resultTitle: {
    fontWeight: '700',
    color: '#1f4d3f',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cost: { color: '#b91c1c', fontWeight: '600' },
  revenue: { color: '#047857', fontWeight: '600' },
  profit: { color: '#065f46', fontWeight: '700' },
});

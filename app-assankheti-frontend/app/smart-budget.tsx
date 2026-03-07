import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import GreenHeader from '@/components/GreenHeader';
import { SafeAreaView } from 'react-native-safe-area-context';

type CropData = {
  fertilizers: string[];
  pesticides: string[];
  seeds: string[];
};

type FertilizerData = {
  _id: string;
  name: string;
  price: number;
  scraped_at: string;
};

type PesticideData = {
  _id: string;
  name: string;
  price: number;
  scraped_at: string;
};

type SeedData = {
  _id: string;
  name: string;
  price: number;
  scraped_at: string;
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
  const params = useLocalSearchParams();
  
  // Get the selected crop from route params and capitalize it
  const selectedCropFromParams = params.selectedCrop 
    ? (params.selectedCrop as string).charAt(0).toUpperCase() + (params.selectedCrop as string).slice(1)
    : 'Select Crop';
  
  const [crop, setCrop] = useState(selectedCropFromParams);
  const [soilType, setSoilType] = useState('Select Soil Type');
  const [fertilizer, setFertilizer] = useState('Select Fertilizer');
  const [pesticide, setPesticide] = useState('Select Pesticide');
  const [seed, setSeed] = useState('Select Seed');
  const [area, setArea] = useState('');
  const [otherCosts, setOtherCosts] = useState('');

  const [open, setOpen] = useState<string | null>(null);

  const [result, setResult] = useState<any>(null);

  // Fertilizer data from API
  const [availableFertilizers, setAvailableFertilizers] = useState<FertilizerData[]>([]);
  const [loadingFertilizers, setLoadingFertilizers] = useState(true);

  // Pesticide data from API
  const [availablePesticides, setAvailablePesticides] = useState<PesticideData[]>([]);
  const [loadingPesticides, setLoadingPesticides] = useState(true);

  // Seed data from API
  const [availableSeeds, setAvailableSeeds] = useState<SeedData[]>([]);
  const [loadingSeeds, setLoadingSeeds] = useState(true);

  // Update crop state when params change
  useEffect(() => {
    if (params.selectedCrop) {
      const capitalizedCrop = (params.selectedCrop as string).charAt(0).toUpperCase() + (params.selectedCrop as string).slice(1);
      if (cropOptions[capitalizedCrop]) {
        setCrop(capitalizedCrop);
        // Reset dependent dropdowns when crop changes
        setFertilizer('Select Fertilizer');
        setPesticide('Select Pesticide');
        setSeed('Select Seed');
      }
    }
  }, [params.selectedCrop]);

  // Fetch fertilizers from API
  useEffect(() => {
    const fetchFertilizers = async () => {
      try {
        setLoadingFertilizers(true);
        const response = await fetch('http://localhost:8000/api/v1/fertilizer/all?limit=100');
        const data = await response.json();

        if (data.status === 'success') {
          setAvailableFertilizers(data.data);
        } else {
          console.error('Failed to fetch fertilizers:', data);
        }
      }
      catch (error) {
        console.error('Error fetching fertilizers:', error);
      } finally {
        setLoadingFertilizers(false);
      }
    };

    fetchFertilizers();
  }, []);

  // Fetch pesticides from API
  useEffect(() => {
    const fetchPesticides = async () => {
      try {
        setLoadingPesticides(true);
        const response = await fetch('http://localhost:8000/api/v1/pesticide/all?limit=100');
        const data = await response.json();

        if (data.status === 'success') {
          setAvailablePesticides(data.data);
        } else {
          console.error('Failed to fetch pesticides:', data);
        }
      } catch (error) {
        console.error('Error fetching pesticides:', error);
      } finally {
        setLoadingPesticides(false);
      }
    };

    fetchPesticides();
  }, []);

  // Fetch seeds from API
  useEffect(() => {
    const fetchSeeds = async () => {
      try {
        setLoadingSeeds(true);
        const response = await fetch('http://localhost:8000/api/v1/seed/all?limit=100');
        const data = await response.json();

        if (data.status === 'success') {
          setAvailableSeeds(data.data);
        } else {
          console.error('Failed to fetch seeds:', data);
        }
      } catch (error) {
        console.error('Error fetching seeds:', error);
      } finally {
        setLoadingSeeds(false);
      }
    };

    fetchSeeds();
  }, []);

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

    // Find selected fertilizer price
    const selectedFertilizerData = availableFertilizers.find(f => f.name === fertilizer);
    const fertilizerPrice = selectedFertilizerData ? selectedFertilizerData.price : 0;

    // Find selected pesticide price
    const selectedPesticideData = availablePesticides.find(p => p.name === pesticide);
    const pesticidePrice = selectedPesticideData ? selectedPesticideData.price : 0;

    // Find selected seed price
    const selectedSeedData = availableSeeds.find(s => s.name === seed);
    const seedPrice = selectedSeedData ? selectedSeedData.price : 0;

    // Calculate costs (assuming 1 unit per acre for now)
    const fertilizerCost = areaNum * fertilizerPrice;
    const pesticideCost = areaNum * pesticidePrice;
    const seedCost = areaNum * seedPrice;

    const totalCost = (areaNum * 5000 * soilFactor) + fertilizerCost + pesticideCost + seedCost + otherNum;
    const expectedRevenue = areaNum * 10000;
    const profit = expectedRevenue - totalCost;

    setResult({
      totalCost,
      expectedRevenue,
      profit,
      fertilizerCost,
      pesticideCost,
      seedCost,
      fertilizerPrice: selectedFertilizerData ? selectedFertilizerData.price : 0,
      pesticidePrice: selectedPesticideData ? selectedPesticideData.price : 0,
      seedPrice: selectedSeedData ? selectedSeedData.price : 0
    });
  };

  const fertilizers = availableFertilizers.map(f => f.name);
  const pesticides = availablePesticides.map(p => p.name);
  const seeds = availableSeeds.map(s => s.name);

  return (
    <SafeAreaView style={styles.container}>
      <GreenHeader title={{ english: 'Smart Budget Calculator', urdu: 'سمارٹ بجٹ کیلکولیٹر' }} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Crop Type - Read Only */}
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.label}>Crop Type</Text>
          <View style={[styles.dropdown, { backgroundColor: '#f0f0f0' }]}>
            <Text style={styles.dropdownText}>{crop}</Text>
          </View>
        </View>

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
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.label}>Fertilizer</Text>

          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setOpen(open === 'fertilizer' ? null : 'fertilizer')}
            disabled={loadingFertilizers}
          >
            <Text style={[styles.dropdownText, loadingFertilizers && { color: '#9ca3af' }]}>
              {loadingFertilizers ? 'Loading fertilizers...' : fertilizer}
            </Text>
            <Feather name="chevron-down" size={18} color={loadingFertilizers ? "#9ca3af" : "#2f6f5f"} />
          </TouchableOpacity>

          {open === 'fertilizer' && !loadingFertilizers && (
            <View style={styles.dropdownList}>
              {fertilizers.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setFertilizer(item);
                    setOpen(null);
                  }}
                >
                  <Text>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Pesticide */}
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.label}>Pesticide</Text>

          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setOpen(open === 'pesticide' ? null : 'pesticide')}
            disabled={loadingPesticides}
          >
            <Text style={[styles.dropdownText, loadingPesticides && { color: '#9ca3af' }]}>
              {loadingPesticides ? 'Loading pesticides...' : pesticide}
            </Text>
            <Feather name="chevron-down" size={18} color={loadingPesticides ? "#9ca3af" : "#2f6f5f"} />
          </TouchableOpacity>

          {open === 'pesticide' && !loadingPesticides && (
            <View style={styles.dropdownList}>
              {pesticides.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setPesticide(item);
                    setOpen(null);
                  }}
                >
                  <Text>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Seed */}
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.label}>Seed</Text>

          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setOpen(open === 'seed' ? null : 'seed')}
            disabled={loadingSeeds}
          >
            <Text style={[styles.dropdownText, loadingSeeds && { color: '#9ca3af' }]}>
              {loadingSeeds ? 'Loading seeds...' : seed}
            </Text>
            <Feather name="chevron-down" size={18} color={loadingSeeds ? "#9ca3af" : "#2f6f5f"} />
          </TouchableOpacity>

          {open === 'seed' && !loadingSeeds && (
            <View style={styles.dropdownList}>
              {seeds.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSeed(item);
                    setOpen(null);
                  }}
                >
                  <Text>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

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

            {result.fertilizerPrice > 0 && (
              <View style={styles.row}>
                <Text>Fertilizer ({fertilizer}):</Text>
                <Text style={styles.cost}>Rs {result.fertilizerCost} ({result.fertilizerPrice}/unit)</Text>
              </View>
            )}

            {result.pesticidePrice > 0 && (
              <View style={styles.row}>
                <Text>Pesticide ({pesticide}):</Text>
                <Text style={styles.cost}>Rs {result.pesticideCost} ({result.pesticidePrice}/unit)</Text>
              </View>
            )}

            {result.seedPrice > 0 && (
              <View style={styles.row}>
                <Text>Seed ({seed}):</Text>
                <Text style={styles.cost}>Rs {result.seedCost} ({result.seedPrice}/unit)</Text>
              </View>
            )}

            <View style={styles.row}>
              <Text>Other Costs:</Text>
              <Text style={styles.cost}>Rs {parseFloat(otherCosts) || 0}</Text>
            </View>

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

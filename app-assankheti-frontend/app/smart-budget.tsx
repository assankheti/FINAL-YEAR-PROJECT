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

type ItemData = {
  _id: string;
  name: string;
  price: number;
  scraped_at: string;
};

// Crop-dependent realistic options from your JSON
const cropOptions: Record<string, CropData> = {
  Wheat: {
    fertilizers: [
      "Engro Dap 50kg...",
      "Sona Zinc Urea...",
      "Dap 7star 50kg...",
      "Mop 1kg Muriate...",
      "Sona Boron DAP...",
      "Sop 50kg Potash...",
      "Ammonium...",
      "Zarkhez Khas...",
      "Badshah SSP...",
      "Enroot 35kg...",
      "Mop 50kg...",
      "Sop 7 Star 50kg...",
      "Sona Dap 25KG (...",
      "Engro Urea 50kg...",
      "Sop 50kg Powder...",
      "Nutraful Dap...",
      "Sop Ffc 25kg...",
      "Zarkhez Plus...",
      "Zorawar Engro...",
      "Engro Np Plus...",
      "Calcium...",
      "Sop...",
      "Sona Urea...",
      "Sona Urea 50kg...",
      "Urea Babar Sher...",
      "Sona Urea 1kg...",
      "Sona Dap 1kg...",
      "Sop Engro/UAF...",
      "Tara Urea 50kg...",
      "Tara Ssp 50kg...",
      "Sarsabz Calcium...",
      "Sona Dap 50kg...",
      "Urea Sarsabz...",
      "Nitrophos Nitro...",
      "Zabardust Urea...",
      "Growphos 25kg...",
      "Dapper Fmc 15kg...",
      "UP Fertilizer..."
    ],
    pesticides: [
      "Foot Print...",
      "Mission Extra...",
      "Romeo 1KG Best...",
      "Glidus 1Liter...",
      "VERDICT 53EC...",
      "Success 250gm..."
    ],
    seeds: [
      "Dilkash Wheat...",
      "Anaj 17 Wheat...",
      "Pakistan 13...",
      "Arooj 22 Wheat...",
      "Fakhar e...",
      "NARC Super or...",
      "Zincol 16 Wheat...",
      "Borlug 16 Wheat...",
      "Falak 24 /...",
      "Sawera 24 Wheat...",
      "DG09 Wheat seed...",
      "Farmi Berseem...",
      "Chickpea Seed..."
    ]
  },
  Rice: {
    fertilizers: [
      "Basmati 515...",
      "Kissan Basmati...",
      "Hybrid Rice...",
      "cyto 2023 (..."
    ],
    pesticides: [
      "Foot Print...",
      "Mission Extra...",
      "Romeo 1KG Best..."
    ],
    seeds: [
      "Basmati 515...",
      "Kissan Basmati...",
      "Hybrid Rice...",
      "cyto 2023 (..."
    ]
  },
  Potato: {
    fertilizers: [
      "Enroot 35kg...",
      "Mop 50kg...",
      "Sop 50kg Powder..."
    ],
    pesticides: [
      "Full Control...",
      "Floki 200ML...",
      "Top Gun 1.6GR..."
    ],
    seeds: [
      "Seed Potato A",
      "Seed Potato B"
    ]
  }
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

  const [availableFertilizers, setAvailableFertilizers] = useState<ItemData[]>([]);
  const [availablePesticides, setAvailablePesticides] = useState<ItemData[]>([]);
  const [availableSeeds, setAvailableSeeds] = useState<ItemData[]>([]);
  const [loadingFertilizers, setLoadingFertilizers] = useState(true);
  const [loadingPesticides, setLoadingPesticides] = useState(true);
  const [loadingSeeds, setLoadingSeeds] = useState(true);

  // Update crop from params
  useEffect(() => {
    if (params.selectedCrop) {
      const capCrop = (params.selectedCrop as string).charAt(0).toUpperCase() + (params.selectedCrop as string).slice(1);
      if (cropOptions[capCrop]) {
        setCrop(capCrop);
        setFertilizer('Select Fertilizer');
        setPesticide('Select Pesticide');
        setSeed('Select Seed');
      }
    }
  }, [params.selectedCrop]);

  // Fetch data from APIs
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingFertilizers(true);
        const fertRes = await fetch('http://localhost:8000/api/v1/fertilizer/all?limit=100');
        const fertData = await fertRes.json();
        if (fertData.status === 'success') setAvailableFertilizers(fertData.data);

        setLoadingPesticides(true);
        const pestRes = await fetch('http://localhost:8000/api/v1/pesticide/all?limit=100');
        const pestData = await pestRes.json();
        if (pestData.status === 'success') setAvailablePesticides(pestData.data);

        setLoadingSeeds(true);
        const seedRes = await fetch('http://localhost:8000/api/v1/seed/all?limit=100');
        const seedData = await seedRes.json();
        if (seedData.status === 'success') setAvailableSeeds(seedData.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingFertilizers(false);
        setLoadingPesticides(false);
        setLoadingSeeds(false);
      }
    };
    fetchData();
  }, []);

  // Helper for dropdowns
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

  // 🔹 FILTERED OPTIONS
  const filteredFertilizers = availableFertilizers; // Show all fertilizers
  const filteredPesticides = availablePesticides.filter(p =>
    cropOptions[crop]?.pesticides.some(cf =>
      p.name.toLowerCase().startsWith(cf.replace('...', '').toLowerCase())
    )
  );
  const filteredSeeds = availableSeeds.filter(s =>
    cropOptions[crop]?.seeds.some(cf =>
      s.name.toLowerCase().startsWith(cf.replace('...', '').toLowerCase())
    )
  );

  const calculateBudget = () => {
    const areaNum = parseFloat(area) || 0;
    const otherNum = parseFloat(otherCosts) || 0;
    let soilFactor = 1;
    if (soilType === 'Saline Soil') soilFactor = 1.2;
    if (soilType === 'Loamy Soil') soilFactor = 0.9;

    const fertilizerPrice = filteredFertilizers.find(f => f.name === fertilizer)?.price || 0;
    const pesticidePrice = filteredPesticides.find(p => p.name === pesticide)?.price || 0;
    const seedPrice = filteredSeeds.find(s => s.name === seed)?.price || 0;

    const fertilizerCost = areaNum * fertilizerPrice * 1;
    const pesticideCost = areaNum * pesticidePrice * 0.5;
    const seedCost = areaNum * seedPrice * 1;
    const baseCost = areaNum * 3500 * soilFactor;
    const totalCost = baseCost + fertilizerCost + pesticideCost + seedCost + otherNum;

    const revenueMap: Record<string, number> = { Wheat: 150000, Rice: 180000, Potato: 300000 };
    const expectedRevenue = areaNum * (revenueMap[crop] || 120000);
    const profit = expectedRevenue - totalCost;

    setResult({ totalCost, expectedRevenue, profit, fertilizerCost, pesticideCost, seedCost, fertilizerPrice, pesticidePrice, seedPrice, fertilizerUnits: areaNum * 1, pesticideUnits: areaNum * 0.5, seedUnits: areaNum * 1 });
  };

  return (
    <SafeAreaView style={styles.container}>
      <GreenHeader title={{ english: 'Smart Budget Calculator', urdu: 'سمارٹ بجٹ کیلکولیٹر' }} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.label}>Crop Type</Text>
          <View style={[styles.dropdown, { backgroundColor: '#f0f0f0' }]}>
            <Text style={styles.dropdownText}>{crop}</Text>
          </View>
        </View>

        {renderDropdown('Soil Type', soilType, soilTypes, 'soil', setSoilType)}

        <View style={{ marginBottom: 12 }}>
          <Text style={styles.label}>Land Area (acre)</Text>
          <TextInput style={styles.input} placeholder="Enter area in acres" keyboardType="numeric" value={area} onChangeText={setArea} />
        </View>

        {/* Fertilizer Dropdown */}
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.label}>Fertilizer</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setOpen(open === 'fertilizer' ? null : 'fertilizer')}
            disabled={loadingFertilizers}
          >
            <Text style={[styles.dropdownText, loadingFertilizers && { color: '#9ca3af' }]}>
              {loadingFertilizers ? 'Loading fertilizers...' : fertilizer ? `${fertilizer} - Rs ${filteredFertilizers.find(f=>f.name===fertilizer)?.price ?? ''}` : 'Select Fertilizer'}
            </Text>
            <Feather name="chevron-down" size={18} color={loadingFertilizers ? "#9ca3af" : "#2f6f5f"} />
          </TouchableOpacity>

          {open === 'fertilizer' && !loadingFertilizers && (
            <View style={styles.dropdownList}>
              {filteredFertilizers.map(f => (
                <TouchableOpacity key={f.name} style={styles.dropdownItem} onPress={() => { setFertilizer(f.name); setOpen(null); }}>
                  <Text>{`${f.name} - Rs ${f.price}`}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Pesticide Dropdown */}
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.label}>Pesticide</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setOpen(open === 'pesticide' ? null : 'pesticide')}
            disabled={loadingPesticides}
          >
            <Text style={[styles.dropdownText, loadingPesticides && { color: '#9ca3af' }]}>
              {loadingPesticides ? 'Loading pesticides...' : pesticide ? `${pesticide} - Rs ${filteredPesticides.find(p=>p.name===pesticide)?.price ?? ''}` : 'Select Pesticide'}
            </Text>
            <Feather name="chevron-down" size={18} color={loadingPesticides ? "#9ca3af" : "#2f6f5f"} />
          </TouchableOpacity>

          {open === 'pesticide' && !loadingPesticides && (
            <View style={styles.dropdownList}>
              {filteredPesticides.map(p => (
                <TouchableOpacity key={p.name} style={styles.dropdownItem} onPress={() => { setPesticide(p.name); setOpen(null); }}>
                  <Text>{`${p.name} - Rs ${p.price}`}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Seed Dropdown */}
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.label}>Seed</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setOpen(open === 'seed' ? null : 'seed')}
            disabled={loadingSeeds}
          >
            <Text style={[styles.dropdownText, loadingSeeds && { color: '#9ca3af' }]}>
              {loadingSeeds ? 'Loading seeds...' : seed ? `${seed} - Rs ${filteredSeeds.find(s=>s.name===seed)?.price ?? ''}` : 'Select Seed'}
            </Text>
            <Feather name="chevron-down" size={18} color={loadingSeeds ? "#9ca3af" : "#2f6f5f"} />
          </TouchableOpacity>

          {open === 'seed' && !loadingSeeds && (
            <View style={styles.dropdownList}>
              {filteredSeeds.map(s => (
                <TouchableOpacity key={s.name} style={styles.dropdownItem} onPress={() => { setSeed(s.name); setOpen(null); }}>
                  <Text>{`${s.name} - Rs ${s.price}`}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Other Costs */}
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.label}>Other Expenses (Rs)</Text>
          <TextInput style={styles.input} placeholder="Any other cost" keyboardType="numeric" value={otherCosts} onChangeText={setOtherCosts} />
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
            {result.fertilizerPrice > 0 && <View style={styles.row}><Text>Fertilizer ({fertilizer}):</Text><Text style={styles.cost}>Rs {result.fertilizerCost} ({result.fertilizerPrice}/unit, {result.fertilizerUnits} bags)</Text></View>}
            {result.pesticidePrice > 0 && <View style={styles.row}><Text>Pesticide ({pesticide}):</Text><Text style={styles.cost}>Rs {result.pesticideCost} ({result.pesticidePrice}/unit, {result.pesticideUnits} units)</Text></View>}
            {result.seedPrice > 0 && <View style={styles.row}><Text>Seed ({seed}):</Text><Text style={styles.cost}>Rs {result.seedCost} ({result.seedPrice}/unit, {result.seedUnits} units)</Text></View>}
            <View style={styles.row}><Text>Other Costs:</Text><Text style={styles.cost}>Rs {parseFloat(otherCosts) || 0}</Text></View>
            <View style={styles.row}><Text>Total Cost:</Text><Text style={styles.cost}>Rs {result.totalCost}</Text></View>
            <View style={styles.row}><Text>Expected Revenue:</Text><Text style={styles.revenue}>Rs {result.expectedRevenue}</Text></View>
            <View style={styles.row}><Text>Profit:</Text><Text style={[styles.profit, { color: result.profit >= 0 ? '#065f46' : '#b91c1c' }]}>{result.profit.toFixed(0)}</Text></View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* STYLES */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6faf7' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
  label: { marginBottom: 6, fontWeight: '600', color: '#1f4d3f' },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#cfe3db' },
  dropdown: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#cfe3db', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownText: { color: '#374151' },
  dropdownList: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#cfe3db', marginTop: 4 },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  button: { backgroundColor: '#2f6f5f', padding: 16, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: '700', marginLeft: 6 },
  resultCard: { marginTop: 20, backgroundColor: '#e9f5ef', padding: 16, borderRadius: 14 },
  resultTitle: { fontWeight: '700', color: '#1f4d3f', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cost: { color: '#b91c1c', fontWeight: '600' },
  revenue: { color: '#047857', fontWeight: '600' },
  profit: { color: '#065f46', fontWeight: '700' },
});
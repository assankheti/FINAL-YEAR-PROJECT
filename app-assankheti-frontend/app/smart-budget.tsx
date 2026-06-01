import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import GreenHeader from '@/components/GreenHeader';
import { SpeechHighlight } from '@/components/SpeechHighlight';
import { useLanguage } from '@/contexts/LanguageContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE } from '@/config/env';
import { useVoiceGuidance } from '@/hooks/useVoiceGuidance';

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
  const { textLanguage } = useLanguage();
  const { enabled: voiceEnabled, activeHighlightId, startGuidedSequence, cancelGuidedSequence, speak, stop } =
    useVoiceGuidance();

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
  const [isResultSectionSpeaking, setIsResultSectionSpeaking] = useState(false);

  const [availableFertilizers, setAvailableFertilizers] = useState<ItemData[]>([]);
  const [availablePesticides, setAvailablePesticides] = useState<ItemData[]>([]);
  const [availableSeeds, setAvailableSeeds] = useState<ItemData[]>([]);
  const [loadingFertilizers, setLoadingFertilizers] = useState(true);
  const [loadingPesticides, setLoadingPesticides] = useState(true);
  const [loadingSeeds, setLoadingSeeds] = useState(true);

  const DROPDOWN_CACHE_KEY = 'smart-budget-dropdown-cache-v1';

  const saveDropdownCache = async (cacheData: {
    fertilizers: ItemData[];
    pesticides: ItemData[];
    seeds: ItemData[];
  }) => {
    try {
      await AsyncStorage.setItem(DROPDOWN_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save smart budget cache', error);
    }
  };

  const loadDropdownCache = async () => {
    try {
      const raw = await AsyncStorage.getItem(DROPDOWN_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const hasData =
        Array.isArray(parsed?.fertilizers) ||
        Array.isArray(parsed?.pesticides) ||
        Array.isArray(parsed?.seeds);
      if (!hasData) return null;

      const cachedData = {
        fertilizers: parsed.fertilizers ?? [],
        pesticides: parsed.pesticides ?? [],
        seeds: parsed.seeds ?? [],
      };
      setAvailableFertilizers(cachedData.fertilizers);
      setAvailablePesticides(cachedData.pesticides);
      setAvailableSeeds(cachedData.seeds);
      setLoadingFertilizers(false);
      setLoadingPesticides(false);
      setLoadingSeeds(false);
      return cachedData;
    } catch (error) {
      console.warn('Failed to load smart budget cache', error);
      return null;
    }
  };

  const T = useMemo(() => {
    const isUrdu = textLanguage === 'urdu';
    return {
      headerTitle: isUrdu ? 'اسمارٹ بجٹ کیلکولیٹر' : 'Smart Budget Calculator',
      headerSub: isUrdu
        ? 'فصل، مٹی، کھاد، دوا، بیج، اور رقبہ منتخب کر کے بجٹ کا اندازہ لگائیں۔'
        : 'Select crop, soil, fertilizers, pesticides, seeds, and area to estimate your farming budget.',
      introTitle: isUrdu ? 'کھیت لاگت منصوبہ' : 'Farm Cost Planner',
      introSub: isUrdu
        ? 'اپنی فصل کی تفصیل درج کریں تاکہ لاگت، آمدنی، اور منافع معلوم ہو سکے۔'
        : 'Enter your crop details to estimate cost, revenue, and profit.',
      cropType: isUrdu ? 'فصل کی قسم' : 'Crop Type',
      soilType: isUrdu ? 'مٹی کی قسم' : 'Soil Type',
      landArea: isUrdu ? 'رقبہ (ایکڑ)' : 'Land Area (acre)',
      fertilizer: isUrdu ? 'کھاد' : 'Fertilizer',
      pesticide: isUrdu ? 'دوا' : 'Pesticide',
      seed: isUrdu ? 'بیج' : 'Seed',
      otherExpenses: isUrdu ? 'دیگر اخراجات (روپے)' : 'Other Expenses (Rs)',
      calculate: isUrdu ? 'بجٹ معلوم کریں' : 'Calculate Budget',
      loadingFertilizers: isUrdu ? 'کھادیں لوڈ ہو رہی ہیں...' : 'Loading fertilizers...',
      loadingPesticides: isUrdu ? 'دوائیں لوڈ ہو رہی ہیں...' : 'Loading pesticides...',
      loadingSeeds: isUrdu ? 'بیج لوڈ ہو رہے ہیں...' : 'Loading seeds...',
      selectCrop: isUrdu ? 'فصل منتخب کریں' : 'Select Crop',
      selectSoil: isUrdu ? 'مٹی منتخب کریں' : 'Select Soil Type',
      selectFertilizer: isUrdu ? 'کھاد منتخب کریں' : 'Select Fertilizer',
      selectPesticide: isUrdu ? 'دوا منتخب کریں' : 'Select Pesticide',
      selectSeed: isUrdu ? 'بیج منتخب کریں' : 'Select Seed',
      areaPlaceholder: isUrdu ? 'ایکڑ میں رقبہ درج کریں' : 'Enter area in acres',
      otherPlaceholder: isUrdu ? 'کوئی اور لاگت' : 'Any other cost',
      currency: isUrdu ? 'روپے' : 'Rs',
      modelLabel: isUrdu ? 'ماڈل' : 'Model',
      resultTitle: isUrdu ? 'متوقع نتیجہ' : 'Estimated Result',
      fertilizerRow: isUrdu ? 'کھاد' : 'Fertilizer',
      pesticideRow: isUrdu ? 'دوا' : 'Pesticide',
      seedRow: isUrdu ? 'بیج' : 'Seed',
      otherRow: isUrdu ? 'دیگر اخراجات' : 'Other Costs',
      totalRow: isUrdu ? 'کل لاگت' : 'Total Cost',
      revenueRow: isUrdu ? 'متوقع آمدنی' : 'Expected Revenue',
      profitRow: isUrdu ? 'منافع' : 'Profit',
      perUnit: isUrdu ? 'فی یونٹ' : 'per unit',
      bagsLabel: isUrdu ? 'بوریاں' : 'bags',
      unitsLabel: isUrdu ? 'یونٹس' : 'units',
      notSelected: isUrdu ? 'منتخب نہیں کیا گیا' : 'Not selected',
      resultReady: isUrdu ? 'نتیجہ تیار ہے' : 'Result is ready',
      noResult: isUrdu ? 'ابھی کوئی نتیجہ موجود نہیں' : 'No result yet',
      cropValue: {
        Wheat: isUrdu ? 'گندم' : 'Wheat',
        Rice: isUrdu ? 'چاول' : 'Rice',
        Potato: isUrdu ? 'آلو' : 'Potato',
        'Select Crop': isUrdu ? 'فصل منتخب کریں' : 'Select Crop',
      } as Record<string, string>,
      soilValue: {
        'Loamy Soil': isUrdu ? 'گلی دار مٹی' : 'Loamy Soil',
        'Clay Soil': isUrdu ? 'چکنی مٹی' : 'Clay Soil',
        'Sandy Soil': isUrdu ? 'ریتلی مٹی' : 'Sandy Soil',
        'Silty Soil': isUrdu ? 'دوامی مٹی' : 'Silty Soil',
        'Alluvial Soil': isUrdu ? 'زرخیز دریائی مٹی' : 'Alluvial Soil',
        'Saline Soil': isUrdu ? 'نمکیاتی مٹی' : 'Saline Soil',
      } as Record<string, string>,
    };
  }, [textLanguage]);

  const formatMoney = useCallback(
    (value: number) =>
      new Intl.NumberFormat(textLanguage === 'urdu' ? 'ur-PK' : 'en-PK', { maximumFractionDigits: 0 }).format(
        Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0
      ),
    [textLanguage]
  );

  const formatNumber = useCallback(
    (value: number) =>
      new Intl.NumberFormat(textLanguage === 'urdu' ? 'ur-PK' : 'en-PK', { maximumFractionDigits: 0 }).format(
        Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0
      ),
    [textLanguage]
  );

  const currencyText = textLanguage === 'urdu' ? 'روپے' : 'Rs';
  const isUrdu = textLanguage === 'urdu';
  const translateValue = (value: string, map: Record<string, string>) => map[value] ?? value;

  const spokenSelectedCrop = translateValue(crop, T.cropValue);
  const spokenSelectedSoil = translateValue(soilType, T.soilValue);

  const cropFieldHighlightId = 'budget.crop';
  const soilFieldHighlightId = 'budget.soil';
  const areaFieldHighlightId = 'budget.area';
  const fertilizerFieldHighlightId = 'budget.fertilizer';
  const pesticideFieldHighlightId = 'budget.pesticide';
  const seedFieldHighlightId = 'budget.seed';
  const otherFieldHighlightId = 'budget.other';
  const calculateHighlightId = 'budget.calculate';
  const resultSequenceTokenRef = useRef(0);

  // Update crop from params
  useEffect(() => {
    if (params.selectedCrop) {
      const capCrop = (params.selectedCrop as string).charAt(0).toUpperCase() + (params.selectedCrop as string).slice(1);
      if (cropOptions[capCrop]) {
        setCrop(capCrop);
        setFertilizer('Select Fertilizer');
        setPesticide('Select Pesticide');
        setSeed('Select Seed');
        setResult(null);
      }
    }
  }, [params.selectedCrop]);

  // Fetch data from APIs and cache results for offline dropdown use
  useEffect(() => {
    let mounted = true;
    let cachedDropdowns = {
      fertilizers: [] as ItemData[],
      pesticides: [] as ItemData[],
      seeds: [] as ItemData[],
    };
    const lastConnectionStatus = { current: false };

    const fetchData = async () => {
      if (!mounted) return;

      setLoadingFertilizers(true);
      setLoadingPesticides(true);
      setLoadingSeeds(true);

      const newFertilizers: ItemData[] = [];
      const newPesticides: ItemData[] = [];
      const newSeeds: ItemData[] = [];
      let fetchedAny = false;

      try {
        const fertRes = await fetch(`${API_BASE}/api/v1/fertilizer/all?limit=100`);
        const fertData = await fertRes.json();
        if (fertData.status === 'success' && Array.isArray(fertData.data)) {
          newFertilizers.push(...fertData.data);
          fetchedAny = true;
        }
      } catch (error) {
        console.warn('Failed to fetch fertilizers', error);
      }

      try {
        const pestRes = await fetch(`${API_BASE}/api/v1/pesticide/all?limit=100`);
        const pestData = await pestRes.json();
        if (pestData.status === 'success' && Array.isArray(pestData.data)) {
          newPesticides.push(...pestData.data);
          fetchedAny = true;
        }
      } catch (error) {
        console.warn('Failed to fetch pesticides', error);
      }

      try {
        const seedRes = await fetch(`${API_BASE}/api/v1/seed/all?limit=100`);
        const seedData = await seedRes.json();
        if (seedData.status === 'success' && Array.isArray(seedData.data)) {
          newSeeds.push(...seedData.data);
          fetchedAny = true;
        }
      } catch (error) {
        console.warn('Failed to fetch seeds', error);
      }

      if (!mounted) return;

      if (newFertilizers.length) setAvailableFertilizers(newFertilizers);
      if (newPesticides.length) setAvailablePesticides(newPesticides);
      if (newSeeds.length) setAvailableSeeds(newSeeds);

      setLoadingFertilizers(false);
      setLoadingPesticides(false);
      setLoadingSeeds(false);

      if (fetchedAny) {
        await saveDropdownCache({
          fertilizers: newFertilizers.length ? newFertilizers : cachedDropdowns.fertilizers,
          pesticides: newPesticides.length ? newPesticides : cachedDropdowns.pesticides,
          seeds: newSeeds.length ? newSeeds : cachedDropdowns.seeds,
        });
      }
    };

    const initialize = async () => {
      const loadedCache = await loadDropdownCache();
      if (loadedCache) {
        cachedDropdowns = loadedCache;
      }

      try {
        const state = await NetInfo.fetch();
        if (!mounted) return;

        const connected = state.isConnected ?? false;
        lastConnectionStatus.current = connected;

        if (connected) {
          await fetchData();
        } else if (!loadedCache) {
          setLoadingFertilizers(false);
          setLoadingPesticides(false);
          setLoadingSeeds(false);
        }
      } catch (error) {
        console.warn('Failed to initialize network state for smart budget', error);
        if (!mounted) return;

        if (!loadedCache) {
          setLoadingFertilizers(false);
          setLoadingPesticides(false);
          setLoadingSeeds(false);
        }
      }
    };

    initialize();

    const subscription = NetInfo.addEventListener(async (state) => {
      if (!mounted) return;
      const connected = state.isConnected ?? false;
      if (connected && lastConnectionStatus.current === false) {
        await fetchData();
      }
      lastConnectionStatus.current = connected;
    });

    return () => {
      mounted = false;
      subscription();
    };
  }, []);

  const fieldGuidedSteps = useMemo(
    () => [
      {
        id: 'budget.header',
        text:
          textLanguage === 'urdu'
            ? 'اسمارٹ بجٹ کیلکولیٹر۔ فصل، مٹی، کھاد، دوا، بیج، اور رقبہ منتخب کر کے بجٹ کا اندازہ لگائیں۔'
            : 'Smart budget calculator. Select crop, soil, fertilizers, pesticides, seeds, and area to estimate your budget.',
      },
      {
        id: 'budget.intro',
        text:
          textLanguage === 'urdu'
            ? 'کھیت لاگت منصوبہ۔ اپنی فصل کی تفصیل درج کریں تاکہ لاگت، آمدنی، اور منافع معلوم ہو سکے۔'
            : 'Farm cost planner. Enter your crop details to estimate cost, revenue, and profit.',
      },
      {
        id: cropFieldHighlightId,
        text:
          textLanguage === 'urdu'
            ? `فصل کی قسم۔ ${spokenSelectedCrop}۔`
            : `Crop type. ${spokenSelectedCrop}.`,
      },
      {
        id: soilFieldHighlightId,
        text:
          textLanguage === 'urdu'
            ? `مٹی کی قسم۔ ${spokenSelectedSoil}۔`
            : `Soil type. ${spokenSelectedSoil}.`,
      },
      {
        id: areaFieldHighlightId,
        text:
          textLanguage === 'urdu'
            ? 'رقبہ (ایکڑ)۔ ایکڑ میں رقبہ درج کریں۔'
            : 'Land area in acres. Enter the area in acres.',
      },
      {
        id: fertilizerFieldHighlightId,
        text:
          textLanguage === 'urdu'
            ? `کھاد۔ ${fertilizer.toLowerCase().startsWith('select ') ? T.selectFertilizer : fertilizer}.`
            : `Fertilizer. ${fertilizer.toLowerCase().startsWith('select ') ? T.selectFertilizer : fertilizer}.`,
      },
      {
        id: pesticideFieldHighlightId,
        text:
          textLanguage === 'urdu'
            ? `دوا۔ ${pesticide.toLowerCase().startsWith('select ') ? T.selectPesticide : pesticide}.`
            : `Pesticide. ${pesticide.toLowerCase().startsWith('select ') ? T.selectPesticide : pesticide}.`,
      },
      {
        id: seedFieldHighlightId,
        text:
          textLanguage === 'urdu'
            ? `بیج۔ ${seed.toLowerCase().startsWith('select ') ? T.selectSeed : seed}.`
            : `Seed. ${seed.toLowerCase().startsWith('select ') ? T.selectSeed : seed}.`,
      },
      {
        id: otherFieldHighlightId,
        text:
          textLanguage === 'urdu'
            ? 'دیگر اخراجات۔ کوئی اور لاگت درج کریں۔'
            : 'Other expenses. Enter any other cost.',
      },
      {
        id: calculateHighlightId,
        text: textLanguage === 'urdu' ? 'بجٹ معلوم کریں بٹن۔ نتیجہ نکالنے کے لیے دبائیں۔' : 'Calculate Budget button. Press to generate the result.',
      },
    ],
    [
      T.selectFertilizer,
      T.selectPesticide,
      T.selectSeed,
      areaFieldHighlightId,
      calculateHighlightId,
      cropFieldHighlightId,
      fertilizer,
      fertilizerFieldHighlightId,
      otherFieldHighlightId,
      pesticide,
      pesticideFieldHighlightId,
      seed,
      seedFieldHighlightId,
      soilFieldHighlightId,
      spokenSelectedCrop,
      spokenSelectedSoil,
      textLanguage,
    ]
  );
  const fieldGuidedStepsRef = useRef(fieldGuidedSteps);

  useEffect(() => {
    fieldGuidedStepsRef.current = fieldGuidedSteps;
  }, [fieldGuidedSteps]);

  const resultGuidedSteps = useMemo(() => {
    if (!result) return [];
    const steps = [
      {
        id: 'budget.result.card',
        text:
          textLanguage === 'urdu'
            ? 'متوقع نتیجہ۔ لاگت، آمدنی، اور منافع دیکھیں۔'
            : 'Estimated result. Review cost, revenue, and profit.',
      },
    ];

    if (result.fertilizerPrice > 0) {
      steps.push({
        id: 'budget.result.fertilizer',
        text:
          textLanguage === 'urdu'
            ? `${T.fertilizerRow}۔ ${result.fertilizerName}۔ ${currencyText} ${formatMoney(result.fertilizerCost)}۔`
            : `${T.fertilizerRow}. ${result.fertilizerName}. ${currencyText} ${formatMoney(result.fertilizerCost)}.`,
      });
    }

    if (result.pesticidePrice > 0) {
      steps.push({
        id: 'budget.result.pesticide',
        text:
          textLanguage === 'urdu'
            ? `${T.pesticideRow}۔ ${result.pesticideName}۔ ${currencyText} ${formatMoney(result.pesticideCost)}۔`
            : `${T.pesticideRow}. ${result.pesticideName}. ${currencyText} ${formatMoney(result.pesticideCost)}.`,
      });
    }

    if (result.seedPrice > 0) {
      steps.push({
        id: 'budget.result.seed',
        text:
          textLanguage === 'urdu'
            ? `${T.seedRow}۔ ${result.seedName}۔ ${currencyText} ${formatMoney(result.seedCost)}۔`
            : `${T.seedRow}. ${result.seedName}. ${currencyText} ${formatMoney(result.seedCost)}.`,
      });
    }

    steps.push(
      {
        id: 'budget.result.other',
        text:
          textLanguage === 'urdu'
            ? `${T.otherRow}۔ ${currencyText} ${formatMoney(result.otherCostsValue || 0)}۔`
            : `${T.otherRow}. ${currencyText} ${formatMoney(result.otherCostsValue || 0)}.`,
      },
      {
        id: 'budget.result.total',
        text:
          textLanguage === 'urdu'
            ? `${T.totalRow}۔ ${currencyText} ${formatMoney(result.totalCost)}۔`
            : `${T.totalRow}. ${currencyText} ${formatMoney(result.totalCost)}.`,
      },
      {
        id: 'budget.result.revenue',
        text:
          textLanguage === 'urdu'
            ? `${T.revenueRow}۔ ${currencyText} ${formatMoney(result.expectedRevenue)}۔`
            : `${T.revenueRow}. ${currencyText} ${formatMoney(result.expectedRevenue)}.`,
      },
      {
        id: 'budget.result.profit',
        text:
          textLanguage === 'urdu'
            ? `${T.profitRow}۔ ${currencyText} ${formatMoney(result.profit)}۔`
            : `${T.profitRow}. ${currencyText} ${formatMoney(result.profit)}.`,
      }
    );

    return steps;
  }, [T, currencyText, formatMoney, result, textLanguage]);

  useFocusEffect(
    React.useCallback(() => {
      if (voiceEnabled) {
        cancelGuidedSequence();
        startGuidedSequence(fieldGuidedStepsRef.current);
      }
      return () => {
        cancelGuidedSequence();
        stop();
      };
    }, [cancelGuidedSequence, startGuidedSequence, stop, voiceEnabled])
  );

  useEffect(() => {
    if (!result || !voiceEnabled || !resultGuidedSteps.length) {
      setIsResultSectionSpeaking(false);
      return undefined;
    }

    const sequenceToken = ++resultSequenceTokenRef.current;
    let cancelled = false;

    setIsResultSectionSpeaking(true);
    console.info('RESULT_SEQUENCE_STARTED', {
      sequenceToken,
      items: resultGuidedSteps.map((step) => step.id),
    });

    (async () => {
      let completed = false;
      try {
        cancelGuidedSequence();
        for (const step of resultGuidedSteps) {
          if (cancelled || sequenceToken !== resultSequenceTokenRef.current) break;
          await speak(step.text, step.id);
          if (cancelled || sequenceToken !== resultSequenceTokenRef.current) break;
          console.info('RESULT_ITEM_SPOKEN', { sequenceToken, itemId: step.id });
        }

        completed = !cancelled && sequenceToken === resultSequenceTokenRef.current;
        if (completed) {
          console.info('RESULT_SEQUENCE_COMPLETED', {
            sequenceToken,
            items: resultGuidedSteps.map((step) => step.id),
          });
        }
      } finally {
        if (!cancelled && sequenceToken === resultSequenceTokenRef.current) {
          setIsResultSectionSpeaking(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      resultSequenceTokenRef.current += 1;
      setIsResultSectionSpeaking(false);
      stop();
    };
  }, [cancelGuidedSequence, result, resultGuidedSteps, speak, stop, voiceEnabled]);

  // Helper for dropdowns
  const renderDropdown = (
    label: string,
    value: string,
    options: { value: string; label: string }[],
    keyName: string,
    setValue: (v: string) => void,
    highlightId: string,
    voiceLabel: string
  ) => (
    <SpeechHighlight
      active={activeHighlightId === highlightId}
      style={styles.fieldWrap}
      highlightStyle={styles.fieldHighlight}
    >
      <View style={{ marginBottom: 12 }}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setOpen(open === keyName ? null : keyName)}
          accessibilityRole="button"
          accessibilityLabel={voiceLabel}
        >
          <Text style={styles.dropdownText}>{value}</Text>
          <Feather name="chevron-down" size={18} color="#2f6f5f" />
        </TouchableOpacity>

        {open === keyName && (
          <View style={styles.dropdownList}>
            {options.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={styles.dropdownItem}
                onPress={() => {
                  setValue(item.value);
                  setOpen(null);
                  void speak(textLanguage === 'urdu' ? `${voiceLabel}۔ ${item.label}` : `${voiceLabel}. ${item.label}`, highlightId);
                }}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <Text>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </SpeechHighlight>
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

  const cropValueDisplay = translateValue(crop, T.cropValue);
  const soilValueDisplay = soilType.toLowerCase().startsWith('select ') ? T.selectSoil : translateValue(soilType, T.soilValue);
  const selectedFertilizerPrice = filteredFertilizers.find((f) => f.name === fertilizer)?.price ?? 0;
  const selectedPesticidePrice = filteredPesticides.find((p) => p.name === pesticide)?.price ?? 0;
  const selectedSeedPrice = filteredSeeds.find((s) => s.name === seed)?.price ?? 0;
  const fertilizerDisplayValue = loadingFertilizers
    ? T.loadingFertilizers
    : fertilizer.toLowerCase().startsWith('select ')
      ? T.selectFertilizer
      : `${fertilizer} - ${currencyText} ${selectedFertilizerPrice}`;
  const pesticideDisplayValue = loadingPesticides
    ? T.loadingPesticides
    : pesticide.toLowerCase().startsWith('select ')
      ? T.selectPesticide
      : `${pesticide} - ${currencyText} ${selectedPesticidePrice}`;
  const seedDisplayValue = loadingSeeds
    ? T.loadingSeeds
    : seed.toLowerCase().startsWith('select ')
      ? T.selectSeed
      : `${seed} - ${currencyText} ${selectedSeedPrice}`;

  const calculateBudget = () => {
    const areaNum = parseFloat(area) || 0;
    const otherNum = parseFloat(otherCosts) || 0;
    let soilFactor = 1;
    if (soilType === 'Saline Soil') soilFactor = 1.2;
    if (soilType === 'Loamy Soil') soilFactor = 0.9;

    const fertilizerSelected = !fertilizer.toLowerCase().startsWith('select ') ? fertilizer : '';
    const pesticideSelected = !pesticide.toLowerCase().startsWith('select ') ? pesticide : '';
    const seedSelected = !seed.toLowerCase().startsWith('select ') ? seed : '';

    const fertilizerPrice = fertilizerSelected
      ? filteredFertilizers.find((f) => f.name === fertilizerSelected)?.price || 0
      : 0;
    const pesticidePrice = pesticideSelected
      ? filteredPesticides.find((p) => p.name === pesticideSelected)?.price || 0
      : 0;
    const seedPrice = seedSelected
      ? filteredSeeds.find((s) => s.name === seedSelected)?.price || 0
      : 0;

    const fertilizerCost = areaNum * fertilizerPrice * 1;
    const pesticideCost = areaNum * pesticidePrice * 0.5;
    const seedCost = areaNum * seedPrice * 1;
    const baseCost = areaNum * 3500 * soilFactor;
    const totalCost = baseCost + fertilizerCost + pesticideCost + seedCost + otherNum;

    const revenueMap: Record<string, number> = { Wheat: 150000, Rice: 180000, Potato: 300000 };
    const expectedRevenue = areaNum * (revenueMap[crop] || 120000);
    const profit = expectedRevenue - totalCost;

    setResult({
      totalCost,
      expectedRevenue,
      profit,
      otherCostsValue: otherNum,
      fertilizerCost,
      pesticideCost,
      seedCost,
      fertilizerPrice,
      pesticidePrice,
      seedPrice,
      fertilizerUnits: areaNum * 1,
      pesticideUnits: areaNum * 0.5,
      seedUnits: areaNum * 1,
      fertilizerName: fertilizerSelected || 'Not selected',
      pesticideName: pesticideSelected || 'Not selected',
      seedName: seedSelected || 'Not selected',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <GreenHeader
        title={T.headerTitle}
        titleLines={2}
        onBack={() => router.back()}
      >
        <SpeechHighlight
          active={activeHighlightId === 'budget.header'}
          style={styles.headerSpeechWrap}
          highlightStyle={styles.headerSpeechHighlight}
        >
          <View style={styles.headerSpeechCard}>
            <Text style={styles.headerSpeechTitle}>{T.headerTitle}</Text>
            <Text style={styles.headerSpeechSub}>{T.headerSub}</Text>
          </View>
        </SpeechHighlight>
      </GreenHeader>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <SpeechHighlight
          active={activeHighlightId === 'budget.intro'}
          style={styles.introWrap}
          highlightStyle={styles.fieldHighlight}
        >
          <View style={styles.introCard}>
            <Text style={styles.introTitle}>{T.introTitle}</Text>
            <Text style={styles.introSub}>{T.introSub}</Text>
          </View>
        </SpeechHighlight>

        <View style={styles.formCard}>
          <SpeechHighlight
            active={activeHighlightId === cropFieldHighlightId}
            style={styles.fieldWrap}
            highlightStyle={styles.fieldHighlight}
          >
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.label}>{T.cropType}</Text>
              <View style={[styles.dropdown, { backgroundColor: '#f0f0f0' }]}>
                <Text style={styles.dropdownText}>{cropValueDisplay}</Text>
              </View>
            </View>
          </SpeechHighlight>

          {renderDropdown(
            T.soilType,
            soilValueDisplay,
            soilTypes.map((item) => ({ value: item, label: translateValue(item, T.soilValue) })),
            'soil',
            setSoilType,
            soilFieldHighlightId,
            T.soilType
          )}

          <SpeechHighlight
            active={activeHighlightId === areaFieldHighlightId}
            style={styles.fieldWrap}
            highlightStyle={styles.fieldHighlight}
          >
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.label}>{T.landArea}</Text>
              <TextInput
                style={[styles.input, isUrdu ? styles.inputUrdu : styles.inputEnglish]}
                placeholder={T.areaPlaceholder}
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={area}
                onChangeText={setArea}
                onFocus={() => void speak(textLanguage === 'urdu' ? `${T.landArea}۔ ${T.areaPlaceholder}` : `${T.landArea}. ${T.areaPlaceholder}`, areaFieldHighlightId)}
              />
            </View>
          </SpeechHighlight>

          {renderDropdown(
            T.fertilizer,
            fertilizerDisplayValue,
            filteredFertilizers.map((item) => ({
              value: item.name,
              label: `${item.name} - ${currencyText} ${formatMoney(item.price)}`,
            })),
            'fertilizer',
            setFertilizer,
            fertilizerFieldHighlightId,
            T.fertilizer
          )}

          {renderDropdown(
            T.pesticide,
            pesticideDisplayValue,
            filteredPesticides.map((item) => ({
              value: item.name,
              label: `${item.name} - ${currencyText} ${formatMoney(item.price)}`,
            })),
            'pesticide',
            setPesticide,
            pesticideFieldHighlightId,
            T.pesticide
          )}

          {renderDropdown(
            T.seed,
            seedDisplayValue,
            filteredSeeds.map((item) => ({
              value: item.name,
              label: `${item.name} - ${currencyText} ${formatMoney(item.price)}`,
            })),
            'seed',
            setSeed,
            seedFieldHighlightId,
            T.seed
          )}

          <SpeechHighlight
            active={activeHighlightId === otherFieldHighlightId}
            style={styles.fieldWrap}
            highlightStyle={styles.fieldHighlight}
          >
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.label}>{T.otherExpenses}</Text>
              <TextInput
                style={[styles.input, isUrdu ? styles.inputUrdu : styles.inputEnglish]}
                placeholder={T.otherPlaceholder}
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={otherCosts}
                onChangeText={setOtherCosts}
                onFocus={() => void speak(textLanguage === 'urdu' ? `${T.otherExpenses}۔ ${T.otherPlaceholder}` : `${T.otherExpenses}. ${T.otherPlaceholder}`, otherFieldHighlightId)}
              />
            </View>
          </SpeechHighlight>

          <SpeechHighlight
            active={activeHighlightId === calculateHighlightId}
            style={styles.fieldWrap}
            highlightStyle={styles.fieldHighlight}
          >
            <TouchableOpacity
              style={styles.button}
              onPress={calculateBudget}
              accessibilityRole="button"
              accessibilityLabel={T.calculate}
            >
              <Feather name="command" size={18} color="#fff" />
              <Text style={styles.buttonText}> {T.calculate}</Text>
            </TouchableOpacity>
          </SpeechHighlight>
        </View>

        {result && (
          <SpeechHighlight
            active={isResultSectionSpeaking}
            style={styles.resultWrap}
            highlightStyle={styles.resultHighlight}
          >
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>📊 {T.resultTitle}</Text>
              {result.fertilizerPrice > 0 && (
                <SpeechHighlight
                  active={activeHighlightId === 'budget.result.fertilizer'}
                  style={styles.resultRowWrap}
                  highlightStyle={styles.resultRowHighlight}
                >
                  <View style={styles.breakdownItem}>
                    <Text style={styles.rowLabel}>
                      {T.fertilizerRow} ({result.fertilizerName}):
                    </Text>
                    <View style={styles.breakdownRight}>
                      <Text style={styles.rowValue}>
                        {currencyText} {formatMoney(result.fertilizerCost)}
                      </Text>
                      <Text style={styles.breakdownMeta}>
                        {formatMoney(result.fertilizerPrice)} {currencyText} {T.perUnit} • {formatNumber(result.fertilizerUnits)} {T.bagsLabel}
                      </Text>
                    </View>
                  </View>
                </SpeechHighlight>
              )}
              {result.pesticidePrice > 0 && (
                <SpeechHighlight
                  active={activeHighlightId === 'budget.result.pesticide'}
                  style={styles.resultRowWrap}
                  highlightStyle={styles.resultRowHighlight}
                >
                  <View style={styles.breakdownItem}>
                    <Text style={styles.rowLabel}>
                      {T.pesticideRow} ({result.pesticideName}):
                    </Text>
                    <View style={styles.breakdownRight}>
                      <Text style={styles.rowValue}>
                        {currencyText} {formatMoney(result.pesticideCost)}
                      </Text>
                      <Text style={styles.breakdownMeta}>
                        {formatMoney(result.pesticidePrice)} {currencyText} {T.perUnit} • {formatNumber(result.pesticideUnits)} {T.unitsLabel}
                      </Text>
                    </View>
                  </View>
                </SpeechHighlight>
              )}
              {result.seedPrice > 0 && (
                <SpeechHighlight
                  active={activeHighlightId === 'budget.result.seed'}
                  style={styles.resultRowWrap}
                  highlightStyle={styles.resultRowHighlight}
                >
                  <View style={styles.breakdownItem}>
                    <Text style={styles.rowLabel}>
                      {T.seedRow} ({result.seedName}):
                    </Text>
                    <View style={styles.breakdownRight}>
                      <Text style={styles.rowValue}>
                        {currencyText} {formatMoney(result.seedCost)}
                      </Text>
                      <Text style={styles.breakdownMeta}>
                        {formatMoney(result.seedPrice)} {currencyText} {T.perUnit} • {formatNumber(result.seedUnits)} {T.unitsLabel}
                      </Text>
                    </View>
                  </View>
                </SpeechHighlight>
              )}
              <View style={styles.summaryDivider} />
              <SpeechHighlight
                active={activeHighlightId === 'budget.result.other'}
                style={styles.resultRowWrap}
                highlightStyle={styles.resultRowHighlight}
              >
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>{T.otherRow}:</Text>
                  <Text style={styles.rowValue}>
                    {currencyText} {formatMoney(result.otherCostsValue || 0)}
                  </Text>
                </View>
              </SpeechHighlight>
              <SpeechHighlight
                active={activeHighlightId === 'budget.result.total'}
                style={styles.resultRowWrap}
                highlightStyle={styles.resultRowHighlight}
              >
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>{T.totalRow}:</Text>
                  <Text style={styles.cost}>
                    {currencyText} {formatMoney(result.totalCost)}
                  </Text>
                </View>
              </SpeechHighlight>
              <SpeechHighlight
                active={activeHighlightId === 'budget.result.revenue'}
                style={styles.resultRowWrap}
                highlightStyle={styles.resultRowHighlight}
              >
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>{T.revenueRow}:</Text>
                  <Text style={styles.revenue}>
                    {currencyText} {formatMoney(result.expectedRevenue)}
                  </Text>
                </View>
              </SpeechHighlight>
              <SpeechHighlight
                active={activeHighlightId === 'budget.result.profit'}
                style={styles.resultRowWrap}
                highlightStyle={styles.resultRowHighlight}
              >
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>{T.profitRow}:</Text>
                  <Text style={[styles.profit, { color: result.profit >= 0 ? '#065f46' : '#b91c1c' }]}>
                    {currencyText} {formatMoney(result.profit)}
                  </Text>
                </View>
              </SpeechHighlight>
            </View>
          </SpeechHighlight>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* STYLES */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6faf7' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  introCard: {
    backgroundColor: '#e9f8f2',
    borderWidth: 1,
    borderColor: '#d2eee4',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  introTitle: { color: '#0f5d4c', fontWeight: '800', fontSize: 16 },
  introSub: { color: '#4b7c6d', marginTop: 4, fontSize: 12.5 },
  introWrap: { marginBottom: 0 },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dceee6',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  label: { marginBottom: 7, fontWeight: '700', color: '#1f4d3f', fontSize: 14.5 },
  input: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: '#cfe3db', fontSize: 16, color: '#1f2937' },
  inputEnglish: { textAlign: 'left', writingDirection: 'ltr' },
  inputUrdu: { textAlign: 'right', writingDirection: 'rtl' },
  dropdown: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: '#cfe3db', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownText: { color: '#374151', fontSize: 16 },
  dropdownList: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#cfe3db', marginTop: 4, overflow: 'hidden' },
  dropdownItem: { paddingVertical: 13, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  button: { backgroundColor: '#2f6f5f', paddingVertical: 15, paddingHorizontal: 16, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontWeight: '800', marginStart: 6, fontSize: 15.5 },
  fieldWrap: { marginBottom: 0 },
  fieldHighlight: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#10b981',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
  },
  headerSpeechWrap: { marginTop: 10 },
  headerSpeechHighlight: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.95)',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
  },
  headerSpeechCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  headerSpeechTitle: { color: '#ffffff', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  headerSpeechSub: { color: 'rgba(255,255,255,0.92)', marginTop: 4, fontSize: 12.5, textAlign: 'center', lineHeight: 18 },
  resultWrap: { marginTop: 16 },
  resultHighlight: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#22c55e',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
  },
  resultRowWrap: { marginBottom: 8 },
  resultRowHighlight: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#10b981',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
  },
  resultCard: { backgroundColor: '#ecf9f2', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#d5efe5' },
  resultTitle: { fontWeight: '800', color: '#1f4d3f', marginBottom: 10, fontSize: 15.5 },
  breakdownItem: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#d9ebe4',
  },
  breakdownRight: { marginTop: 4, alignItems: 'flex-end' },
  breakdownMeta: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  summaryDivider: {
    marginTop: 4,
    marginBottom: 10,
    height: 1,
    backgroundColor: '#d1e7dd',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 8, alignItems: 'center' },
  rowLabel: { flex: 1, color: '#374151', fontWeight: '600' },
  rowValue: { textAlign: 'right', color: '#1f2937', fontWeight: '700', fontSize: 15 },
  cost: { color: '#b91c1c', fontWeight: '700' },
  revenue: { color: '#047857', fontWeight: '700' },
  profit: { color: '#065f46', fontWeight: '800', fontSize: 17 },
});

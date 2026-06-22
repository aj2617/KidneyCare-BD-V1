import { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Activity, Mail, Lock, User, MapPin, ArrowRight, Loader2,
  Phone, Eye, EyeOff, ShieldCheck, Stethoscope, Users, Heart,
  Building2, Calendar, FileText, Home,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DISTRICTS_BY_DIVISION: Record<string, string[]> = {
  Dhaka: ['Dhaka', 'Faridpur', 'Gazipur', 'Gopalganj', 'Kishoreganj', 'Madaripur', 'Manikganj', 'Munshiganj', 'Narayanganj', 'Narsingdi', 'Rajbari', 'Shariatpur', 'Tangail'],
  Chittagong: ['Bandarban', 'Brahmanbaria', 'Chandpur', 'Chittagong', 'Comilla', "Cox's Bazar", 'Feni', 'Khagrachari', 'Lakshmipur', 'Noakhali', 'Rangamati'],
  Rajshahi: ['Bogra', 'Joypurhat', 'Naogaon', 'Natore', 'Chapainawabganj', 'Pabna', 'Rajshahi', 'Sirajganj'],
  Khulna: ['Bagerhat', 'Chuadanga', 'Jessore', 'Jhenaidah', 'Khulna', 'Kushtia', 'Magura', 'Meherpur', 'Narail', 'Satkhira'],
  Barisal: ['Barguna', 'Barisal', 'Bhola', 'Jhalokati', 'Patuakhali', 'Pirojpur'],
  Sylhet: ['Habiganj', 'Moulvibazar', 'Sunamganj', 'Sylhet'],
  Rangpur: ['Dinajpur', 'Gaibandha', 'Kurigram', 'Lalmonirhat', 'Nilphamari', 'Panchagarh', 'Rangpur', 'Thakurgaon'],
  Mymensingh: ['Jamalpur', 'Mymensingh', 'Netrokona', 'Sherpur'],
};
const DIVISIONS = Object.keys(DISTRICTS_BY_DIVISION);

const ROLES = [
  {
    value: 'patient',
    label: 'Patient',
    labelBn: 'রোগী',
    desc: 'Track your CKD health journey',
    descBn: 'আপনার সিকেডি স্বাস্থ্য যাত্রা ট্র্যাক করুন',
    icon: Heart,
    color: '#1A6B8A',
  },
  {
    value: 'doctor',
    label: 'Doctor',
    labelBn: 'ডাক্তার',
    desc: 'Manage and monitor patients',
    descBn: 'রোগীদের পরিচালনা ও পর্যবেক্ষণ করুন',
    icon: Stethoscope,
    color: '#1A6B8A',
  },
  {
    value: 'chw',
    label: 'Community Health Worker',
    labelBn: 'কমিউনিটি স্বাস্থ্যকর্মী',
    desc: 'Register and visit patients in rural areas',
    descBn: 'গ্রামাঞ্চলে রোগীদের নিবন্ধন ও পরিদর্শন করুন',
    icon: Users,
    color: '#1A6B8A',
  },
];

const SPECIALTIES = [
  { value: 'nephrologist', label: 'Nephrologist', labelBn: 'নেফ্রোলজিস্ট' },
  { value: 'general', label: 'General Physician', labelBn: 'সাধারণ চিকিৎসক' },
  { value: 'diabetologist', label: 'Diabetologist', labelBn: 'ডায়াবেটোলজিস্ট' },
  { value: 'other', label: 'Other', labelBn: 'অন্যান্য' },
];

const T = {
  en: {
    heading: { patient: 'Create a Patient Account', doctor: 'Create a Doctor Account', chw: 'Create a CHW Account' },
    subheading: { patient: 'Start tracking your kidney health today', doctor: 'Join the clinical network', chw: 'Register to support rural communities' },
    alreadyHave: 'Already have an account?',
    signIn: 'Sign in',
    name: 'Full Name', namePh: 'Enter your full name',
    nameBn: 'Name in Bengali (optional)', nameBnPh: 'আপনার বাংলা নাম',
    email: 'Email Address', emailPh: 'name@example.com',
    phone: 'Phone Number', phonePh: '01XXXXXXXXX',
    password: 'Password', passwordPh: '••••••••',
    confirmPassword: 'Confirm Password', confirmPasswordPh: '••••••••',
    division: 'Division', divisionPh: 'Select Division',
    district: 'District', districtPh: 'Select District', districtDisabled: 'Select Division First',
    createAccount: 'Create Account',
    strength: { weak: 'Weak', medium: 'Medium', strong: 'Strong' },
    area: 'Living Area',
    urban: 'Urban', rural: 'Rural',
    diabetes: 'Do you have diabetes?',
    hypertension: 'Do you have hypertension?',
    familyHistory: 'Family history of kidney disease?',
    age: 'Age', agePh: 'Your age (years)',
    sex: 'Sex', male: 'Male', female: 'Female',
    weight: 'Weight (kg)', weightPh: '30–300 kg',
    yes: 'Yes', no: 'No', dontKnow: "Don't Know",
    bmdcNumber: 'BMDC Registration Number', bmdcPh: 'e.g. BMDC-12345',
    specialty: 'Specialty', specialtyPh: 'Select specialty',
    hospital: 'Hospital / Clinic Name', hospitalPh: 'Name of your hospital or clinic',
    experience: 'Years of Experience', experiencePh: 'e.g. 5',
    nationalId: 'National ID or CHW ID', nationalIdPh: 'Your NID or CHW ID number',
    organization: 'Organization / NGO (optional)', organizationPh: 'Name of your organization',
    workingArea: 'Assigned Working Area', workingAreaPh: 'e.g. Rangpur Sadar Union',
    encrypted: 'Your data is encrypted and secure',
    required: 'required',
    errors: {
      nameRequired: 'Full name is required',
      emailRequired: 'Valid email is required',
      phoneInvalid: 'Phone must be in 01XXXXXXXXX format',
      passwordLength: 'Password must be at least 8 characters',
      passwordStrength: 'Password must contain a letter and a number',
      passwordMatch: 'Passwords do not match',
      divisionRequired: 'Please select a division',
      districtRequired: 'Please select a district',
      ageRequired: 'Age is required (1–120)',
      weightRequired: 'Weight is required (30–300 kg)',
      sexRequired: 'Please select your sex',
      bmdcRequired: 'BMDC number is required',
      specialtyRequired: 'Please select a specialty',
      hospitalRequired: 'Hospital name is required',
      nationalIdRequired: 'National ID or CHW ID is required',
      workingAreaRequired: 'Working area is required',
    },
  },
  bn: {
    heading: { patient: 'রোগী অ্যাকাউন্ট তৈরি করুন', doctor: 'ডাক্তার অ্যাকাউন্ট তৈরি করুন', chw: 'স্বাস্থ্যকর্মী অ্যাকাউন্ট তৈরি করুন' },
    subheading: { patient: 'আজই আপনার কিডনি স্বাস্থ্য ট্র্যাক করা শুরু করুন', doctor: 'ক্লিনিকাল নেটওয়ার্কে যোগ দিন', chw: 'গ্রামীণ সম্প্রদায় সহায়তায় নিবন্ধন করুন' },
    alreadyHave: 'আগে থেকে অ্যাকাউন্ট আছে?',
    signIn: 'সাইন ইন করুন',
    name: 'পূর্ণ নাম', namePh: 'আপনার পূর্ণ নাম লিখুন',
    nameBn: 'বাংলায় নাম (ঐচ্ছিক)', nameBnPh: 'আপনার বাংলা নাম',
    email: 'ইমেইল ঠিকানা', emailPh: 'name@example.com',
    phone: 'ফোন নম্বর', phonePh: '01XXXXXXXXX',
    password: 'পাসওয়ার্ড', passwordPh: '••••••••',
    confirmPassword: 'পাসওয়ার্ড নিশ্চিত করুন', confirmPasswordPh: '••••••••',
    division: 'বিভাগ', divisionPh: 'বিভাগ নির্বাচন করুন',
    district: 'জেলা', districtPh: 'জেলা নির্বাচন করুন', districtDisabled: 'আগে বিভাগ নির্বাচন করুন',
    createAccount: 'অ্যাকাউন্ট তৈরি করুন',
    strength: { weak: 'দুর্বল', medium: 'মাঝারি', strong: 'শক্তিশালী' },
    area: 'বসবাসের এলাকা',
    urban: 'শহর', rural: 'গ্রাম',
    diabetes: 'আপনার কি ডায়াবেটিস আছে?',
    hypertension: 'আপনার কি উচ্চ রক্তচাপ আছে?',
    familyHistory: 'পরিবারে কিডনি রোগের ইতিহাস আছে?',
    age: 'বয়স', agePh: 'আপনার বয়স (বছর)',
    sex: 'লিঙ্গ', male: 'পুরুষ', female: 'মহিলা',
    weight: 'ওজন (কেজি)', weightPh: '৩০–৩০০ কেজি',
    yes: 'হ্যাঁ', no: 'না', dontKnow: 'জানি না',
    bmdcNumber: 'বিএমডিসি নিবন্ধন নম্বর', bmdcPh: 'যেমন BMDC-12345',
    specialty: 'বিশেষত্ব', specialtyPh: 'বিশেষত্ব নির্বাচন করুন',
    hospital: 'হাসপাতাল / ক্লিনিকের নাম', hospitalPh: 'আপনার হাসপাতাল বা ক্লিনিকের নাম',
    experience: 'অভিজ্ঞতার বছর', experiencePh: 'যেমন ৫',
    nationalId: 'জাতীয় পরিচয়পত্র বা সিএইচডব্লিউ আইডি', nationalIdPh: 'আপনার এনআইডি বা সিএইচডব্লিউ আইডি',
    organization: 'সংগঠন / এনজিও (ঐচ্ছিক)', organizationPh: 'আপনার সংগঠনের নাম',
    workingArea: 'নির্ধারিত কাজের এলাকা', workingAreaPh: 'যেমন রংপুর সদর ইউনিয়ন',
    encrypted: 'আপনার ডেটা এনক্রিপ্টেড এবং সুরক্ষিত',
    required: 'আবশ্যক',
    errors: {
      nameRequired: 'পূর্ণ নাম আবশ্যক',
      emailRequired: 'সঠিক ইমেইল আবশ্যক',
      phoneInvalid: 'ফোন নম্বর ০১XXXXXXXXX ফরম্যাটে হতে হবে',
      passwordLength: 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে',
      passwordStrength: 'পাসওয়ার্ডে অক্ষর ও সংখ্যা থাকতে হবে',
      passwordMatch: 'পাসওয়ার্ড মিলছে না',
      divisionRequired: 'বিভাগ নির্বাচন করুন',
      districtRequired: 'জেলা নির্বাচন করুন',
      ageRequired: 'বয়স আবশ্যক (১–১২০)',
      weightRequired: 'ওজন আবশ্যক (৩০–৩০০ কেজি)',
      sexRequired: 'লিঙ্গ নির্বাচন করুন',
      bmdcRequired: 'বিএমডিসি নম্বর আবশ্যক',
      specialtyRequired: 'বিশেষত্ব নির্বাচন করুন',
      hospitalRequired: 'হাসপাতালের নাম আবশ্যক',
      nationalIdRequired: 'জাতীয় পরিচয়পত্র বা সিএইচডব্লিউ আইডি আবশ্যক',
      workingAreaRequired: 'কাজের এলাকা আবশ্যক',
    },
  },
};

function getPasswordStrength(pw: string): 'weak' | 'medium' | 'strong' | null {
  if (!pw) return null;
  const hasLetter = /[a-zA-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pw);
  if (pw.length < 6) return 'weak';
  if (pw.length >= 10 && hasLetter && hasNumber && hasSpecial) return 'strong';
  if (pw.length >= 8 && hasLetter && hasNumber) return 'medium';
  if (pw.length >= 8) return 'medium';
  return 'weak';
}

const STRENGTH_COLORS = { weak: '#E74C3C', medium: '#F39C12', strong: '#2ECC71' };
const STRENGTH_WIDTH = { weak: '33%', medium: '66%', strong: '100%' };

type TriBool = 'yes' | 'no' | 'unknown' | '';

interface FormData {
  name: string; nameBn: string; email: string; phone: string;
  password: string; confirmPassword: string;
  role: string; division: string; district: string;
  age: string; sex: string; weight: string;
  diabetes: TriBool; hypertension: TriBool; familyHistory: TriBool; area: string;
  bmdcNumber: string; specialty: string; hospital: string; experience: string;
  nationalId: string; organization: string; workingArea: string;
}

function FieldError({ msg }: { msg: string }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="text-xs font-medium mt-1"
          style={{ color: '#E74C3C' }}
        >
          {msg}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

function inputCls(error?: string) {
  return `w-full px-4 py-3 bg-white border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all text-[15px] ${
    error
      ? 'border-red-400 focus:ring-red-100 focus:border-red-400'
      : 'border-slate-200 focus:ring-[#1A6B8A]/15 focus:border-[#1A6B8A]'
  }`;
}

function iconInputCls(error?: string) {
  return `w-full pl-11 pr-4 py-3 bg-white border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all text-[15px] ${
    error
      ? 'border-red-400 focus:ring-red-100 focus:border-red-400'
      : 'border-slate-200 focus:ring-[#1A6B8A]/15 focus:border-[#1A6B8A]'
  }`;
}

function TriSelect({
  value, onChange, yes, no, dontKnow,
}: { value: TriBool; onChange: (v: TriBool) => void; yes: string; no: string; dontKnow: string }) {
  const opts: { v: TriBool; label: string }[] = [
    { v: 'yes', label: yes }, { v: 'no', label: no }, { v: 'unknown', label: dontKnow },
  ];
  return (
    <div className="flex gap-2">
      {opts.map(o => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
            value === o.v
              ? 'bg-[#1A6B8A] text-white border-[#1A6B8A]'
              : 'bg-white text-slate-600 border-slate-200 hover:border-[#1A6B8A]/40'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function Register({
  onLogin,
  initialRole = 'patient',
  successMessage = '',
}: {
  onLogin: (success?: boolean) => void;
  initialRole?: string;
  successMessage?: string;
}) {
  const { language } = useLanguage();
  const tx = T[language as 'en' | 'bn'];
  const [role, setRole] = useState(initialRole);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState<FormData>({
    name: '', nameBn: '', email: '', phone: '',
    password: '', confirmPassword: '',
    role: initialRole, division: '', district: '',
    age: '', sex: '', weight: '',
    diabetes: '', hypertension: '', familyHistory: '', area: '',
    bmdcNumber: '', specialty: '', hospital: '', experience: '',
    nationalId: '', organization: '', workingArea: '',
  });

  const set = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }));
  const touch = (k: string) => setTouched(t => ({ ...t, [k]: true }));

  const availableDistricts = form.division ? DISTRICTS_BY_DIVISION[form.division] ?? [] : [];
  const strength = getPasswordStrength(form.password);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = tx.errors.nameRequired;
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = tx.errors.emailRequired;
    if (!/^01[0-9]{9}$/.test(form.phone)) e.phone = tx.errors.phoneInvalid;
    if (form.password.length < 8) e.password = tx.errors.passwordLength;
    else if (!/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password)) e.password = tx.errors.passwordStrength;
    if (form.confirmPassword !== form.password) e.confirmPassword = tx.errors.passwordMatch;
    if (!form.division) e.division = tx.errors.divisionRequired;
    if (!form.district) e.district = tx.errors.districtRequired;

    if (role === 'patient') {
      const age = parseInt(form.age);
      if (!form.age || isNaN(age) || age < 1 || age > 120) e.age = tx.errors.ageRequired;
      const wt = parseFloat(form.weight);
      if (!form.weight || isNaN(wt) || wt < 30 || wt > 300) e.weight = tx.errors.weightRequired;
      if (!form.sex) e.sex = tx.errors.sexRequired;
    }

    if (role === 'doctor') {
      if (!form.bmdcNumber.trim()) e.bmdcNumber = tx.errors.bmdcRequired;
      if (!form.specialty) e.specialty = tx.errors.specialtyRequired;
      if (!form.hospital.trim()) e.hospital = tx.errors.hospitalRequired;
    }

    if (role === 'chw') {
      if (!form.nationalId.trim()) e.nationalId = tx.errors.nationalIdRequired;
      if (!form.workingArea.trim()) e.workingArea = tx.errors.workingAreaRequired;
    }

    return e;
  }, [form, role, tx]);

  const isValid = Object.keys(errors).length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(Object.fromEntries(Object.keys(errors).map(k => [k, true])));
    if (!isValid) return;

    setIsLoading(true);
    setServerError('');
    try {
      const payload = {
        name: form.name.trim(),
        name_bn: form.nameBn.trim() || undefined,
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role,
        division: form.division,
        district: form.district,
        ...(role === 'patient' ? {
          age: parseInt(form.age),
          sex: form.sex,
          weight: parseFloat(form.weight),
          diabetes: form.diabetes,
          hypertension: form.hypertension,
          family_history: form.familyHistory,
          area: form.area,
        } : {}),
        ...(role === 'doctor' ? {
          bmdc_number: form.bmdcNumber,
          specialty: form.specialty,
          hospital: form.hospital,
          experience: form.experience ? parseInt(form.experience) : undefined,
        } : {}),
        ...(role === 'chw' ? {
          national_id: form.nationalId,
          organization: form.organization || undefined,
          working_area: form.workingArea,
        } : {}),
      };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onLogin(true);
      } else {
        const data = await res.json();
        setServerError(data.error || (language === 'bn' ? 'নিবন্ধন ব্যর্থ হয়েছে' : 'Registration failed'));
      }
    } catch {
      setServerError(language === 'bn' ? 'সংযোগ ব্যর্থ হয়েছে' : 'Connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const roleObj = ROLES.find(r => r.value === role)!;
  const headingKey = role as 'patient' | 'doctor' | 'chw';

  return (
    <div className="min-h-[80vh] flex items-start justify-center py-10 px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-[480px]"
      >
        {/* Role Tabs */}
        <div className="flex rounded-2xl bg-white border border-slate-200 p-1 mb-6 shadow-sm">
          {ROLES.map(r => {
            const Icon = r.icon;
            const active = role === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => { setRole(r.value); setForm(f => ({ ...f, role: r.value })); setTouched({}); setServerError(''); }}
                className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? 'bg-[#1A6B8A] text-white shadow-md shadow-[#1A6B8A]/20'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{language === 'bn' ? r.labelBn : r.label}</span>
              </button>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
          {/* Header stripe */}
          <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #1A6B8A, #2ECC71)' }} />

          <div className="p-6 sm:p-8">
            {/* Heading */}
            <div className="text-center mb-6">
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 text-white"
                style={{ background: '#1A6B8A' }}
              >
                <Activity className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-black text-slate-900">
                {tx.heading[headingKey]}
              </h1>
              <p className="text-sm text-slate-500 mt-1.5">{tx.subheading[headingKey]}</p>
              <p className="text-sm text-slate-500 mt-3">
                {tx.alreadyHave}{' '}
                <button
                  type="button"
                  onClick={() => onLogin(false)}
                  className="font-bold hover:underline"
                  style={{ color: '#1A6B8A' }}
                >
                  {tx.signIn}
                </button>
              </p>
            </div>

            {serverError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-5 p-3.5 rounded-xl text-sm font-medium"
                style={{ background: '#FEF2F2', color: '#E74C3C', border: '1px solid #FECACA' }}
              >
                {serverError}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* ── COMMON FIELDS ── */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {language === 'bn' ? 'সাধারণ তথ্য' : 'Basic Information'}
                </p>

                {/* Name */}
                <div>
                  <Label required>{tx.name}</Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 w-[18px] h-[18px]" />
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => set('name', e.target.value)}
                      onBlur={() => touch('name')}
                      placeholder={tx.namePh}
                      className={iconInputCls(touched.name ? errors.name : '')}
                      autoComplete="name"
                    />
                  </div>
                  <FieldError msg={touched.name ? errors.name || '' : ''} />
                </div>

                {/* Email */}
                <div>
                  <Label required>{tx.email}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-[18px] h-[18px]" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                      onBlur={() => touch('email')}
                      placeholder={tx.emailPh}
                      className={iconInputCls(touched.email ? errors.email : '')}
                      inputMode="email"
                      autoComplete="email"
                    />
                  </div>
                  <FieldError msg={touched.email ? errors.email || '' : ''} />
                </div>

                {/* Phone */}
                <div>
                  <Label required>{tx.phone}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-[18px] h-[18px]" />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 11))}
                      onBlur={() => touch('phone')}
                      placeholder={tx.phonePh}
                      className={iconInputCls(touched.phone ? errors.phone : '')}
                      inputMode="tel"
                      autoComplete="tel"
                    />
                  </div>
                  <FieldError msg={touched.phone ? errors.phone || '' : ''} />
                </div>

                {/* Password */}
                <div>
                  <Label required>{tx.password}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-[18px] h-[18px]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => set('password', e.target.value)}
                      onBlur={() => touch('password')}
                      placeholder={tx.passwordPh}
                      className={`${iconInputCls(touched.password ? errors.password : '')} pr-11`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {form.password && strength && (
                    <div className="mt-2">
                      <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                        <motion.div
                          animate={{ width: STRENGTH_WIDTH[strength] }}
                          className="h-full rounded-full transition-all"
                          style={{ background: STRENGTH_COLORS[strength] }}
                        />
                      </div>
                      <p className="text-xs mt-1 font-medium" style={{ color: STRENGTH_COLORS[strength] }}>
                        {tx.strength[strength]}
                      </p>
                    </div>
                  )}
                  <FieldError msg={touched.password ? errors.password || '' : ''} />
                </div>

                {/* Confirm Password */}
                <div>
                  <Label required>{tx.confirmPassword}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-[18px] h-[18px]" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={e => set('confirmPassword', e.target.value)}
                      onBlur={() => touch('confirmPassword')}
                      placeholder={tx.confirmPasswordPh}
                      className={`${iconInputCls(touched.confirmPassword ? errors.confirmPassword : '')} pr-11`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <FieldError msg={touched.confirmPassword ? errors.confirmPassword || '' : ''} />
                </div>

                {/* Division + District */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label required>{tx.division}</Label>
                    <select
                      value={form.division}
                      onChange={e => { set('division', e.target.value); set('district', ''); }}
                      onBlur={() => touch('division')}
                      className={inputCls(touched.division ? errors.division : '')}
                    >
                      <option value="">{tx.divisionPh}</option>
                      {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <FieldError msg={touched.division ? errors.division || '' : ''} />
                  </div>
                  <div>
                    <Label required>{tx.district}</Label>
                    <div className="relative">
                      <select
                        value={form.district}
                        onChange={e => set('district', e.target.value)}
                        onBlur={() => touch('district')}
                        disabled={!form.division}
                        className={`${inputCls(touched.district ? errors.district : '')} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
                      >
                        <option value="">{form.division ? tx.districtPh : tx.districtDisabled}</option>
                        {availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <FieldError msg={touched.district ? errors.district || '' : ''} />
                  </div>
                </div>
              </div>

              {/* ── ROLE-SPECIFIC FIELDS ── */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={role}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {role === 'patient' && (
                    <div className="mt-6 space-y-4">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {language === 'bn' ? 'স্বাস্থ্য তথ্য' : 'Health Information'}
                      </p>

                      {/* Age + Sex */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label required>{tx.age}</Label>
                          <div className="relative">
                            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-[18px] h-[18px]" />
                            <input
                              type="number"
                              value={form.age}
                              onChange={e => set('age', e.target.value)}
                              onBlur={() => touch('age')}
                              placeholder={tx.agePh}
                              min={1} max={120}
                              className={iconInputCls(touched.age ? errors.age : '')}
                              inputMode="numeric"
                            />
                          </div>
                          <FieldError msg={touched.age ? errors.age || '' : ''} />
                        </div>
                        <div>
                          <Label required>{tx.sex}</Label>
                          <div className="flex gap-2 h-[48px]">
                            {[{ v: 'male', l: tx.male }, { v: 'female', l: tx.female }].map(o => (
                              <button
                                key={o.v}
                                type="button"
                                onClick={() => { set('sex', o.v); touch('sex'); }}
                                className={`flex-1 rounded-xl text-sm font-semibold border transition-all ${
                                  form.sex === o.v
                                    ? 'bg-[#1A6B8A] text-white border-[#1A6B8A]'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#1A6B8A]/40'
                                }`}
                              >{o.l}</button>
                            ))}
                          </div>
                          <FieldError msg={touched.sex ? errors.sex || '' : ''} />
                        </div>
                      </div>

                      {/* Weight */}
                      <div>
                        <Label required>{tx.weight}</Label>
                        <input
                          type="number"
                          value={form.weight}
                          onChange={e => set('weight', e.target.value)}
                          onBlur={() => touch('weight')}
                          placeholder={tx.weightPh}
                          min={30} max={300}
                          className={inputCls(touched.weight ? errors.weight : '')}
                          inputMode="decimal"
                        />
                        <FieldError msg={touched.weight ? errors.weight || '' : ''} />
                      </div>

                      {/* Living Area */}
                      <div>
                        <Label>{tx.area}</Label>
                        <div className="flex gap-2">
                          {[{ v: 'urban', l: tx.urban }, { v: 'rural', l: tx.rural }].map(o => (
                            <button
                              key={o.v}
                              type="button"
                              onClick={() => set('area', o.v)}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                                form.area === o.v
                                  ? 'bg-[#1A6B8A] text-white border-[#1A6B8A]'
                                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#1A6B8A]/40'
                              }`}
                            >
                              {o.v === 'urban' ? <Building2 className="w-3.5 h-3.5" /> : <Home className="w-3.5 h-3.5" />}
                              {o.l}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Diabetes */}
                      <div>
                        <Label>{tx.diabetes}</Label>
                        <TriSelect
                          value={form.diabetes}
                          onChange={v => set('diabetes', v)}
                          yes={tx.yes} no={tx.no} dontKnow={tx.dontKnow}
                        />
                      </div>

                      {/* Hypertension */}
                      <div>
                        <Label>{tx.hypertension}</Label>
                        <TriSelect
                          value={form.hypertension}
                          onChange={v => set('hypertension', v)}
                          yes={tx.yes} no={tx.no} dontKnow={tx.dontKnow}
                        />
                      </div>

                      {/* Family History */}
                      <div>
                        <Label>{tx.familyHistory}</Label>
                        <TriSelect
                          value={form.familyHistory}
                          onChange={v => set('familyHistory', v)}
                          yes={tx.yes} no={tx.no} dontKnow={tx.dontKnow}
                        />
                      </div>
                    </div>
                  )}

                  {role === 'doctor' && (
                    <div className="mt-6 space-y-4">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {language === 'bn' ? 'পেশাদার তথ্য' : 'Professional Details'}
                      </p>

                      <div>
                        <Label required>{tx.bmdcNumber}</Label>
                        <div className="relative">
                          <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-[18px] h-[18px]" />
                          <input
                            type="text"
                            value={form.bmdcNumber}
                            onChange={e => set('bmdcNumber', e.target.value)}
                            onBlur={() => touch('bmdcNumber')}
                            placeholder={tx.bmdcPh}
                            className={iconInputCls(touched.bmdcNumber ? errors.bmdcNumber : '')}
                          />
                        </div>
                        <FieldError msg={touched.bmdcNumber ? errors.bmdcNumber || '' : ''} />
                      </div>

                      <div>
                        <Label required>{tx.specialty}</Label>
                        <select
                          value={form.specialty}
                          onChange={e => set('specialty', e.target.value)}
                          onBlur={() => touch('specialty')}
                          className={inputCls(touched.specialty ? errors.specialty : '')}
                        >
                          <option value="">{tx.specialtyPh}</option>
                          {SPECIALTIES.map(s => (
                            <option key={s.value} value={s.value}>
                              {language === 'bn' ? s.labelBn : s.label}
                            </option>
                          ))}
                        </select>
                        <FieldError msg={touched.specialty ? errors.specialty || '' : ''} />
                      </div>

                      <div>
                        <Label required>{tx.hospital}</Label>
                        <div className="relative">
                          <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-[18px] h-[18px]" />
                          <input
                            type="text"
                            value={form.hospital}
                            onChange={e => set('hospital', e.target.value)}
                            onBlur={() => touch('hospital')}
                            placeholder={tx.hospitalPh}
                            className={iconInputCls(touched.hospital ? errors.hospital : '')}
                          />
                        </div>
                        <FieldError msg={touched.hospital ? errors.hospital || '' : ''} />
                      </div>

                      <div>
                        <Label>{tx.experience}</Label>
                        <input
                          type="number"
                          value={form.experience}
                          onChange={e => set('experience', e.target.value)}
                          placeholder={tx.experiencePh}
                          min={0} max={60}
                          className={inputCls()}
                          inputMode="numeric"
                        />
                      </div>
                    </div>
                  )}

                  {role === 'chw' && (
                    <div className="mt-6 space-y-4">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {language === 'bn' ? 'কর্মীর তথ্য' : 'Worker Details'}
                      </p>

                      <div>
                        <Label required>{tx.nationalId}</Label>
                        <div className="relative">
                          <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-[18px] h-[18px]" />
                          <input
                            type="text"
                            value={form.nationalId}
                            onChange={e => set('nationalId', e.target.value)}
                            onBlur={() => touch('nationalId')}
                            placeholder={tx.nationalIdPh}
                            className={iconInputCls(touched.nationalId ? errors.nationalId : '')}
                          />
                        </div>
                        <FieldError msg={touched.nationalId ? errors.nationalId || '' : ''} />
                      </div>

                      <div>
                        <Label>{tx.organization}</Label>
                        <div className="relative">
                          <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-[18px] h-[18px]" />
                          <input
                            type="text"
                            value={form.organization}
                            onChange={e => set('organization', e.target.value)}
                            placeholder={tx.organizationPh}
                            className={iconInputCls()}
                          />
                        </div>
                      </div>

                      <div>
                        <Label required>{tx.workingArea}</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-[18px] h-[18px]" />
                          <input
                            type="text"
                            value={form.workingArea}
                            onChange={e => set('workingArea', e.target.value)}
                            onBlur={() => touch('workingArea')}
                            placeholder={tx.workingAreaPh}
                            className={iconInputCls(touched.workingArea ? errors.workingArea : '')}
                          />
                        </div>
                        <FieldError msg={touched.workingArea ? errors.workingArea || '' : ''} />
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="mt-8 w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all text-[15px] disabled:opacity-60 active:scale-[0.98]"
                style={{ background: isLoading ? '#1A6B8A' : 'linear-gradient(135deg, #1A6B8A 0%, #14556e 100%)', boxShadow: '0 4px 20px rgba(26,107,138,0.3)' }}
              >
                {isLoading
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : (
                    <>
                      {tx.createAccount}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )
                }
              </button>
            </form>

            {/* Trust footer */}
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-[#2ECC71]" />
              <span>{tx.encrypted}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

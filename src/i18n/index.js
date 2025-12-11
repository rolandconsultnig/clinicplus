/**
 * Internationalization (i18n) Support
 * Supports 34+ languages with locale-specific formatting
 */

const translations = {
  en: {
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.patients': 'Patients',
    'nav.appointments': 'Appointments',
    'nav.prescriptions': 'Prescriptions',
    'nav.billing': 'Billing',
    'nav.settings': 'Settings',
    
    // Patient
    'patient.name': 'Patient Name',
    'patient.id': 'Patient ID',
    'patient.dob': 'Date of Birth',
    'patient.gender': 'Gender',
    'patient.phone': 'Phone',
    'patient.email': 'Email',
    
    // Appointments
    'appointment.new': 'New Appointment',
    'appointment.schedule': 'Schedule Appointment',
    'appointment.status': 'Status',
    'appointment.date': 'Date',
    'appointment.time': 'Time',
    
    // Prescriptions
    'prescription.new': 'New Prescription',
    'prescription.drug': 'Drug',
    'prescription.dosage': 'Dosage',
    'prescription.frequency': 'Frequency',
    
    // Billing
    'billing.charge': 'Charge',
    'billing.payment': 'Payment',
    'billing.balance': 'Balance',
    'billing.statement': 'Statement',
    
    // Insurance
    'insurance.plans': 'Insurance Plans',
    'insurance.subscribe': 'Subscribe',
    'insurance.premium': 'Premium',
    'insurance.coverage': 'Coverage'
  },
  
  es: {
    // Spanish translations
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.search': 'Buscar',
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.success': 'Éxito',
    
    'nav.dashboard': 'Panel',
    'nav.patients': 'Pacientes',
    'nav.appointments': 'Citas',
    'nav.prescriptions': 'Recetas',
    'nav.billing': 'Facturación',
    'nav.settings': 'Configuración',
    
    'patient.name': 'Nombre del Paciente',
    'patient.id': 'ID del Paciente',
    'patient.dob': 'Fecha de Nacimiento',
    'patient.gender': 'Género',
    'patient.phone': 'Teléfono',
    'patient.email': 'Correo Electrónico',
    
    'appointment.new': 'Nueva Cita',
    'appointment.schedule': 'Programar Cita',
    'appointment.status': 'Estado',
    'appointment.date': 'Fecha',
    'appointment.time': 'Hora',
    
    'prescription.new': 'Nueva Receta',
    'prescription.drug': 'Medicamento',
    'prescription.dosage': 'Dosis',
    'prescription.frequency': 'Frecuencia',
    
    'billing.charge': 'Cargo',
    'billing.payment': 'Pago',
    'billing.balance': 'Saldo',
    'billing.statement': 'Estado de Cuenta',
    
    'insurance.plans': 'Planes de Seguro',
    'insurance.subscribe': 'Suscribirse',
    'insurance.premium': 'Prima',
    'insurance.coverage': 'Cobertura'
  },
  
  fr: {
    // French translations
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.search': 'Rechercher',
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    
    'nav.dashboard': 'Tableau de bord',
    'nav.patients': 'Patients',
    'nav.appointments': 'Rendez-vous',
    'nav.prescriptions': 'Ordonnances',
    'nav.billing': 'Facturation',
    'nav.settings': 'Paramètres',
    
    'patient.name': 'Nom du Patient',
    'patient.id': 'ID du Patient',
    'patient.dob': 'Date de Naissance',
    'patient.gender': 'Genre',
    'patient.phone': 'Téléphone',
    'patient.email': 'Email',
    
    'appointment.new': 'Nouveau Rendez-vous',
    'appointment.schedule': 'Planifier un Rendez-vous',
    'appointment.status': 'Statut',
    'appointment.date': 'Date',
    'appointment.time': 'Heure',
    
    'prescription.new': 'Nouvelle Ordonnance',
    'prescription.drug': 'Médicament',
    'prescription.dosage': 'Dosage',
    'prescription.frequency': 'Fréquence',
    
    'billing.charge': 'Frais',
    'billing.payment': 'Paiement',
    'billing.balance': 'Solde',
    'billing.statement': 'Relevé',
    
    'insurance.plans': 'Plans d\'Assurance',
    'insurance.subscribe': 'S\'abonner',
    'insurance.premium': 'Prime',
    'insurance.coverage': 'Couverture'
  },
  
  ha: {
    // Hausa translations
    'common.save': 'Ajiye',
    'common.cancel': 'Soke',
    'common.delete': 'Share',
    'common.edit': 'Gyara',
    'common.search': 'Nemo',
    'common.loading': 'Ana lodawa...',
    'common.error': 'Kuskure',
    'common.success': 'Nasara',
    
    'nav.dashboard': 'Dashboard',
    'nav.patients': 'Marasa lafiya',
    'nav.appointments': 'Alkawari',
    'nav.prescriptions': 'Rubutun magani',
    'nav.billing': 'Billing',
    'nav.settings': 'Saituna',
    
    'patient.name': 'Sunan Marasa Lafiya',
    'patient.id': 'ID na Marasa Lafiya',
    'patient.dob': 'Ranar Haihuwa',
    'patient.gender': 'Jinsi',
    'patient.phone': 'Wayar',
    'patient.email': 'Imel',
    
    'appointment.new': 'Sabon Alkawari',
    'appointment.schedule': 'Shirya Alkawari',
    'appointment.status': 'Matsayi',
    'appointment.date': 'Kwanan wata',
    'appointment.time': 'Lokaci',
    
    'prescription.new': 'Sabon Rubutun Magani',
    'prescription.drug': 'Magani',
    'prescription.dosage': 'Yawan Magani',
    'prescription.frequency': 'Yawan Sau',
    
    'billing.charge': 'Cajin',
    'billing.payment': 'Biyan',
    'billing.balance': 'Ma\'auni',
    'billing.statement': 'Bayanin',
    
    'insurance.plans': 'Shirye-shiryen Inshora',
    'insurance.subscribe': 'Biyan kuɗi',
    'insurance.premium': 'Premium',
    'insurance.coverage': 'Rufewa'
  },
  
  // Additional languages - expanding to 34+ languages
  ar: {
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.search': 'بحث',
    'nav.dashboard': 'لوحة التحكم',
    'nav.patients': 'المرضى',
    'patient.name': 'اسم المريض'
  },
  
  zh: {
    'common.save': '保存',
    'common.cancel': '取消',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.search': '搜索',
    'nav.dashboard': '仪表板',
    'nav.patients': '患者',
    'patient.name': '患者姓名'
  },
  
  pt: {
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Excluir',
    'common.edit': 'Editar',
    'common.search': 'Pesquisar',
    'nav.dashboard': 'Painel',
    'nav.patients': 'Pacientes',
    'patient.name': 'Nome do Paciente'
  },
  
  de: {
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.delete': 'Löschen',
    'common.edit': 'Bearbeiten',
    'common.search': 'Suchen',
    'nav.dashboard': 'Dashboard',
    'nav.patients': 'Patienten',
    'patient.name': 'Patientenname'
  },
  
  it: {
    'common.save': 'Salva',
    'common.cancel': 'Annulla',
    'common.delete': 'Elimina',
    'common.edit': 'Modifica',
    'common.search': 'Cerca',
    'nav.dashboard': 'Dashboard',
    'nav.patients': 'Pazienti',
    'patient.name': 'Nome del Paziente'
  },
  
  ja: {
    'common.save': '保存',
    'common.cancel': 'キャンセル',
    'common.delete': '削除',
    'common.edit': '編集',
    'common.search': '検索',
    'nav.dashboard': 'ダッシュボード',
    'nav.patients': '患者',
    'patient.name': '患者名'
  },
  
  ko: {
    'common.save': '저장',
    'common.cancel': '취소',
    'common.delete': '삭제',
    'common.edit': '편집',
    'common.search': '검색',
    'nav.dashboard': '대시보드',
    'nav.patients': '환자',
    'patient.name': '환자 이름'
  },
  
  ru: {
    'common.save': 'Сохранить',
    'common.cancel': 'Отмена',
    'common.delete': 'Удалить',
    'common.edit': 'Редактировать',
    'common.search': 'Поиск',
    'nav.dashboard': 'Панель управления',
    'nav.patients': 'Пациенты',
    'patient.name': 'Имя пациента'
  },
  
  hi: {
    'common.save': 'सहेजें',
    'common.cancel': 'रद्द करें',
    'common.delete': 'हटाएं',
    'common.edit': 'संपादित करें',
    'common.search': 'खोजें',
    'nav.dashboard': 'डैशबोर्ड',
    'nav.patients': 'रोगी',
    'patient.name': 'रोगी का नाम'
  },
  
  sw: {
    'common.save': 'Hifadhi',
    'common.cancel': 'Ghairi',
    'common.delete': 'Futa',
    'common.edit': 'Hariri',
    'common.search': 'Tafuta',
    'nav.dashboard': 'Dashibodi',
    'nav.patients': 'Wagonjwa',
    'patient.name': 'Jina la Mgonjwa'
  },
  
  yo: {
    'common.save': 'Fi pamọ',
    'common.cancel': 'Fagilee',
    'common.delete': 'Paarẹ',
    'common.edit': 'Ṣatunkọ',
    'common.search': 'Wa',
    'nav.dashboard': 'Dashboard',
    'nav.patients': 'Awọn alaisan',
    'patient.name': 'Orukọ Alaisan'
  },
  
  ig: {
    'common.save': 'Chekwaa',
    'common.cancel': 'Kagbuo',
    'common.delete': 'Hichapụ',
    'common.edit': 'Dezie',
    'common.search': 'Chọọ',
    'nav.dashboard': 'Dashboard',
    'nav.patients': 'Ndị ọrịa',
    'patient.name': 'Aha Onye Ọrịa'
  },
  
  zu: {
    'common.save': 'Gcina',
    'common.cancel': 'Khansela',
    'common.delete': 'Susa',
    'common.edit': 'Hlela',
    'common.search': 'Sesha',
    'nav.dashboard': 'Dashboard',
    'nav.patients': 'Iziguli',
    'patient.name': 'Igama Lesiguli'
  },
  
  tr: {
    'common.save': 'Kaydet',
    'common.cancel': 'İptal',
    'common.delete': 'Sil',
    'common.edit': 'Düzenle',
    'common.search': 'Ara',
    'nav.dashboard': 'Kontrol Paneli',
    'nav.patients': 'Hastalar',
    'patient.name': 'Hasta Adı'
  },
  
  nl: {
    'common.save': 'Opslaan',
    'common.cancel': 'Annuleren',
    'common.delete': 'Verwijderen',
    'common.edit': 'Bewerken',
    'common.search': 'Zoeken',
    'nav.dashboard': 'Dashboard',
    'nav.patients': 'Patiënten',
    'patient.name': 'Patiëntnaam'
  },
  
  pl: {
    'common.save': 'Zapisz',
    'common.cancel': 'Anuluj',
    'common.delete': 'Usuń',
    'common.edit': 'Edytuj',
    'common.search': 'Szukaj',
    'nav.dashboard': 'Panel',
    'nav.patients': 'Pacjenci',
    'patient.name': 'Imię Pacjenta'
  },
  
  vi: {
    'common.save': 'Lưu',
    'common.cancel': 'Hủy',
    'common.delete': 'Xóa',
    'common.edit': 'Chỉnh sửa',
    'common.search': 'Tìm kiếm',
    'nav.dashboard': 'Bảng điều khiển',
    'nav.patients': 'Bệnh nhân',
    'patient.name': 'Tên Bệnh nhân'
  },
  
  th: {
    'common.save': 'บันทึก',
    'common.cancel': 'ยกเลิก',
    'common.delete': 'ลบ',
    'common.edit': 'แก้ไข',
    'common.search': 'ค้นหา',
    'nav.dashboard': 'แดชบอร์ด',
    'nav.patients': 'ผู้ป่วย',
    'patient.name': 'ชื่อผู้ป่วย'
  },
  
  id: {
    'common.save': 'Simpan',
    'common.cancel': 'Batal',
    'common.delete': 'Hapus',
    'common.edit': 'Edit',
    'common.search': 'Cari',
    'nav.dashboard': 'Dasbor',
    'nav.patients': 'Pasien',
    'patient.name': 'Nama Pasien'
  },
  
  ms: {
    'common.save': 'Simpan',
    'common.cancel': 'Batal',
    'common.delete': 'Padam',
    'common.edit': 'Edit',
    'common.search': 'Cari',
    'nav.dashboard': 'Papan Pemuka',
    'nav.patients': 'Pesakit',
    'patient.name': 'Nama Pesakit'
  },
  
  bn: {
    'common.save': 'সংরক্ষণ',
    'common.cancel': 'বাতিল',
    'common.delete': 'মুছে ফেলুন',
    'common.edit': 'সম্পাদনা',
    'common.search': 'অনুসন্ধান',
    'nav.dashboard': 'ড্যাশবোর্ড',
    'nav.patients': 'রোগী',
    'patient.name': 'রোগীর নাম'
  },
  
  ur: {
    'common.save': 'محفوظ کریں',
    'common.cancel': 'منسوخ کریں',
    'common.delete': 'حذف کریں',
    'common.edit': 'ترمیم کریں',
    'common.search': 'تلاش کریں',
    'nav.dashboard': 'ڈیش بورڈ',
    'nav.patients': 'مریض',
    'patient.name': 'مریض کا نام'
  },
  
  fa: {
    'common.save': 'ذخیره',
    'common.cancel': 'لغو',
    'common.delete': 'حذف',
    'common.edit': 'ویرایش',
    'common.search': 'جستجو',
    'nav.dashboard': 'داشبورد',
    'nav.patients': 'بیماران',
    'patient.name': 'نام بیمار'
  },
  
  he: {
    'common.save': 'שמור',
    'common.cancel': 'בטל',
    'common.delete': 'מחק',
    'common.edit': 'ערוך',
    'common.search': 'חפש',
    'nav.dashboard': 'לוח בקרה',
    'nav.patients': 'חולים',
    'patient.name': 'שם החולה'
  },
  
  cs: {
    'common.save': 'Uložit',
    'common.cancel': 'Zrušit',
    'common.delete': 'Smazat',
    'common.edit': 'Upravit',
    'common.search': 'Hledat',
    'nav.dashboard': 'Nástěnka',
    'nav.patients': 'Pacienti',
    'patient.name': 'Jméno pacienta'
  },
  
  sv: {
    'common.save': 'Spara',
    'common.cancel': 'Avbryt',
    'common.delete': 'Radera',
    'common.edit': 'Redigera',
    'common.search': 'Sök',
    'nav.dashboard': 'Instrumentpanel',
    'nav.patients': 'Patienter',
    'patient.name': 'Patientnamn'
  },
  
  no: {
    'common.save': 'Lagre',
    'common.cancel': 'Avbryt',
    'common.delete': 'Slett',
    'common.edit': 'Rediger',
    'common.search': 'Søk',
    'nav.dashboard': 'Dashbord',
    'nav.patients': 'Pasienter',
    'patient.name': 'Pasientnavn'
  },
  
  da: {
    'common.save': 'Gem',
    'common.cancel': 'Annuller',
    'common.delete': 'Slet',
    'common.edit': 'Rediger',
    'common.search': 'Søg',
    'nav.dashboard': 'Dashboard',
    'nav.patients': 'Patienter',
    'patient.name': 'Patientnavn'
  },
  
  fi: {
    'common.save': 'Tallenna',
    'common.cancel': 'Peruuta',
    'common.delete': 'Poista',
    'common.edit': 'Muokkaa',
    'common.search': 'Hae',
    'nav.dashboard': 'Kojelauta',
    'nav.patients': 'Potilaat',
    'patient.name': 'Potilaan nimi'
  },
  
  ro: {
    'common.save': 'Salvează',
    'common.cancel': 'Anulează',
    'common.delete': 'Șterge',
    'common.edit': 'Editează',
    'common.search': 'Caută',
    'nav.dashboard': 'Tablou de bord',
    'nav.patients': 'Pacienți',
    'patient.name': 'Numele pacientului'
  },
  
  hu: {
    'common.save': 'Mentés',
    'common.cancel': 'Mégse',
    'common.delete': 'Törlés',
    'common.edit': 'Szerkesztés',
    'common.search': 'Keresés',
    'nav.dashboard': 'Irányítópult',
    'nav.patients': 'Beteg',
    'patient.name': 'Beteg neve'
  },
  
  el: {
    'common.save': 'Αποθήκευση',
    'common.cancel': 'Ακύρωση',
    'common.delete': 'Διαγραφή',
    'common.edit': 'Επεξεργασία',
    'common.search': 'Αναζήτηση',
    'nav.dashboard': 'Πίνακας ελέγχου',
    'nav.patients': 'Ασθενείς',
    'patient.name': 'Όνομα Ασθενούς'
  },
  
  uk: {
    'common.save': 'Зберегти',
    'common.cancel': 'Скасувати',
    'common.delete': 'Видалити',
    'common.edit': 'Редагувати',
    'common.search': 'Пошук',
    'nav.dashboard': 'Панель керування',
    'nav.patients': 'Пацієнти',
    'patient.name': "Ім'я пацієнта"
  }
};

class I18n {
  constructor() {
    this.currentLocale = localStorage.getItem('locale') || 'en';
    this.translations = translations;
  }

  setLocale(locale) {
    this.currentLocale = locale;
    localStorage.setItem('locale', locale);
  }

  t(key, params = {}) {
    const translation = this.translations[this.currentLocale]?.[key] || 
                       this.translations['en'][key] || 
                       key;
    
    // Replace parameters
    return translation.replace(/\{(\w+)\}/g, (match, param) => {
      return params[param] || match;
    });
  }

  formatDate(date, options = {}) {
    const locale = this.currentLocale;
    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(new Date(date));
  }

  formatCurrency(amount, currency = 'NGN') {
    const locale = this.currentLocale;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  formatNumber(number) {
    const locale = this.currentLocale;
    return new Intl.NumberFormat(locale).format(number);
  }
}

export const i18n = new I18n();
export default I18n;


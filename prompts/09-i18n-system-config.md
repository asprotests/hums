# Prompt 09: Internationalization & System Configuration

## Objective
Implement bilingual support (English/Somali) and system configuration management.

## Backend Implementation

### 1. System Configuration Service (src/services/config.service.ts)

```typescript
interface SystemConfig {
  // Branding
  universityName: string;
  universityNameLocal: string;
  logo: string;
  favicon: string;
  primaryColor: string;
  
  // Localization
  defaultLanguage: 'en' | 'so';
  timezone: string;  // e.g., 'Africa/Mogadishu'
  dateFormat: string;  // e.g., 'DD/MM/YYYY'
  currency: string;  // e.g., 'USD'
  
  // Academic
  minAttendancePercentage: number;  // e.g., 75
  gradeScale: GradeScale[];
  
  // Security
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  passwordExpiryDays: number;
}

getConfig(): Promise<SystemConfig>
updateConfig(key: string, value: any): Promise<void>
updateConfigs(configs: Partial<SystemConfig>): Promise<void>
```

### 2. Config API Routes
```
GET    /api/v1/config                    # Get all config (public subset for frontend)
GET    /api/v1/config/public             # Public config only (no auth required)
PATCH  /api/v1/config                    # Update configs (admin only)
POST   /api/v1/config/logo               # Upload logo
GET    /api/v1/config/grade-scale        # Get grading scale
```

### 3. Public Config Response
```json
{
  "universityName": "Hormuud University",
  "universityNameLocal": "Jaamacadda Hormuud",
  "logo": "/uploads/logo.png",
  "defaultLanguage": "en",
  "timezone": "Africa/Mogadishu",
  "dateFormat": "DD/MM/YYYY",
  "currency": "USD"
}
```

## Frontend - Internationalization

### 1. i18n Setup (src/lib/i18n.ts)
Use `react-i18next` with the following structure:

```
src/
└── locales/
    ├── en/
    │   ├── common.json
    │   ├── auth.json
    │   ├── admin.json
    │   ├── student.json
    │   ├── academic.json
    │   ├── finance.json
    │   └── errors.json
    └── so/
        ├── common.json
        ├── auth.json
        ├── admin.json
        ├── student.json
        ├── academic.json
        ├── finance.json
        └── errors.json
```

### 2. Translation Files

**en/common.json:**
```json
{
  "app": {
    "name": "HUMS",
    "fullName": "Hormuud University Management System"
  },
  "nav": {
    "dashboard": "Dashboard",
    "profile": "Profile",
    "settings": "Settings",
    "logout": "Logout"
  },
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "search": "Search",
    "filter": "Filter",
    "export": "Export",
    "import": "Import",
    "submit": "Submit",
    "confirm": "Confirm"
  },
  "status": {
    "active": "Active",
    "inactive": "Inactive",
    "pending": "Pending",
    "approved": "Approved",
    "rejected": "Rejected"
  },
  "messages": {
    "saveSuccess": "Saved successfully",
    "deleteSuccess": "Deleted successfully",
    "error": "An error occurred",
    "confirmDelete": "Are you sure you want to delete this?"
  },
  "pagination": {
    "showing": "Showing {{from}} to {{to}} of {{total}}",
    "previous": "Previous",
    "next": "Next"
  }
}
```

**so/common.json:**
```json
{
  "app": {
    "name": "HUMS",
    "fullName": "Nidaamka Maamulka Jaamacadda Hormuud"
  },
  "nav": {
    "dashboard": "Bogga Hore",
    "profile": "Xogta Shaqsiga",
    "settings": "Hagaajinta",
    "logout": "Ka Bax"
  },
  "actions": {
    "save": "Kaydi",
    "cancel": "Jooji",
    "delete": "Tirtir",
    "edit": "Wax ka Beddel",
    "create": "Samee",
    "search": "Raadi",
    "filter": "Kala Sooc",
    "export": "Soo Saar",
    "import": "Soo Geli",
    "submit": "Dir",
    "confirm": "Xaqiiji"
  },
  "status": {
    "active": "Firfircoon",
    "inactive": "Aan Firfircoonayn",
    "pending": "Sugitaan",
    "approved": "La Ansixiyey",
    "rejected": "La Diiday"
  },
  "messages": {
    "saveSuccess": "Si guul leh ayaa loo kaydiyey",
    "deleteSuccess": "Si guul leh ayaa loo tirtiray",
    "error": "Khalad ayaa dhacay",
    "confirmDelete": "Ma hubtaa inaad rabto inaad tirtirto?"
  },
  "pagination": {
    "showing": "Muujinaya {{from}} ilaa {{to}} ee {{total}}",
    "previous": "Ka Hore",
    "next": "Xiga"
  }
}
```

**en/student.json:**
```json
{
  "portal": {
    "title": "Student Portal",
    "welcome": "Welcome, {{name}}"
  },
  "profile": {
    "title": "My Profile",
    "studentId": "Student ID",
    "program": "Program",
    "semester": "Current Semester",
    "status": "Status"
  },
  "grades": {
    "title": "My Grades",
    "currentSemester": "Current Semester",
    "history": "Grade History",
    "gpa": "GPA",
    "cgpa": "CGPA",
    "transcript": "Download Transcript"
  },
  "attendance": {
    "title": "My Attendance",
    "percentage": "Attendance Percentage",
    "warning": "Warning: Your attendance is below the required {{min}}%"
  },
  "finance": {
    "title": "Finance",
    "balance": "Outstanding Balance",
    "feeStructure": "Fee Structure",
    "payments": "Payment History",
    "invoices": "Invoices"
  }
}
```

**so/student.json:**
```json
{
  "portal": {
    "title": "Bogga Ardayga",
    "welcome": "Ku soo dhawoow, {{name}}"
  },
  "profile": {
    "title": "Xogtayda",
    "studentId": "Lambarka Ardayga",
    "program": "Barnaamijka",
    "semester": "Semester-ka Hadda",
    "status": "Xaalad"
  },
  "grades": {
    "title": "Natigadayda",
    "currentSemester": "Semester-ka Hadda",
    "history": "Taariikhda Natigada",
    "gpa": "GPA",
    "cgpa": "CGPA",
    "transcript": "Soo Deji Transcript-ka"
  },
  "attendance": {
    "title": "Imaatinkayga",
    "percentage": "Boqolkiiba Imaatinka",
    "warning": "Digniin: Imaatinkaagu waa ka hooseeya {{min}}% ee loo baahan yahay"
  },
  "finance": {
    "title": "Maaliyadda",
    "balance": "Lacagta La Leeyahay",
    "feeStructure": "Qaab-dhismeedka Khidmada",
    "payments": "Taariikhda Lacag-bixinta",
    "invoices": "Qaansheegtooyinka"
  }
}
```

### 3. Language Switcher Component
```tsx
// src/components/LanguageSwitcher.tsx
export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'so' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
    // Update document direction for RTL support
    document.dir = newLang === 'so' ? 'rtl' : 'ltr';
  };
  
  return (
    <Button onClick={toggleLanguage}>
      {i18n.language === 'en' ? 'Soomaali' : 'English'}
    </Button>
  );
}
```

### 4. RTL Support
Somali uses Latin script (LTR), but prepare for potential Arabic support:

```css
/* In global styles */
[dir="rtl"] {
  /* RTL specific styles if needed */
}
```

### 5. Usage in Components
```tsx
import { useTranslation } from 'react-i18next';

function StudentDashboard() {
  const { t } = useTranslation('student');
  const user = useUser();
  
  return (
    <div>
      <h1>{t('portal.welcome', { name: user.firstName })}</h1>
      <Card title={t('grades.title')}>
        <Stat label={t('grades.gpa')} value={gpa} />
      </Card>
    </div>
  );
}
```

### 6. Date & Number Formatting
```typescript
// src/lib/formatters.ts
import { format } from 'date-fns';

export function formatDate(date: Date, config: SystemConfig): string {
  return format(date, config.dateFormat);
}

export function formatCurrency(amount: number, config: SystemConfig): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: config.currency
  }).format(amount);
}
```

## Frontend - System Configuration UI

### 1. Settings Pages (src/pages/admin/settings/)

**GeneralSettingsPage.tsx:**
- University name (English + Somali)
- Logo upload
- Timezone selection
- Default language
- Date format

**AcademicSettingsPage.tsx:**
- Minimum attendance percentage
- Grading scale configuration
- Academic calendar defaults

**SecuritySettingsPage.tsx:**
- Session timeout
- Max login attempts
- Password policies

### 2. Settings Form
```tsx
<Form onSubmit={saveSettings}>
  <FormField
    name="universityName"
    label={t('settings.universityName')}
  />
  <FormField
    name="universityNameLocal"
    label={t('settings.universityNameSomali')}
  />
  <ImageUpload
    name="logo"
    label={t('settings.logo')}
    accept="image/*"
  />
  <Select
    name="defaultLanguage"
    label={t('settings.defaultLanguage')}
    options={[
      { value: 'en', label: 'English' },
      { value: 'so', label: 'Soomaali' }
    ]}
  />
  <Select
    name="timezone"
    label={t('settings.timezone')}
    options={timezones}
  />
</Form>
```

## Validation Checklist
- [ ] Language can be switched between English and Somali
- [ ] All UI text uses translation keys
- [ ] Language preference persists after refresh
- [ ] Dates format according to config
- [ ] Currency displays correctly
- [ ] System config can be updated by admin
- [ ] Logo upload works
- [ ] Config changes apply immediately
- [ ] Bilingual content (nameLocal fields) displays correctly

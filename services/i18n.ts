export type Locale = 'en' | 'hi' | 'mr'
let currentLocale: Locale = 'en'

const dictionaries: Record<Locale, Record<string, string>> = {
  en: {},
  hi: {
    // Navigation & General
    'Theme': 'थीम',
    'Locale': 'भाषा',
    'Profile': 'प्रोफाइल',
    'Logout': 'लॉगआउट',
    'Login': 'लॉगिन',
    'Loading Dashboard...': 'डैशबोर्ड लोड हो रहा है...',

    // Login
    'Select Your Role': 'अपनी भूमिका चुनें',
    'Enter Your User ID': 'अपना यूजर आईडी दर्ज करें',
    'Login with Face ID': 'फेस आईडी से लॉगिन करें',
    'Email': 'ईमेल',
    'Password': 'पासवर्ड',
    'Forgot Password?': 'पासवर्ड भूल गए?',
    'Invalid email or password': 'अमान्य ईमेल या पासवर्ड',

    // Dashboards
    'Student Dashboard': 'छात्र डैशबोर्ड',
    'Teacher Dashboard': 'शिक्षक डैशबोर्ड',
    'Hello,': 'नमस्ते,',
    'Welcome,': 'स्वागत है,',

    // Attendance
    'Mark Attendance': 'उपस्थिति दर्ज करें',
    'Real-time Attendance': 'रियल-टाइम उपस्थिति',
    'Attendance Summary': 'उपस्थिति सारांश',
    'Status': 'स्थिति',
    'Student Name': 'छात्र का नाम',
    'Time': 'समय',
    'Present': 'उपस्थित',
    'Absent': 'अनुपस्थित',
    'Class': 'कक्षा',
    'Weekly Attendance Trend': 'साप्ताहिक उपस्थिति प्रवृत्ति',
    'ACTIVE SESSION CODE': 'सक्रिय सत्र कोड',
    'Radius': 'त्रिज्या',
    'left': 'शेष',
    'Expired': 'समाप्त',
    'Export CSV': 'CSV निर्यात करें',
    'Export Selected': 'चयनित निर्यात करें',
    'Copy code': 'कोड कॉपी करें',
    'Copied to clipboard!': 'क्लिपबोर्ड पर कॉपी किया!',

    // Session
    'Session Control': 'सत्र नियंत्रण',
    'Generate Session Code': 'सत्र कोड उत्पन्न करें',
    'End & Start New Session': 'समाप्त करें और नया सत्र शुरू करें',
    'Class Notes & Quiz': 'कक्षा नोट्स और प्रश्नोत्तरी',
    'Class Notes': 'कक्षा नोट्स',
    'Review Quiz': 'प्रश्नोत्तरी की समीक्षा करें',
    'Publish Quiz': 'प्रश्नोत्तरी प्रकाशित करें',
    'Thinking Mode': 'थिंकिंग मोड',
    'Enable for higher quality quizzes from complex notes. (Slower)': 'जटिल नोट्स से उच्च गुणवत्ता वाली प्रश्नोत्तरी के लिए सक्षम करें। (धीमा)',
    'Difficulty': 'कठिनाई',
    'Tags (comma-separated)': 'टैग (अल्पविराम से अलग)',

    // Performance
    'Student Performance': 'छात्र प्रदर्शन',
    'Your Performance in': 'में आपका प्रदर्शन',

    // Face & Settings
    'Face Registration': 'फेस पंजीकरण',
    'Register Face': 'फेस पंजीकृत करें',
    'Update Face ID': 'फेस आईडी अपडेट करें',
    'Register Now': 'अभी पंजीकरण करें',
    'Account Settings': 'खाता सेटिंग',
    'Face ID': 'फेस आईडी',
    'Registered': 'पंजीकृत',
    'Not registered': 'पंजीकृत नहीं',
  },
  mr: {
    // Navigation & General
    'Theme': 'थीम',
    'Locale': 'भाषा',
    'Profile': 'प्रोफाइल',
    'Logout': 'लॉगआउट',
    'Login': 'लॉगिन',
    'Loading Dashboard...': 'डॅशबोर्ड लोड होत आहे...',

    // Login
    'Select Your Role': 'तुमची भूमिका निवडा',
    'Enter Your User ID': 'तुमचा यूजर आयडी प्रविष्ट करा',
    'Login with Face ID': 'फेस आयडीने लॉगिन करा',
    'Email': 'ईमेल',
    'Password': 'पासवर्ड',
    'Forgot Password?': 'पासवर्ड विसरलात?',
    'Invalid email or password': 'अवैध ईमेल किंवा पासवर्ड',

    // Dashboards
    'Student Dashboard': 'विद्यार्थी डॅशबोर्ड',
    'Teacher Dashboard': 'शिक्षक डॅशबोर्ड',
    'Hello,': 'नमस्कार,',
    'Welcome,': 'स्वागत आहे,',

    // Attendance
    'Mark Attendance': 'उपस्थिती नोंदवा',
    'Real-time Attendance': 'रियल-टाइम उपस्थिती',
    'Attendance Summary': 'उपस्थिती सारांश',
    'Status': 'स्थिती',
    'Student Name': 'विद्यार्थ्याचे नाव',
    'Time': 'वेळ',
    'Present': 'उपस्थित',
    'Absent': 'अनुपस्थित',
    'Class': 'वर्ग',
    'Weekly Attendance Trend': 'साप्ताहिक उपस्थिती ट्रेंड',
    'ACTIVE SESSION CODE': 'सक्रिय सत्र कोड',
    'Radius': 'त्रिज्या',
    'left': 'उरलेले',
    'Expired': 'कालबाह्य',
    'Export CSV': 'CSV निर्यात करा',
    'Export Selected': 'निवडलेले निर्यात करा',
    'Copy code': 'कोड कॉपी करा',
    'Copied to clipboard!': 'क्लिपबोर्डवर कॉपी केले!',

    // Session
    'Session Control': 'सत्र नियंत्रण',
    'Generate Session Code': 'सत्र कोड तयार करा',
    'End & Start New Session': 'समाप्त करा आणि नवीन सत्र सुरू करा',
    'Class Notes & Quiz': 'वर्ग नोट्स आणि प्रश्नमंजुषा',
    'Class Notes': 'वर्ग नोट्स',
    'Review Quiz': 'प्रश्नमंजुषा पुनरावलोकन करा',
    'Publish Quiz': 'प्रश्नमंजुषा प्रकाशित करा',
    'Thinking Mode': 'विचार मोड',
    'Enable for higher quality quizzes from complex notes. (Slower)': 'जटिल नोट्समधून उच्च दर्जाच्या प्रश्नमंजुषासाठी सक्षम करा. (हळू)',
    'Difficulty': 'अडचण',
    'Tags (comma-separated)': 'टॅग (स्वल्पविरामाने विभक्त)',

    // Performance
    'Student Performance': 'विद्यार्थी कामगिरी',
    'Your Performance in': 'मध्ये तुमची कामगिरी',

    // Face & Settings
    'Face Registration': 'चेहरा नोंदणी',
    'Register Face': 'चेहरा नोंदवा',
    'Update Face ID': 'फेस आयडी अपडेट करा',
    'Register Now': 'आत्ता नोंदणी करा',
    'Account Settings': 'खाते सेटिंग्ज',
    'Face ID': 'फेस आयडी',
    'Registered': 'नोंदणीकृत',
    'Not registered': 'नोंदणीकृत नाही',
  }
}

export const setLocale = (locale: Locale) => { currentLocale = locale }
export const t = (key: string) => {
  const dict = dictionaries[currentLocale] || {}
  return dict[key] || key
}
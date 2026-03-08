import LegalPage from '@/components/landing/LegalPage';

const sections = [
  {
    title: 'Information We Collect',
    content: 'We collect information that you provide directly to us, including:',
    items: [
      'Account information (email address)',
      'Telegram connection data (chat ID for delivering alerts)',
      'Alert preferences and keyword settings',
      'Communication preferences',
    ],
  },
  {
    title: 'How We Use Your Information',
    content: 'We use the collected information to:',
    items: [
      'Provide and maintain the alert service',
      'Deliver Telegram voice call alerts when keywords match',
      'Improve our service and user experience',
      'Communicate with you about your account',
    ],
  },
  {
    title: 'Information Sharing',
    content: 'We do not sell your personal information. We may share your information with:',
    items: [
      'Apify (to monitor public X/Twitter posts)',
      'Telegram (to deliver voice call alerts)',
      'Supabase (database and authentication provider)',
      'Law enforcement when required by law',
    ],
  },
  {
    title: 'Data Security',
    content: 'We implement appropriate security measures to protect your personal information, including encryption of sensitive data, access controls, and secure data storage.',
  },
  {
    title: 'Your Rights',
    content: 'You have the right to:',
    items: [
      'Access your personal information',
      'Correct inaccurate information',
      'Request deletion of your information',
      'Export your data',
    ],
  },
  {
    title: 'Cookies and Tracking',
    content: 'We use cookies for session management and to remember your preferences. We do not use third-party tracking or advertising cookies.',
  },
  {
    title: "Children's Privacy",
    content: 'Our service is not intended for children under 18. We do not knowingly collect personal information from children.',
  },
  {
    title: 'Changes to Privacy Policy',
    content: 'We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.',
  },
];

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy" lastUpdated="March 8, 2026" sections={sections} />;
}

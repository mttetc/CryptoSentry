import LegalPage from '@/components/landing/LegalPage';

const sections = [
  {
    title: 'Acceptance of Terms',
    content: 'By accessing and using CryptoSentry, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.',
  },
  {
    title: 'Description of Service',
    content: 'CryptoSentry monitors public X/Twitter accounts for specific keywords and delivers alerts via Telegram voice calls. Our service includes:',
    items: [
      'Social media monitoring for specified accounts and keywords',
      'Real-time alert delivery via Telegram voice calls',
      'Customizable alert settings and preferences',
    ],
  },
  {
    title: 'User Accounts',
    content: 'To use our service, you must:',
    items: [
      'Be at least 18 years old',
      'Register for an account with valid information',
      'Maintain the security of your account credentials',
      'Accept responsibility for all activities under your account',
    ],
  },
  {
    title: 'Acceptable Use',
    content: 'You agree not to use CryptoSentry to:',
    items: [
      'Violate any applicable laws or regulations',
      'Harass, abuse, or harm other users',
      'Attempt to gain unauthorized access to the service',
      'Use the service for any unlawful purpose',
    ],
  },
  {
    title: 'Data Usage and Privacy',
    content: 'We collect and process data as described in our Privacy Policy. By using our service, you consent to our data practices.',
  },
  {
    title: 'Limitation of Liability',
    content: 'CryptoSentry is provided "as is" without warranties of any kind. We are not responsible for trading decisions made based on our alerts. We are not liable for any damages arising from your use of our service, including missed or delayed alerts.',
  },
  {
    title: 'Changes to Terms',
    content: 'We reserve the right to modify these terms at any time. Continued use of our service after changes constitutes acceptance of the new terms.',
  },
];

export default function TermsPage() {
  return <LegalPage title="Terms of Service" lastUpdated="March 8, 2026" sections={sections} />;
}

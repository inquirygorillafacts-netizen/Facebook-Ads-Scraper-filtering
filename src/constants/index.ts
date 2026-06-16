// Campaign name suffixes to strip from filenames
export const FILENAME_SUFFIXES_TO_STRIP = [
  '_Lead', '_Leads', '_Data', '_data', '_ads', '_Ads',
  '_output', '_Output', '_export', '_Export', '_results', '_Results',
  '_list', '_List', '_contacts', '_Contacts',
];

// CSV column name mappings (Meta Ads Library)
export const CSV_COLUMNS = {
  PAGE_ID: 'Page ID',
  PAGE_NAME: 'Page Name',
  PHONE: 'Phone',
  EMAIL: 'Email',
  FACEBOOK: 'Facebook',
  PAGE_PROFILE_URI: 'Page Profile URI',
  INSTAGRAM: 'Instagram',
  WEBSITE_URL: 'Website URL',
  FACEBOOK_AD_URL: 'Facebook AD URL',
  LINK_URL: 'Link URL',
  BODY_TEXT: 'Body Text',
} as const;

// Phone extraction patterns
export const PHONE_PATTERNS = {
  MOBILE: /[6-9]\d{9}/g,
  SEPARATOR: /[,;]/,
} as const;

// Placeholder URLs to ignore
export const IGNORED_URLS = ['fb.me', 'facebook.com', 'www.facebook.com'];

// Export column headers
export const MSG91_HEADERS = ['Mobile', 'Name'];
export const FULL_EXPORT_HEADERS = [
  'Name', 'Mobile', 'Email', 'Facebook', 'Instagram',
  'Website', 'Ads Link', 'Landing Page',
];

// Cache settings
export const CACHE_KEY = 'leadsync_cache_v1';
export const CACHE_VERSION = 1;

// Firestore settings
export const CHUNK_SIZE = 1000;
export const MAX_BATCH_SIZE = 499;

// Pagination
export const LEADS_PER_PAGE = 50;

// Navigation items
export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'BarChart3' },
  { label: 'Import', href: '/import', icon: 'Download' },
  { label: 'Database', href: '/database', icon: 'Database' },
  { label: 'Coming Soon', href: '/coming-soon', icon: 'Rocket' },
] as const;

/**
 * Theme Service
 * Manages theme switching and persistence
 */

const THEMES = {
  'MediTrust': {
    name: 'MediTrust',
    path: '/themes/MediTrust',
    description: 'Modern medical template with clean design',
    preview: '/themes/MediTrust/assets/img/health/showcase-1.webp'
  },
  'Clinic': {
    name: 'Clinic',
    path: '/themes/Clinic',
    description: 'Professional clinic template',
    preview: '/themes/Clinic/assets/img/health/facilities-1.webp'
  },
  'MediLab-1.0.0': {
    name: 'MediLab',
    path: '/themes/MediLab-1.0.0',
    description: 'Medical laboratory focused design',
    preview: '/themes/MediLab-1.0.0/assets/img/about.jpg'
  },
  'MediNest': {
    name: 'MediNest',
    path: '/themes/MediNest',
    description: 'Nest-like comfortable medical interface',
    preview: '/themes/MediNest/assets/img/health/facilities-1.webp'
  }
};

class ThemeService {
  constructor() {
    this.currentTheme = this.getStoredTheme() || 'MediTrust';
  }

  getStoredTheme() {
    try {
      return localStorage.getItem('clinic_theme') || 'MediTrust';
    } catch (e) {
      return 'MediTrust';
    }
  }

  setStoredTheme(themeName) {
    try {
      localStorage.setItem('clinic_theme', themeName);
      this.currentTheme = themeName;
    } catch (e) {
      console.error('Failed to store theme:', e);
    }
  }

  getCurrentTheme() {
    return this.currentTheme;
  }

  getThemeInfo(themeName) {
    return THEMES[themeName] || THEMES['MediTrust'];
  }

  getAllThemes() {
    return Object.keys(THEMES).map(key => ({
      id: key,
      ...THEMES[key]
    }));
  }

  async loadTheme(themeName) {
    const theme = this.getThemeInfo(themeName);
    
    // Remove existing theme stylesheets
    document.querySelectorAll('link[data-theme]').forEach(link => link.remove());
    
    // Load theme CSS
    const cssFiles = [
      `${theme.path}/assets/vendor/bootstrap/css/bootstrap.min.css`,
      `${theme.path}/assets/vendor/bootstrap-icons/bootstrap-icons.css`,
      `${theme.path}/assets/vendor/aos/aos.css`,
      `${theme.path}/assets/vendor/fontawesome-free/css/all.min.css`,
      `${theme.path}/assets/vendor/swiper/swiper-bundle.min.css`,
      `${theme.path}/assets/vendor/glightbox/css/glightbox.min.css`,
      `${theme.path}/assets/css/main.css`
    ];

    // Load CSS files
    cssFiles.forEach(href => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.setAttribute('data-theme', themeName);
      document.head.appendChild(link);
    });

    // Store theme preference
    this.setStoredTheme(themeName);
    
    return theme;
  }

  async saveThemePreference(themeName) {
    try {
      // Save to backend
      const response = await fetch('/api/settings/appearance/theme', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ value: themeName })
      });

      if (response.ok) {
        this.setStoredTheme(themeName);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to save theme preference:', error);
      // Still save locally
      this.setStoredTheme(themeName);
      return false;
    }
  }
}

export const themeService = new ThemeService();
export default themeService;


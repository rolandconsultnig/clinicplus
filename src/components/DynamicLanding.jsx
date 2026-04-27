import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from './ThemeProvider';
import MediTrustLayout from './MediTrustLayout';
import { apiService } from '../services/apiService';
import { LANDING_PAGE_DEFAULTS as LP } from '../config/landingPageDefaults.js';

const DynamicLanding = () => {
  const navigate = useNavigate();
  const { currentTheme } = useTheme();
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [landingContent, setLandingContent] = useState(null);
  const [facility, setFacility] = useState(null);
  const [subdomain, setSubdomain] = useState(null);

  // Multi-Tenant Architecture: Extract facility subdomain from hostname
  // Each facility gets its own subdomain:
  // - Development: [facility_name].localhost:4305 (e.g., elvis.localhost:4305)
  // - Production: [facility_name].clinicplus.org (e.g., elvis.clinicplus.org)
  // The subdomain identifies the tenant/facility for multi-tenant data isolation
  useEffect(() => {
    const hostname = window.location.hostname;
    // Extract subdomain (e.g., "elvis" from "elvis.clinicplus.org" or "elvis.localhost")
    const parts = hostname.split('.');
    
    // Handle subdomain patterns for multi-tenant architecture:
    // - elvis.localhost:4305 (development - clinicplus.org maps to localhost:4305)
    // - elvis.clinicplus.org (production)
    // - elvis.127.0.0.1 (development with IP)
    if (parts.length >= 2) {
      const potentialSubdomain = parts[0];
      const domain = parts.slice(1).join('.');
      
      // Allow subdomain if:
      // 1. It exists and is not empty
      // 2. It's not 'www', 'localhost', or an IP address segment
      // 3. The domain part is 'localhost' (dev) or contains 'clinicplus.org' (prod) or is a valid domain
      if (potentialSubdomain && 
          potentialSubdomain !== 'www' && 
          potentialSubdomain !== 'localhost' &&
          potentialSubdomain !== '127' &&
          !potentialSubdomain.match(/^\d+$/) &&
          (domain === 'localhost' || domain.includes('clinicplus.org') || domain.includes('.'))) {
        const extractedSubdomain = potentialSubdomain.toLowerCase();
        console.log(`[Multi-Tenant] Detected facility subdomain: ${extractedSubdomain} from hostname: ${hostname}`);
        setSubdomain(extractedSubdomain);
      }
    }
  }, []);

  useEffect(() => {
    // Load facility data if subdomain exists
    const loadFacility = async () => {
      if (subdomain) {
        try {
          const result = await apiService.request(`/facilities/by-subdomain/${subdomain}`, {
            method: 'GET',
            auth: false
          });
          if (result.success && result.facility) {
            setFacility(result.facility);
          }
        } catch (error) {
          console.error('Error loading facility:', error);
          // Facility not found or error - continue without facility-specific content
        }
      }
    };

    loadFacility();

    // Load landing page content from settings
    const loadLandingContent = async () => {
      try {
        const result = await apiService.request('/settings/landing-page', { 
          method: 'GET',
          auth: false 
        });
        if (result.success && result.content) {
          setLandingContent(result.content);
        }
      } catch (error) {
        console.error('Error loading landing page content:', error);
        // Use default content if API fails
        setLandingContent(null);
      }
    };

    loadLandingContent();

    // Initialize AOS after theme loads
    const initAOS = () => {
      if (window.AOS) {
        window.AOS.init({
          duration: 1000,
          easing: 'ease-in-out',
          once: true,
          mirror: false
        });
        window.AOS.refresh();
      } else {
        setTimeout(initAOS, 100);
      }
    };

    // Wait for theme to load
    setTimeout(() => {
      initAOS();
      setThemeLoaded(true);
    }, 500);
  }, [currentTheme, subdomain]);

  // Get theme-specific content based on current theme
  const getThemeContent = () => {
    const themePath = `/themes/${currentTheme}`;
    const content = { ...LP, ...(landingContent || {}) };

    switch (currentTheme) {
      case 'Clinic':
        return (
          <MediTrustLayout themeName="Clinic">
            <section id="hero" className="hero section">
              <div className="container" data-aos="fade-up" data-aos-delay="100">
                <div className="row align-items-center">
                  <div className="col-lg-6">
                    <div className="hero-content">
                      <div className="trust-badges mb-4" data-aos="fade-right" data-aos-delay="200">
                        <div className="badge-item">
                          <i className={`bi ${content.badge_1_icon || 'bi-shield-check'}`}></i>
                          <div>
                            <span className="d-block fw-semibold">{content.badge_1_title}</span>
                            <small className="text-muted d-block" style={{ maxWidth: '14rem' }}>{content.badge_1_subtitle}</small>
                          </div>
                        </div>
                        <div className="badge-item">
                          <i className={`bi ${content.badge_2_icon || 'bi-clock'}`}></i>
                          <div>
                            <span className="d-block fw-semibold">{content.badge_2_title}</span>
                            <small className="text-muted d-block" style={{ maxWidth: '14rem' }}>{content.badge_2_subtitle}</small>
                          </div>
                        </div>
                        <div className="badge-item">
                          <i className={`bi ${content.badge_3_icon || 'bi-star-fill'}`}></i>
                          <div>
                            <span className="d-block fw-semibold">{content.badge_3_title}</span>
                            <small className="text-muted d-block" style={{ maxWidth: '14rem' }}>{content.badge_3_subtitle}</small>
                          </div>
                        </div>
                      </div>
                      {facility && (
                        <div className="facility-badge mb-3" data-aos="fade-right" data-aos-delay="250">
                          <h2 className="text-3xl font-bold text-teal-700">{facility.facility_name}</h2>
                        </div>
                      )}
                      <h1 data-aos="fade-right" data-aos-delay="300">
                        {content.hero_title}
                      </h1>
                      <p data-aos="fade-right" data-aos-delay="400">
                        {content.hero_description}
                      </p>
                      <div className="cta-group mt-4" data-aos="fade-right" data-aos-delay="500">
                        <a 
                          href={content.hero_primary_button_link || '/login'} 
                          className="btn btn-primary" 
                          onClick={(e) => { e.preventDefault(); navigate(content.hero_primary_button_link || '/login'); }}
                        >
                          {content.hero_primary_button_text || 'Get Started'}
                        </a>
                        <a 
                          href={content.hero_secondary_button_link || '/services'} 
                          className="btn btn-outline" 
                          onClick={(e) => { e.preventDefault(); navigate(content.hero_secondary_button_link || '/services'); }}
                        >
                          {content.hero_secondary_button_text || 'Learn More'}
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-6" data-aos="fade-left" data-aos-delay="200">
                    <img src={content.hero_image || `${themePath}/assets/img/health/facilities-1.webp`} alt="Healthcare" className="img-fluid rounded" />
                  </div>
                </div>
              </div>
            </section>
          </MediTrustLayout>
        );

      case 'MediLab-1.0.0':
        return (
          <MediTrustLayout themeName="MediLab">
            <section id="hero" className="hero section light-background">
              <div className="container position-relative">
                {facility && (
                  <div className="facility-name mb-4" data-aos="fade-down" data-aos-delay="50">
                    <h1 className="text-5xl font-bold text-primary">{facility.facility_name}</h1>
                  </div>
                )}
                <div className="welcome position-relative" data-aos="fade-down" data-aos-delay="100">
                  <h2>WELCOME TO CLINIC+</h2>
                  <p>{content.hero_subtitle}</p>
                </div>
                <div className="content row gy-4">
                  <div className="col-lg-4 d-flex align-items-stretch">
                    <div className="why-box" data-aos="zoom-out" data-aos-delay="200">
                      <h3>{content.about_title}</h3>
                      <p>{content.about_description}</p>
                      <div className="text-center">
                        <a href="/login" className="more-btn" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>
                          <span>{content.hero_primary_button_text || 'Get Started'}</span> <i className="bi bi-chevron-right"></i>
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-8 d-flex align-items-stretch">
                    <div className="d-flex flex-column justify-content-center">
                      <div className="row gy-4">
                        <div className="col-xl-4 d-flex align-items-stretch">
                          <div className="icon-box" data-aos="zoom-out" data-aos-delay="300">
                            <i className={`bi ${content.badge_1_icon || 'bi-shield-check'}`}></i>
                            <h4>{content.badge_1_title}</h4>
                            <p className="small">{content.badge_1_subtitle}</p>
                          </div>
                        </div>
                        <div className="col-xl-4 d-flex align-items-stretch">
                          <div className="icon-box" data-aos="zoom-out" data-aos-delay="400">
                            <i className={`bi ${content.badge_2_icon || 'bi-telephone-fill'}`}></i>
                            <h4>{content.badge_2_title}</h4>
                            <p className="small">{content.badge_2_subtitle}</p>
                          </div>
                        </div>
                        <div className="col-xl-4 d-flex align-items-stretch">
                          <div className="icon-box" data-aos="zoom-out" data-aos-delay="500">
                            <i className={`bi ${content.feature_1_icon || 'bi-heart-pulse'}`}></i>
                            <h4>{content.feature_1_title}</h4>
                            <p className="small">{content.feature_1_description}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </MediTrustLayout>
        );

      case 'MediNest':
        return (
          <MediTrustLayout themeName="MediNest">
            <section id="hero" className="hero section">
              <div className="container">
                <div className="row align-items-center">
                  <div className="col-lg-5">
                    <div className="hero-image" data-aos="fade-right" data-aos-delay="100">
                      <img src={`${themePath}/assets/img/health/staff-8.webp`} alt="Healthcare Professional" className="img-fluid main-image" />
                    </div>
                  </div>
                  <div className="col-lg-7">
                    <div className="hero-content" data-aos="fade-left" data-aos-delay="200">
                      {facility && (
                        <div className="facility-name mb-3" data-aos="fade-left" data-aos-delay="150">
                          <h2 className="text-4xl font-bold text-gray-900">{facility.facility_name}</h2>
                        </div>
                      )}
                      <div className="badge-container">
                        <span className="hero-badge">{content.hero_subtitle}</span>
                      </div>
                      <h1 className="hero-title">{content.hero_title}</h1>
                      <p className="hero-description">{content.hero_description}</p>
                      <div className="cta-group mt-4">
                        <a href="/login" className="btn btn-primary" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>{content.hero_primary_button_text || 'Get Started'}</a>
                        <a href="/services" className="btn btn-outline" onClick={(e) => { e.preventDefault(); navigate('/services'); }}>{content.hero_secondary_button_text || 'Learn More'}</a>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="row gy-4 mt-2 mb-5">
                  <div className="col-md-4" data-aos="fade-up" data-aos-delay="250">
                    <div className="p-4 border rounded-3 h-100 bg-light">
                      <h3 className="h5 fw-bold">{content.feature_1_title}</h3>
                      <p className="text-muted small mb-0">{content.feature_1_description}</p>
                    </div>
                  </div>
                  <div className="col-md-4" data-aos="fade-up" data-aos-delay="300">
                    <div className="p-4 border rounded-3 h-100 bg-light">
                      <h3 className="h5 fw-bold">{content.feature_2_title}</h3>
                      <p className="text-muted small mb-0">{content.feature_2_description}</p>
                    </div>
                  </div>
                  <div className="col-md-4" data-aos="fade-up" data-aos-delay="350">
                    <div className="p-4 border rounded-3 h-100 bg-light">
                      <h3 className="h5 fw-bold">{content.feature_3_title}</h3>
                      <p className="text-muted small mb-0">{content.feature_3_description}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </MediTrustLayout>
        );

      default: // MediTrust
        return (
          <MediTrustLayout>
            <section id="hero" className="hero section dark-background">
              <div className="container-fluid p-0">
                <div className="hero-wrapper">
                  <div className="hero-image">
                    <img src={content.hero_image || `${themePath}/assets/img/health/showcase-1.webp`} alt="Advanced Healthcare" className="img-fluid" />
                  </div>
                  <div className="hero-content">
                    <div className="container">
                      <div className="row">
                        <div className="col-lg-7 col-md-10" data-aos="fade-right" data-aos-delay="100">
                          <div className="content-box">
                            {facility && (
                              <div className="facility-name mb-3" data-aos="fade-up" data-aos-delay="100">
                                <h2 className="text-4xl font-bold text-white mb-2">{facility.facility_name}</h2>
                              </div>
                            )}
                            <span className="badge-accent" data-aos="fade-up" data-aos-delay="150">
                              {content.hero_subtitle}
                            </span>
                            <h1 data-aos="fade-up" data-aos-delay="200">
                              {facility?.facility_type === 'pharmacy'
                                ? 'Your Trusted Pharmacy Partner'
                                : content.hero_title}
                            </h1>
                            <p data-aos="fade-up" data-aos-delay="250">
                              {facility?.facility_type === 'pharmacy'
                                ? 'Professional pharmacy services with prescription management, medication counseling, and comprehensive care.'
                                : content.hero_description}
                            </p>
                            <div className="cta-group" data-aos="fade-up" data-aos-delay="300">
                              <a 
                                href={content.hero_primary_button_link || '/login'} 
                                className="btn btn-primary" 
                                onClick={(e) => { e.preventDefault(); navigate(content.hero_primary_button_link || '/login'); }}
                              >
                                {content.hero_primary_button_text || 'Get Started'}
                              </a>
                              <a 
                                href={content.hero_secondary_button_link || '/services'} 
                                className="btn btn-outline" 
                                onClick={(e) => { e.preventDefault(); navigate(content.hero_secondary_button_link || '/services'); }}
                              >
                                {content.hero_secondary_button_text || 'Explore Services'}
                              </a>
                            </div>
                            <div className="info-badges" data-aos="fade-up" data-aos-delay="350">
                              <div className="badge-item">
                                <i className={`bi ${content.badge_2_icon || 'bi-telephone-fill'}`}></i>
                                <div className="badge-content">
                                  <span>{content.badge_2_title}</span>
                                  <strong>{content.badge_2_subtitle}</strong>
                                </div>
                              </div>
                              <div className="badge-item">
                                <i className={`bi ${content.badge_1_icon || 'bi-shield-check-fill'}`}></i>
                                <div className="badge-content">
                                  <span>{content.badge_1_title}</span>
                                  <strong>{content.badge_1_subtitle}</strong>
                                </div>
                              </div>
                              <div className="badge-item">
                                <i className={`bi ${content.badge_3_icon || 'bi-star-fill'}`}></i>
                                <div className="badge-content">
                                  <span>{content.badge_3_title}</span>
                                  <strong>{content.badge_3_subtitle}</strong>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="features-wrapper">
                        <div className="row gy-4">
                          <div className="col-lg-4">
                            <div className="feature-item" data-aos="fade-up" data-aos-delay="450">
                              <div className="feature-icon">
                                <i className={`bi ${content.feature_1_icon || 'bi-heart-pulse-fill'}`}></i>
                              </div>
                              <div className="feature-text">
                                <h3>{content.feature_1_title}</h3>
                                <p>{content.feature_1_description}</p>
                              </div>
                            </div>
                          </div>
                          <div className="col-lg-4">
                            <div className="feature-item" data-aos="fade-up" data-aos-delay="500">
                              <div className="feature-icon">
                                <i className={`bi ${content.feature_2_icon || 'bi-calendar-check-fill'}`}></i>
                              </div>
                              <div className="feature-text">
                                <h3>{content.feature_2_title}</h3>
                                <p>{content.feature_2_description}</p>
                              </div>
                            </div>
                          </div>
                          <div className="col-lg-4">
                            <div className="feature-item" data-aos="fade-up" data-aos-delay="550">
                              <div className="feature-icon">
                                <i className={`bi ${content.feature_3_icon || 'bi-capsule'}`}></i>
                              </div>
                              <div className="feature-text">
                                <h3>{content.feature_3_title}</h3>
                                <p>{content.feature_3_description}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </MediTrustLayout>
        );
    }
  };

  if (!themeLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading theme...</p>
        </div>
      </div>
    );
  }

  return getThemeContent();
};

export default DynamicLanding;


import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from './ThemeProvider';
import MediTrustLayout from './MediTrustLayout';
import { apiService } from '../services/apiService';

const DynamicLanding = () => {
  const navigate = useNavigate();
  const { currentTheme } = useTheme();
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [landingContent, setLandingContent] = useState(null);

  useEffect(() => {
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
  }, [currentTheme]);

  // Get theme-specific content based on current theme
  const getThemeContent = () => {
    const themePath = `/themes/${currentTheme}`;
    
    switch (currentTheme) {
      case 'Clinic':
        const clinicContent = landingContent || {};
        return (
          <MediTrustLayout themeName="Clinic">
            <section id="hero" className="hero section">
              <div className="container" data-aos="fade-up" data-aos-delay="100">
                <div className="row align-items-center">
                  <div className="col-lg-6">
                    <div className="hero-content">
                      <div className="trust-badges mb-4" data-aos="fade-right" data-aos-delay="200">
                        <div className="badge-item">
                          <i className={`bi ${clinicContent.badge_1_icon || 'bi-shield-check'}`}></i>
                          <span>{clinicContent.badge_1_title || 'HIPAA Compliant'}</span>
                        </div>
                        <div className="badge-item">
                          <i className={`bi ${clinicContent.badge_2_icon || 'bi-clock'}`}></i>
                          <span>{clinicContent.badge_2_title || '24/7 Support'}</span>
                        </div>
                        <div className="badge-item">
                          <i className={`bi ${clinicContent.badge_3_icon || 'bi-star-fill'}`}></i>
                          <span>{clinicContent.badge_3_title || 'Patient-Centered'}</span>
                        </div>
                      </div>
                      <h1 data-aos="fade-right" data-aos-delay="300">
                        {clinicContent.hero_title || 'Advanced Healthcare Management Platform'}
                      </h1>
                      <p data-aos="fade-right" data-aos-delay="400">
                        {clinicContent.hero_description || 'Clinic+ empowers patients with complete control over their medical records while providing healthcare providers with powerful tools for exceptional care delivery.'}
                      </p>
                      <div className="cta-group mt-4" data-aos="fade-right" data-aos-delay="500">
                        <a 
                          href={clinicContent.hero_primary_button_link || '/login'} 
                          className="btn btn-primary" 
                          onClick={(e) => { e.preventDefault(); navigate(clinicContent.hero_primary_button_link || '/login'); }}
                        >
                          {clinicContent.hero_primary_button_text || 'Get Started'}
                        </a>
                        <a 
                          href={clinicContent.hero_secondary_button_link || '/services'} 
                          className="btn btn-outline" 
                          onClick={(e) => { e.preventDefault(); navigate(clinicContent.hero_secondary_button_link || '/services'); }}
                        >
                          {clinicContent.hero_secondary_button_text || 'Learn More'}
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-6" data-aos="fade-left" data-aos-delay="200">
                    <img src={clinicContent.hero_image || `${themePath}/assets/img/health/facilities-1.webp`} alt="Healthcare" className="img-fluid rounded" />
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
                <div className="welcome position-relative" data-aos="fade-down" data-aos-delay="100">
                  <h2>WELCOME TO CLINIC+</h2>
                  <p>Universal Patient-Owned Health Ecosystem</p>
                </div>
                <div className="content row gy-4">
                  <div className="col-lg-4 d-flex align-items-stretch">
                    <div className="why-box" data-aos="zoom-out" data-aos-delay="200">
                      <h3>Why Choose Clinic+?</h3>
                      <p>Complete control over your medical records with enterprise-grade security and seamless healthcare provider integration.</p>
                      <div className="text-center">
                        <a href="/login" className="more-btn" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>
                          <span>Get Started</span> <i className="bi bi-chevron-right"></i>
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-8 d-flex align-items-stretch">
                    <div className="d-flex flex-column justify-content-center">
                      <div className="row gy-4">
                        <div className="col-xl-4 d-flex align-items-stretch">
                          <div className="icon-box" data-aos="zoom-out" data-aos-delay="300">
                            <i className="bi bi-shield-check"></i>
                            <h4>HIPAA Compliant</h4>
                            <p>Enterprise-grade security with full compliance</p>
                          </div>
                        </div>
                        <div className="col-xl-4 d-flex align-items-stretch">
                          <div className="icon-box" data-aos="zoom-out" data-aos-delay="400">
                            <i className="bi bi-person-check"></i>
                            <h4>Patient-Owned</h4>
                            <p>You control your medical data</p>
                          </div>
                        </div>
                        <div className="col-xl-4 d-flex align-items-stretch">
                          <div className="icon-box" data-aos="zoom-out" data-aos-delay="500">
                            <i className="bi bi-heart-pulse"></i>
                            <h4>Comprehensive Care</h4>
                            <p>Complete healthcare management platform</p>
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
                      <div className="badge-container">
                        <span className="hero-badge">Trusted Healthcare Platform</span>
                      </div>
                      <h1 className="hero-title">Excellence in Medical Care Management</h1>
                      <p className="hero-description">Clinic+ provides comprehensive healthcare management with patient-centered design, ensuring you have complete control over your medical records.</p>
                      <div className="cta-group mt-4">
                        <a href="/login" className="btn btn-primary" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Get Started</a>
                        <a href="/services" className="btn btn-outline" onClick={(e) => { e.preventDefault(); navigate('/services'); }}>Learn More</a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </MediTrustLayout>
        );

      default: // MediTrust
        const content = landingContent || {};
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
                            <span className="badge-accent" data-aos="fade-up" data-aos-delay="150">
                              {content.hero_subtitle || 'Universal Patient-Owned Health Ecosystem'}
                            </span>
                            <h1 data-aos="fade-up" data-aos-delay="200">
                              {content.hero_title || 'Advanced Medical Care for Your Family\'s Health'}
                            </h1>
                            <p data-aos="fade-up" data-aos-delay="250">
                              {content.hero_description || 'Clinic+ is a comprehensive, patient-centered healthcare platform that puts you in control of your medical records while connecting you with trusted healthcare providers.'}
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
                                  <span>{content.badge_2_title || 'Emergency Line'}</span>
                                  <strong>{content.badge_2_subtitle || '24/7 Support Available'}</strong>
                                </div>
                              </div>
                              <div className="badge-item">
                                <i className={`bi ${content.badge_1_icon || 'bi-shield-check-fill'}`}></i>
                                <div className="badge-content">
                                  <span>{content.badge_1_title || 'HIPAA Compliant'}</span>
                                  <strong>{content.badge_1_subtitle || 'Secure & Private'}</strong>
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
                                <h3>{content.feature_1_title || 'Patient Records'}</h3>
                                <p>{content.feature_1_description || 'Own and control your complete medical history with secure, encrypted storage.'}</p>
                              </div>
                            </div>
                          </div>
                          <div className="col-lg-4">
                            <div className="feature-item" data-aos="fade-up" data-aos-delay="500">
                              <div className="feature-icon">
                                <i className={`bi ${content.feature_2_icon || 'bi-calendar-check-fill'}`}></i>
                              </div>
                              <div className="feature-text">
                                <h3>{content.feature_2_title || 'Appointments'}</h3>
                                <p>{content.feature_2_description || 'Schedule and manage appointments with healthcare providers seamlessly.'}</p>
                              </div>
                            </div>
                          </div>
                          <div className="col-lg-4">
                            <div className="feature-item" data-aos="fade-up" data-aos-delay="550">
                              <div className="feature-icon">
                                <i className={`bi ${content.feature_3_icon || 'bi-capsule'}`}></i>
                              </div>
                              <div className="feature-text">
                                <h3>{content.feature_3_title || 'ePrescribing'}</h3>
                                <p>{content.feature_3_description || 'Digital prescriptions with drug interaction checks and pharmacy integration.'}</p>
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading theme...</p>
        </div>
      </div>
    );
  }

  return getThemeContent();
};

export default DynamicLanding;


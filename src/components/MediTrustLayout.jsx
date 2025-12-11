import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from './ThemeProvider';

const MediTrustLayout = ({ children, themeName }) => {
  const navigate = useNavigate();
  const { currentTheme } = useTheme();
  const activeTheme = themeName || currentTheme;
  const themePath = `/themes/${activeTheme}`;

  useEffect(() => {
    // Load Bootstrap and other vendor scripts
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    };

    // Load AOS (Animate On Scroll)
    const aosPath = `${themePath}/assets/vendor/aos/aos.js`;
    if (!window.AOS) {
      loadScript(aosPath).then(() => {
        if (window.AOS) {
          window.AOS.init({
            duration: 1000,
            easing: 'ease-in-out',
            once: true,
            mirror: false
          });
        }
      }).catch(() => {
        // Fallback to MediTrust AOS if theme doesn't have it
        loadScript('/themes/MediTrust/assets/vendor/aos/aos.js');
      });
    } else {
      window.AOS.refresh();
    }

    // Load main.js for mobile nav toggle
    const mainJsPath = `${themePath}/assets/js/main.js`;
    if (!document.querySelector(`script[src="${mainJsPath}"]`)) {
      loadScript(mainJsPath).catch(() => {
        // Fallback to MediTrust main.js
        loadScript('/themes/MediTrust/assets/js/main.js');
      });
    }

    // Toggle scrolled class on scroll
    const handleScroll = () => {
      const body = document.querySelector('body');
      const header = document.querySelector('#header');
      if (header && !header.classList.contains('scroll-up-sticky') && 
          !header.classList.contains('sticky-top') && 
          !header.classList.contains('fixed-top')) return;
      if (window.scrollY > 100) {
        body?.classList.add('scrolled');
      } else {
        body?.classList.remove('scrolled');
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleMobileNavToggle = () => {
    const body = document.querySelector('body');
    const mobileNavToggleBtn = document.querySelector('.mobile-nav-toggle');
    if (body && mobileNavToggleBtn) {
      body.classList.toggle('mobile-nav-active');
      mobileNavToggleBtn.classList.toggle('bi-list');
      mobileNavToggleBtn.classList.toggle('bi-x');
    }
  };

  return (
    <div className="index-page">
      {/* Header */}
      <header id="header" className="header d-flex align-items-center fixed-top">
        <div className="header-container container-fluid container-xl position-relative d-flex align-items-center justify-content-between">
          <a href="/" className="logo d-flex align-items-center me-auto me-xl-0" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
            <img src="/logo.png" alt="Clinic+" style={{ height: '40px', marginRight: '10px' }} />
            <h1 className="sitename">Clinic+</h1>
          </a>

          <nav id="navmenu" className="navmenu">
            <ul>
              <li><a href="/" className="active" onClick={(e) => { e.preventDefault(); navigate('/'); }}>Home</a></li>
              <li><a href="/about" onClick={(e) => { e.preventDefault(); navigate('/about'); }}>About</a></li>
              <li><a href="/departments" onClick={(e) => { e.preventDefault(); navigate('/departments'); }}>Departments</a></li>
              <li><a href="/services" onClick={(e) => { e.preventDefault(); navigate('/services'); }}>Services</a></li>
              <li><a href="/doctors" onClick={(e) => { e.preventDefault(); navigate('/doctors'); }}>Doctors</a></li>
              <li className="dropdown">
                <a href="#"><span>More</span> <i className="bi bi-chevron-down toggle-dropdown"></i></a>
                <ul>
                  <li><a href="/appointment" onClick={(e) => { e.preventDefault(); navigate('/appointment'); }}>Appointment</a></li>
                  <li><a href="/testimonials" onClick={(e) => { e.preventDefault(); navigate('/testimonials'); }}>Testimonials</a></li>
                  <li><a href="/faq" onClick={(e) => { e.preventDefault(); navigate('/faq'); }}>FAQ</a></li>
                  <li><a href="/gallery" onClick={(e) => { e.preventDefault(); navigate('/gallery'); }}>Gallery</a></li>
                </ul>
              </li>
              <li><a href="/contact" onClick={(e) => { e.preventDefault(); navigate('/contact'); }}>Contact</a></li>
            </ul>
            <i className="mobile-nav-toggle d-xl-none bi bi-list" onClick={handleMobileNavToggle}></i>
          </nav>

          <a className="btn-getstarted" href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Login</a>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        {children}
      </main>

      {/* Footer */}
      <footer id="footer" className="footer position-relative">
        <div className="container footer-top">
          <div className="row gy-4">
            <div className="col-lg-4 col-md-6 footer-about">
              <a href="/" className="logo d-flex align-items-center">
                <img src="/logo.png" alt="Clinic+" style={{ height: '40px', marginRight: '10px' }} />
                <span className="sitename">Clinic+</span>
              </a>
              <div className="footer-contact pt-3">
                <p>A108 Adam Street</p>
                <p>New York, NY 535022</p>
                <p className="mt-3"><strong>Phone:</strong> <span>+1 5589 55488 55</span></p>
                <p><strong>Email:</strong> <span>info@clinicplus.com</span></p>
              </div>
            </div>

            <div className="col-lg-2 col-md-3 footer-links">
              <h4>Useful Links</h4>
              <ul>
                <li><a href="/">Home</a></li>
                <li><a href="/about">About us</a></li>
                <li><a href="/services">Services</a></li>
                <li><a href="/terms">Terms of service</a></li>
                <li><a href="/privacy">Privacy policy</a></li>
              </ul>
            </div>

            <div className="col-lg-2 col-md-3 footer-links">
              <h4>Our Services</h4>
              <ul>
                <li><a href="/departments">Departments</a></li>
                <li><a href="/doctors">Doctors</a></li>
                <li><a href="/appointment">Appointment</a></li>
                <li><a href="/emergency">Emergency Care</a></li>
              </ul>
            </div>

            <div className="col-lg-4 col-md-12 footer-newsletter">
              <h4>Our Newsletter</h4>
              <p>Subscribe to our newsletter to get updates on our latest services and health tips.</p>
              <form action="forms/newsletter.php" method="post" className="php-email-form">
                <div className="newsletter-input-group d-flex">
                  <input type="email" name="email" className="form-control" placeholder="Enter your Email" required />
                  <input type="submit" className="btn btn-primary" value="Subscribe" />
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="container copyright text-center mt-4">
          <p>© <span>Copyright</span> <strong className="px-1">Clinic+</strong> <span>All Rights Reserved</span></p>
          <div className="credits">
            Designed by <a href="https://bootstrapmade.com/">BootstrapMade</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MediTrustLayout;


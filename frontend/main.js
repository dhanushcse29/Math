document.addEventListener('DOMContentLoaded', function() {
  let user = null;
  
  // Base URL configuration
  const BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000'
    : 'https://mathhelper-k8al.onrender.com';

  // Update all fetch calls to use BASE_URL
  async function fetchWithBase(url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
    return fetch(fullUrl, {
      ...options,
      credentials: 'include'
    });
  }

  function showModal(html) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = html;
    const container = document.getElementById('modal-container');
    container.innerHTML = '';
    container.appendChild(modal);
    container.classList.add('active');
  }
  function closeModal() {
    document.getElementById('modal-container').classList.remove('active');
  }
  document.getElementById('modal-container').addEventListener('click', e => {
    if (e.target.id === 'modal-container') closeModal();
  });

  // Navbar links
  const loginLink = document.getElementById('login-link');
  const dashboardLink = document.getElementById('dashboard-link');
  const userDropdown = document.getElementById('user-dropdown');
  const userNameSpan = document.getElementById('user-name');

  function updateNavbar() {
    if (user) {
      loginLink.style.display = 'none';
      dashboardLink.style.display = '';
      userDropdown.style.display = 'flex';
      userNameSpan.textContent = user.username || (user.role === 'admin' ? 'Admin' : 'Student');
    } else {
      loginLink.style.display = '';
      dashboardLink.style.display = 'none';
      userDropdown.style.display = 'none';
      userNameSpan.textContent = '';
    }
  }

  // Announcements auto-scroll
  function autoScrollAnnouncements() {
    const container = document.querySelector('.announcements-scroll');
    if (!container) return;
    let scrollAmount = 0;
    let direction = 1;
    let paused = false;
    container.addEventListener('mouseenter', () => { paused = true; });
    container.addEventListener('mouseleave', () => { paused = false; });
    setInterval(() => {
      if (paused || container.scrollWidth <= container.clientWidth) return;
      if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 2) direction = -1;
      if (container.scrollLeft <= 2) direction = 1;
      container.scrollLeft += direction * 1.5;
    }, 20);
  }

  // Announcements
  async function loadAnnouncements() {
    const res = await fetch('/api/announcements');
    if (!res.ok) return;
    const data = await res.json();
    const list = document.getElementById('announcements-list');
    list.innerHTML = '';
    data.forEach(a => {
      const div = document.createElement('div');
      div.className = 'announcement';
      div.innerHTML = `<strong>${a.creator?.username || 'Admin'}:</strong> ${a.message} <br><small>${new Date(a.createdAt).toLocaleString()}</small>`;
      list.appendChild(div);
    });
    autoScrollAnnouncements();
  }

  // Login modal
  loginLink.addEventListener('click', function(e) {
    e.preventDefault();
    showModal(`
      <h2>Login</h2>
      <form id="login-form">
        <input type="text" name="username" placeholder="Username" required>
        <input type="password" name="password" placeholder="Password" required>
        <button type="submit">Login</button>
      </form>
      <button type="button" id="cancel-login-btn">Cancel</button>
      <div id="login-error" style="color:red;"></div>
    `);
    document.getElementById('login-form').onsubmit = async e => {
      e.preventDefault();
      const form = e.target;
      const usernameInput = form.querySelector('input[name="username"]').value.trim();
      const passwordInput = form.querySelector('input[name="password"]').value;
      const errorDiv = document.getElementById('login-error');
      
      try {
        const res = await fetchWithBase('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: usernameInput,
            password: passwordInput
          })
        });
        const data = await res.json();
        if (!res.ok) {
          errorDiv.textContent = data.message || 'Login failed. Please try again.';
          errorDiv.style.display = 'block';
          return;
        }
        user = { role: data.role, mustChangePassword: data.mustChangePassword, username: data.username || usernameInput };
        closeModal();
        updateNavbar();
        if (user.mustChangePassword) showChangePassword();
        else if (user.role === 'admin') showDashboard();
        else showStudentView();
      } catch (err) {
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.style.display = 'block';
      }
    };
    document.getElementById('cancel-login-btn').onclick = closeModal;
  });

  dashboardLink.addEventListener('click', function(e) {
    e.preventDefault();
    if (!user) return;
    // Close mobile menu if open
    const navbarLinks = document.getElementById('navbar-links');
    if (navbarLinks && navbarLinks.classList.contains('open')) {
      navbarLinks.classList.remove('open');
    }
    showDashboard();
  });

  function showChangePassword() {
    showModal(`
      <h2>Change Password</h2>
      <form id="change-pw-form">
        <input type="password" name="oldPassword" placeholder="Old Password" required>
        <input type="password" name="newPassword" placeholder="New Password (min 6 chars)" required>
        <button type="submit">Change</button>
      </form>
      <button type="button" id="cancel-change-btn">Cancel</button>
      <div id="pw-error" style="color:red;"></div>
    `);
    document.getElementById('change-pw-form').onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword: fd.get('oldPassword'),
          newPassword: fd.get('newPassword')
        })
      });
      const data = await res.json();
      if (!res.ok) {
        document.getElementById('pw-error').textContent = data.message;
        return;
      }
      user.mustChangePassword = false;
      closeModal();
      if (user.role === 'admin') showDashboard();
      else showStudentView();
    };
    document.getElementById('cancel-change-btn').onclick = closeModal;
  }

  function showDashboard() {
    Promise.all([
      fetchWithBase('/api/materials').then(r => {
        if (!r.ok) throw new Error('Failed to fetch materials');
        return r.json();
      }),
      fetchWithBase('/api/students').then(r => {
        if (!r.ok) throw new Error('Failed to fetch students');
        return r.json();
      }),
      fetchWithBase('/api/announcements').then(r => {
        if (!r.ok) throw new Error('Failed to fetch announcements');
        return r.json();
      })
    ]).then(([materials, students, announcements]) => {
      if (!Array.isArray(materials)) {
        console.error('Materials data is not an array:', materials);
        materials = [];
      }
      if (!Array.isArray(students)) {
        console.error('Students data is not an array:', students);
        students = [];
      }
      if (!Array.isArray(announcements)) {
        console.error('Announcements data is not an array:', announcements);
        announcements = [];
      }
      
      showModal(`
        <div class="dashboard">
          <h2>${user.role === 'admin' ? 'Admin Dashboard' : 'Student Dashboard'}</h2>
          <button id="logout-btn">Logout</button>
          <button type="button" id="cancel-dashboard-btn" style="margin-left:1rem;">Cancel</button>
          ${user.role === 'admin' ? `
          <div class="dashboard-section">
            <h3>Upload Study Material</h3>
            <form id="upload-form">
              <input type="text" name="title" placeholder="Title" required>
              <textarea name="description" placeholder="Description"></textarea>
              <input type="file" name="file" accept=".pdf,.txt" required>
              <button type="submit">Upload</button>
            </form>
            <div id="upload-msg"></div>
          </div>
          <div class="dashboard-section">
            <h3>Study Materials</h3>
            <ul class="material-list">
              ${materials.map(m => `<li>${m.title} <a href="/api/materials/download/${m._id}">Download</a></li>`).join('')}
            </ul>
          </div>
          <div class="dashboard-section">
            <h3>Students</h3>
            <form id="create-student-form">
              <input type="text" name="username" placeholder="Username" required>
              <input type="password" name="password" placeholder="Default Password" required>
              <button type="submit">Create Student</button>
            </form>
            <ul class="student-list">
              ${students.map(s => `<li>${s.username} <button data-username="${s.username}" class="reset-btn">Reset Password</button></li>`).join('')}
            </ul>
          </div>
          <div class="dashboard-section">
            <h3>Post Announcement</h3>
            <form id="announce-form">
              <textarea name="message" placeholder="Announcement" required></textarea>
              <button type="submit">Post</button>
            </form>
          </div>
          <div class="dashboard-section">
            <h3>Announcements</h3>
            <ul class="material-list">
              ${announcements.map(a => `<li>${a.message} <small>by ${a.creator?.username || 'Admin'} (${new Date(a.createdAt).toLocaleString()})</small></li>`).join('')}
            </ul>
          </div>
          ` : `
          <div class="dashboard-section">
            <h3>Study Materials</h3>
            <ul class="material-list">
              ${materials.map(m => `<li>${m.title} <a href="/api/materials/download/${m._id}">Download</a></li>`).join('')}
            </ul>
          </div>
          `}
        </div>
      `);
      document.getElementById('logout-btn').onclick = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        user = null;
        updateNavbar();
        closeModal();
      };
      document.getElementById('cancel-dashboard-btn').onclick = closeModal;
      if (user.role === 'admin') {
        document.getElementById('upload-form').onsubmit = async e => {
          e.preventDefault();
          const fd = new FormData(e.target);
          const res = await fetch('/api/materials/upload', {
            method: 'POST',
            body: fd
          });
          const data = await res.json();
          document.getElementById('upload-msg').textContent = data.message;
          if (res.ok) showDashboard();
        };
        document.getElementById('create-student-form').onsubmit = async e => {
          e.preventDefault();
          const fd = new FormData(e.target);
          const res = await fetch('/api/students/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: fd.get('username'),
              password: fd.get('password')
            })
          });
          const data = await res.json();
          if (res.ok) showDashboard();
          else alert(data.message);
        };
        document.querySelectorAll('.reset-btn').forEach(btn => {
          btn.onclick = async () => {
            const newPassword = prompt('Enter new password for ' + btn.dataset.username);
            if (!newPassword) return;
            const res = await fetch('/api/students/reset-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: btn.dataset.username, newPassword })
            });
            const data = await res.json();
            if (res.ok) showDashboard();
            else alert(data.message);
          };
        });
        document.getElementById('announce-form').onsubmit = async e => {
          e.preventDefault();
          const fd = new FormData(e.target);
          const res = await fetch('/api/announcements/post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: fd.get('message') })
          });
          const data = await res.json();
          if (res.ok) showDashboard();
          else alert(data.message);
        };
      }
    }).catch(error => {
      console.error('Dashboard error:', error);
      showModal(`
        <div class="dashboard">
          <h2>Error</h2>
          <p>Failed to load dashboard. Please try logging in again.</p>
          <button id="reload-dashboard-btn">Reload Page</button>
        </div>
      `);
      document.getElementById('reload-dashboard-btn').addEventListener('click', () => {
        window.location.reload();
      });
    });
  }

  function showStudentView() {
    fetch('/api/materials').then(r => r.json()).then(materials => {
      showModal(`
        <div class="dashboard">
          <h2>Study Materials</h2>
          <button id="logout-btn">Logout</button>
          <ul class="material-list">
            ${materials.map(m => `<li>${m.title} <a href="/api/materials/download/${m._id}">Download</a></li>`).join('')}
          </ul>
        </div>
      `);
      document.getElementById('logout-btn').onclick = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        user = null;
        closeModal();
        updateNavbar();
      };
    });
  }

  async function checkSession() {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.loggedIn) {
      user = { role: data.role, mustChangePassword: data.mustChangePassword, username: data.username };
      updateNavbar();
      if (user.mustChangePassword) showChangePassword();
      else if (user.role === 'admin') showDashboard();
      else showStudentView();
    }
  }

  // Add a function to check session status
  async function checkSessionStatus() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await res.json();
      if (!data.loggedIn) {
        // Session expired or invalid
        user = null;
        updateNavbar();
        showModal(`
          <div class="dashboard">
            <h2>Session Expired</h2>
            <p>Your session has expired. Please log in again.</p>
            <button id="login-again-btn">Login Again</button>
          </div>
        `);
        document.getElementById('login-again-btn').addEventListener('click', () => {
          closeModal();
          loginLink.click();
        });
      }
    } catch (error) {
      console.error('Session check failed:', error);
    }
  }

  // Check session status periodically
  setInterval(checkSessionStatus, 5 * 60 * 1000); // Check every 5 minutes

  checkSession();

  // On load
  updateNavbar();
  loadAnnouncements();

  // Hero CTA scrolls to announcements
  const heroCta = document.getElementById('hero-cta');
  if (heroCta) {
    heroCta.onclick = () => {
      document.getElementById('announcements-section').scrollIntoView({ behavior: 'smooth' });
    };
  }

  // Footer year
  const footerYear = document.getElementById('footer-year');
  if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
  }

  // Footer login/dashboard links
  const footerLogin = document.getElementById('footer-login');
  if (footerLogin) {
    footerLogin.onclick = (e) => {
      e.preventDefault();
      loginLink.click();
    };
  }
  const footerDashboard = document.getElementById('footer-dashboard');
  if (footerDashboard) {
    footerDashboard.onclick = (e) => {
      e.preventDefault();
      dashboardLink.click();
    };
  }

  // Responsive navbar toggle
  const navbarToggle = document.getElementById('navbar-toggle');
  const navbarLinks = document.getElementById('navbar-links');
  if (navbarToggle && navbarLinks) {
    navbarToggle.onclick = () => {
      navbarLinks.classList.toggle('open');
    };
    // Close menu when a link is clicked (mobile UX)
    navbarLinks.querySelectorAll('a').forEach(link => {
      link.onclick = () => {
        navbarLinks.classList.remove('open');
      };
    });
  }
}); 
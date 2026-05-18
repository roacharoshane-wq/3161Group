import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000';

const emptyRegisterForm = {
  role: 'student',
  student_no: '',
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  created_by_admin_id: 1,
};

function App() {
  const [loginForm, setLoginForm] = useState({ role: 'student', email: '', password: '' });
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm);

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [message, setMessage] = useState('');

  const selectedCourse = useMemo(
    () => courses.find(c => String(c.course_id) === String(selectedCourseId)),
    [courses, selectedCourseId]
  );

  function updateLogin(field, value) {
    setLoginForm(prev => ({ ...prev, [field]: value }));
  }

  function updateRegister(field, value) {
    setRegisterForm(prev => ({ ...prev, [field]: value }));
  }

  function credentials(extra = {}) {
    if (!currentUser) return extra;

    return {
      role: currentUser.role,
      email: currentUser.email,
      password: currentUser.password,
      ...extra,
    };
  }

  async function apiRequest(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    if (!res.ok) {
      throw new Error(data.error || `Request failed with status ${res.status}`);
    }

    return data;
  }

  async function handleRegister(e) {
    e.preventDefault();

    try {
      const body = { ...registerForm };

      if (body.role !== 'student') {
        delete body.student_no;
      }

      const data = await apiRequest('/register_user', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      setMessage(`${data.role} created successfully. New ID: ${data.user_id}`);
      setRegisterForm(emptyRegisterForm);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();

    try {
      const data = await apiRequest('/login', {
        method: 'POST',
        body: JSON.stringify(loginForm),
      });

      const user = {
        ...data.user,
        role: data.role,
        email: loginForm.email,
        password: loginForm.password,
      };

      localStorage.setItem('currentUser', JSON.stringify(user));
      setCurrentUser(user);
      setMessage(`Logged in as ${data.role}: ${loginForm.email}`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  function logout() {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setMessage('Logged out.');
  }

  async function loadCourses() {
    try {
      const data = await apiRequest('/courses');
      setCourses(data.courses || []);
      setMessage(`Loaded ${(data.courses || []).length} courses.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function registerForCourse(courseId) {
    try {
      const data = await apiRequest(`/courses/${courseId}/register`, {
        method: 'POST',
        body: JSON.stringify(credentials()),
      });

      setMessage(data.success || 'Registered for course.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    loadCourses();
  }, []);

  return (
    <main style={{ maxWidth: 1100, margin: '30px auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>COMP3161 Course Management System</h1>

      {currentUser && (
        <div style={{ padding: 15, border: '1px solid #ddd', borderRadius: 10, marginBottom: 20 }}>
          <strong>Logged in as:</strong> {currentUser.first_name} {currentUser.last_name} ({currentUser.role})
          <br />
          <button onClick={logout} style={{ marginTop: 10 }}>Logout</button>
        </div>
      )}

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <form onSubmit={handleLogin} style={{ border: '1px solid #ddd', padding: 20, borderRadius: 10 }}>
          <h2>Login</h2>

          <label>Role</label>
          <select value={loginForm.role} onChange={e => updateLogin('role', e.target.value)}>
            <option value="student">Student</option>
            <option value="lecturer">Lecturer</option>
            <option value="admin">Admin</option>
          </select>

          <label>Email</label>
          <input value={loginForm.email} onChange={e => updateLogin('email', e.target.value)} />

          <label>Password</label>
          <input
            type="password"
            value={loginForm.password}
            onChange={e => updateLogin('password', e.target.value)}
          />

          <button type="submit">Login</button>
        </form>

        <form onSubmit={handleRegister} style={{ border: '1px solid #ddd', padding: 20, borderRadius: 10 }}>
          <h2>Register User</h2>

          <label>Role</label>
          <select value={registerForm.role} onChange={e => updateRegister('role', e.target.value)}>
            <option value="student">Student</option>
            <option value="lecturer">Lecturer</option>
            <option value="admin">Admin</option>
          </select>

          {registerForm.role === 'student' && (
            <>
              <label>Student Number</label>
              <input value={registerForm.student_no} onChange={e => updateRegister('student_no', e.target.value)} />
            </>
          )}

          <label>Email</label>
          <input value={registerForm.email} onChange={e => updateRegister('email', e.target.value)} />

          <label>Password</label>
          <input
            type="password"
            value={registerForm.password}
            onChange={e => updateRegister('password', e.target.value)}
          />

          <label>First Name</label>
          <input value={registerForm.first_name} onChange={e => updateRegister('first_name', e.target.value)} />

          <label>Last Name</label>
          <input value={registerForm.last_name} onChange={e => updateRegister('last_name', e.target.value)} />

          <label>Created By Admin ID</label>
          <input
            type="number"
            value={registerForm.created_by_admin_id}
            onChange={e => updateRegister('created_by_admin_id', Number(e.target.value))}
          />

          <button type="submit">Create Account</button>
        </form>
      </section>

      <section style={{ border: '1px solid #ddd', padding: 20, borderRadius: 10, marginTop: 20 }}>
        <h2>Courses</h2>
        <button onClick={loadCourses}>Refresh Courses</button>

        {selectedCourse && (
          <p>
            <strong>Selected Course:</strong> {selectedCourse.course_code} — {selectedCourse.course_name}
          </p>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 15 }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Code</th>
              <th>Name</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {courses.map(course => (
              <tr
                key={course.course_id}
                onClick={() => setSelectedCourseId(course.course_id)}
                style={{
                  cursor: 'pointer',
                  backgroundColor: String(selectedCourseId) === String(course.course_id) ? '#e8f0ff' : 'white',
                }}
              >
                <td>{course.course_id}</td>
                <td>{course.course_code}</td>
                <td>{course.course_name}</td>
                <td>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCourseId(course.course_id);
                    }}
                  >
                    Select
                  </button>

                  {currentUser?.role === 'student' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        registerForCourse(course.course_id);
                      }}
                    >
                      Register
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ background: '#f5f5f5', padding: 15, borderRadius: 10, marginTop: 20 }}>
        <strong>Status</strong>
        <pre>{message}</pre>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
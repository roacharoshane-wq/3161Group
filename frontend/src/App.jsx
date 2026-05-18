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

// ─── tiny helpers ────────────────────────────────────────────────────────────

function Badge({ label, color = '#4963d1' }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 99,
      background: color + '1a', color, fontSize: '0.75rem', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      {label}
    </span>
  );
}

function EmptyState({ text }) {
  return <p style={{ color: '#8892a4', fontStyle: 'italic', margin: '6px 0' }}>{text}</p>;
}

// ─── main app ────────────────────────────────────────────────────────────────

function App() {
  // ── auth
  const [loginForm, setLoginForm]       = useState({ role: 'student', email: '', password: '' });
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm);
  const [currentUser, setCurrentUser]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('currentUser')); } catch { return null; }
  });

  // ── courses
  const [courses, setCourses]             = useState([]);
  const [myCourses, setMyCourses]         = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [courseCode, setCourseCode]       = useState('');
  const [courseName, setCourseName]       = useState('');
  const [lecturerId, setLecturerId]       = useState('');
  const [members, setMembers]             = useState(null);

  // ── calendar
  const [calendarEvents, setCalendarEvents]         = useState([]);
  const [studentDate, setStudentDate]               = useState('');
  const [studentDateEvents, setStudentDateEvents]   = useState([]);
  const [eventForm, setEventForm] = useState({ title: '', event_type: 'general', event_at: '' });

  // ── forums / threads / replies
  const [forums, setForums]               = useState([]);
  const [selectedForumId, setSelectedForumId] = useState('');
  const [forumTitle, setForumTitle]       = useState('');
  const [threads, setThreads]             = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState('');
  const [threadForm, setThreadForm]       = useState({ title: '', body: '' });
  const [replyBody, setReplyBody]         = useState('');
  const [parentReplyId, setParentReplyId] = useState('');
  const [threadReplies, setThreadReplies] = useState(null);

  // ── content
  const [sections, setSections]           = useState([]);
  const [sectionTitle, setSectionTitle]   = useState('');
  const [sectionPosition, setSectionPosition] = useState(1);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [itemForm, setItemForm] = useState({
    item_type: 'link', title: '', url: '', file_url: '', description: '', max_score: 100,
  });

  // ── assignments
  const [assignmentId, setAssignmentId]   = useState('');
  const [contentUrl, setContentUrl]       = useState('');
  const [gradeForm, setGradeForm]         = useState({ assignment_id: '', student_id: '', grade: '' });
  const [averageStudentId, setAverageStudentId] = useState('');
  const [average, setAverage]             = useState(null);

  // ── misc
  const [reports, setReports]             = useState({});
  const [message, setMessage]             = useState('');
  const [msgType, setMsgType]             = useState('info'); // 'info' | 'error'

  const selectedCourse = useMemo(
    () => courses.find(c => String(c.course_id) === String(selectedCourseId)),
    [courses, selectedCourseId]
  );

  // ── utils ──────────────────────────────────────────────────────────────────

  function credentials(extra = {}) {
    if (!currentUser) return extra;
    return { role: currentUser.role, email: currentUser.email, password: currentUser.password, ...extra };
  }

  function setMsg(text, type = 'info') { setMessage(text); setMsgType(type); }

  async function apiRequest(path, options = {}) {
    const res  = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  // ── auth handlers ──────────────────────────────────────────────────────────

  async function handleLogin(e) {
    e.preventDefault();
    try {
      const data = await apiRequest('/login', { method: 'POST', body: JSON.stringify(loginForm) });
      const user = { ...data.user, role: data.role, email: loginForm.email, password: loginForm.password };
      localStorage.setItem('currentUser', JSON.stringify(user));
      setCurrentUser(user);
      setMsg(`Logged in as ${data.role}: ${loginForm.email}`);
    } catch (err) { setMsg(err.message, 'error'); }
  }

  async function handleRegister(e) {
    e.preventDefault();
    try {
      const body = { ...registerForm };
      if (body.role !== 'student') delete body.student_no;
      const data = await apiRequest('/register_user', { method: 'POST', body: JSON.stringify(body) });
      setMsg(`${data.role} created (ID: ${data.user_id}).`);
      setRegisterForm(emptyRegisterForm);
    } catch (err) { setMsg(err.message, 'error'); }
  }

  function logout() {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setMyCourses([]);
    setMsg('Logged out.');
  }

  // ── courses ────────────────────────────────────────────────────────────────

  async function loadCourses() {
    try {
      const data = await apiRequest('/courses');
      setCourses(data.courses || []);
      setMsg(`Loaded ${(data.courses || []).length} courses.`);
    } catch (err) { setMsg(err.message, 'error'); }
  }

  async function loadMyCourses() {
    if (!currentUser) return;
    try {
      if (currentUser.role === 'student') {
        const data = await apiRequest(`/courses/student/${currentUser.student_id}`);
        setMyCourses(data.courses || []);
        setMsg(`${(data.courses || []).length} registered course(s).`);
      } else if (currentUser.role === 'lecturer') {
        const data = await apiRequest(`/courses/lecturer/${currentUser.lecturer_id}`);
        setMyCourses(data.courses || []);
        setMsg(`${(data.courses || []).length} taught course(s).`);
      } else {
        setMsg('Admins do not have a personal course list.');
      }
    } catch (err) { setMsg(err.message, 'error'); }
  }

  async function createCourse(e) {
    e.preventDefault();
    try {
      const data = await apiRequest('/courses', {
        method: 'POST',
        body: JSON.stringify(credentials({ course_code: courseCode, course_name: courseName })),
      });
      setMsg(`Course created (ID: ${data.course_id}).`);
      setCourseCode(''); setCourseName('');
      loadCourses();
    } catch (err) { setMsg(err.message, 'error'); }
  }

  async function registerForCourse(courseId) {
    try {
      const data = await apiRequest(`/courses/${courseId}/register`, {
        method: 'POST', body: JSON.stringify(credentials()),
      });
      setMsg(data.success || 'Registered.');
      loadMyCourses();
    } catch (err) { setMsg(err.message, 'error'); }
  }

  async function assignLecturer(e) {
    e.preventDefault();
    try {
      const data = await apiRequest(`/courses/${selectedCourseId}/assign_lecturer`, {
        method: 'POST',
        body: JSON.stringify(credentials({ lecturer_id: Number(lecturerId) })),
      });
      setMsg(data.success || 'Lecturer assigned.');
      setLecturerId(''); loadMembers();
    } catch (err) { setMsg(err.message, 'error'); }
  }

  async function loadMembers() {
    if (!selectedCourseId) return;
    try {
      const data = await apiRequest(`/courses/${selectedCourseId}/members`);
      setMembers(data);
      setMsg('Loaded course members.');
    } catch (err) { setMsg(err.message, 'error'); }
  }

  // ── calendar ───────────────────────────────────────────────────────────────

  async function loadCalendar() {
    if (!selectedCourseId) return;
    try {
      const data = await apiRequest(`/courses/${selectedCourseId}/calendar`);
      setCalendarEvents(data.events || []);
      setMsg('Loaded course calendar.');
    } catch (err) { setMsg(err.message, 'error'); }
  }

  async function loadStudentDateCalendar() {
    if (!currentUser?.student_id || !studentDate) {
      setMsg('Login as a student and choose a date first.', 'error'); return;
    }
    try {
      const data = await apiRequest(`/calendar/student/${currentUser.student_id}?date=${studentDate}`);
      setStudentDateEvents(data.events || []);
      setMsg(`${data.events?.length || 0} event(s) on ${studentDate}.`);
    } catch (err) { setMsg(err.message, 'error'); }
  }

  async function createCalendarEvent(e) {
    e.preventDefault();
    try {
      const data = await apiRequest(`/courses/${selectedCourseId}/calendar`, {
        method: 'POST', body: JSON.stringify(credentials(eventForm)),
      });
      setMsg(data.success || 'Calendar event created.');
      setEventForm({ title: '', event_type: 'general', event_at: '' });
      loadCalendar();
    } catch (err) { setMsg(err.message, 'error'); }
  }

  // ── forums ─────────────────────────────────────────────────────────────────

  async function loadForums() {
    if (!selectedCourseId) return;
    try {
      const data = await apiRequest(`/courses/${selectedCourseId}/forums`);
      setForums(data.forums || []);
      setMsg('Loaded forums.');
    } catch (err) { setMsg(err.message, 'error'); }
  }

  async function createForum(e) {
    e.preventDefault();
    try {
      const data = await apiRequest(`/courses/${selectedCourseId}/forums`, {
        method: 'POST', body: JSON.stringify(credentials({ title: forumTitle })),
      });
      setMsg(data.success || 'Forum created.');
      setForumTitle(''); loadForums();
    } catch (err) { setMsg(err.message, 'error'); }
  }

  // ── threads ────────────────────────────────────────────────────────────────

  async function loadThreads(forumId = selectedForumId) {
    if (!forumId) return;
    try {
      const data = await apiRequest(`/forums/${forumId}/threads`);
      setThreads(data.threads || []);
      setMsg('Loaded threads.');
    } catch (err) { setMsg(err.message, 'error'); }
  }

  async function createThread(e) {
    e.preventDefault();
    try {
      const data = await apiRequest(`/forums/${selectedForumId}/threads`, {
        method: 'POST', body: JSON.stringify(credentials(threadForm)),
      });
      setMsg(data.success || 'Thread created.');
      setThreadForm({ title: '', body: '' }); loadThreads();
    } catch (err) { setMsg(err.message, 'error'); }
  }

  async function loadReplies(threadId = selectedThreadId) {
    if (!threadId) return;
    try {
      const data = await apiRequest(`/threads/${threadId}/replies`);
      setThreadReplies(data);
      setMsg('Loaded replies.');
    } catch (err) { setMsg(err.message, 'error'); }
  }

  async function createReply(e) {
    e.preventDefault();
    try {
      const body = { body: replyBody };
      if (parentReplyId) body.parent_reply_id = Number(parentReplyId);
      const data = await apiRequest(`/threads/${selectedThreadId}/replies`, {
        method: 'POST', body: JSON.stringify(credentials(body)),
      });
      setMsg(data.success || 'Reply posted.');
      setReplyBody(''); setParentReplyId(''); loadReplies();
    } catch (err) { setMsg(err.message, 'error'); }
  }

  // ── content ────────────────────────────────────────────────────────────────

  async function loadContent() {
    if (!selectedCourseId) return;
    try {
      const data = await apiRequest(`/courses/${selectedCourseId}/content`);
      setSections(data.sections || []);
      setMsg('Loaded course content.');
    } catch (err) { setMsg(err.message, 'error'); }
  }

  async function createSection(e) {
    e.preventDefault();
    try {
      const data = await apiRequest(`/courses/${selectedCourseId}/sections`, {
        method: 'POST',
        body: JSON.stringify(credentials({ title: sectionTitle, position: Number(sectionPosition) })),
      });
      setMsg(data.success || 'Section created.');
      setSectionTitle(''); setSectionPosition(1); loadContent();
    } catch (err) { setMsg(err.message, 'error'); }
  }

  async function addSectionItem(e) {
    e.preventDefault();
    try {
      const body = { item_type: itemForm.item_type, title: itemForm.title };
      if (itemForm.item_type === 'link')           body.url       = itemForm.url;
      if (itemForm.item_type === 'lecture_slide')  body.file_url  = itemForm.file_url;
      if (itemForm.item_type === 'assignment') {
        body.description = itemForm.description;
        body.max_score   = Number(itemForm.max_score);
      }
      const data = await apiRequest(`/sections/${selectedSectionId}/items`, {
        method: 'POST', body: JSON.stringify(credentials(body)),
      });
      setMsg(data.success || 'Item added.');
      setItemForm({ item_type: 'link', title: '', url: '', file_url: '', description: '', max_score: 100 });
      loadContent();
    } catch (err) { setMsg(err.message, 'error'); }
  }

  // ── assignments ────────────────────────────────────────────────────────────

  async function submitAssignment(e) {
    e.preventDefault();
    try {
      const data = await apiRequest(`/assignments/${assignmentId}/submit`, {
        method: 'POST', body: JSON.stringify(credentials({ content_url: contentUrl })),
      });
      setMsg(data.success || 'Assignment submitted.');
      setContentUrl('');
    } catch (err) { setMsg(err.message, 'error'); }
  }

  async function gradeAssignment(e) {
    e.preventDefault();
    try {
      const data = await apiRequest(`/assignments/${gradeForm.assignment_id}/grade`, {
        method: 'POST',
        body: JSON.stringify(credentials({ student_id: Number(gradeForm.student_id), grade: Number(gradeForm.grade) })),
      });
      setMsg(data.success || 'Grade submitted.');
      setGradeForm({ assignment_id: '', student_id: '', grade: '' });
    } catch (err) { setMsg(err.message, 'error'); }
  }

  async function loadAverage() {
    try {
      const id   = averageStudentId || currentUser?.student_id;
      const data = await apiRequest(`/students/${id}/average`);
      setAverage(data);
      setMsg('Loaded student average.');
    } catch (err) { setMsg(err.message, 'error'); }
  }

  // ── reports ────────────────────────────────────────────────────────────────

  async function loadReport(key, path) {
    try {
      const data = await apiRequest(path);
      setReports(prev => ({ ...prev, [key]: data }));
      setMsg(`Loaded report: ${key}`);
    } catch (err) { setMsg(err.message, 'error'); }
  }

  // ── effects ────────────────────────────────────────────────────────────────

  useEffect(() => { loadCourses(); }, []);
  useEffect(() => { if (currentUser) loadMyCourses(); }, [currentUser]);

  // ── reply tree renderer ────────────────────────────────────────────────────

  function ReplyTree({ replies, depth = 0 }) {
    if (!replies?.length) return null;
    return (
      <ul style={{ paddingLeft: depth === 0 ? 0 : 18, listStyle: 'none', margin: 0 }}>
        {replies.map(r => (
          <li key={r.reply_id} style={{ borderLeft: depth > 0 ? '2px solid #e2e6ee' : 'none', paddingLeft: depth > 0 ? 10 : 0, marginBottom: 8 }}>
            <div style={{ background: depth % 2 === 0 ? '#f8faff' : '#fff', borderRadius: 8, padding: '8px 12px', border: '1px solid #e8ecf4' }}>
              <span style={{ fontSize: '0.75rem', color: '#8892a4' }}>
                Reply #{r.reply_id} · {r.created_at ? String(r.created_at).slice(0, 16) : ''}
              </span>
              <p style={{ margin: '4px 0 4px' }}>{r.body}</p>
              <button
                type="button"
                style={{ fontSize: '0.75rem', padding: '2px 8px', background: '#e8edf8', color: '#4963d1', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                onClick={() => { setParentReplyId(String(r.reply_id)); setSelectedThreadId(r.thread_id); }}
              >
                ↩ Reply
              </button>
            </div>
            <ReplyTree replies={r.replies} depth={depth + 1} />
          </li>
        ))}
      </ul>
    );
  }

  // ── render ─────────────────────────────────────────────────────────────────

  const isStudent  = currentUser?.role === 'student';
  const isLecturer = currentUser?.role === 'lecturer';
  const isAdmin    = currentUser?.role === 'admin';

  return (
    <main className="page">

      {/* ── header ─────────────────────────────────────────────────────────── */}
      <header className="hero">
        <div>
          <p className="eyebrow">COMP3161 Database Project</p>
          <h1>Course Management System</h1>
          <p style={{ color: '#5a6478', margin: '4px 0 0' }}>
            React + Flask + MySQL · Full-stack course portal
          </p>
        </div>
        {currentUser && (
          <div className="user-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#4963d1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem' }}>
                {currentUser.first_name?.[0]}{currentUser.last_name?.[0]}
              </div>
              <div>
                <strong>{currentUser.first_name} {currentUser.last_name}</strong>
                <br />
                <span style={{ fontSize: '0.8rem', color: '#5a6478' }}>{currentUser.email}</span>
              </div>
            </div>
            <Badge label={currentUser.role} color={isAdmin ? '#d14949' : isLecturer ? '#2e7d57' : '#4963d1'} />
            <button onClick={logout} style={{ background: '#f3f5f8', color: '#172033' }}>Logout</button>
          </div>
        )}
      </header>

      {/* ── login / register ───────────────────────────────────────────────── */}
      <section className="grid two">
        <form className="card" onSubmit={handleLogin}>
          <h2>Login</h2>
          <label>Role</label>
          <select value={loginForm.role} onChange={e => setLoginForm(p => ({ ...p, role: e.target.value }))}>
            <option value="student">Student</option>
            <option value="lecturer">Lecturer</option>
            <option value="admin">Admin</option>
          </select>
          <label>Email</label>
          <input value={loginForm.email} onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
          <label>Password</label>
          <input type="password" value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} />
          <button type="submit">Sign In</button>
        </form>

        <form className="card" onSubmit={handleRegister}>
          <h2>Register New User</h2>
          <label>Role</label>
          <select value={registerForm.role} onChange={e => setRegisterForm(p => ({ ...p, role: e.target.value }))}>
            <option value="student">Student</option>
            <option value="lecturer">Lecturer</option>
            <option value="admin">Admin</option>
          </select>
          {registerForm.role === 'student' && (
            <>
              <label>Student Number</label>
              <input value={registerForm.student_no} onChange={e => setRegisterForm(p => ({ ...p, student_no: e.target.value }))} placeholder="S000001" />
            </>
          )}
          <label>Email</label>
          <input value={registerForm.email} onChange={e => setRegisterForm(p => ({ ...p, email: e.target.value }))} />
          <label>Password</label>
          <input type="password" value={registerForm.password} onChange={e => setRegisterForm(p => ({ ...p, password: e.target.value }))} />
          <label>First Name</label>
          <input value={registerForm.first_name} onChange={e => setRegisterForm(p => ({ ...p, first_name: e.target.value }))} />
          <label>Last Name</label>
          <input value={registerForm.last_name} onChange={e => setRegisterForm(p => ({ ...p, last_name: e.target.value }))} />
          <label>Created By Admin ID</label>
          <input type="number" value={registerForm.created_by_admin_id} onChange={e => setRegisterForm(p => ({ ...p, created_by_admin_id: Number(e.target.value) }))} />
          <button type="submit">Create Account</button>
        </form>
      </section>

      {/* ── admin: create course / assign lecturer ─────────────────────────── */}
      {isAdmin && (
        <section className="grid two">
          <form className="card" onSubmit={createCourse}>
            <h2>Admin: Create Course</h2>
            <label>Course Code</label>
            <input value={courseCode} onChange={e => setCourseCode(e.target.value)} placeholder="COMP3161" />
            <label>Course Name</label>
            <input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="Database Management" />
            <button type="submit">Create Course</button>
          </form>

          <form className="card" onSubmit={assignLecturer}>
            <h2>Admin: Assign Lecturer</h2>
            {selectedCourse
              ? <div className="selected-banner">{selectedCourse.course_code} — {selectedCourse.course_name}</div>
              : <EmptyState text="Select a course from the table below first." />
            }
            <label>Lecturer ID</label>
            <input value={lecturerId} onChange={e => setLecturerId(e.target.value)} placeholder="1" />
            <button type="submit" disabled={!selectedCourseId}>Assign Lecturer</button>
          </form>
        </section>
      )}

      {/* ── all courses table ──────────────────────────────────────────────── */}
      <section className="card">
        <div className="section-header">
          <h2>All Courses</h2>
          <button onClick={loadCourses}>↻ Refresh</button>
        </div>
        {selectedCourse && (
          <div className="selected-banner">
            Selected: <strong>{selectedCourse.course_code} — {selectedCourse.course_name}</strong>
          </div>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>ID</th><th>Code</th><th>Name</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {courses.length === 0
                ? <tr><td colSpan={4}><EmptyState text="No courses loaded — click Refresh." /></td></tr>
                : courses.map(c => (
                  <tr
                    key={c.course_id}
                    className={String(selectedCourseId) === String(c.course_id) ? 'selected-row' : ''}
                    onClick={() => setSelectedCourseId(c.course_id)}
                  >
                    <td>{c.course_id}</td>
                    <td><strong>{c.course_code}</strong></td>
                    <td>{c.course_name}</td>
                    <td>
                      <button type="button" onClick={e => { e.stopPropagation(); setSelectedCourseId(c.course_id); }}>Select</button>
                      {isStudent && (
                        <button type="button" onClick={e => { e.stopPropagation(); registerForCourse(c.course_id); }}>Enrol</button>
                      )}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </section>

      {/* ── my courses ────────────────────────────────────────────────────── */}
      {currentUser && !isAdmin && (
        <section className="card">
          <div className="section-header">
            <h2>{isStudent ? 'My Enrolled Courses' : 'My Taught Courses'}</h2>
            <button onClick={loadMyCourses}>↻ Refresh</button>
          </div>
          {myCourses.length === 0
            ? <EmptyState text="No courses loaded yet." />
            : <ul className="list">{myCourses.map(c => <li key={c.course_id}><strong>{c.course_code}</strong> — {c.course_name}</li>)}</ul>
          }
        </section>
      )}

      {/* ── course tools panel ────────────────────────────────────────────── */}
      <section className="card">
        <div className="section-header">
          <h2>Course Tools</h2>
          <span style={{ color: '#8892a4', fontSize: '0.85rem' }}>
            {selectedCourse ? `${selectedCourse.course_code} — ${selectedCourse.course_name}` : 'Select a course first'}
          </span>
        </div>
        <div className="button-row">
          <button disabled={!selectedCourseId} onClick={loadMembers}>👥 Members</button>
          <button disabled={!selectedCourseId} onClick={loadCalendar}>📅 Calendar</button>
          <button disabled={!selectedCourseId} onClick={loadForums}>💬 Forums</button>
          <button disabled={!selectedCourseId} onClick={loadContent}>📚 Content</button>
        </div>

        {/* members */}
        {members && (
          <div className="grid two nested">
            <div>
              <h3>Students ({members.students?.length ?? 0})</h3>
              {members.students?.length
                ? <ul className="list">{members.students.map(s => <li key={s.student_id}>{s.student_no} — {s.first_name} {s.last_name}</li>)}</ul>
                : <EmptyState text="No students enrolled." />
              }
            </div>
            <div>
              <h3>Lecturer</h3>
              {members.lecturers?.length
                ? <ul className="list">{members.lecturers.map(l => <li key={l.lecturer_id}>{l.first_name} {l.last_name} ({l.email})</li>)}</ul>
                : <EmptyState text="No lecturer assigned." />
              }
            </div>
          </div>
        )}

        {/* calendar events */}
        {calendarEvents.length > 0 && (
          <div className="nested">
            <h3>Calendar Events ({calendarEvents.length})</h3>
            <ul className="list">
              {calendarEvents.map(ev => (
                <li key={ev.event_id}>
                  <Badge label={ev.event_type} color={ev.event_type === 'assignment_due' ? '#d14949' : '#2e7d57'} />
                  {' '}{String(ev.event_at).slice(0, 16)} — {ev.title}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* forums */}
        {forums.length > 0 && (
          <div className="nested">
            <h3>Forums ({forums.length})</h3>
            <ul className="list">
              {forums.map(f => (
                <li key={f.forum_id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <button type="button" onClick={() => { setSelectedForumId(f.forum_id); loadThreads(f.forum_id); }}>
                    {String(selectedForumId) === String(f.forum_id) ? '✓ Selected' : 'Select'}
                  </button>
                  {f.title}
                  {String(selectedForumId) === String(f.forum_id) && <Badge label="active forum" />}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* content sections */}
        {sections.length > 0 && (
          <div className="nested">
            <h3>Content Sections ({sections.length})</h3>
            {sections.map(sec => (
              <div className="mini-card" key={sec.section_id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button type="button" onClick={() => setSelectedSectionId(sec.section_id)}>
                    {String(selectedSectionId) === String(sec.section_id) ? '✓ Selected' : 'Select'}
                  </button>
                  <strong>{sec.position}. {sec.title}</strong>
                  {String(selectedSectionId) === String(sec.section_id) && <Badge label="active section" />}
                </div>
                <ul className="list" style={{ marginTop: 6 }}>
                  {sec.items?.map(item => (
                    <li key={item.section_item_id}>
                      <Badge
                        label={item.item_type}
                        color={item.item_type === 'assignment' ? '#d14949' : item.item_type === 'lecture_slide' ? '#2e7d57' : '#4963d1'}
                      />
                      {' '}#{item.section_item_id} — {item.title}
                      {item.url && <> · <a href={item.url} target="_blank" rel="noreferrer">{item.url}</a></>}
                      {item.file_url && <> · <a href={item.file_url} target="_blank" rel="noreferrer">{item.file_url}</a></>}
                      {item.max_score && <> · max {item.max_score} pts</>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── student: enrol / submit assignment / calendar by date ─────────── */}
      {isStudent && (
        <section className="grid two">
          <form className="card" onSubmit={submitAssignment}>
            <h2>Submit Assignment</h2>
            <label>Assignment ID (section_item_id)</label>
            <input value={assignmentId} onChange={e => setAssignmentId(e.target.value)} placeholder="e.g. 42" />
            <label>Content URL</label>
            <input value={contentUrl} onChange={e => setContentUrl(e.target.value)} placeholder="https://..." />
            <button type="submit">Submit</button>
          </form>

          <div className="card">
            <h2>My Calendar by Date</h2>
            <label>Date</label>
            <input type="date" value={studentDate} onChange={e => setStudentDate(e.target.value)} />
            <button onClick={loadStudentDateCalendar}>Load Events</button>
            {studentDateEvents.length > 0
              ? <ul className="list" style={{ marginTop: 10 }}>{studentDateEvents.map(ev => <li key={ev.event_id}>{String(ev.event_at).slice(11, 16)} — {ev.title}</li>)}</ul>
              : <EmptyState text="No events on selected date." />
            }
          </div>
        </section>
      )}

      {/* ── lecturer tools ─────────────────────────────────────────────────── */}
      {isLecturer && (
        <>
          <section className="grid three">
            <form className="card" onSubmit={createSection}>
              <h2>Add Section</h2>
              <label>Title</label>
              <input value={sectionTitle} onChange={e => setSectionTitle(e.target.value)} />
              <label>Position</label>
              <input type="number" min="1" value={sectionPosition} onChange={e => setSectionPosition(e.target.value)} />
              <button type="submit" disabled={!selectedCourseId}>Create Section</button>
            </form>

            <form className="card" onSubmit={createCalendarEvent}>
              <h2>Add Calendar Event</h2>
              <label>Title</label>
              <input value={eventForm.title} onChange={e => setEventForm(p => ({ ...p, title: e.target.value }))} />
              <label>Type</label>
              <select value={eventForm.event_type} onChange={e => setEventForm(p => ({ ...p, event_type: e.target.value }))}>
                <option value="general">General</option>
                <option value="assignment_due">Assignment Due</option>
              </select>
              <label>Date/Time</label>
              <input value={eventForm.event_at} onChange={e => setEventForm(p => ({ ...p, event_at: e.target.value }))} placeholder="2026-06-01 09:00:00" />
              <button type="submit" disabled={!selectedCourseId}>Create Event</button>
            </form>

            <form className="card" onSubmit={createForum}>
              <h2>Create Forum</h2>
              <label>Forum Title</label>
              <input value={forumTitle} onChange={e => setForumTitle(e.target.value)} />
              <button type="submit" disabled={!selectedCourseId}>Create Forum</button>
            </form>
          </section>

          <section className="grid two">
            <form className="card" onSubmit={addSectionItem}>
              <h2>Add Content Item</h2>
              {selectedSectionId
                ? <div className="selected-banner">Section ID: {selectedSectionId}</div>
                : <EmptyState text="Select a section from Course Tools first." />
              }
              <label>Type</label>
              <select value={itemForm.item_type} onChange={e => setItemForm(p => ({ ...p, item_type: e.target.value }))}>
                <option value="link">Link</option>
                <option value="lecture_slide">Lecture Slide / File</option>
                <option value="assignment">Assignment</option>
              </select>
              <label>Title</label>
              <input value={itemForm.title} onChange={e => setItemForm(p => ({ ...p, title: e.target.value }))} />
              {itemForm.item_type === 'link' && (
                <><label>URL</label><input value={itemForm.url} onChange={e => setItemForm(p => ({ ...p, url: e.target.value }))} /></>
              )}
              {itemForm.item_type === 'lecture_slide' && (
                <><label>File URL</label><input value={itemForm.file_url} onChange={e => setItemForm(p => ({ ...p, file_url: e.target.value }))} /></>
              )}
              {itemForm.item_type === 'assignment' && (
                <>
                  <label>Description</label>
                  <input value={itemForm.description} onChange={e => setItemForm(p => ({ ...p, description: e.target.value }))} />
                  <label>Max Score</label>
                  <input type="number" value={itemForm.max_score} onChange={e => setItemForm(p => ({ ...p, max_score: e.target.value }))} />
                </>
              )}
              <button type="submit" disabled={!selectedSectionId}>Add Item</button>
            </form>

            <form className="card" onSubmit={gradeAssignment}>
              <h2>Grade Assignment</h2>
              <label>Assignment ID</label>
              <input value={gradeForm.assignment_id} onChange={e => setGradeForm(p => ({ ...p, assignment_id: e.target.value }))} />
              <label>Student ID</label>
              <input value={gradeForm.student_id} onChange={e => setGradeForm(p => ({ ...p, student_id: e.target.value }))} />
              <label>Grade</label>
              <input type="number" step="0.01" value={gradeForm.grade} onChange={e => setGradeForm(p => ({ ...p, grade: e.target.value }))} />
              <button type="submit">Submit Grade</button>
            </form>
          </section>
        </>
      )}

      {/* ── discussion threads & replies ───────────────────────────────────── */}
      {currentUser && !isAdmin && (
        <>
          <section className="grid two">
            <form className="card" onSubmit={createThread}>
              <h2>New Discussion Thread</h2>
              {selectedForumId
                ? <div className="selected-banner">Forum ID: {selectedForumId}</div>
                : <EmptyState text="Select a forum from Course Tools first." />
              }
              <label>Title</label>
              <input value={threadForm.title} onChange={e => setThreadForm(p => ({ ...p, title: e.target.value }))} />
              <label>Post</label>
              <textarea value={threadForm.body} onChange={e => setThreadForm(p => ({ ...p, body: e.target.value }))} rows={4} />
              <button type="submit" disabled={!selectedForumId}>Post Thread</button>
            </form>

            <div className="card">
              <div className="section-header">
                <h2>Threads</h2>
                <button disabled={!selectedForumId} onClick={() => loadThreads()}>↻ Refresh</button>
              </div>
              {threads.length === 0
                ? <EmptyState text="No threads yet." />
                : <ul className="list">
                    {threads.map(t => (
                      <li key={t.thread_id} style={{ marginBottom: 8 }}>
                        <button
                          type="button"
                          style={{ marginRight: 6 }}
                          onClick={() => { setSelectedThreadId(t.thread_id); loadReplies(t.thread_id); }}
                        >
                          {String(selectedThreadId) === String(t.thread_id) ? '✓ Open' : 'Open'}
                        </button>
                        <strong>{t.title}</strong>
                        <span style={{ fontSize: '0.8rem', color: '#8892a4', marginLeft: 6 }}>{String(t.created_at).slice(0, 16)}</span>
                      </li>
                    ))}
                  </ul>
              }
            </div>
          </section>

          <section className="grid two">
            <form className="card" onSubmit={createReply}>
              <h2>Reply to Thread</h2>
              {selectedThreadId
                ? <div className="selected-banner">Thread ID: {selectedThreadId}</div>
                : <EmptyState text="Open a thread above first." />
              }
              <label>Reply to Reply ID (optional — for nested replies)</label>
              <input
                type="number"
                value={parentReplyId}
                onChange={e => setParentReplyId(e.target.value)}
                placeholder="Leave blank to reply to thread"
              />
              <label>Message</label>
              <textarea value={replyBody} onChange={e => setReplyBody(e.target.value)} rows={4} />
              <button type="submit" disabled={!selectedThreadId}>Post Reply</button>
            </form>

            <div className="card" style={{ overflowY: 'auto', maxHeight: 480 }}>
              <h2>Thread Replies</h2>
              {threadReplies ? (
                <>
                  <div style={{ background: '#f8faff', border: '1px solid #e2e6ee', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                    <strong>{threadReplies.thread?.title}</strong>
                    <p style={{ margin: '4px 0 0' }}>{threadReplies.thread?.body}</p>
                  </div>
                  <ReplyTree replies={threadReplies.replies} />
                </>
              ) : (
                <EmptyState text="Open a thread to see replies." />
              )}
            </div>
          </section>
        </>
      )}

      {/* ── student average ────────────────────────────────────────────────── */}
      <section className="card">
        <h2>Student Grade Average</h2>
        <div className="button-row">
          <div style={{ flex: 1 }}>
            <label>Student ID</label>
            <input
              value={averageStudentId}
              onChange={e => setAverageStudentId(e.target.value)}
              placeholder={currentUser?.student_id ? String(currentUser.student_id) : 'Enter student ID'}
            />
          </div>
          <button onClick={loadAverage} style={{ alignSelf: 'flex-end', marginBottom: 12 }}>Load Average</button>
        </div>
        {average && (
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#4963d1', marginTop: 4 }}>
            {average.overall_average !== null ? `${Number(average.overall_average).toFixed(2)}%` : 'No grades yet'}
          </div>
        )}
      </section>

      {/* ── reports ────────────────────────────────────────────────────────── */}
      <section className="card">
        <h2>Reports</h2>
        <div className="button-row" style={{ flexWrap: 'wrap' }}>
          <button onClick={() => loadReport('courses50',    '/reports/courses_50_plus_students')}>📊 Courses with 50+ Students</button>
          <button onClick={() => loadReport('students5',   '/reports/students_5_plus_courses')}>📊 Students with 5+ Courses</button>
          <button onClick={() => loadReport('lecturers3',  '/reports/lecturers_3_plus_courses')}>📊 Lecturers with 3+ Courses</button>
          <button onClick={() => loadReport('topCourses',  '/reports/top_10_enrolled_courses')}>🏆 Top 10 Enrolled Courses</button>
          <button onClick={() => loadReport('topStudents', '/reports/top_10_students_by_average')}>🏆 Top 10 Students by Average</button>
        </div>

        {Object.entries(reports).map(([key, data]) => {
          const rows = data.courses || data.students || data.lecturers || [];
          if (!rows.length) return <p key={key} style={{ color: '#8892a4' }}>{key}: no data.</p>;
          const keys = Object.keys(rows[0]);
          return (
            <div key={key} style={{ marginTop: 16 }}>
              <h3 style={{ margin: '0 0 6px' }}>{key}</h3>
              <div className="table-wrap">
                <table>
                  <thead><tr>{keys.map(k => <th key={k}>{k}</th>)}</tr></thead>
                  <tbody>{rows.map((row, i) => <tr key={i}>{keys.map(k => <td key={k}>{String(row[k] ?? '')}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </div>
          );
        })}
      </section>

      {/* ── status message ─────────────────────────────────────────────────── */}
      <section className="message" style={{ borderLeft: `4px solid ${msgType === 'error' ? '#d14949' : '#4963d1'}` }}>
        <strong style={{ color: msgType === 'error' ? '#d14949' : '#4963d1' }}>
          {msgType === 'error' ? '⚠ Error' : 'ℹ Status'}
        </strong>
        <pre style={{ margin: '4px 0 0' }}>{message || 'Ready.'}</pre>
      </section>

    </main>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #f3f5f8; color: #172033; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
  h1 { margin: 0; font-size: 2rem; }
  h2 { margin: 0 0 14px; font-size: 1.1rem; font-weight: 700; }
  h3 { margin: 10px 0 6px; font-size: 1rem; }
  button { border: 0; border-radius: 8px; padding: 9px 14px; background: #172033; color: white; cursor: pointer; margin: 3px; font-size: 0.875rem; transition: opacity .15s; }
  button:hover:not(:disabled) { opacity: 0.85; }
  button:disabled { opacity: 0.4; cursor: not-allowed; }
  input, select, textarea { width: 100%; padding: 10px; margin: 4px 0 12px; border: 1.5px solid #cdd3df; border-radius: 8px; background: white; font-size: 0.9rem; }
  input:focus, select:focus, textarea:focus { outline: none; border-color: #4963d1; }
  textarea { min-height: 80px; resize: vertical; }
  label { display: block; font-size: 0.82rem; font-weight: 600; color: #3b4658; margin-top: 4px; }
  a { color: #4963d1; }
  table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  th, td { padding: 9px 12px; border-bottom: 1px solid #e2e6ee; text-align: left; }
  th { background: #eef1f7; font-weight: 600; }
  tr:hover td { background: #f8faff; }
  pre { white-space: pre-wrap; overflow-x: auto; margin: 0; font-size: 0.85rem; }
  ul { margin: 0; padding-left: 18px; }
  .page { max-width: 1200px; margin: 0 auto; padding: 28px 20px 60px; }
  .hero { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; margin-bottom: 24px; }
  .eyebrow { margin: 0 0 4px; font-weight: 700; color: #4963d1; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.78rem; }
  .grid { display: grid; gap: 18px; margin-bottom: 18px; }
  .two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .card { background: white; border: 1px solid #e0e5ef; border-radius: 16px; padding: 22px; box-shadow: 0 4px 20px rgba(18,33,60,.06); margin-bottom: 18px; }
  .message { background: white; border: 1px solid #e0e5ef; border-radius: 16px; padding: 16px 20px; box-shadow: 0 4px 20px rgba(18,33,60,.06); margin-bottom: 18px; }
  .user-card { background: white; border: 1px solid #e0e5ef; border-radius: 16px; padding: 16px 18px; box-shadow: 0 4px 20px rgba(18,33,60,.06); min-width: 240px; display: flex; flex-direction: column; gap: 8px; }
  .section-header, .button-row { display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; margin-bottom: 10px; }
  .table-wrap { overflow-x: auto; }
  .list { list-style: disc; }
  .nested { margin-top: 14px; border-top: 1px solid #eef1f7; padding-top: 14px; }
  .mini-card { border: 1px solid #e2e6ee; border-radius: 12px; padding: 12px 14px; margin: 8px 0; }
  .selected-row td { background: #eef4ff !important; }
  .selected-banner { background: #eef4ff; border: 1px solid #ccdaff; padding: 10px 14px; border-radius: 10px; margin-bottom: 12px; font-size: 0.9rem; }
  @media (max-width: 860px) { .two, .three { grid-template-columns: 1fr; } .hero { flex-direction: column; } }
`;

const tag = document.createElement('style');
tag.innerHTML = styles;
document.head.appendChild(tag);

createRoot(document.getElementById('root')).render(<App />);

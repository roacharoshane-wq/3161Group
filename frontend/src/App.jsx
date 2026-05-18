import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000';

function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('currentUser')); } catch { return null; }
  });

  const [login, setLogin] = useState({ role: 'student', email: '', password: '' });
  const [register, setRegister] = useState({
    role: 'student', student_no: '', email: '', password: '', first_name: '', last_name: '', created_by_admin_id: 1
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);

  const [courses, setCourses] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [lecturerId, setLecturerId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [forumId, setForumId] = useState('');
  const [threadId, setThreadId] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [assignmentId, setAssignmentId] = useState('');
  const [result, setResult] = useState(null);

  const [courseForm, setCourseForm] = useState({ course_code: '', course_name: '' });
  const [assignForm, setAssignForm] = useState({ course_id: '', lecturer_id: '' });
  const [eventForm, setEventForm] = useState({ course_id: '', title: '', event_type: 'general', event_at: '' });
  const [forumForm, setForumForm] = useState({ course_id: '', title: '' });
  const [threadForm, setThreadForm] = useState({ forum_id: '', title: '', body: '' });
  const [replyForm, setReplyForm] = useState({ thread_id: '', parent_reply_id: '', body: '' });
  const [sectionForm, setSectionForm] = useState({ course_id: '', title: '', position: 1 });
  const [itemForm, setItemForm] = useState({ section_id: '', item_type: 'link', title: '', url: '', file_url: '', description: '', max_score: 100 });
  const [submitForm, setSubmitForm] = useState({ assignment_id: '', content_url: '' });
  const [gradeForm, setGradeForm] = useState({ assignment_id: '', student_id: '', grade: '' });

  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';
  const isLecturer = user?.role === 'lecturer';

  function show(text, isError = false) {
    setMessage(text);
    setError(isError);
  }

  function userCreds(extra = {}) {
    return user ? { role: user.role, email: user.email, password: user.password, ...extra } : extra;
  }

  async function api(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
    setResult(data);
    return data;
  }

  async function doLogin(e) {
    e.preventDefault();
    try {
      const data = await api('/login', { method: 'POST', body: JSON.stringify(login) });
      const loggedIn = { ...data.user, role: data.role, email: login.email, password: login.password };
      localStorage.setItem('currentUser', JSON.stringify(loggedIn));
      setUser(loggedIn);
      show(`Logged in as ${data.role}`);
    } catch (err) { show(err.message, true); }
  }

  async function doRegister(e) {
    e.preventDefault();
    try {
      const body = { ...register };
      if (body.role !== 'student') delete body.student_no;
      const data = await api('/register_user', { method: 'POST', body: JSON.stringify(body) });
      show(`${data.role} created. ID: ${data.user_id}`);
    } catch (err) { show(err.message, true); }
  }

  function logout() {
    localStorage.removeItem('currentUser');
    setUser(null);
    setResult(null);
    show('Logged out.');
  }

  async function loadCourses() {
    try {
      const data = await api('/courses');
      setCourses(data.courses || []);
      show('Courses retrieved.');
    } catch (err) { show(err.message, true); }
  }

  async function post(path, body) {
    try {
      const data = await api(path, { method: 'POST', body: JSON.stringify(userCreds(body)) });
      show(data.success || 'Action completed.');
    } catch (err) { show(err.message, true); }
  }

  async function get(path, label = 'Data retrieved.') {
    try { await api(path); show(label); } catch (err) { show(err.message, true); }
  }

  useEffect(() => { loadCourses(); }, []);

  return (
    <main className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">COMP3161 API Frontend</p>
          <h1>Course Management System</h1>
          <p>Login, logout, and role-specific API testing.</p>
        </div>
        {user && (
          <div className="userBox">
            <strong>{user.first_name} {user.last_name}</strong>
            <span>{user.email}</span>
            <b>{user.role}</b>
            <button onClick={logout}>Logout</button>
          </div>
        )}
      </header>

      {message && <div className={error ? 'alert error' : 'alert'}>{message}</div>}

      {!user && (
        <section className="grid two">
          <form className="card" onSubmit={doLogin}>
            <h2>Login</h2>
            <label>Role</label>
            <select value={login.role} onChange={e => setLogin({ ...login, role: e.target.value })}>
              <option value="student">Student</option><option value="lecturer">Lecturer</option><option value="admin">Admin</option>
            </select>
            <label>Email</label>
            <input value={login.email} onChange={e => setLogin({ ...login, email: e.target.value })} />
            <label>Password</label>
            <input type="password" value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })} />
            <button>Login</button>
          </form>

          <form className="card" onSubmit={doRegister}>
            <h2>Register User</h2>
            <label>Role</label>
            <select value={register.role} onChange={e => setRegister({ ...register, role: e.target.value })}>
              <option value="student">Student</option><option value="lecturer">Lecturer</option><option value="admin">Admin</option>
            </select>
            {register.role === 'student' && <><label>Student No</label><input value={register.student_no} onChange={e => setRegister({ ...register, student_no: e.target.value })} /></>}
            <label>Email</label><input value={register.email} onChange={e => setRegister({ ...register, email: e.target.value })} />
            <label>Password</label><input type="password" value={register.password} onChange={e => setRegister({ ...register, password: e.target.value })} />
            <label>First Name</label><input value={register.first_name} onChange={e => setRegister({ ...register, first_name: e.target.value })} />
            <label>Last Name</label><input value={register.last_name} onChange={e => setRegister({ ...register, last_name: e.target.value })} />
            <label>Created By Admin ID</label><input type="number" value={register.created_by_admin_id} onChange={e => setRegister({ ...register, created_by_admin_id: Number(e.target.value) })} />
            <button>Create Account</button>
          </form>
        </section>
      )}

      {user && (
        <>
          <section className="card">
            <h2>Retrieve Courses</h2>
            <div className="buttonGrid">
              <button onClick={loadCourses}>Retrieve All Courses</button>
            </div>
            <div className="inlineForm">
              <input placeholder="Student ID" value={studentId} onChange={e => setStudentId(e.target.value)} />
              <button onClick={() => get(`/courses/student/${studentId}`, 'Student courses retrieved.')}>Retrieve Courses for Student</button>
            </div>
            <div className="inlineForm">
              <input placeholder="Lecturer ID" value={lecturerId} onChange={e => setLecturerId(e.target.value)} />
              <button onClick={() => get(`/courses/lecturer/${lecturerId}`, 'Lecturer courses retrieved.')}>Retrieve Courses for Lecturer</button>
            </div>
          </section>

          {isAdmin && (
            <section className="grid two">
              <form className="card" onSubmit={e => { e.preventDefault(); post('/courses', courseForm); }}>
                <h2>Admin: Create Course</h2>
                <label>Course Code</label><input value={courseForm.course_code} onChange={e => setCourseForm({ ...courseForm, course_code: e.target.value })} />
                <label>Course Name</label><input value={courseForm.course_name} onChange={e => setCourseForm({ ...courseForm, course_name: e.target.value })} />
                <button>Create Course</button>
              </form>
              <form className="card" onSubmit={e => { e.preventDefault(); post(`/courses/${assignForm.course_id}/assign_lecturer`, { lecturer_id: Number(assignForm.lecturer_id) }); }}>
                <h2>Admin: Assign Lecturer</h2>
                <label>Course ID</label><input value={assignForm.course_id} onChange={e => setAssignForm({ ...assignForm, course_id: e.target.value })} />
                <label>Lecturer ID</label><input value={assignForm.lecturer_id} onChange={e => setAssignForm({ ...assignForm, lecturer_id: e.target.value })} />
                <button>Assign Lecturer</button>
              </form>
            </section>
          )}

          {isStudent && (
            <section className="grid two">
              <form className="card" onSubmit={e => { e.preventDefault(); post(`/courses/${courseId}/register`, {}); }}>
                <h2>Student: Register for Course</h2>
                <label>Course ID</label><input value={courseId} onChange={e => setCourseId(e.target.value)} />
                <button>Register for Course</button>
              </form>
              <form className="card" onSubmit={e => { e.preventDefault(); post(`/assignments/${submitForm.assignment_id}/submit`, { content_url: submitForm.content_url }); }}>
                <h2>Student: Submit Assignment</h2>
                <label>Assignment ID</label><input value={submitForm.assignment_id} onChange={e => setSubmitForm({ ...submitForm, assignment_id: e.target.value })} />
                <label>Content URL</label><input value={submitForm.content_url} onChange={e => setSubmitForm({ ...submitForm, content_url: e.target.value })} />
                <button>Submit Assignment</button>
              </form>
            </section>
          )}

          {isLecturer && (
            <section className="grid two">
              <form className="card" onSubmit={e => { e.preventDefault(); post(`/courses/${eventForm.course_id}/calendar`, { title: eventForm.title, event_type: eventForm.event_type, event_at: eventForm.event_at }); }}>
                <h2>Lecturer: Create Calendar Event</h2>
                <label>Course ID</label><input value={eventForm.course_id} onChange={e => setEventForm({ ...eventForm, course_id: e.target.value })} />
                <label>Title</label><input value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} />
                <label>Type</label><select value={eventForm.event_type} onChange={e => setEventForm({ ...eventForm, event_type: e.target.value })}><option value="general">General</option><option value="assignment_due">Assignment Due</option></select>
                <label>Date/Time</label><input placeholder="2026-06-01 23:59:00" value={eventForm.event_at} onChange={e => setEventForm({ ...eventForm, event_at: e.target.value })} />
                <button>Create Event</button>
              </form>
              <form className="card" onSubmit={e => { e.preventDefault(); post(`/assignments/${gradeForm.assignment_id}/grade`, { student_id: Number(gradeForm.student_id), grade: Number(gradeForm.grade) }); }}>
                <h2>Lecturer: Grade Assignment</h2>
                <label>Assignment ID</label><input value={gradeForm.assignment_id} onChange={e => setGradeForm({ ...gradeForm, assignment_id: e.target.value })} />
                <label>Student ID</label><input value={gradeForm.student_id} onChange={e => setGradeForm({ ...gradeForm, student_id: e.target.value })} />
                <label>Grade</label><input value={gradeForm.grade} onChange={e => setGradeForm({ ...gradeForm, grade: e.target.value })} />
                <button>Submit Grade</button>
              </form>
            </section>
          )}

          {(isLecturer || isStudent) && (
            <section className="grid two">
              {isLecturer && <form className="card" onSubmit={e => { e.preventDefault(); post(`/courses/${forumForm.course_id}/forums`, { title: forumForm.title }); }}>
                <h2>Lecturer: Create Forum</h2>
                <label>Course ID</label><input value={forumForm.course_id} onChange={e => setForumForm({ ...forumForm, course_id: e.target.value })} />
                <label>Forum Title</label><input value={forumForm.title} onChange={e => setForumForm({ ...forumForm, title: e.target.value })} />
                <button>Create Forum</button>
              </form>}

              <form className="card" onSubmit={e => { e.preventDefault(); post(`/forums/${threadForm.forum_id}/threads`, { title: threadForm.title, body: threadForm.body }); }}>
                <h2>Create Discussion Thread</h2>
                <label>Forum ID</label><input value={threadForm.forum_id} onChange={e => setThreadForm({ ...threadForm, forum_id: e.target.value })} />
                <label>Title</label><input value={threadForm.title} onChange={e => setThreadForm({ ...threadForm, title: e.target.value })} />
                <label>Post Body</label><textarea value={threadForm.body} onChange={e => setThreadForm({ ...threadForm, body: e.target.value })} />
                <button>Add Thread</button>
              </form>

              <form className="card" onSubmit={e => { e.preventDefault(); const body = { body: replyForm.body }; if (replyForm.parent_reply_id) body.parent_reply_id = Number(replyForm.parent_reply_id); post(`/threads/${replyForm.thread_id}/replies`, body); }}>
                <h2>Reply to Thread</h2>
                <label>Thread ID</label><input value={replyForm.thread_id} onChange={e => setReplyForm({ ...replyForm, thread_id: e.target.value })} />
                <label>Parent Reply ID optional</label><input value={replyForm.parent_reply_id} onChange={e => setReplyForm({ ...replyForm, parent_reply_id: e.target.value })} />
                <label>Reply</label><textarea value={replyForm.body} onChange={e => setReplyForm({ ...replyForm, body: e.target.value })} />
                <button>Reply</button>
              </form>
            </section>
          )}

          {isLecturer && (
            <section className="grid two">
              <form className="card" onSubmit={e => { e.preventDefault(); post(`/courses/${sectionForm.course_id}/sections`, { title: sectionForm.title, position: Number(sectionForm.position) }); }}>
                <h2>Lecturer: Add Course Section</h2>
                <label>Course ID</label><input value={sectionForm.course_id} onChange={e => setSectionForm({ ...sectionForm, course_id: e.target.value })} />
                <label>Section Title</label><input value={sectionForm.title} onChange={e => setSectionForm({ ...sectionForm, title: e.target.value })} />
                <label>Position</label><input type="number" value={sectionForm.position} onChange={e => setSectionForm({ ...sectionForm, position: e.target.value })} />
                <button>Add Section</button>
              </form>

              <form className="card" onSubmit={e => { e.preventDefault(); const body = { item_type: itemForm.item_type, title: itemForm.title }; if (itemForm.item_type === 'link') body.url = itemForm.url; if (itemForm.item_type === 'lecture_slide') body.file_url = itemForm.file_url; if (itemForm.item_type === 'assignment') { body.description = itemForm.description; body.max_score = Number(itemForm.max_score); } post(`/sections/${itemForm.section_id}/items`, body); }}>
                <h2>Lecturer: Add Course Content</h2>
                <label>Section ID</label><input value={itemForm.section_id} onChange={e => setItemForm({ ...itemForm, section_id: e.target.value })} />
                <label>Type</label><select value={itemForm.item_type} onChange={e => setItemForm({ ...itemForm, item_type: e.target.value })}><option value="link">Link</option><option value="lecture_slide">Lecture Slide/File</option><option value="assignment">Assignment</option></select>
                <label>Title</label><input value={itemForm.title} onChange={e => setItemForm({ ...itemForm, title: e.target.value })} />
                {itemForm.item_type === 'link' && <><label>URL</label><input value={itemForm.url} onChange={e => setItemForm({ ...itemForm, url: e.target.value })} /></>}
                {itemForm.item_type === 'lecture_slide' && <><label>File URL</label><input value={itemForm.file_url} onChange={e => setItemForm({ ...itemForm, file_url: e.target.value })} /></>}
                {itemForm.item_type === 'assignment' && <><label>Description</label><textarea value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} /><label>Max Score</label><input type="number" value={itemForm.max_score} onChange={e => setItemForm({ ...itemForm, max_score: e.target.value })} /></>}
                <button>Add Content</button>
              </form>
            </section>
          )}

          <section className="card">
            <h2>Retrieve by Criteria</h2>
            <div className="inlineForm"><input placeholder="Course ID" value={courseId} onChange={e => setCourseId(e.target.value)} /><button onClick={() => get(`/courses/${courseId}/members`, 'Members retrieved.')}>Retrieve Members</button><button onClick={() => get(`/courses/${courseId}/calendar`, 'Course calendar retrieved.')}>Retrieve Calendar for Course</button><button onClick={() => get(`/courses/${courseId}/forums`, 'Forums retrieved.')}>Retrieve Forums</button><button onClick={() => get(`/courses/${courseId}/content`, 'Course content retrieved.')}>Retrieve Course Content</button></div>
            <div className="inlineForm"><input placeholder="Student ID" value={studentId} onChange={e => setStudentId(e.target.value)} /><input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} /><button onClick={() => get(`/calendar/student/${studentId}?date=${eventDate}`, 'Student calendar by date retrieved.')}>Retrieve Student Calendar by Date</button></div>
            <div className="inlineForm"><input placeholder="Forum ID" value={forumId} onChange={e => setForumId(e.target.value)} /><button onClick={() => get(`/forums/${forumId}/threads`, 'Forum threads retrieved.')}>Retrieve Threads for Forum</button></div>
            <div className="inlineForm"><input placeholder="Thread ID" value={threadId} onChange={e => setThreadId(e.target.value)} /><button onClick={() => get(`/threads/${threadId}/replies`, 'Thread replies retrieved.')}>Retrieve Replies</button></div>
            <div className="inlineForm"><input placeholder="Student ID" value={studentId} onChange={e => setStudentId(e.target.value)} /><button onClick={() => get(`/students/${studentId}/average`, 'Student average retrieved.')}>Retrieve Student Average</button></div>
          </section>

          <section className="card">
            <h2>Reports</h2>
            <div className="buttonGrid">
              <button onClick={() => get('/reports/courses_50_plus_students')}>Courses with 50+ Students</button>
              <button onClick={() => get('/reports/students_5_plus_courses')}>Students with 5+ Courses</button>
              <button onClick={() => get('/reports/lecturers_3_plus_courses')}>Lecturers with 3+ Courses</button>
              <button onClick={() => get('/reports/top_10_enrolled_courses')}>Top 10 Enrolled Courses</button>
              <button onClick={() => get('/reports/top_10_students_by_average')}>Top 10 Student Averages</button>
            </div>
          </section>
        </>
      )}

      <section className="card">
        <h2>Result</h2>
        <pre>{result ? JSON.stringify(result, null, 2) : 'No result yet.'}</pre>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);

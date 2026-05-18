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
  const [myCourses, setMyCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [lecturerId, setLecturerId] = useState('');
  const [members, setMembers] = useState(null);

  const [calendarEvents, setCalendarEvents] = useState([]);
  const [studentDate, setStudentDate] = useState('');
  const [studentDateEvents, setStudentDateEvents] = useState([]);
  const [eventForm, setEventForm] = useState({ title: '', event_type: 'general', event_at: '' });

  const [forums, setForums] = useState([]);
  const [selectedForumId, setSelectedForumId] = useState('');
  const [forumTitle, setForumTitle] = useState('');
  const [threads, setThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState('');
  const [threadForm, setThreadForm] = useState({ title: '', body: '' });
  const [replyBody, setReplyBody] = useState('');
  const [threadReplies, setThreadReplies] = useState(null);

  const [sections, setSections] = useState([]);
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionPosition, setSectionPosition] = useState(1);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [itemForm, setItemForm] = useState({
    item_type: 'link',
    title: '',
    url: '',
    file_url: '',
    description: '',
    max_score: 100,
  });

  const [assignmentId, setAssignmentId] = useState('');
  const [contentUrl, setContentUrl] = useState('');
  const [gradeForm, setGradeForm] = useState({ assignment_id: '', student_id: '', grade: '' });
  const [averageStudentId, setAverageStudentId] = useState('');
  const [average, setAverage] = useState(null);

  const [reports, setReports] = useState({});
  const [message, setMessage] = useState('');

  const selectedCourse = useMemo(
    () => courses.find(course => String(course.course_id) === String(selectedCourseId)),
    [courses, selectedCourseId]
  );

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

  function updateRegister(field, value) {
    setRegisterForm(prev => ({ ...prev, [field]: value }));
  }

  function updateLogin(field, value) {
    setLoginForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleRegister(event) {
    event.preventDefault();
    try {
      const body = { ...registerForm };
      if (body.role !== 'student') delete body.student_no;

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

  async function handleLogin(event) {
    event.preventDefault();
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
    setMyCourses([]);
    setMessage('Logged out.');
  }

  async function loadCourses() {
    try {
      const data = await apiRequest('/courses');
      setCourses(data.courses || []);
      setMessage(`Loaded ${(data.courses || []).length} courses from the database.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadMyCourses() {
    if (!currentUser) return;

    try {
      if (currentUser.role === 'student') {
        const data = await apiRequest(`/courses/student/${currentUser.student_id}`);
        setMyCourses(data.courses || []);
        setMessage(`Loaded ${(data.courses || []).length} registered course(s).`);
      } else if (currentUser.role === 'lecturer') {
        const data = await apiRequest(`/courses/lecturer/${currentUser.lecturer_id}`);
        setMyCourses(data.courses || []);
        setMessage(`Loaded ${(data.courses || []).length} taught course(s).`);
      } else {
        setMessage('Admins do not have a personal course list.');
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createCourse(event) {
    event.preventDefault();
    try {
      const data = await apiRequest('/courses', {
        method: 'POST',
        body: JSON.stringify(credentials({ course_code: courseCode, course_name: courseName })),
      });
      setMessage(`Course created. ID: ${data.course_id}`);
      setCourseCode('');
      setCourseName('');
      await loadCourses();
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
      await loadMyCourses();
      await loadMembers();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function assignLecturer(event) {
    event.preventDefault();
    try {
      const data = await apiRequest(`/courses/${selectedCourseId}/assign_lecturer`, {
        method: 'POST',
        body: JSON.stringify(credentials({ lecturer_id: Number(lecturerId) })),
      });
      setMessage(data.success || 'Lecturer assigned.');
      setLecturerId('');
      await loadMembers();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadMembers() {
    if (!selectedCourseId) return;
    try {
      const data = await apiRequest(`/courses/${selectedCourseId}/members`);
      setMembers(data);
      setMessage('Loaded course members.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadCalendar() {
    if (!selectedCourseId) return;
    try {
      const data = await apiRequest(`/courses/${selectedCourseId}/calendar`);
      setCalendarEvents(data.events || []);
      setMessage('Loaded course calendar.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadStudentDateCalendar() {
    if (!currentUser?.student_id || !studentDate) {
      setMessage('Login as a student and enter a date first.');
      return;
    }

    try {
      const data = await apiRequest(`/calendar/student/${currentUser.student_id}?date=${studentDate}`);
      setStudentDateEvents(data.events || []);
      setMessage(`Loaded ${data.events?.length || 0} event(s) for ${studentDate}.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createCalendarEvent(event) {
    event.preventDefault();
    try {
      const data = await apiRequest(`/courses/${selectedCourseId}/calendar`, {
        method: 'POST',
        body: JSON.stringify(credentials(eventForm)),
      });
      setMessage(data.success || 'Calendar event created.');
      setEventForm({ title: '', event_type: 'general', event_at: '' });
      await loadCalendar();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadForums() {
    if (!selectedCourseId) return;
    try {
      const data = await apiRequest(`/courses/${selectedCourseId}/forums`);
      setForums(data.forums || []);
      setMessage('Loaded forums.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createForum(event) {
    event.preventDefault();
    try {
      const data = await apiRequest(`/courses/${selectedCourseId}/forums`, {
        method: 'POST',
        body: JSON.stringify(credentials({ title: forumTitle })),
      });
      setMessage(data.success || 'Forum created.');
      setForumTitle('');
      await loadForums();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadThreads(forumId = selectedForumId) {
    if (!forumId) return;
    try {
      const data = await apiRequest(`/forums/${forumId}/threads`);
      setThreads(data.threads || []);
      setMessage('Loaded discussion threads.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createThread(event) {
    event.preventDefault();
    try {
      const data = await apiRequest(`/forums/${selectedForumId}/threads`, {
        method: 'POST',
        body: JSON.stringify(credentials(threadForm)),
      });
      setMessage(data.success || 'Thread created.');
      setThreadForm({ title: '', body: '' });
      await loadThreads();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadReplies(threadId = selectedThreadId) {
    if (!threadId) return;
    try {
      const data = await apiRequest(`/threads/${threadId}/replies`);
      setThreadReplies(data);
      setMessage('Loaded thread replies.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createReply(event) {
    event.preventDefault();
    try {
      const data = await apiRequest(`/threads/${selectedThreadId}/replies`, {
        method: 'POST',
        body: JSON.stringify(credentials({ body: replyBody })),
      });
      setMessage(data.success || 'Reply posted.');
      setReplyBody('');
      await loadReplies();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadContent() {
    if (!selectedCourseId) return;
    try {
      const data = await apiRequest(`/courses/${selectedCourseId}/content`);
      setSections(data.sections || []);
      setMessage('Loaded course content.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createSection(event) {
    event.preventDefault();
    try {
      const data = await apiRequest(`/courses/${selectedCourseId}/sections`, {
        method: 'POST',
        body: JSON.stringify(credentials({ title: sectionTitle, position: Number(sectionPosition) })),
      });
      setMessage(data.success || 'Section created.');
      setSectionTitle('');
      setSectionPosition(1);
      await loadContent();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function addSectionItem(event) {
    event.preventDefault();
    try {
      const body = {
        item_type: itemForm.item_type,
        title: itemForm.title,
      };

      if (itemForm.item_type === 'link') body.url = itemForm.url;
      if (itemForm.item_type === 'lecture_slide') body.file_url = itemForm.file_url;
      if (itemForm.item_type === 'assignment') {
        body.description = itemForm.description;
        body.max_score = Number(itemForm.max_score);
      }

      const data = await apiRequest(`/sections/${selectedSectionId}/items`, {
        method: 'POST',
        body: JSON.stringify(credentials(body)),
      });
      setMessage(data.success || 'Content item added.');
      setItemForm({ item_type: 'link', title: '', url: '', file_url: '', description: '', max_score: 100 });
      await loadContent();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function submitAssignment(event) {
    event.preventDefault();
    try {
      const data = await apiRequest(`/assignments/${assignmentId}/submit`, {
        method: 'POST',
        body: JSON.stringify(credentials({ content_url: contentUrl })),
      });
      setMessage(data.success || 'Assignment submitted.');
      setContentUrl('');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function gradeAssignment(event) {
    event.preventDefault();
    try {
      const data = await apiRequest(`/assignments/${gradeForm.assignment_id}/grade`, {
        method: 'POST',
        body: JSON.stringify(credentials({
          student_id: Number(gradeForm.student_id),
          grade: Number(gradeForm.grade),
        })),
      });
      setMessage(data.success || 'Grade submitted.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadAverage() {
    try {
      const id = averageStudentId || currentUser?.student_id;
      const data = await apiRequest(`/students/${id}/average`);
      setAverage(data);
      setMessage('Loaded student average.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadReport(key, path) {
    try {
      const data = await apiRequest(path);
      setReports(prev => ({ ...prev, [key]: data }));
      setMessage(`Loaded report: ${key}`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (currentUser) loadMyCourses();
  }, [currentUser]);

  return (
    <main className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">COMP3161 Database Project</p>
          <h1>Course Management Dashboard</h1>
          <p>Use the frontend to call your Flask API and display live MySQL database records.</p>
        </div>

        {currentUser ? (
          <div className="user-card">
            <strong>{currentUser.first_name} {currentUser.last_name}</strong>
            <span>{currentUser.role} • {currentUser.email}</span>
            <button onClick={logout}>Logout</button>
          </div>
        ) : null}
      </header>

      <section className="grid two">
        <form className="card" onSubmit={handleLogin}>
          <h2>Login</h2>
          <label>Role</label>
          <select value={loginForm.role} onChange={e => updateLogin('role', e.target.value)}>
            <option value="student">Student</option>
            <option value="lecturer">Lecturer</option>
            <option value="admin">Admin</option>
          </select>

          <label>Email</label>
          <input value={loginForm.email} onChange={e => updateLogin('email', e.target.value)} placeholder="student1@example.com" />

          <label>Password</label>
          <input type="password" value={loginForm.password} onChange={e => updateLogin('password', e.target.value)} placeholder="pass123" />

          <button type="submit">Login</button>
        </form>

        <form className="card" onSubmit={handleRegister}>
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
          <input type="password" value={registerForm.password} onChange={e => updateRegister('password', e.target.value)} />

          <label>First Name</label>
          <input value={registerForm.first_name} onChange={e => updateRegister('first_name', e.target.value)} />

          <label>Last Name</label>
          <input value={registerForm.last_name} onChange={e => updateRegister('last_name', e.target.value)} />

          <label>Created By Admin ID</label>
          <input type="number" value={registerForm.created_by_admin_id} onChange={e => updateRegister('created_by_admin_id', Number(e.target.value))} />

          <button type="submit">Create Account</button>
        </form>
      </section>

      {currentUser?.role === 'admin' && (
        <section className="grid two">
          <form className="card" onSubmit={createCourse}>
            <h2>Admin: Create Course</h2>
            <label>Course Code</label>
            <input value={courseCode} onChange={e => setCourseCode(e.target.value)} placeholder="COMP3161" />

            <label>Course Name</label>
            <input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="Database Management Systems" />

            <button type="submit">Create Course</button>
          </form>

          <form className="card" onSubmit={assignLecturer}>
            <h2>Admin: Assign Lecturer</h2>
            <p>Selected course: {selectedCourse ? `${selectedCourse.course_code} - ${selectedCourse.course_name}` : 'None'}</p>

            <label>Lecturer ID</label>
            <input value={lecturerId} onChange={e => setLecturerId(e.target.value)} placeholder="1" />

            <button type="submit" disabled={!selectedCourseId}>Assign Lecturer</button>
          </form>
        </section>
      )}

      <section className="card">
        <div className="section-header">
          <h2>All Courses</h2>
          <button onClick={loadCourses}>Refresh Courses</button>
        </div>

        {selectedCourse && (
          <div className="selected-banner">
            Selected Course: <strong>{selectedCourse.course_code} — {selectedCourse.course_name}</strong>
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Code</th>
                <th>Name</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {courses.map(course => (
                <tr
                  key={course.course_id}
                  className={String(selectedCourseId) === String(course.course_id) ? 'selected-row' : ''}
                  onClick={() => setSelectedCourseId(course.course_id)}
                >
                  <td>{course.course_id}</td>
                  <td>{course.course_code}</td>
                  <td>{course.course_name}</td>
                  <td>
                    <button type="button" onClick={e => {
                      e.stopPropagation();
                      setSelectedCourseId(course.course_id);
                    }}>
                      Select
                    </button>

                    {currentUser?.role === 'student' && (
                      <button type="button" onClick={e => {
                        e.stopPropagation();
                        registerForCourse(course.course_id);
                      }}>
                        Register
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {currentUser && currentUser.role !== 'admin' && (
        <section className="card">
          <div className="section-header">
            <h2>{currentUser.role === 'student' ? 'My Registered Courses' : 'My Taught Courses'}</h2>
            <button onClick={loadMyCourses}>Load My Courses</button>
          </div>

          {myCourses.length === 0 ? (
            <p>No courses loaded yet.</p>
          ) : (
            <ul className="list">
              {myCourses.map(course => (
                <li key={course.course_id}>{course.course_code} — {course.course_name}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="card">
        <h2>Selected Course Tools</h2>
        <p>{selectedCourse ? `${selectedCourse.course_code} — ${selectedCourse.course_name}` : 'Select a course from the table first.'}</p>

        <div className="button-row">
          <button disabled={!selectedCourseId} onClick={loadMembers}>View Members</button>
          <button disabled={!selectedCourseId} onClick={loadCalendar}>View Calendar</button>
          <button disabled={!selectedCourseId} onClick={loadForums}>View Forums</button>
          <button disabled={!selectedCourseId} onClick={loadContent}>View Content</button>
        </div>

        {members && (
          <div className="grid two nested">
            <div>
              <h3>Students</h3>
              <ul>{members.students?.map(s => <li key={s.student_id}>{s.student_no} — {s.first_name} {s.last_name}</li>)}</ul>
            </div>
            <div>
              <h3>Lecturers</h3>
              <ul>{members.lecturers?.map(l => <li key={l.lecturer_id}>{l.lecturer_id} — {l.first_name} {l.last_name}</li>)}</ul>
            </div>
          </div>
        )}

        {calendarEvents.length > 0 && (
          <div>
            <h3>Calendar Events</h3>
            <ul>{calendarEvents.map(e => <li key={e.event_id}>{String(e.event_at)} — {e.title} ({e.event_type})</li>)}</ul>
          </div>
        )}

        {forums.length > 0 && (
          <div>
            <h3>Forums</h3>
            <ul>
              {forums.map(f => (
                <li key={f.forum_id}>
                  <button type="button" onClick={() => {
                    setSelectedForumId(f.forum_id);
                    loadThreads(f.forum_id);
                  }}>
                    Select Forum
                  </button>
                  {f.title}
                </li>
              ))}
            </ul>
          </div>
        )}

        {sections.length > 0 && (
          <div>
            <h3>Content Sections</h3>
            {sections.map(sec => (
              <div className="mini-card" key={sec.section_id}>
                <button type="button" onClick={() => setSelectedSectionId(sec.section_id)}>Select Section</button>
                <strong>{sec.position}. {sec.title}</strong>
                <ul>
                  {sec.items?.map(item => (
                    <li key={item.section_item_id}>
                      #{item.section_item_id} — {item.item_type}: {item.title}
                      {item.url ? ` (${item.url})` : ''}
                      {item.file_url ? ` (${item.file_url})` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {currentUser?.role === 'student' && (
        <section className="grid two">
          <form className="card" onSubmit={submitAssignment}>
            <h2>Student: Submit Assignment</h2>
            <label>Assignment ID</label>
            <input value={assignmentId} onChange={e => setAssignmentId(e.target.value)} placeholder="Section item ID of assignment" />

            <label>Content URL</label>
            <input value={contentUrl} onChange={e => setContentUrl(e.target.value)} placeholder="https://..." />

            <button type="submit">Submit Assignment</button>
          </form>

          <div className="card">
            <h2>Student: Calendar By Date</h2>
            <label>Date</label>
            <input type="date" value={studentDate} onChange={e => setStudentDate(e.target.value)} />
            <button onClick={loadStudentDateCalendar}>Load Events</button>
            <ul>{studentDateEvents.map(e => <li key={e.event_id}>{String(e.event_at)} — {e.title}</li>)}</ul>
          </div>
        </section>
      )}

      {currentUser?.role === 'lecturer' && (
        <>
          <section className="grid three">
            <form className="card" onSubmit={createSection}>
              <h2>Lecturer: Add Section</h2>
              <label>Section Title</label>
              <input value={sectionTitle} onChange={e => setSectionTitle(e.target.value)} />

              <label>Position</label>
              <input type="number" value={sectionPosition} onChange={e => setSectionPosition(e.target.value)} />

              <button disabled={!selectedCourseId}>Create Section</button>
            </form>

            <form className="card" onSubmit={createCalendarEvent}>
              <h2>Lecturer: Add Calendar Event</h2>
              <label>Title</label>
              <input value={eventForm.title} onChange={e => setEventForm(prev => ({ ...prev, title: e.target.value }))} />

              <label>Type</label>
              <select value={eventForm.event_type} onChange={e => setEventForm(prev => ({ ...prev, event_type: e.target.value }))}>
                <option value="general">General</option>
                <option value="assignment_due">Assignment Due</option>
              </select>

              <label>Date/Time</label>
              <input value={eventForm.event_at} onChange={e => setEventForm(prev => ({ ...prev, event_at: e.target.value }))} placeholder="2026-05-20 09:00:00" />

              <button disabled={!selectedCourseId}>Create Event</button>
            </form>

            <form className="card" onSubmit={createForum}>
              <h2>Lecturer: Create Forum</h2>
              <label>Forum Title</label>
              <input value={forumTitle} onChange={e => setForumTitle(e.target.value)} />

              <button disabled={!selectedCourseId}>Create Forum</button>
            </form>
          </section>

          <section className="grid two">
            <form className="card" onSubmit={addSectionItem}>
              <h2>Lecturer: Add Content Item</h2>
              <p>Selected section ID: {selectedSectionId || 'None'}</p>

              <label>Type</label>
              <select value={itemForm.item_type} onChange={e => setItemForm(prev => ({ ...prev, item_type: e.target.value }))}>
                <option value="link">Link</option>
                <option value="lecture_slide">File/Slide</option>
                <option value="assignment">Assignment</option>
              </select>

              <label>Title</label>
              <input value={itemForm.title} onChange={e => setItemForm(prev => ({ ...prev, title: e.target.value }))} />

              {itemForm.item_type === 'link' && (
                <>
                  <label>URL</label>
                  <input value={itemForm.url} onChange={e => setItemForm(prev => ({ ...prev, url: e.target.value }))} />
                </>
              )}

              {itemForm.item_type === 'lecture_slide' && (
                <>
                  <label>File URL</label>
                  <input value={itemForm.file_url} onChange={e => setItemForm(prev => ({ ...prev, file_url: e.target.value }))} />
                </>
              )}

              {itemForm.item_type === 'assignment' && (
                <>
                  <label>Description</label>
                  <input value={itemForm.description} onChange={e => setItemForm(prev => ({ ...prev, description: e.target.value }))} />
                  <label>Max Score</label>
                  <input type="number" value={itemForm.max_score} onChange={e => setItemForm(prev => ({ ...prev, max_score: e.target.value }))} />
                </>
              )}

              <button disabled={!selectedSectionId}>Add Content</button>
            </form>

            <form className="card" onSubmit={gradeAssignment}>
              <h2>Lecturer: Grade Assignment</h2>
              <label>Assignment ID</label>
              <input value={gradeForm.assignment_id} onChange={e => setGradeForm(prev => ({ ...prev, assignment_id: e.target.value }))} />

              <label>Student ID</label>
              <input value={gradeForm.student_id} onChange={e => setGradeForm(prev => ({ ...prev, student_id: e.target.value }))} />

              <label>Grade</label>
              <input type="number" value={gradeForm.grade} onChange={e => setGradeForm(prev => ({ ...prev, grade: e.target.value }))} />

              <button type="submit">Submit Grade</button>
            </form>
          </section>
        </>
      )}

      {currentUser && currentUser.role !== 'admin' && (
        <section className="grid two">
          <form className="card" onSubmit={createThread}>
            <h2>Discussion: New Thread</h2>
            <p>Selected forum ID: {selectedForumId || 'None'}</p>

            <label>Title</label>
            <input value={threadForm.title} onChange={e => setThreadForm(prev => ({ ...prev, title: e.target.value }))} />

            <label>Post</label>
            <textarea value={threadForm.body} onChange={e => setThreadForm(prev => ({ ...prev, body: e.target.value }))} />

            <button disabled={!selectedForumId}>Create Thread</button>
          </form>

          <div className="card">
            <div className="section-header">
              <h2>Discussion Threads</h2>
              <button disabled={!selectedForumId} onClick={() => loadThreads()}>Refresh Threads</button>
            </div>

            <ul>
              {threads.map(t => (
                <li key={t.thread_id}>
                  <button onClick={() => {
                    setSelectedThreadId(t.thread_id);
                    loadReplies(t.thread_id);
                  }}>
                    Select Thread
                  </button>
                  {t.title}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {currentUser && currentUser.role !== 'admin' && (
        <section className="grid two">
          <form className="card" onSubmit={createReply}>
            <h2>Reply to Thread</h2>
            <p>Selected thread ID: {selectedThreadId || 'None'}</p>
            <textarea value={replyBody} onChange={e => setReplyBody(e.target.value)} />
            <button disabled={!selectedThreadId}>Post Reply</button>
          </form>

          <div className="card">
            <h2>Thread Replies</h2>
            <pre>{threadReplies ? JSON.stringify(threadReplies, null, 2) : 'No thread selected.'}</pre>
          </div>
        </section>
      )}

      <section className="card">
        <h2>Student Average</h2>
        <label>Student ID</label>
        <input value={averageStudentId} onChange={e => setAverageStudentId(e.target.value)} placeholder={currentUser?.student_id ? String(currentUser.student_id) : 'Student ID'} />
        <button onClick={loadAverage}>Load Average</button>
        <pre>{average ? JSON.stringify(average, null, 2) : ''}</pre>
      </section>

      <section className="card">
        <h2>Reports</h2>
        <div className="button-row">
          <button onClick={() => loadReport('courses50', '/reports/courses_50_plus_students')}>Courses with 50+ Students</button>
          <button onClick={() => loadReport('students5', '/reports/students_5_plus_courses')}>Students with 5+ Courses</button>
          <button onClick={() => loadReport('lecturers3', '/reports/lecturers_3_plus_courses')}>Lecturers with 3+ Courses</button>
          <button onClick={() => loadReport('topCourses', '/reports/top_10_enrolled_courses')}>Top 10 Courses</button>
          <button onClick={() => loadReport('topStudents', '/reports/top_10_students_by_average')}>Top 10 Students</button>
        </div>
        <pre>{JSON.stringify(reports, null, 2)}</pre>
      </section>

      <section className="message">
        <strong>Status</strong>
        <pre>{message}</pre>
      </section>
    </main>
  );
}

const styles = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #f3f5f8; color: #172033; font-family: Arial, sans-serif; }
  button { border: 0; border-radius: 8px; padding: 9px 12px; background: #172033; color: white; cursor: pointer; margin: 3px; }
  button:disabled { opacity: 0.45; cursor: not-allowed; }
  input, select, textarea { width: 100%; padding: 10px; margin: 6px 0 12px; border: 1px solid #cdd3df; border-radius: 8px; background: white; }
  textarea { min-height: 90px; resize: vertical; }
  label { font-size: 0.85rem; font-weight: bold; color: #3b4658; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 10px; border-bottom: 1px solid #e2e6ee; text-align: left; }
  th { background: #eef1f7; }
  tr { transition: 0.2s; }
  tr:hover { background: #f8faff; cursor: pointer; }
  pre { white-space: pre-wrap; overflow-x: auto; }
  .page { max-width: 1200px; margin: 0 auto; padding: 28px; }
  .hero { display: flex; justify-content: space-between; gap: 20px; align-items: center; margin-bottom: 22px; }
  .hero h1 { margin: 6px 0; font-size: 2.2rem; }
  .eyebrow { margin: 0; font-weight: bold; color: #4963d1; text-transform: uppercase; letter-spacing: 0.08em; }
  .grid { display: grid; gap: 18px; margin-bottom: 18px; }
  .two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .card, .message, .user-card { background: white; border: 1px solid #e0e5ef; border-radius: 16px; padding: 20px; box-shadow: 0 10px 30px rgba(18, 33, 60, 0.06); margin-bottom: 18px; }
  .user-card { min-width: 260px; margin: 0; display: grid; gap: 8px; }
  .section-header, .button-row { display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
  .table-wrap { overflow-x: auto; }
  .list { margin: 0; padding-left: 20px; }
  .nested { margin-top: 12px; }
  .mini-card { border: 1px solid #e2e6ee; border-radius: 12px; padding: 12px; margin: 10px 0; }
  .selected-row { background: #e8f0ff !important; }
  .selected-banner { background: #eef4ff; border: 1px solid #d4e2ff; padding: 12px; border-radius: 10px; margin: 12px 0; }
  @media (max-width: 850px) { .two, .three { grid-template-columns: 1fr; } .hero { flex-direction: column; align-items: flex-start; } }
`;

const styleTag = document.createElement('style');
styleTag.innerHTML = styles;
document.head.appendChild(styleTag);

createRoot(document.getElementById('root')).render(<App />);

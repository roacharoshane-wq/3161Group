import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000';

// ─── tiny helpers ──────────────────────────────────────────────────────────────
const useForm = (init) => {
  const [val, set] = useState(init);
  const bind = (key) => ({ value: val[key], onChange: e => set(v => ({ ...v, [key]: e.target.value })) });
  return [val, set, bind];
};

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#5a6478', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</label>
      {children}
    </div>
  );
}

const inp = { width: '100%', padding: '8px 10px', border: '1px solid #dde3ef', borderRadius: 8, fontSize: 14, background: '#fafbfd', boxSizing: 'border-box' };
const sel = { ...inp, cursor: 'pointer' };
const tex = { ...inp, minHeight: 72, resize: 'vertical' };
const btn = (variant = 'primary') => ({
  padding: '9px 16px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
  background: variant === 'primary' ? '#3b55c8' : variant === 'danger' ? '#d93025' : '#eef0f8',
  color: variant === 'primary' ? '#fff' : variant === 'danger' ? '#fff' : '#3b55c8',
});

function Card({ title, children, style }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e4e8f2', borderRadius: 14, padding: 20, marginBottom: 16, ...style }}>
      {title && <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#1a2035' }}>{title}</h3>}
      {children}
    </div>
  );
}

function Alert({ msg, isError, onClose }) {
  if (!msg) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 600,
      background: isError ? '#fff0f0' : '#f0faf4', border: `1px solid ${isError ? '#f5b5b5' : '#a8dfc0'}`, color: isError ? '#b91c1c' : '#166534' }}>
      {msg}
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'inherit', lineHeight: 1 }}>×</button>
    </div>
  );
}

function ResultPanel({ result }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#5a6478', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Last Response</div>
      <pre style={{ background: '#0e1525', color: '#a8d8ff', padding: 16, borderRadius: 12, fontSize: 12, overflowX: 'auto', maxHeight: 320, margin: 0 }}>
        {result ? JSON.stringify(result, null, 2) : 'No response yet.'}
      </pre>
    </div>
  );
}

// ─── Tab navigation ────────────────────────────────────────────────────────────
const TABS_ADMIN    = ['Courses', 'Lookup', 'Reports'];
const TABS_LECTURER = ['Calendar', 'Forums', 'Content', 'Grades', 'Lookup', 'Reports'];
const TABS_STUDENT  = ['My Courses', 'Forums', 'Lookup', 'Reports'];
const TABS_GUEST    = [];

function Tabs({ tabs, active, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e4e8f2', paddingBottom: 0 }}>
      {tabs.map(t => (
        <button key={t} onClick={() => onSelect(t)} style={{
          padding: '9px 16px', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontWeight: 700, fontSize: 13,
          background: active === t ? '#3b55c8' : 'transparent', color: active === t ? '#fff' : '#5a6478',
          marginBottom: -2, borderBottom: active === t ? '2px solid #3b55c8' : '2px solid transparent',
        }}>{t}</button>
      ))}
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cms_user')); } catch { return null; }
  });
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);
  const [result, setResult] = useState(null);
  const [tab, setTab] = useState('');

  const isAdmin    = user?.role === 'admin';
  const isLecturer = user?.role === 'lecturer';
  const isStudent  = user?.role === 'student';

  const tabs = isAdmin ? TABS_ADMIN : isLecturer ? TABS_LECTURER : isStudent ? TABS_STUDENT : TABS_GUEST;
  useEffect(() => { if (tabs.length && !tab) setTab(tabs[0]); }, [user]);

  function flash(text, err = false) { setMsg(text); setIsError(err); }

  function creds(extra = {}) {
    return user ? { role: user.role, email: user.email, password: user.password, ...extra } : extra;
  }

  async function api(path, opts = {}) {
    const r = await fetch(`${API_BASE}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
    const text = await r.text();
    const data = text ? JSON.parse(text) : {};
    if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`);
    setResult(data);
    return data;
  }

  async function post(path, body) {
    try { const d = await api(path, { method: 'POST', body: JSON.stringify(creds(body)) }); flash(d.success || 'Done.'); return d; }
    catch (e) { flash(e.message, true); }
  }

  async function get(path, label = 'Retrieved.') {
    try { await api(path); flash(label); }
    catch (e) { flash(e.message, true); }
  }

  async function doLogin(loginData) {
    try {
      const d = await api('/login', { method: 'POST', body: JSON.stringify(loginData) });
      const saved = { ...d.user, role: d.role, email: loginData.email, password: loginData.password };
      localStorage.setItem('cms_user', JSON.stringify(saved));
      setUser(saved);
      setTab('');
      flash(`Logged in as ${d.role}`);
    } catch (e) { flash(e.message, true); }
  }

  function logout() {
    localStorage.removeItem('cms_user');
    setUser(null); setResult(null); setTab(''); flash('Logged out.');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f5fb', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#1a2240', color: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ background: '#3b55c8', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, letterSpacing: '.06em' }}>COMP3161</span>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Course Management System</span>
        </div>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ textAlign: 'right', lineHeight: 1.3 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{user.first_name} {user.last_name}</div>
              <div style={{ fontSize: 11, color: '#93aac8', textTransform: 'uppercase', letterSpacing: '.06em' }}>{user.role}</div>
            </div>
            <button onClick={logout} style={{ ...btn('ghost'), background: 'rgba(255,255,255,.1)', color: '#fff' }}>Logout</button>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
        <Alert msg={msg} isError={isError} onClose={() => setMsg('')} />

        {!user ? (
          <AuthSection onLogin={doLogin} flash={flash} api={api} />
        ) : (
          <>
            <Tabs tabs={tabs} active={tab} onSelect={setTab} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
              <div>
                {/* Admin tabs */}
                {isAdmin && tab === 'Courses' && <AdminCourses post={post} get={get} flash={flash} api={api} creds={creds} />}
                {/* Shared Lookup */}
                {tab === 'Lookup' && <LookupSection get={get} />}
                {/* Reports */}
                {tab === 'Reports' && <ReportsSection get={get} />}
                {/* Lecturer tabs */}
                {isLecturer && tab === 'Calendar'  && <LecturerCalendar post={post} />}
                {isLecturer && tab === 'Forums'    && <ForumsSection post={post} isLecturer={isLecturer} />}
                {isLecturer && tab === 'Content'   && <LecturerContent post={post} />}
                {isLecturer && tab === 'Grades'    && <LecturerGrades post={post} />}
                {/* Student tabs */}
                {isStudent  && tab === 'My Courses' && <StudentCourses post={post} get={get} />}
                {isStudent  && tab === 'Forums'     && <ForumsSection post={post} isLecturer={false} />}
              </div>
              <div>
                <Card>
                  <ResultPanel result={result} />
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Auth ──────────────────────────────────────────────────────────────────────
function AuthSection({ onLogin, flash, api }) {
  const [lf, , lb] = useForm({ role: 'student', email: '', password: '' });
  const [rf, setRf, rb] = useForm({ role: 'student', student_no: '', email: '', password: '', first_name: '', last_name: '', created_by_admin_id: 1 });

  async function doRegister(e) {
    e.preventDefault();
    try {
      const body = { ...rf, created_by_admin_id: Number(rf.created_by_admin_id) };
      if (body.role !== 'student') delete body.student_no;
      const d = await api('/register_user', { method: 'POST', body: JSON.stringify(body) });
      flash(`${d.role} created — ID: ${d.user_id}`);
    } catch (e) { flash(e.message, true); }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <Card title="Login">
        <form onSubmit={e => { e.preventDefault(); onLogin(lf); }}>
          <Field label="Role"><select style={sel} {...lb('role')}><option value="student">Student</option><option value="lecturer">Lecturer</option><option value="admin">Admin</option></select></Field>
          <Field label="Email"><input style={inp} type="email" {...lb('email')} /></Field>
          <Field label="Password"><input style={inp} type="password" {...lb('password')} /></Field>
          <button style={btn()} type="submit">Login</button>
        </form>
      </Card>
      <Card title="Register User">
        <form onSubmit={doRegister}>
          <Field label="Role"><select style={sel} value={rf.role} onChange={e => setRf(v => ({ ...v, role: e.target.value }))}><option value="student">Student</option><option value="lecturer">Lecturer</option><option value="admin">Admin</option></select></Field>
          {rf.role === 'student' && <Field label="Student No"><input style={inp} {...rb('student_no')} /></Field>}
          <Field label="Email"><input style={inp} type="email" {...rb('email')} /></Field>
          <Field label="Password"><input style={inp} type="password" {...rb('password')} /></Field>
          <Field label="First Name"><input style={inp} {...rb('first_name')} /></Field>
          <Field label="Last Name"><input style={inp} {...rb('last_name')} /></Field>
          <Field label="Created By Admin ID"><input style={inp} type="number" {...rb('created_by_admin_id')} /></Field>
          <button style={btn()} type="submit">Create Account</button>
        </form>
      </Card>
    </div>
  );
}

// ─── Admin: Courses ────────────────────────────────────────────────────────────
function AdminCourses({ post, get }) {
  const [cf, , cb] = useForm({ course_code: '', course_name: '' });
  const [af, , ab] = useForm({ course_id: '', lecturer_id: '' });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <Card title="Create Course">
        <form onSubmit={e => { e.preventDefault(); post('/courses', cf); }}>
          <Field label="Course Code"><input style={inp} {...cb('course_code')} placeholder="e.g. COMP3161" /></Field>
          <Field label="Course Name"><input style={inp} {...cb('course_name')} placeholder="e.g. Database Management" /></Field>
          <button style={btn()} type="submit">Create Course</button>
        </form>
      </Card>
      <Card title="Assign Lecturer to Course">
        <form onSubmit={e => { e.preventDefault(); post(`/courses/${af.course_id}/assign_lecturer`, { lecturer_id: Number(af.lecturer_id) }); }}>
          <Field label="Course ID"><input style={inp} type="number" {...ab('course_id')} /></Field>
          <Field label="Lecturer ID"><input style={inp} type="number" {...ab('lecturer_id')} /></Field>
          <button style={btn()} type="submit">Assign Lecturer</button>
        </form>
      </Card>
      <Card title="All Courses" style={{ gridColumn: '1/-1' }}>
        <button style={btn('secondary')} onClick={() => get('/courses', 'All courses loaded.')}>Load All Courses</button>
      </Card>
    </div>
  );
}

// ─── Student ───────────────────────────────────────────────────────────────────
function StudentCourses({ post, get }) {
  const [sf, , sb] = useForm({ assignment_id: '', content_url: '' });
  const [cid, setCid] = useState('');
  const [sid, setSid] = useState('');
  const [date, setDate] = useState('');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <Card title="Register for a Course">
        <Field label="Course ID">
          <input style={inp} type="number" value={cid} onChange={e => setCid(e.target.value)} />
        </Field>
        <button style={btn()} onClick={() => post(`/courses/${cid}/register`, {})}>Register</button>
      </Card>
      <Card title="Submit Assignment">
        <form onSubmit={e => { e.preventDefault(); post(`/assignments/${sf.assignment_id}/submit`, { content_url: sf.content_url }); }}>
          <Field label="Assignment ID"><input style={inp} type="number" {...sb('assignment_id')} /></Field>
          <Field label="Content URL"><input style={inp} {...sb('content_url')} placeholder="https://..." /></Field>
          <button style={btn()} type="submit">Submit</button>
        </form>
      </Card>
      <Card title="My Courses">
        <Field label="Student ID (leave blank to use my ID)">
          <input style={inp} type="number" value={sid} onChange={e => setSid(e.target.value)} />
        </Field>
        <button style={btn('secondary')} onClick={() => get(`/courses/student/${sid}`, 'Student courses loaded.')}>Load My Courses</button>
      </Card>
      <Card title="Calendar by Date">
        <Field label="Student ID"><input style={inp} type="number" value={sid} onChange={e => setSid(e.target.value)} /></Field>
        <Field label="Date"><input style={inp} type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
        <button style={btn('secondary')} onClick={() => get(`/calendar/student/${sid}?date=${date}`, 'Calendar loaded.')}>Get Calendar</button>
      </Card>
    </div>
  );
}

// ─── Lecturer: Calendar ────────────────────────────────────────────────────────
function LecturerCalendar({ post }) {
  const [ef, , eb] = useForm({ course_id: '', title: '', event_type: 'general', event_at: '' });
  return (
    <Card title="Create Calendar Event">
      <form onSubmit={e => { e.preventDefault(); post(`/courses/${ef.course_id}/calendar`, { title: ef.title, event_type: ef.event_type, event_at: ef.event_at }); }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Course ID"><input style={inp} type="number" {...eb('course_id')} /></Field>
          <Field label="Event Type">
            <select style={sel} {...eb('event_type')}>
              <option value="general">General</option>
              <option value="assignment_due">Assignment Due</option>
            </select>
          </Field>
          <Field label="Title" ><input style={{ ...inp, gridColumn: '1/-1' }} {...eb('title')} /></Field>
          <Field label="Date / Time"><input style={inp} {...eb('event_at')} placeholder="2026-06-01 23:59:00" /></Field>
        </div>
        <button style={btn()} type="submit">Create Event</button>
      </form>
    </Card>
  );
}

// ─── Lecturer: Content ─────────────────────────────────────────────────────────
function LecturerContent({ post }) {
  const [sf, , sb] = useForm({ course_id: '', title: '', position: 1 });
  const [it, setIt] = useForm({ section_id: '', item_type: 'link', title: '', url: '', file_url: '', description: '', max_score: 100 });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <Card title="Add Section to Course">
        <form onSubmit={e => { e.preventDefault(); post(`/courses/${sf.course_id}/sections`, { title: sf.title, position: Number(sf.position) }); }}>
          <Field label="Course ID"><input style={inp} type="number" {...sb('course_id')} /></Field>
          <Field label="Title"><input style={inp} {...sb('title')} /></Field>
          <Field label="Position"><input style={inp} type="number" {...sb('position')} /></Field>
          <button style={btn()} type="submit">Add Section</button>
        </form>
      </Card>
      <Card title="Add Content Item">
        <form onSubmit={e => {
          e.preventDefault();
          const body = { item_type: it.item_type, title: it.title };
          if (it.item_type === 'link') body.url = it.url;
          if (it.item_type === 'lecture_slide') body.file_url = it.file_url;
          if (it.item_type === 'assignment') { body.description = it.description; body.max_score = Number(it.max_score); }
          post(`/sections/${it.section_id}/items`, body);
        }}>
          <Field label="Section ID"><input style={inp} type="number" value={it.section_id} onChange={e => setIt(v => ({ ...v, section_id: e.target.value }))} /></Field>
          <Field label="Type">
            <select style={sel} value={it.item_type} onChange={e => setIt(v => ({ ...v, item_type: e.target.value }))}>
              <option value="link">Link</option>
              <option value="lecture_slide">Lecture Slide</option>
              <option value="assignment">Assignment</option>
            </select>
          </Field>
          <Field label="Title"><input style={inp} value={it.title} onChange={e => setIt(v => ({ ...v, title: e.target.value }))} /></Field>
          {it.item_type === 'link'          && <Field label="URL"><input style={inp} value={it.url} onChange={e => setIt(v => ({ ...v, url: e.target.value }))} /></Field>}
          {it.item_type === 'lecture_slide' && <Field label="File URL"><input style={inp} value={it.file_url} onChange={e => setIt(v => ({ ...v, file_url: e.target.value }))} /></Field>}
          {it.item_type === 'assignment' && <>
            <Field label="Description"><textarea style={tex} value={it.description} onChange={e => setIt(v => ({ ...v, description: e.target.value }))} /></Field>
            <Field label="Max Score"><input style={inp} type="number" value={it.max_score} onChange={e => setIt(v => ({ ...v, max_score: e.target.value }))} /></Field>
          </>}
          <button style={btn()} type="submit">Add Item</button>
        </form>
      </Card>
    </div>
  );
}

// ─── Lecturer: Grade ───────────────────────────────────────────────────────────
function LecturerGrades({ post }) {
  const [gf, , gb] = useForm({ assignment_id: '', student_id: '', grade: '' });
  return (
    <Card title="Grade Assignment Submission">
      <form onSubmit={e => { e.preventDefault(); post(`/assignments/${gf.assignment_id}/grade`, { student_id: Number(gf.student_id), grade: Number(gf.grade) }); }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Field label="Assignment ID"><input style={inp} type="number" {...gb('assignment_id')} /></Field>
          <Field label="Student ID"><input style={inp} type="number" {...gb('student_id')} /></Field>
          <Field label="Grade"><input style={inp} type="number" step="0.01" {...gb('grade')} /></Field>
        </div>
        <button style={btn()} type="submit">Submit Grade</button>
      </form>
    </Card>
  );
}

// ─── Forums (shared) ───────────────────────────────────────────────────────────
function ForumsSection({ post, isLecturer }) {
  const [ff, , fb] = useForm({ course_id: '', title: '' });
  const [tf, , tb] = useForm({ forum_id: '', title: '', body: '' });
  const [rf, , rb] = useForm({ thread_id: '', parent_reply_id: '', body: '' });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {isLecturer && (
        <Card title="Create Forum">
          <form onSubmit={e => { e.preventDefault(); post(`/courses/${ff.course_id}/forums`, { title: ff.title }); }}>
            <Field label="Course ID"><input style={inp} type="number" {...fb('course_id')} /></Field>
            <Field label="Title"><input style={inp} {...fb('title')} /></Field>
            <button style={btn()} type="submit">Create Forum</button>
          </form>
        </Card>
      )}
      <Card title="Create Thread">
        <form onSubmit={e => { e.preventDefault(); post(`/forums/${tf.forum_id}/threads`, { title: tf.title, body: tf.body }); }}>
          <Field label="Forum ID"><input style={inp} type="number" {...tb('forum_id')} /></Field>
          <Field label="Title"><input style={inp} {...tb('title')} /></Field>
          <Field label="Body"><textarea style={tex} {...tb('body')} /></Field>
          <button style={btn()} type="submit">Post Thread</button>
        </form>
      </Card>
      <Card title="Reply to Thread">
        <form onSubmit={e => {
          e.preventDefault();
          const body = { body: rf.body };
          if (rf.parent_reply_id) body.parent_reply_id = Number(rf.parent_reply_id);
          post(`/threads/${rf.thread_id}/replies`, body);
        }}>
          <Field label="Thread ID"><input style={inp} type="number" {...rb('thread_id')} /></Field>
          <Field label="Parent Reply ID (optional)"><input style={inp} type="number" {...rb('parent_reply_id')} /></Field>
          <Field label="Reply"><textarea style={tex} {...rb('body')} /></Field>
          <button style={btn()} type="submit">Post Reply</button>
        </form>
      </Card>
    </div>
  );
}

// ─── Lookup ────────────────────────────────────────────────────────────────────
function LookupSection({ get }) {
  const [cid, setCid]   = useState('');
  const [sid, setSid]   = useState('');
  const [lid, setLid]   = useState('');
  const [fid, setFid]   = useState('');
  const [tid, setTid]   = useState('');
  const [date, setDate] = useState('');

  const row = { display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 };
  const smallInp = { ...inp, flex: 1 };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <Card title="By Course ID">
        <Field label="Course ID"><input style={inp} type="number" value={cid} onChange={e => setCid(e.target.value)} /></Field>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          <button style={btn('secondary')} onClick={() => get(`/courses/${cid}/members`, 'Members loaded.')}>Members</button>
          <button style={btn('secondary')} onClick={() => get(`/courses/${cid}/calendar`, 'Calendar loaded.')}>Calendar</button>
          <button style={btn('secondary')} onClick={() => get(`/courses/${cid}/forums`, 'Forums loaded.')}>Forums</button>
          <button style={btn('secondary')} onClick={() => get(`/courses/${cid}/content`, 'Content loaded.')}>Content</button>
        </div>
      </Card>
      <Card title="By Student / Lecturer ID">
        <Field label="Student ID"><input style={inp} type="number" value={sid} onChange={e => setSid(e.target.value)} /></Field>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btn('secondary')} onClick={() => get(`/courses/student/${sid}`, 'Student courses loaded.')}>Student Courses</button>
          <button style={btn('secondary')} onClick={() => get(`/students/${sid}/average`, 'Average loaded.')}>Average</button>
        </div>
        <div style={{ height: 1, background: '#e4e8f2', margin: '12px 0' }} />
        <Field label="Lecturer ID"><input style={inp} type="number" value={lid} onChange={e => setLid(e.target.value)} /></Field>
        <button style={btn('secondary')} onClick={() => get(`/courses/lecturer/${lid}`, 'Lecturer courses loaded.')}>Lecturer Courses</button>
      </Card>
      <Card title="Calendar by Date">
        <Field label="Student ID"><input style={inp} type="number" value={sid} onChange={e => setSid(e.target.value)} /></Field>
        <Field label="Date"><input style={inp} type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
        <button style={btn('secondary')} onClick={() => get(`/calendar/student/${sid}?date=${date}`, 'Calendar loaded.')}>Get Events</button>
      </Card>
      <Card title="Forum / Thread">
        <Field label="Forum ID"><input style={inp} type="number" value={fid} onChange={e => setFid(e.target.value)} /></Field>
        <button style={btn('secondary')} onClick={() => get(`/forums/${fid}/threads`, 'Threads loaded.')}>Get Threads</button>
        <div style={{ height: 1, background: '#e4e8f2', margin: '12px 0' }} />
        <Field label="Thread ID"><input style={inp} type="number" value={tid} onChange={e => setTid(e.target.value)} /></Field>
        <button style={btn('secondary')} onClick={() => get(`/threads/${tid}/replies`, 'Replies loaded.')}>Get Replies</button>
      </Card>
    </div>
  );
}

// ─── Reports ───────────────────────────────────────────────────────────────────
function ReportsSection({ get }) {
  const reports = [
    { label: 'Courses with 50+ Students', path: '/reports/courses_50_plus_students' },
    { label: 'Students with 5+ Courses',  path: '/reports/students_5_plus_courses' },
    { label: 'Lecturers with 3+ Courses', path: '/reports/lecturers_3_plus_courses' },
    { label: 'Top 10 Enrolled Courses',   path: '/reports/top_10_enrolled_courses' },
    { label: 'Top 10 Students by Average',path: '/reports/top_10_students_by_average' },
  ];
  return (
    <Card title="Reports">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
        {reports.map(r => (
          <button key={r.path} style={{ ...btn('secondary'), textAlign: 'left', padding: '12px 14px' }}
            onClick={() => get(r.path, `${r.label} loaded.`)}>
            {r.label}
          </button>
        ))}
      </div>
    </Card>
  );
}

createRoot(document.getElementById('root')).render(<App />);

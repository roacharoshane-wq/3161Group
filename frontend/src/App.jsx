import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const explicitApiBase = import.meta.env.VITE_API_BASE;
const useProxy = import.meta.env.DEV && (!explicitApiBase || /localhost|127\.0\.0\.1/.test(explicitApiBase));
const API_BASE = useProxy ? '/api' : (explicitApiBase || '/api');
const BASIC_USER = import.meta.env.VITE_BASIC_USER;
const BASIC_PASS = import.meta.env.VITE_BASIC_PASS;

const getBasicAuthHeaders = () => {
  if (!BASIC_USER || !BASIC_PASS) return {};
  const token = btoa(`${BASIC_USER}:${BASIC_PASS}`);
  return { Authorization: `Basic ${token}` };
};

const parsePositiveInt = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
};

// ─── tiny helpers ──────────────────────────────────────────────────────────────
const useForm = (init) => {
  const [val, set] = useState(init);
  const bind = (key) => ({ value: val[key], onChange: e => set(v => ({ ...v, [key]: e.target.value })) });
  return [val, set, bind];
};

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</label>
      {children}
    </div>
  );
}

const inp = { width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 14, background: 'var(--surface)', color: 'var(--ink)', boxSizing: 'border-box' };
const sel = { ...inp, cursor: 'pointer' };
const tex = { ...inp, minHeight: 72, resize: 'vertical' };
const btn = (variant = 'primary') => ({
  padding: '9px 16px', borderRadius: 10, border: '1px solid transparent', fontWeight: 700, fontSize: 13, cursor: 'pointer',
  background: variant === 'primary' ? 'var(--accent)' : variant === 'danger' ? 'var(--danger)' : 'var(--accent-soft)',
  color: variant === 'primary' ? 'var(--accent-contrast)' : variant === 'danger' ? '#fff' : 'var(--accent)',
  boxShadow: variant === 'primary' ? '0 6px 16px rgba(15, 118, 110, 0.25)' : 'none',
});

function Card({ title, children, style }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: 'var(--shadow)', ...style }}>
      {title && <h3 style={{ margin: '0 0 16px', fontSize: 16, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>{title}</h3>}
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

const normalizeText = (value) => String(value ?? '').toLowerCase().trim();

const dedupeOptions = (options) => {
  const map = new Map();
  options.forEach((opt) => {
    if (!opt || opt.value === undefined || opt.value === null) return;
    const value = String(opt.value).trim();
    if (!value) return;
    const label = opt.label ? String(opt.label) : value;
    map.set(value, { value, label });
  });
  return Array.from(map.values());
};

const toCourseOption = (course) => {
  if (!course || course.course_id === undefined || course.course_id === null) return null;
  const labelParts = [course.course_code, course.course_name].filter(Boolean);
  return {
    value: String(course.course_id),
    label: labelParts.join(' - ') || `Course ${course.course_id}`
  };
};

const toStudentOption = (student) => {
  if (!student || student.student_id === undefined || student.student_id === null) return null;
  const name = [student.first_name, student.last_name].filter(Boolean).join(' ');
  const extra = [student.student_no, student.email].filter(Boolean).join(' / ');
  return {
    value: String(student.student_id),
    label: [name, extra].filter(Boolean).join(' - ') || `Student ${student.student_id}`
  };
};

const toLecturerOption = (lecturer) => {
  if (!lecturer || lecturer.lecturer_id === undefined || lecturer.lecturer_id === null) return null;
  const name = [lecturer.first_name, lecturer.last_name].filter(Boolean).join(' ');
  const extra = lecturer.email ? lecturer.email : '';
  return {
    value: String(lecturer.lecturer_id),
    label: [name, extra].filter(Boolean).join(' - ') || `Lecturer ${lecturer.lecturer_id}`
  };
};

const toForumOption = (forum) => {
  if (!forum || forum.forum_id === undefined || forum.forum_id === null) return null;
  return {
    value: String(forum.forum_id),
    label: forum.title ? forum.title : `Forum ${forum.forum_id}`
  };
};

const toThreadOption = (thread) => {
  if (!thread || thread.thread_id === undefined || thread.thread_id === null) return null;
  return {
    value: String(thread.thread_id),
    label: thread.title ? thread.title : `Thread ${thread.thread_id}`
  };
};

const toSectionOption = (section) => {
  if (!section || section.section_id === undefined || section.section_id === null) return null;
  return {
    value: String(section.section_id),
    label: section.title ? section.title : `Section ${section.section_id}`
  };
};

const toAssignmentOption = (item) => {
  const assignmentId = item?.assignment_id ?? item?.section_item_id;
  if (assignmentId === undefined || assignmentId === null) return null;
  return {
    value: String(assignmentId),
    label: item?.title ? item.title : `Assignment ${assignmentId}`
  };
};

const toEventOption = (event) => {
  if (!event || event.event_id === undefined || event.event_id === null) return null;
  return {
    value: String(event.event_id),
    label: event.title ? event.title : `Event ${event.event_id}`
  };
};

function SuggestField({ label, value, onChange, options, placeholder, type = 'text', listId, selectLabel = 'Select' }) {
  const textValue = value ?? '';
  const query = normalizeText(textValue);
  const matches = options.filter((opt) => {
    if (!query) return true;
    return normalizeText(opt.value).includes(query) || normalizeText(opt.label).includes(query);
  }).slice(0, 20);
  const hasOptions = options.length > 0;

  return (
    <Field label={label}>
      <div style={{ display: 'grid', gridTemplateColumns: hasOptions ? '1fr 180px' : '1fr', gap: 8 }}>
        <input
          style={inp}
          type={type}
          list={listId}
          value={textValue}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        {hasOptions && (
          <select style={sel} value={textValue} onChange={(e) => onChange(e.target.value)}>
            <option value="">{selectLabel}</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label || opt.value}</option>
            ))}
          </select>
        )}
      </div>
      {hasOptions && (
        <datalist id={listId}>
          {matches.map((opt) => (
            <option key={`${opt.value}-${opt.label}`} value={opt.value} label={opt.label || opt.value} />
          ))}
        </datalist>
      )}
    </Field>
  );
}

const PREVIEW_LIMIT = 20;

const truncateArray = (arr) => ({
  count: arr.length,
  items: arr.slice(0, PREVIEW_LIMIT)
});

const buildPreview = (data) => {
  if (Array.isArray(data)) return { preview: truncateArray(data), truncated: data.length > PREVIEW_LIMIT };
  if (data && typeof data === 'object') {
    const preview = {};
    let truncated = false;
    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        preview[key] = truncateArray(value);
        if (value.length > PREVIEW_LIMIT) truncated = true;
      } else {
        preview[key] = value;
      }
    });
    return { preview, truncated };
  }
  return { preview: data, truncated: false };
};

function DataPanel({ title, data, emptyMessage }) {
  if (!data) return <div className="section-note">{emptyMessage || 'No data yet.'}</div>;
  const { preview, truncated } = buildPreview(data);
  return (
    <div>
      {title && <div className="result-title">{title}</div>}
      {truncated && <div className="section-note">Showing first {PREVIEW_LIMIT} items per list.</div>}
      <pre className="result-block">{JSON.stringify(preview, null, 2)}</pre>
    </div>
  );
}

function ShowMoreList({
  items,
  renderItem,
  getKey,
  emptyMessage = 'No items found.',
  initialCount = 20,
  step = 20,
  threshold = 50,
  className
}) {
  const shouldPaginate = items.length > threshold;
  const [visible, setVisible] = useState(shouldPaginate ? initialCount : items.length);

  useEffect(() => {
    setVisible(shouldPaginate ? initialCount : items.length);
  }, [items.length, shouldPaginate, initialCount]);

  if (!items.length) return <div className="section-note">{emptyMessage}</div>;

  const shown = items.slice(0, visible);

  return (
    <div>
      <div className={className}>
        {shown.map((item) => (
          <React.Fragment key={getKey(item)}>
            {renderItem(item)}
          </React.Fragment>
        ))}
      </div>
      {shouldPaginate && (
        <div className="show-more-row">
          <div className="section-note">Showing {shown.length} of {items.length}</div>
          {visible < items.length && (
            <button
              style={btn('secondary')}
              type="button"
              onClick={() => setVisible((current) => Math.min(current + step, items.length))}
            >
              Show more
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const formatDate = (value) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

function LookupResults({ label, data }) {
  if (!data) {
    return <div className="section-note">Lookup results appear here after a request.</div>;
  }

  const sections = Array.isArray(data.sections?.items) ? data.sections.items : Array.isArray(data.sections) ? data.sections : [];
  const courses = Array.isArray(data.courses) ? data.courses : [];
  const students = Array.isArray(data.students) ? data.students : [];
  const lecturers = Array.isArray(data.lecturers) ? data.lecturers : [];
  const forums = Array.isArray(data.forums) ? data.forums : [];
  const threads = Array.isArray(data.threads) ? data.threads : [];
  const events = Array.isArray(data.events) ? data.events : [];
  const replies = Array.isArray(data.replies) ? data.replies : [];
  const thread = data.thread || null;

  return (
    <div className="lookup-results">
      {label && <div className="result-title">{label}</div>}

      {courses.length > 0 && (
        <div className="result-block-card">
          <div className="result-header">Courses</div>
          <ShowMoreList
            items={courses}
            getKey={(course) => course.course_id}
            className="result-grid"
            emptyMessage="No courses found."
            renderItem={(course) => (
              <div className="result-card">
                <div className="result-card-title">{course.course_code || `Course ${course.course_id}`}</div>
                <div className="result-card-sub">{course.course_name || 'Untitled course'}</div>
                <div className="result-meta">ID {course.course_id}</div>
              </div>
            )}
          />
        </div>
      )}

      {(students.length > 0 || lecturers.length > 0) && (
        <div className="result-block-card">
          <div className="result-header">Members</div>
          <div className="result-columns">
            <div>
              <div className="result-subheader">Students</div>
              <ShowMoreList
                items={students}
                getKey={(student) => student.student_id}
                className="result-stack"
                emptyMessage="No students found."
                renderItem={(student) => (
                  <div className="result-row">
                    <div>
                      <div className="result-row-title">{student.first_name} {student.last_name}</div>
                      <div className="result-row-sub">{student.student_no || 'Student'} • {student.email || 'No email'}</div>
                    </div>
                    <div className="result-meta">ID {student.student_id}</div>
                  </div>
                )}
              />
            </div>
            <div>
              <div className="result-subheader">Lecturers</div>
              <ShowMoreList
                items={lecturers}
                getKey={(lecturer) => lecturer.lecturer_id}
                className="result-stack"
                emptyMessage="No lecturers found."
                renderItem={(lecturer) => (
                  <div className="result-row">
                    <div>
                      <div className="result-row-title">{lecturer.first_name} {lecturer.last_name}</div>
                      <div className="result-row-sub">{lecturer.email || 'No email'}</div>
                    </div>
                    <div className="result-meta">ID {lecturer.lecturer_id}</div>
                  </div>
                )}
              />
            </div>
          </div>
        </div>
      )}

      {sections.length > 0 && (
        <div className="result-block-card">
          <div className="result-header">Course Content</div>
          <ShowMoreList
            items={sections}
            getKey={(section) => section.section_id}
            className="result-stack"
            emptyMessage="No sections found."
            renderItem={(section) => (
              <div className="section-card">
                <div className="section-header">
                  <div>
                    <div className="result-card-title">{section.title || `Section ${section.position}`}</div>
                    <div className="result-card-sub">Position {section.position} • ID {section.section_id}</div>
                  </div>
                  <div className="result-meta">Course {section.course_id}</div>
                </div>
                <div className="section-items">
                  {(section.items || []).map((item) => (
                    <div key={item.section_item_id} className="item-row">
                      <div>
                        <div className="item-title">{item.title || `Item ${item.section_item_id}`}</div>
                        <div className="item-sub">
                          <span className="pill">{item.item_type}</span>
                          {item.max_score !== undefined && <span className="pill">Max {item.max_score}</span>}
                        </div>
                      </div>
                      <div className="item-meta">
                        ID {item.section_item_id} • {formatDate(item.updated_at || item.created_at)}
                      </div>
                      {item.url && <div className="item-link">{item.url}</div>}
                      {item.file_url && <div className="item-link">{item.file_url}</div>}
                      {item.description && <div className="item-desc">{item.description}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          />
        </div>
      )}

      {events.length > 0 && (
        <div className="result-block-card">
          <div className="result-header">Calendar Events</div>
          <ShowMoreList
            items={events}
            getKey={(event) => event.event_id}
            className="result-stack"
            emptyMessage="No events found."
            renderItem={(event) => (
              <div className="result-row">
                <div>
                  <div className="result-row-title">{event.title || 'Untitled event'}</div>
                  <div className="result-row-sub">{event.event_type || 'general'} • {formatDate(event.event_at)}</div>
                </div>
                <div className="result-meta">ID {event.event_id}</div>
              </div>
            )}
          />
        </div>
      )}

      {forums.length > 0 && (
        <div className="result-block-card">
          <div className="result-header">Forums</div>
          <ShowMoreList
            items={forums}
            getKey={(forum) => forum.forum_id}
            className="result-stack"
            emptyMessage="No forums found."
            renderItem={(forum) => (
              <div className="result-row">
                <div>
                  <div className="result-row-title">{forum.title || `Forum ${forum.forum_id}`}</div>
                  <div className="result-row-sub">Course {forum.course_id}</div>
                </div>
                <div className="result-meta">ID {forum.forum_id}</div>
              </div>
            )}
          />
        </div>
      )}

      {threads.length > 0 && (
        <div className="result-block-card">
          <div className="result-header">Threads</div>
          <ShowMoreList
            items={threads}
            getKey={(threadItem) => threadItem.thread_id}
            className="result-stack"
            emptyMessage="No threads found."
            renderItem={(threadItem) => (
              <div className="result-row">
                <div>
                  <div className="result-row-title">{threadItem.title || `Thread ${threadItem.thread_id}`}</div>
                  <div className="result-row-sub">{threadItem.body || 'No preview'} </div>
                </div>
                <div className="result-meta">ID {threadItem.thread_id}</div>
              </div>
            )}
          />
        </div>
      )}

      {thread && (
        <div className="result-block-card">
          <div className="result-header">Thread</div>
          <div className="result-row">
            <div>
              <div className="result-row-title">{thread.title || `Thread ${thread.thread_id}`}</div>
              <div className="result-row-sub">{thread.body || 'No body text'}</div>
            </div>
            <div className="result-meta">ID {thread.thread_id}</div>
          </div>
        </div>
      )}

      {replies.length > 0 && (
        <div className="result-block-card">
          <div className="result-header">Replies</div>
          <div className="reply-tree">
            <ReplyTree replies={replies} />
          </div>
        </div>
      )}

      {data.student_id && data.overall_average !== undefined && (
        <div className="result-block-card">
          <div className="result-header">Student Average</div>
          <div className="result-row">
            <div>
              <div className="result-row-title">Student {data.student_id}</div>
              <div className="result-row-sub">Overall average</div>
            </div>
            <div className="result-meta">{data.overall_average ?? 'N/A'}</div>
          </div>
        </div>
      )}

      {!sections.length && !courses.length && !students.length && !lecturers.length && !forums.length && !threads.length && !events.length && !replies.length && !thread && !(data.student_id && data.overall_average !== undefined) && (
        <DataPanel title="Raw response" data={data} emptyMessage="" />
      )}
    </div>
  );
}

function ReplyTree({ replies, level = 0 }) {
  return (
    <div className="reply-level">
      {replies.map((reply) => (
        <div key={reply.reply_id} className="reply" style={{ marginLeft: level * 16 }}>
          <div className="reply-body">{reply.body || 'No content'}</div>
          <div className="reply-meta">Reply ID {reply.reply_id}</div>
          {Array.isArray(reply.replies) && reply.replies.length > 0 && (
            <ReplyTree replies={reply.replies} level={level + 1} />
          )}
        </div>
      ))}
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
    <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--line)', paddingBottom: 0 }}>
      {tabs.map(t => (
        <button key={t} onClick={() => onSelect(t)} style={{
          padding: '9px 16px', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontWeight: 700, fontSize: 13,
          background: active === t ? 'var(--accent)' : 'transparent', color: active === t ? 'var(--accent-contrast)' : 'var(--muted)',
          marginBottom: -2, borderBottom: active === t ? '2px solid var(--accent-strong)' : '2px solid transparent',
        }}>{t}</button>
      ))}
    </div>
  );
}

// ─── Modal Error Dialog ─────────────────────────────────────────────────────────
function ModalError({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 16,
        padding: 24,
        maxWidth: 400,
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--danger)', marginBottom: 12 }}>Error</div>
        <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.5, marginBottom: 20 }}>{message}</div>
        <button
          onClick={onDismiss}
          style={{
            ...btn('primary'),
            width: '100%',
            padding: '10px 16px'
          }}
        >
          OK
        </button>
      </div>
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
  const [modalError, setModalError] = useState('');
  const [tab, setTab] = useState('');
  const [options, setOptions] = useState({
    courses: [],
    students: [],
    lecturers: [],
    forums: [],
    threads: [],
    sections: [],
    assignments: [],
    events: []
  });

  const isAdmin    = user?.role === 'admin';
  const isLecturer = user?.role === 'lecturer';
  const isStudent  = user?.role === 'student';

  const tabs = isAdmin ? TABS_ADMIN : isLecturer ? TABS_LECTURER : isStudent ? TABS_STUDENT : TABS_GUEST;
  useEffect(() => { if (tabs.length && !tab) setTab(tabs[0]); }, [user]);

  useEffect(() => {
    if (user) {
      get('/courses', null);
      get('/lecturers', null);
      get('/forums', null);
    }
  }, [user]);

  function flash(text, err = false) {
    if (err) {
      setModalError(text);
    } else {
      setMsg(text);
      setIsError(false);
    }
  }

  function creds(extra = {}) {
    return user ? { role: user.role, email: user.email, password: user.password, ...extra } : extra;
  }

  function mergeOptions(key, nextOptions) {
    const cleaned = dedupeOptions((nextOptions || []).filter(Boolean));
    if (!cleaned.length) return;
    setOptions((prev) => ({
      ...prev,
      [key]: dedupeOptions([...(prev[key] || []), ...cleaned])
    }));
  }

  function absorbData(data) {
    if (!data) return;
    if (data.courses) mergeOptions('courses', data.courses.map(toCourseOption));
    if (data.students) mergeOptions('students', data.students.map(toStudentOption));
    if (data.lecturers) mergeOptions('lecturers', data.lecturers.map(toLecturerOption));
    if (data.forums) mergeOptions('forums', data.forums.map(toForumOption));
    if (data.threads) mergeOptions('threads', data.threads.map(toThreadOption));
    if (data.thread) mergeOptions('threads', [toThreadOption(data.thread)]);
    if (data.events) mergeOptions('events', data.events.map(toEventOption));
    if (data.sections) {
      mergeOptions('sections', data.sections.map(toSectionOption));
      const assignmentItems = data.sections.flatMap((section) => section.items || [])
        .filter((item) => item.item_type === 'assignment');
      mergeOptions('assignments', assignmentItems.map(toAssignmentOption));
    }
  }

  async function api(path, opts = {}) {
    const method = (opts.method || 'GET').toUpperCase();
    const r = await fetch(`${API_BASE}${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...getBasicAuthHeaders(), ...(opts.headers || {}) }
    });
    const text = await r.text();
    let data = {};
    if (text) {
      try { data = JSON.parse(text); }
      catch { data = { error: 'Server returned a non-JSON response.' }; }
    }
    const fallbackError = data?.error || (text ? 'Server returned a non-JSON response.' : `Request failed (${r.status})`);
    if (!r.ok) throw new Error(fallbackError);
    if (method === 'GET') absorbData(data);
    return data;
  }

  async function post(path, body) {
    try { const d = await api(path, { method: 'POST', body: JSON.stringify(creds(body)) }); flash(d.success || 'Done.'); return d; }
    catch (e) { flash(e.message, true); }
  }

  async function get(path, label = 'Retrieved.') {
    try {
      const data = await api(path);
      if (label) flash(label);
      return data;
    } catch (e) {
      flash(e.message, true);
      return null;
    }
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
    setUser(null); setTab(''); flash('Logged out.');
  }

  return (
    <div className="app-shell" style={{ minHeight: '100vh' }}>
      <ModalError message={modalError} onDismiss={() => setModalError('')} />
      {/* Header */}
      <div style={{ background: 'var(--header-bg)', color: 'var(--header-ink)', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ background: 'var(--header-pill)', color: 'var(--header-pill-ink)', borderRadius: 10, padding: '4px 10px', fontSize: 12, fontWeight: 700, letterSpacing: '.08em' }}>COMP3161</span>
          <span style={{ fontWeight: 700, fontSize: 17, fontFamily: 'var(--font-display)' }}>Course Management System</span>
        </div>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ textAlign: 'right', lineHeight: 1.3 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{user.first_name} {user.last_name}</div>
              <div style={{ fontSize: 11, color: '#93aac8', textTransform: 'uppercase', letterSpacing: '.06em' }}>{user.role}</div>
            </div>
            <button onClick={logout} style={{ ...btn('ghost'), background: 'rgba(255,255,255,.12)', color: 'var(--header-ink)', border: '1px solid rgba(255,255,255,.25)' }}>Logout</button>
          </div>
        )}
      </div>

      <div className="app-container" style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
        <Alert msg={msg} isError={false} onClose={() => setMsg('')} />

        {!user ? (
          <AuthSection onLogin={doLogin} flash={flash} api={api} />
        ) : (
          <>
            <Tabs tabs={tabs} active={tab} onSelect={setTab} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
              <div>
                {/* Admin tabs */}
                {isAdmin && tab === 'Courses' && <AdminCourses post={post} get={get} flash={flash} options={options} />}
                {/* Shared Lookup */}
                {tab === 'Lookup' && <LookupSection get={get} options={options} flash={flash} />}
                {/* Reports */}
                {tab === 'Reports' && <ReportsSection get={get} />}
                {/* Lecturer tabs */}
                {isLecturer && tab === 'Calendar'  && <LecturerCalendar post={post} options={options} />}
                {isLecturer && tab === 'Forums'    && <ForumsSection post={post} get={get} flash={flash} options={options} isLecturer={isLecturer} />}
                {isLecturer && tab === 'Content'   && <LecturerContent post={post} get={get} flash={flash} options={options} />}
                {isLecturer && tab === 'Grades'    && <LecturerGrades post={post} get={get} flash={flash} options={options} />}
                {/* Student tabs */}
                {isStudent  && tab === 'My Courses' && <StudentCourses post={post} get={get} flash={flash} options={options} user={user} />}
                {isStudent  && tab === 'Forums'     && <ForumsSection post={post} get={get} flash={flash} options={options} isLecturer={false} />}
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
function AdminCourses({ post, get, flash, options }) {
  const [cf, , cb] = useForm({ course_code: '', course_name: '' });
  const [af, setAf, ab] = useForm({ course_id: '', lecturer_id: '' });
  const [result, setResult] = useState(null);
  const [resultLabel, setResultLabel] = useState('');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <Card title="Create Course">
        <form onSubmit={async e => {
          e.preventDefault();
          const data = await post('/courses', cf);
          if (data) { setResult(data); setResultLabel('Course created'); }
        }}>
          <Field label="Course Code"><input style={inp} {...cb('course_code')} placeholder="e.g. COMP3161" /></Field>
          <Field label="Course Name"><input style={inp} {...cb('course_name')} placeholder="e.g. Database Management" /></Field>
          <button style={btn()} type="submit">Create Course</button>
        </form>
      </Card>
      <Card title="Assign Lecturer to Course">
        <form onSubmit={async e => {
          e.preventDefault();
          const courseId = parsePositiveInt(af.course_id);
          const lecturerId = parsePositiveInt(af.lecturer_id);
          if (!courseId) return flash('Course ID required.', true);
          if (!lecturerId) return flash('Lecturer ID required.', true);
          const data = await post(`/courses/${courseId}/assign_lecturer`, { lecturer_id: Number(lecturerId) });
          if (data) { setResult(data); setResultLabel('Lecturer assigned'); }
        }}>
          <SuggestField
            label="Course ID"
            value={af.course_id}
            onChange={(value) => setAf(v => ({ ...v, course_id: value }))}
            options={options.courses}
            type="number"
            listId="course-id-admin-assign"
            selectLabel="Pick course"
          />
          <SuggestField
            label="Lecturer ID"
            value={af.lecturer_id}
            onChange={(value) => setAf(v => ({ ...v, lecturer_id: value }))}
            options={options.lecturers}
            type="number"
            listId="lecturer-id-admin-assign"
            selectLabel="Pick lecturer"
          />
          <button style={btn()} type="submit">Assign Lecturer</button>
        </form>
        <button
          style={btn('secondary')}
          onClick={() => {
            if (!af.course_id) return flash('Course ID required to load members.', true);
            get(`/courses/${af.course_id}/members`, 'Course members loaded for suggestions.')
              .then((data) => {
                if (data) { setResult(data); setResultLabel('Course members'); }
              });
          }}
        >
          Load Course Members
        </button>
      </Card>
      <Card title="All Courses" style={{ gridColumn: '1/-1' }}>
        <button style={btn('secondary')} onClick={async () => {
          const data = await get('/courses', 'All courses loaded for suggestions.');
          if (data) { setResult(data); setResultLabel('All courses'); }
        }}>Load All Courses</button>
      </Card>
      <Card title="Results" style={{ gridColumn: '1/-1' }}>
        <DataPanel title={resultLabel} data={result} emptyMessage="Results appear here after actions." />
      </Card>
    </div>
  );
}

// ─── Student ───────────────────────────────────────────────────────────────────
function StudentCourses({ post, get, flash, options, user }) {
  const [sf, setSf, sb] = useForm({ assignment_id: '', content_url: '' });
  const [cid, setCid] = useState('');
  const [sid, setSid] = useState('');
  const [date, setDate] = useState('');
  const [myCourses, setMyCourses] = useState([]);
  const [myCoursesLoaded, setMyCoursesLoaded] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarSearched, setCalendarSearched] = useState(false);
  const resolvedStudentId = sid || user?.student_id || '';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <Card title="Register for a Course">
        <SuggestField
          label="Course ID"
          value={cid}
          onChange={setCid}
          options={options.courses}
          type="number"
          listId="course-id-student-register"
          selectLabel="Pick course"
        />
        <button style={btn()} onClick={() => {
          if (!cid) return flash('Course ID required to register.', true);
          post(`/courses/${cid}/register`, {});
        }}>Register</button>
      </Card>
      <Card title="Submit Assignment">
        <form onSubmit={e => {
          e.preventDefault();
          if (!sf.assignment_id) return flash('Assignment ID required.', true);
          if (!sf.content_url) return flash('Content URL required.', true);
          post(`/assignments/${sf.assignment_id}/submit`, { content_url: sf.content_url });
        }}>
          <SuggestField
            label="Assignment ID"
            value={sf.assignment_id}
            onChange={(value) => setSf(v => ({ ...v, assignment_id: value }))}
            options={options.assignments}
            type="number"
            listId="assignment-id-student-submit"
            selectLabel="Pick assignment"
          />
          <Field label="Content URL"><input style={inp} {...sb('content_url')} placeholder="https://..." /></Field>
          <button style={btn()} type="submit">Submit</button>
        </form>
      </Card>
      <Card title="My Courses">
        <SuggestField
          label="Student ID (leave blank to use my ID)"
          value={sid}
          onChange={setSid}
          options={options.students}
          type="number"
          listId="student-id-student-courses"
          selectLabel="Pick student"
        />
        <button style={btn('secondary')} onClick={async () => {
          if (!resolvedStudentId) return flash('Student ID required.', true);
          const data = await get(`/courses/student/${resolvedStudentId}`, null);
          setMyCourses(Array.isArray(data?.courses) ? data.courses : []);
          setMyCoursesLoaded(true);
        }}>Load My Courses</button>
        {!sid && resolvedStudentId && (
          <div className="section-note">Using my student ID: {resolvedStudentId}</div>
        )}
        {myCourses.length > 0 ? (
          <div className="mini-list">
            {myCourses.map((course) => (
              <div key={course.course_id} className="mini-list-item">
                <div>
                  <div className="mini-title">{course.course_code || `Course ${course.course_id}`}</div>
                  <div className="mini-sub">{course.course_name || 'Untitled course'}</div>
                </div>
                <div className="mini-meta">ID {course.course_id}</div>
              </div>
            ))}
          </div>
        ) : myCoursesLoaded ? (
          <div className="section-note">No courses have been selected.</div>
        ) : (
          <div className="section-note">Courses appear here after loading.</div>
        )}
      </Card>
      <Card title="Calendar by Date">
        <SuggestField
          label="Student ID"
          value={sid}
          onChange={setSid}
          options={options.students}
          type="number"
          listId="student-id-calendar"
          selectLabel="Pick student"
        />
        <Field label="Date"><input style={inp} type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
        <button style={btn('secondary')} onClick={async () => {
          if (!resolvedStudentId) return flash('Student ID required.', true);
          if (!date) return flash('Date required.', true);
          setCalendarSearched(true);
          const data = await get(`/calendar/student/${resolvedStudentId}?date=${date}`, 'Calendar loaded.');
          setCalendarEvents(Array.isArray(data?.events) ? data.events : []);
        }}>Get Calendar</button>
        {calendarSearched && calendarEvents.length === 0 ? (
          <div className="section-note">No events found for this date.</div>
        ) : calendarEvents.length > 0 ? (
          <div className="mini-list">
            {calendarEvents.map((event) => (
              <div key={event.event_id} className="mini-list-item">
                <div>
                  <div className="mini-title">{event.title || 'Untitled event'}</div>
                  <div className="mini-sub">{event.event_type || 'general'} • {event.event_at || 'No date'}</div>
                </div>
                <div className="mini-meta">ID {event.event_id}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="section-note">Events appear here after loading.</div>
        )}
      </Card>
    </div>
  );
}

// ─── Lecturer: Calendar ────────────────────────────────────────────────────────
function LecturerCalendar({ post, options }) {
  const [ef, setEf, eb] = useForm({ course_id: '', title: '', event_type: 'general', event_at: '' });
  return (
    <Card title="Create Calendar Event">
      <form onSubmit={e => { e.preventDefault(); post(`/courses/${ef.course_id}/calendar`, { title: ef.title, event_type: ef.event_type, event_at: ef.event_at }); }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <SuggestField
            label="Course ID"
            value={ef.course_id}
            onChange={(value) => setEf(v => ({ ...v, course_id: value }))}
            options={options.courses}
            type="number"
            listId="course-id-lecturer-calendar"
            selectLabel="Pick course"
          />
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
function LecturerContent({ post, get, flash, options }) {
  const [sf, setSf, sb] = useForm({ course_id: '', title: '', position: 1 });
  const [it, setIt] = useForm({ section_id: '', item_type: 'link', title: '', url: '', file_url: '', description: '', max_score: 100 });
  const [contentResult, setContentResult] = useState(null);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <Card title="Add Section to Course">
        <form onSubmit={e => { e.preventDefault(); post(`/courses/${sf.course_id}/sections`, { title: sf.title, position: Number(sf.position) }); }}>
          <SuggestField
            label="Course ID"
            value={sf.course_id}
            onChange={(value) => setSf(v => ({ ...v, course_id: value }))}
            options={options.courses}
            type="number"
            listId="course-id-lecturer-section"
            selectLabel="Pick course"
          />
          <Field label="Title"><input style={inp} {...sb('title')} /></Field>
          <Field label="Position"><input style={inp} type="number" {...sb('position')} /></Field>
          <button style={btn()} type="submit">Add Section</button>
        </form>
        <button
          style={btn('secondary')}
          onClick={() => {
            if (!sf.course_id) return flash('Course ID required to load content.', true);
            get(`/courses/${sf.course_id}/content`, 'Course content loaded for suggestions.')
              .then((data) => {
                if (data) setContentResult(data);
              });
          }}
        >
          Load Course Content
        </button>
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
          <SuggestField
            label="Section ID"
            value={it.section_id}
            onChange={(value) => setIt(v => ({ ...v, section_id: value }))}
            options={options.sections}
            type="number"
            listId="section-id-lecturer-item"
            selectLabel="Pick section"
          />
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
      <Card title="Content Preview" style={{ gridColumn: '1/-1' }}>
        <DataPanel title="Course content" data={contentResult} emptyMessage="Load course content to preview sections and items." />
      </Card>
    </div>
  );
}

// ─── Lecturer: Grade ───────────────────────────────────────────────────────────
function LecturerGrades({ post, get, flash, options }) {
  const [gf, setGf, gb] = useForm({ assignment_id: '', student_id: '', grade: '' });
  return (
    <Card title="Grade Assignment Submission">
      <form onSubmit={e => { e.preventDefault(); post(`/assignments/${gf.assignment_id}/grade`, { student_id: Number(gf.student_id), grade: Number(gf.grade) }); }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <SuggestField
            label="Assignment ID"
            value={gf.assignment_id}
            onChange={(value) => setGf(v => ({ ...v, assignment_id: value }))}
            options={options.assignments}
            type="number"
            listId="assignment-id-lecturer-grade"
            selectLabel="Pick assignment"
          />
          <SuggestField
            label="Student ID"
            value={gf.student_id}
            onChange={(value) => setGf(v => ({ ...v, student_id: value }))}
            options={options.students}
            type="number"
            listId="student-id-lecturer-grade"
            selectLabel="Pick student"
          />
          <Field label="Grade"><input style={inp} type="number" step="0.01" {...gb('grade')} /></Field>
        </div>
        <button style={btn()} type="submit">Submit Grade</button>
      </form>
    </Card>
  );
}

// ─── Forums (shared) ───────────────────────────────────────────────────────────
function ForumsSection({ post, get, flash, options, isLecturer }) {
  const [ff, setFf, fb] = useForm({ course_id: '', title: '' });
  const [tf, setTf, tb] = useForm({ forum_id: '', title: '', body: '' });
  const [rf, setRf, rb] = useForm({ thread_id: '', parent_reply_id: '', body: '' });
  const [forumResult, setForumResult] = useState(null);
  const [forumLabel, setForumLabel] = useState('');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {isLecturer && (
        <Card title="Create Forum">
          <form onSubmit={async e => {
            e.preventDefault();
            const courseId = parsePositiveInt(ff.course_id);
            if (!courseId) return flash('Course ID required.', true);
            if (!ff.title) return flash('Forum title required.', true);
              const data = await post(`/courses/${courseId}/forums`, { title: ff.title });
              if (data) { setForumResult(data); setForumLabel('Forum created'); }
          }}>
            <SuggestField
              label="Course ID"
              value={ff.course_id}
              onChange={(value) => setFf(v => ({ ...v, course_id: value }))}
              options={options.courses}
              type="number"
              listId="course-id-forum-create"
              selectLabel="Pick course"
            />
            <Field label="Title"><input style={inp} {...fb('title')} /></Field>
            <button style={btn()} type="submit">Create Forum</button>
          </form>
          <button
            style={btn('secondary')}
            onClick={() => {
                const courseId = parsePositiveInt(ff.course_id);
                if (!courseId) return flash('Course ID required to load forums.', true);
                get(`/courses/${courseId}/forums`, 'Forums loaded for suggestions.')
                  .then((data) => { if (data) { setForumResult(data); setForumLabel('Forums'); } });
            }}
          >
            Load Forums
          </button>
        </Card>
      )}
      <Card title="Create Thread">
          <form onSubmit={e => {
            e.preventDefault();
            const forumId = parsePositiveInt(tf.forum_id);
            if (!forumId) return flash('Forum ID required.', true);
            if (!tf.title) return flash('Thread title required.', true);
            if (!tf.body) return flash('Thread body required.', true);
            post(`/forums/${forumId}/threads`, { title: tf.title, body: tf.body })
              .then((data) => { if (data) { setForumResult(data); setForumLabel('Thread created'); } });
          }}>
          <SuggestField
            label="Forum ID"
            value={tf.forum_id}
            onChange={(value) => setTf(v => ({ ...v, forum_id: value }))}
            options={options.forums}
            type="number"
            listId="forum-id-thread-create"
            selectLabel="Pick forum"
          />
          <Field label="Title"><input style={inp} {...tb('title')} /></Field>
          <Field label="Body"><textarea style={tex} {...tb('body')} /></Field>
          <button style={btn()} type="submit">Post Thread</button>
        </form>
        <button
          style={btn('secondary')}
          onClick={() => {
            const forumId = parsePositiveInt(tf.forum_id);
            if (!forumId) return flash('Forum ID required to load threads.', true);
            get(`/forums/${forumId}/threads`, 'Threads loaded for suggestions.')
              .then((data) => { if (data) { setForumResult(data); setForumLabel('Threads'); } });
          }}
        >
          Load Threads
        </button>
      </Card>
      <Card title="Reply to Thread">
        <form onSubmit={e => {
          e.preventDefault();
          const threadId = parsePositiveInt(rf.thread_id);
          if (!threadId) return flash('Thread ID required.', true);
          if (!rf.body) return flash('Reply body required.', true);
          const body = { body: rf.body };
          if (rf.parent_reply_id) {
            const parentId = parsePositiveInt(rf.parent_reply_id);
            if (!parentId) return flash('Parent reply ID must be a positive number.', true);
            body.parent_reply_id = parentId;
          }
          post(`/threads/${threadId}/replies`, body)
            .then((data) => { if (data) { setForumResult(data); setForumLabel('Reply posted'); } });
        }}>
          <SuggestField
            label="Thread ID"
            value={rf.thread_id}
            onChange={(value) => setRf(v => ({ ...v, thread_id: value }))}
            options={options.threads}
            type="number"
            listId="thread-id-reply"
            selectLabel="Pick thread"
          />
          <Field label="Parent Reply ID (optional)"><input style={inp} type="number" {...rb('parent_reply_id')} /></Field>
          <Field label="Reply"><textarea style={tex} {...rb('body')} /></Field>
          <button style={btn()} type="submit">Post Reply</button>
        </form>
      </Card>
      <Card title="Forum Results" style={{ gridColumn: '1/-1' }}>
        <DataPanel title={forumLabel} data={forumResult} emptyMessage="Forum data appears here after loading or posting." />
      </Card>
    </div>
  );
}

// ─── Lookup ────────────────────────────────────────────────────────────────────
function LookupSection({ get, options, flash }) {
  const [cid, setCid]   = useState('');
  const [sid, setSid]   = useState('');
  const [lid, setLid]   = useState('');
  const [fid, setFid]   = useState('');
  const [tid, setTid]   = useState('');
  const [date, setDate] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupLabel, setLookupLabel] = useState('');
  const [calendarSearched, setCalendarSearched] = useState(false);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <Card title="By Course ID">
        <SuggestField
          label="Course ID"
          value={cid}
          onChange={setCid}
          options={options.courses}
          type="number"
          listId="course-id-lookup"
          selectLabel="Pick course"
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          <button style={btn('secondary')} onClick={() => {
            const courseId = parsePositiveInt(cid);
            if (!courseId) return flash('Course ID required.', true);
            get(`/courses/${courseId}/members`, 'Members loaded.')
              .then((data) => { if (data) { setLookupResult(data); setLookupLabel('Members'); } });
          }}>Members</button>
          <button style={btn('secondary')} onClick={() => {
            const courseId = parsePositiveInt(cid);
            if (!courseId) return flash('Course ID required.', true);
            get(`/courses/${courseId}/calendar`, 'Calendar loaded.')
              .then((data) => { if (data) { setLookupResult(data); setLookupLabel('Calendar'); } });
          }}>Calendar</button>
          <button style={btn('secondary')} onClick={() => {
            const courseId = parsePositiveInt(cid);
            if (!courseId) return flash('Course ID required.', true);
            get(`/courses/${courseId}/forums`, 'Forums loaded.')
              .then((data) => { if (data) { setLookupResult(data); setLookupLabel('Forums'); } });
          }}>Forums</button>
          <button style={btn('secondary')} onClick={() => {
            const courseId = parsePositiveInt(cid);
            if (!courseId) return flash('Course ID required.', true);
            get(`/courses/${courseId}/content`, 'Content loaded.')
              .then((data) => { if (data) { setLookupResult(data); setLookupLabel('Content'); } });
          }}>Content</button>
        </div>
      </Card>
      <Card title="By Student / Lecturer ID">
        <SuggestField
          label="Student ID"
          value={sid}
          onChange={setSid}
          options={options.students}
          type="number"
          listId="student-id-lookup"
          selectLabel="Pick student"
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btn('secondary')} onClick={() => {
            const studentId = parsePositiveInt(sid);
            if (!studentId) return flash('Student ID required.', true);
            get(`/courses/student/${studentId}`, 'Student courses loaded.')
              .then((data) => { if (data) { setLookupResult(data); setLookupLabel('Student courses'); } });
          }}>Student Courses</button>
          <button style={btn('secondary')} onClick={() => {
            const studentId = parsePositiveInt(sid);
            if (!studentId) return flash('Student ID required.', true);
            get(`/students/${studentId}/average`, 'Average loaded.')
              .then((data) => { if (data) { setLookupResult(data); setLookupLabel('Student average'); } });
          }}>Average</button>
        </div>
        <div style={{ height: 1, background: '#e4e8f2', margin: '12px 0' }} />
        <SuggestField
          label="Lecturer ID"
          value={lid}
          onChange={setLid}
          options={options.lecturers}
          type="number"
          listId="lecturer-id-lookup"
          selectLabel="Pick lecturer"
        />
        <button style={btn('secondary')} onClick={() => {
          const lecturerId = parsePositiveInt(lid);
          if (!lecturerId) return flash('Lecturer ID required.', true);
          get(`/courses/lecturer/${lecturerId}`, 'Lecturer courses loaded.')
            .then((data) => { if (data) { setLookupResult(data); setLookupLabel('Lecturer courses'); } });
        }}>Lecturer Courses</button>
      </Card>
      <Card title="Calendar by Date">
        <SuggestField
          label="Student ID"
          value={sid}
          onChange={setSid}
          options={options.students}
          type="number"
          listId="student-id-lookup-calendar"
          selectLabel="Pick student"
        />
        <Field label="Date"><input style={inp} type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
        <button style={btn('secondary')} onClick={() => {
          const studentId = parsePositiveInt(sid);
          if (!studentId) return flash('Student ID required.', true);
          if (!date) return flash('Date required.', true);
          setCalendarSearched(true);
          get(`/calendar/student/${studentId}?date=${date}`, 'Calendar loaded.')
            .then((data) => {
              if (data) {
                setLookupResult(data);
                setLookupLabel('Calendar by date');
              }
            });
        }}>Get Events</button>
        {calendarSearched && lookupLabel === 'Calendar by date' && (!lookupResult?.events || lookupResult.events.length === 0) && (
          <div className="section-note">No events found for this date.</div>
        )}
      </Card>
      <Card title="Forum / Thread">
        <SuggestField
          label="Forum ID"
          value={fid}
          onChange={setFid}
          options={options.forums}
          type="number"
          listId="forum-id-lookup"
          selectLabel="Pick forum"
        />
        <button style={btn('secondary')} onClick={() => {
          const forumId = parsePositiveInt(fid);
          if (!forumId) return flash('Forum ID required.', true);
          get(`/forums/${forumId}/threads`, 'Threads loaded.')
            .then((data) => { if (data) { setLookupResult(data); setLookupLabel('Forum threads'); } });
        }}>Get Threads</button>
        <div style={{ height: 1, background: '#e4e8f2', margin: '12px 0' }} />
        <SuggestField
          label="Thread ID"
          value={tid}
          onChange={setTid}
          options={options.threads}
          type="number"
          listId="thread-id-lookup"
          selectLabel="Pick thread"
        />
        <button style={btn('secondary')} onClick={() => {
          const threadId = parsePositiveInt(tid);
          if (!threadId) return flash('Thread ID required.', true);
          get(`/threads/${threadId}/replies`, 'Replies loaded.')
            .then((data) => { if (data) { setLookupResult(data); setLookupLabel('Thread replies'); } });
        }}>Get Replies</button>
      </Card>
      <Card title="Lookup Results" style={{ gridColumn: '1/-1' }}>
        <LookupResults label={lookupLabel} data={lookupResult} />
      </Card>
    </div>
  );
}

// ─── Reports ───────────────────────────────────────────────────────────────────
function ReportsSection({ get }) {
  const [reportResults, setReportResults] = useState({});
  const [activeReport, setActiveReport] = useState('');
  const reports = [
    { label: 'Courses with 50+ Students', path: '/reports/courses_50_plus_students' },
    { label: 'Students with 5+ Courses',  path: '/reports/students_5_plus_courses' },
    { label: 'Lecturers with 3+ Courses', path: '/reports/lecturers_3_plus_courses' },
    { label: 'Top 10 Enrolled Courses',   path: '/reports/top_10_enrolled_courses' },
    { label: 'Top 10 Students by Average',path: '/reports/top_10_students_by_average' },
  ];

  const renderReportItem = (item) => {
    const idKey = Object.keys(item).find((k) => k.endsWith('_id') || k === 'id');
    const itemId = idKey ? item[idKey] : null;
    const title = item.course_code ? `${item.course_code} • ${item.course_name || 'Course'}`
      : item.student_no ? `${item.first_name || ''} ${item.last_name || ''}`.trim() || `Student ${item.student_id || item.student_no}`
      : item.lecturer_id ? `${item.first_name || ''} ${item.last_name || ''}`.trim() || `Lecturer ${item.lecturer_id}`
      : item.title || item.name || `Item ${itemId ?? ''}`;

    const details = [
      item.student_count !== undefined ? `${item.student_count} students` : null,
      item.course_count !== undefined ? `${item.course_count} courses` : null,
      item.overall_average !== undefined ? `Average ${Number(item.overall_average).toFixed(2)}` : null,
      item.email || null,
      item.course_name && item.course_code ? null : item.course_name || null,
    ].filter(Boolean).join(' • ');

    return (
      <div className="result-row">
        <div>
          <div className="result-row-title">{title}</div>
          {details && <div className="result-row-sub">{details}</div>}
        </div>
        {itemId != null && <div className="result-meta">ID {itemId}</div>}
      </div>
    );
  };

  const renderReportCard = (label, data) => {
    const arrayKey = Object.keys(data || {}).find((key) => Array.isArray(data[key]));
    const items = arrayKey ? data[arrayKey] : [];
    if (!items.length) return <DataPanel title={label} data={data} emptyMessage="No report rows found." />;

    const getItemKey = (item) => {
      const idKey = Object.keys(item).find((k) => k.endsWith('_id') || k === 'id');
      return idKey ? String(item[idKey]) : JSON.stringify(item);
    };

    return (
      <div className="result-block-card" style={{ marginTop: 16 }}>
        <div className="result-header">{label}</div>
        <ShowMoreList
          items={items}
          getKey={getItemKey}
          className="result-stack"
          emptyMessage="No items found."
          renderItem={renderReportItem}
        />
      </div>
    );
  };

  return (
    <Card title="Reports">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
        {reports.map(r => (
          <button key={r.path} style={{ ...btn('secondary'), textAlign: 'left', padding: '12px 14px' }}
            onClick={async () => {
              const data = await get(r.path, `${r.label} loaded.`);
              if (data) {
                setReportResults((prev) => ({ ...prev, [r.label]: data }));
                setActiveReport(r.label);
              }
            }}>
            {r.label}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        {Object.entries(reportResults).length === 0 ? (
          <div className="section-note">Run a report to view its results here.</div>
        ) : (
          Object.entries(reportResults).map(([label, data]) => (
            <div key={label}>
              {renderReportCard(label, data)}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

createRoot(document.getElementById('root')).render(<App />);

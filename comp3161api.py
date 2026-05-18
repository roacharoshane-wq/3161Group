import os
import bcrypt
import mysql.connector
from dotenv import load_dotenv
from flask import Flask, request, make_response
from flask_cors import CORS
from flask_httpauth import HTTPBasicAuth

load_dotenv()

app = Flask(__name__)
CORS(app)

auth = HTTPBasicAuth()

DB_USER     = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME     = os.getenv("DB_NAME")
DB_HOST     = os.getenv("DB_HOST", "127.0.0.1")

@auth.verify_password
def verify_password(username, password):
    return username == DB_USER and password == DB_PASSWORD

def get_db():
    if not DB_USER or not DB_PASSWORD or not DB_NAME:
        raise Exception("Database credentials missing from .env")

    return mysql.connector.connect(
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        database=DB_NAME,
        auth_plugin='mysql_native_password'
    )


def json_response(payload, status=200):
    return make_response(payload, status)


def get_json():
    data = request.get_json(silent=True)
    if not data:
        raise ValueError("Request body must be valid JSON.")
    return data


def hash_password(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def check_password(password, stored_hash):
    if not stored_hash:
        return False
    return bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8"))


def auth_user(cursor, role, email, password):
    if role not in ("student", "lecturer", "admin"):
        return None
    cursor.execute(f"SELECT * FROM {role} WHERE email = %s", (email,))
    user = cursor.fetchone()
    if user and check_password(password, user["password_hash"]):
        return user
    return None


def require_role(cursor, content, allowed_roles):
    role  = content.get("role", "").lower()
    email = content.get("email")
    password = content.get("password")

    if role not in allowed_roles:
        return None, role, json_response(
            {"error": f"Only {', '.join(allowed_roles)} can perform this action."}, 403
        )

    if not email or not password:
        return None, role, json_response({"error": "Email and password are required."}, 400)

    user = auth_user(cursor, role, email, password)
    if not user:
        return None, role, json_response({"error": "Invalid credentials."}, 401)

    return user, role, None



@app.route("/", methods=["GET"])
def home():
    return json_response({"status": "COMP3161 API running"}, 200)



@app.route("/register_user", methods=["POST"])
@auth.login_required
def register_user():
    try:
        content = get_json()
        role = content["role"].lower()

        if role not in ("student", "lecturer", "admin"):
            return json_response({"error": "Invalid role. Use admin, lecturer, or student."}, 400)

        email              = content["email"]
        password           = content["password"]
        first_name         = content["first_name"]
        last_name          = content["last_name"]
        created_by_admin_id = content.get("created_by_admin_id")

        password_hash = hash_password(password)

        cnx    = get_db()
        cursor = cnx.cursor(dictionary=True)

        if role == "student":
            student_no = content["student_no"]
            cursor.execute(
                """
                INSERT INTO student
                  (student_no, email, password_hash, first_name, last_name, created_by_admin_id)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (student_no, email, password_hash, first_name, last_name, created_by_admin_id),
            )
        elif role == "lecturer":
            cursor.execute(
                """
                INSERT INTO lecturer
                  (email, password_hash, first_name, last_name, created_by_admin_id)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (email, password_hash, first_name, last_name, created_by_admin_id),
            )
        else:  # admin
            cursor.execute(
                """
                INSERT INTO admin
                  (email, password_hash, first_name, last_name, created_by_admin_id)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (email, password_hash, first_name, last_name, created_by_admin_id),
            )

        cnx.commit()
        new_id = cursor.lastrowid
        cursor.close()
        cnx.close()

        return json_response({"success": "user account created", "role": role, "user_id": new_id}, 201)

    except Exception as e:
        print(e)
        return json_response({"error": str(e)}, 400)



@app.route("/login", methods=["POST"])
@auth.login_required
def login():
    try:
        content = get_json()

        role = content.get("role", "").lower()
        email = content.get("email")
        password = content.get("password")

        if role not in ("student", "lecturer", "admin"):
            return json_response({"error": "Invalid role."}, 400)

        if not email or not password:
            return json_response({"error": "Email and password are required."}, 400)

        cnx = get_db()
        cursor = cnx.cursor(dictionary=True)

        cursor.execute(
            f"SELECT * FROM {role} WHERE email = %s",
            (email,)
        )

        user = cursor.fetchone()

        cursor.close()
        cnx.close()

        if not user:
            return json_response({"error": "User not found."}, 401)

        if not check_password(password, user["password_hash"]):
            return json_response({"error": "Invalid password."}, 401)

        user.pop("password_hash", None)

        return json_response({
            "success": "login successful",
            "role": role,
            "user": user
        }, 200)

    except Exception as e:
        print(e)
        return json_response({"error": str(e)}, 400)


@app.route("/courses", methods=["POST"])
def create_course():
    try:
        content = get_json()

        cnx    = get_db()
        cursor = cnx.cursor(dictionary=True)

        admin, role, error = require_role(cursor, content, ("admin",))
        if error:
            cursor.close(); cnx.close()
            return error

        course_code = content["course_code"]
        course_name = content["course_name"]

        cursor.execute(
            "INSERT INTO course (course_code, course_name, created_by_admin_id) VALUES (%s, %s, %s)",
            (course_code, course_name, admin["admin_id"]),
        )
        cnx.commit()
        course_id = cursor.lastrowid

        cursor.close(); cnx.close()
        return json_response({"success": "course created", "course_id": course_id}, 201)

    except Exception as e:
        print(e)
        return json_response({"error": str(e)}, 400)


@app.route("/courses", methods=["GET"])
def get_all_courses():
    try:
        cnx    = get_db()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute("SELECT * FROM course ORDER BY course_code")
        courses = cursor.fetchall()
        cursor.close(); cnx.close()
        return json_response({"courses": courses}, 200)

    except Exception as e:
        print(e)
        return json_response({"error": str(e)}, 400)


@app.route("/courses/student/<int:student_id>", methods=["GET"])
def get_courses_for_student(student_id):
    try:
        cnx    = get_db()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT c.*
            FROM course c
            JOIN course_student cs ON c.course_id = cs.course_id
            WHERE cs.student_id = %s
            ORDER BY c.course_code
            """,
            (student_id,),
        )
        courses = cursor.fetchall()
        cursor.close(); cnx.close()
        return json_response({"courses": courses}, 200)

    except Exception as e:
        print(e)
        return json_response({"error": str(e)}, 400)


@app.route("/courses/lecturer/<int:lecturer_id>", methods=["GET"])
def get_courses_for_lecturer(lecturer_id):
    try:
        cnx    = get_db()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT c.*
            FROM course c
            JOIN course_lecturer cl ON c.course_id = cl.course_id
            WHERE cl.lecturer_id = %s
            ORDER BY c.course_code
            """,
            (lecturer_id,),
        )
        courses = cursor.fetchall()
        cursor.close(); cnx.close()
        return json_response({"courses": courses}, 200)

    except Exception as e:
        print(e)
        return json_response({"error": str(e)}, 400)



@app.route("/courses/<int:course_id>/assign_lecturer", methods=["POST"])
def assign_lecturer(course_id):
    try:
        content = get_json()

        cnx    = get_db()
        cursor = cnx.cursor(dictionary=True)

        admin, role, error = require_role(cursor, content, ("admin",))
        if error:
            cursor.close(); cnx.close()
            return error

        lecturer_id = content["lecturer_id"]

        cursor.execute("SELECT * FROM lecturer WHERE lecturer_id = %s", (lecturer_id,))
        if not cursor.fetchone():
            cursor.close(); cnx.close()
            return json_response({"error": "Lecturer not found."}, 404)

        cursor.execute("SELECT * FROM course_lecturer WHERE course_id = %s", (course_id,))
        if cursor.fetchone():
            cursor.close(); cnx.close()
            return json_response({"error": "A lecturer is already assigned to this course."}, 409)

        cursor.execute(
            "INSERT INTO course_lecturer (course_id, lecturer_id) VALUES (%s, %s)",
            (course_id, lecturer_id),
        )
        cnx.commit()
        cursor.close(); cnx.close()
        return json_response({"success": "Lecturer assigned to course."}, 201)

    except Exception as e:
        print(e)
        return json_response({"error": str(e)}, 400)


@app.route("/courses/<int:course_id>/register", methods=["POST"])
def register_for_course(course_id):
    try:
        content = get_json()

        cnx    = get_db()
        cursor = cnx.cursor(dictionary=True)

        student, role, error = require_role(cursor, content, ("student",))
        if error:
            cursor.close(); cnx.close()
            return error

        cursor.execute("SELECT * FROM course WHERE course_id = %s", (course_id,))
        if not cursor.fetchone():
            cursor.close(); cnx.close()
            return json_response({"error": "Course not found."}, 404)

        cursor.execute(
            "SELECT * FROM course_student WHERE course_id = %s AND student_id = %s",
            (course_id, student["student_id"]),
        )
        if cursor.fetchone():
            cursor.close(); cnx.close()
            return json_response({"error": "Already registered for this course."}, 409)

        cursor.execute(
            "INSERT INTO course_student (course_id, student_id) VALUES (%s, %s)",
            (course_id, student["student_id"]),
        )
        cnx.commit()
        cursor.close(); cnx.close()
        return json_response({"success": "Registered for course."}, 201)

    except Exception as e:
        print(e)
        return json_response({"error": str(e)}, 400)



@app.route("/courses/<int:course_id>/members", methods=["GET"])
def get_course_members(course_id):
    try:
        cnx    = get_db()
        cursor = cnx.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT s.student_id, s.student_no, s.first_name, s.last_name, s.email
            FROM student s
            JOIN course_student cs ON s.student_id = cs.student_id
            WHERE cs.course_id = %s
            ORDER BY s.last_name, s.first_name
            """,
            (course_id,),
        )
        students = cursor.fetchall()

        cursor.execute(
            """
            SELECT l.lecturer_id, l.first_name, l.last_name, l.email
            FROM lecturer l
            JOIN course_lecturer cl ON l.lecturer_id = cl.lecturer_id
            WHERE cl.course_id = %s
            """,
            (course_id,),
        )
        lecturers = cursor.fetchall()

        cursor.close(); cnx.close()
        return json_response({"students": students, "lecturers": lecturers}, 200)

    except Exception as e:
        print(e)
        return json_response({"error": str(e)}, 400)



@app.route("/courses/<int:course_id>/calendar", methods=["GET"])
def get_course_calendar(course_id):
    try:
        cnx    = get_db()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute(
            "SELECT * FROM calendar_event WHERE course_id = %s ORDER BY event_at",
            (course_id,),
        )
        events = cursor.fetchall()
        cursor.close(); cnx.close()
        return json_response({"events": events}, 200)

    except Exception as e:
        print(e)
        return json_response({"error": str(e)}, 400)


@app.route("/calendar/student/<int:student_id>", methods=["GET"])
def get_student_calendar_by_date(student_id):
    try:
        event_date = request.args.get("date")
        if not event_date:
            return json_response(
                {"error": "date query parameter required. Example: ?date=2026-05-20"}, 400
            )

        cnx    = get_db()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT ce.*
            FROM calendar_event ce
            JOIN course_student cs ON ce.course_id = cs.course_id
            WHERE cs.student_id = %s
              AND DATE(ce.event_at) = %s
            ORDER BY ce.event_at
            """,
            (student_id, event_date),
        )
        events = cursor.fetchall()
        cursor.close(); cnx.close()
        return json_response({"events": events}, 200)

    except Exception as e:
        print(e)
        return json_response({"error": str(e)}, 400)


@app.route("/courses/<int:course_id>/calendar", methods=["POST"])
def create_calendar_event(course_id):
    try:
        content = get_json()

        cnx    = get_db()
        cursor = cnx.cursor(dictionary=True)

        lecturer, role, error = require_role(cursor, content, ("lecturer",))
        if error:
            cursor.close(); cnx.close()
            return error

        cursor.execute(
            "SELECT * FROM course_lecturer WHERE course_id = %s AND lecturer_id = %s",
            (course_id, lecturer["lecturer_id"]),
        )
        if not cursor.fetchone():
            cursor.close(); cnx.close()
            return json_response(
                {"error": "Only the assigned lecturer can create events for this course."}, 403
            )

        cursor.execute(
            """
            INSERT INTO calendar_event
              (course_id, title, event_type, event_at, created_by_lecturer_id, assignment_item_id)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                course_id,
                content["title"],
                content.get("event_type", "general"),
                content["event_at"],
                lecturer["lecturer_id"],
                content.get("assignment_item_id"),
            ),
        )
        cnx.commit()
        event_id = cursor.lastrowid
        cursor.close(); cnx.close()
        return json_response({"success": "Calendar event created.", "event_id": event_id}, 201)

    except Exception as e:
        print(e)
        return json_response({"error": str(e)}, 400)



@app.route("/courses/<int:course_id>/forums", methods=["GET"])
def get_forums(course_id):
    try:
        cnx    = get_db()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute(
            "SELECT * FROM discussion_forum WHERE course_id = %s ORDER BY created_at",
            (course_id,),
        )
        forums = cursor.fetchall()
        cursor.close(); cnx.close()
        return json_response({"forums": forums}, 200)

    except Exception as e:
        print(e)
        return json_response({"error": str(e)}, 400)


@app.route("/courses/<int:course_id>/forums", methods=["POST"])
def create_forum(course_id):
    try:
        content = get_json()

        cnx    = get_db()
        cursor = cnx.cursor(dictionary=True)

        lecturer, role, error = require_role(cursor, content, ("lecturer",))
        if error:
            cursor.close(); cnx.close()
            return error

        cursor.execute(
            "INSERT INTO discussion_forum (course_id, title, created_by_lecturer_id) VALUES (%s, %s, %s)",
            (course_id, content["title"], lecturer["lecturer_id"]),
        )
        cnx.commit()
        forum_id = cursor.lastrowid
        cursor.close(); cnx.close()
        return json_response({"success": "Forum created.", "forum_id": forum_id}, 201)

    except Exception as e:
        print(e)
        return json_response({"error": str(e)}, 400)



@app.route("/forums/<int:forum_id>/threads", methods=["GET"])
def get_threads(forum_id):
    try:
        cnx    = get_db()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute(
            "SELECT * FROM discussion_thread WHERE forum_id = %s ORDER BY created_at",
            (forum_id,),
        )
        threads = cursor.fetchall()
        cursor.close(); cnx.close()
        return json_response({"threads": threads}, 200)

    except Exception as e:
        print(e)
        return json_response({"error": str(e)}, 400)


@app.route("/forums/<int:forum_id>/threads", methods=["POST"])
def create_thread(forum_id):
    try:
        content = get_json()

        cnx    = get_db()
        cursor = cnx.cursor(dictionary=True)

        user, role, error = require_role(cursor, content, ("student", "lecturer"))
        if error:
            cursor.close(); cnx.close()
            return error

        student_id  = user.get("student_id")  if role == "student"  else None
        lecturer_id = user.get("lecturer_id") if role == "lecturer" else None

        cursor.execute(
            """
            INSERT INTO discussion_thread
              (forum_id, title, body, created_by_student_id, created_by_lecturer_id)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (forum_id, content["title"], content["body"], student_id, lecturer_id),
        )
        cnx.commit()
        thread_id = cursor.lastrowid
        cursor.close(); cnx.close()
        return json_response({"success": "Thread created.", "thread_id": thread_id}, 201)

    except Exception as e:
        print(e)
        return json_response({"error": str(e)}, 400)



@app.route("/threads/<int:thread_id>/replies", methods=["GET"])
def get_replies(thread_id):
    try:
        cnx    = get_db()
        cursor = cnx.cursor(dictionary=True)

        cursor.execute("SELECT * FROM discussion_thread WHERE thread_id = %s", (thread_id,))
        thread = cursor.fetchone()
        if not thread:
            cursor.close(); cnx.close()
            return json_response({"error": "Thread not found."}, 404)

        def fetch_children(parent_reply_id):
            if parent_reply_id is None:
                cursor.execute(
                    """
                    SELECT * FROM discussion_reply
                    WHERE thread_id = %s AND parent_reply_id IS NULL
                    ORDER BY created_at
                    """,
                    (thread_id,),
                )
            else:
                cursor.execute(
                    """
                    SELECT * FROM discussion_reply
                    WHERE thread_id = %s AND parent_reply_id = %s
                    ORDER BY created_at
                    """,
                    (thread_id, parent_reply_id),
                )
            replies = cursor.fetchall()
            for reply in replies:
                reply["replies"] = fetch_children(reply["reply_id"])
            return replies

        replies = fetch_children(None)
        cursor.close(); cnx.close()
        return json_response({"thread": thread, "replies": replies}, 200)

    except Exception as e:
        print(e)
        return json_response({"error": str(e)}, 400)


@app.route("/threads/<int:thread_id>/replies", methods=["POST"])
def reply_to_thread(thread_id):
    try:
        content = get_json()

        cnx    = get_db()
        cursor = cnx.cursor(dictionary=True)

        user, role, error = require_role(cursor, content, ("student", "lecturer"))
        if error:
            cursor.close(); cnx.close()
            return error

        cursor.execute("SELECT * FROM discussion_thread WHERE thread_id = %s", (thread_id,))
        if not cursor.fetchone():
            cursor.close(); cnx.close()
            return json_response({"error": "Thread not found."}, 404)

        student_id  = user.get("student_id")  if role == "student"  else None
        lecturer_id = user.get("lecturer_id") if role == "lecturer" else None

        cursor.execute(
            """
            INSERT INTO discussion_reply
              (thread_id, parent_reply_id, body, created_by_student_id, created_by_lecturer_id)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (thread_id, content.get("parent_reply_id"), content["body"], student_id, lecturer_id),
        )
        cnx.commit()
        reply_id = cursor.lastrowid
        cursor.close(); cnx.close()
        return json_response({"success": "Reply posted.", "reply_id": reply_id}, 201)

    except Exception as e:
        print(e)
        return json_response({"error": str(e)}, 400)



@app.route("/courses/<int:course_id>/content", methods=["GET"])
def get_course_content(course_id):
    try:
        cnx    = get_db()
        cursor = cnx.cursor(dictionary=True)

        cursor.execute(
            "SELECT * FROM section WHERE course_id = %s ORDER BY position",
            (course_id,),
        )
        sections = cursor.fetchall()

        for section in sections:
            cursor.execute(
                "SELECT * FROM section_item WHERE section_id = %s ORDER BY created_at",
                (section["section_id"],),
            )
            items = cursor.fetchall()

            for item in items:
                if item["item_type"] == "link":
                    cursor.execute(
                        "SELECT url FROM section_link WHERE section_item_id = %s",
                        (item["section_item_id"],),
                    )
                    extra = cursor.fetchone()
                    item["url"] = extra["url"] if extra else None

                elif item["item_type"] == "lecture_slide":
                    cursor.execute(
                        "SELECT file_url FROM section_lecture_slide WHERE section_item_id = %s",
                        (item["section_item_id"],),
                    )
                    extra = cursor.fetchone()
                    item["file_url"] = extra["file_url"] if extra else None

                elif item["item_type"] == "assignment":
                    cursor.execute(
                        "SELECT description, max_score FROM assignment WHERE assignment_id = %s",
                        (item["section_item_id"],),
                    )
                    extra = cursor.fetchone()
                    if extra:
                        item.update(extra)

            section["items"] = items

        cursor.close(); cnx.close()
        return json_response({"sections": sections}, 200)

    except Exception as e:
        print(e)
        return json_response({"error": str(e)}, 400)


@app.route("/courses/<int:course_id>/sections", methods=["POST"])
def add_section(course_id):
    try:
        content = get_json()

        cnx    = get_db()
        cursor = cnx.cursor(dictionary=True)

        lecturer, role, error = require_role(cursor, content, ("lecturer",))
        if error:
            cursor.close(); cnx.close()
            return error

        cursor.execute(
            "SELECT * FROM course_lecturer WHERE lecturer_id = %s AND course_id = %s",
            (lecturer["lecturer_id"], course_id),
        )
        if not cursor.fetchone():
            cursor.close(); cnx.close()
            return json_response({"error": "You are not assigned to this course."}, 403)

        cursor.execute(
            "INSERT INTO section (course_id, title, position, created_by_lecturer_id) VALUES (%s, %s, %s, %s)",
            (course_id, content["title"], content["position"], lecturer["lecturer_id"]),
        )
        cnx.commit()
        section_id = cursor.lastrowid
        cursor.close(); cnx.close()
        return json_response({"success": "Section created.", "section_id": section_id}, 201)

    except Exception as e:
        print(e)
        return json_response({"error": str(e)}, 400)


@app.route("/sections/<int:section_id>/items", methods=["POST"])
def add_section_item(section_id):
    try:
        content = get_json()

        cnx    = get_db()
        cursor = cnx.cursor(dictionary=True)

        lecturer, role, error = require_role(cursor, content, ("lecturer",))
        if error:
            cursor.close(); cnx.close()
            return error

        item_type = content["item_type"]
        if item_type not in ("link", "lecture_slide", "assignment"):
            cursor.close(); cnx.close()
            return json_response(
                {"error": "item_type must be link, lecture_slide, or assignment."}, 400
            )

        cursor.execute(
            "INSERT INTO section_item (section_id, item_type, title, created_by_lecturer_id) VALUES (%s, %s, %s, %s)",
            (section_id, item_type, content["title"], lecturer["lecturer_id"]),
        )
        cnx.commit()
        item_id = cursor.lastrowid

        if item_type == "link":
            cursor.execute(
                "INSERT INTO section_link (section_item_id, url) VALUES (%s, %s)",
                (item_id, content["url"]),
            )
        elif item_type == "lecture_slide":
            cursor.execute(
                "INSERT INTO section_lecture_slide (section_item_id, file_url) VALUES (%s, %s)",
                (item_id, content["file_url"]),
            )
        elif item_type == "assignment":
            cursor.execute(
                "INSERT INTO assignment (assignment_id, description, max_score) VALUES (%s, %s, %s)",
                (item_id, content.get("description", ""), content.get("max_score", 100)),
            )

        cnx.commit()
        cursor.close(); cnx.close()
        return json_response({"success": "Item added.", "section_item_id": item_id}, 201)

    except Exception as e:
        print(e)
        return json_response({"error": str(e)}, 400)



@app.route("/assignments/<int:assignment_id>/submit", methods=["POST"])
def submit_assignment(assignment_id):
    try:
        content = get_json()

        cnx    = get_db()
        cursor = cnx.cursor(dictionary=True)

        student, role, error = require_role(cursor, content, ("student",))
        if error:
            cursor.close(); cnx.close()
            return error

        cursor.execute(
            """
            INSERT INTO submission (assignment_id, student_id, content_url)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE
              content_url  = VALUES(content_url),
              submitted_at = NOW()
            """,
            (assignment_id, student["student_id"], content["content_url"]),
        )
        cnx.commit()
        submission_id = cursor.lastrowid
        cursor.close(); cnx.close()
        return json_response({"success": "Assignment submitted.", "submission_id": submission_id}, 201)

    except Exception as e:
        print(e)
        return json_response({"error": str(e)}, 400)


@app.route("/assignments/<int:assignment_id>/grade", methods=["POST"])
def grade_assignment(assignment_id):
    try:
        content = get_json()

        cnx    = get_db()
        cursor = cnx.cursor(dictionary=True)

        lecturer, role, error = require_role(cursor, content, ("lecturer",))
        if error:
            cursor.close(); cnx.close()
            return error

        cursor.execute(
            "UPDATE submission SET grade = %s WHERE assignment_id = %s AND student_id = %s",
            (content["grade"], assignment_id, content["student_id"]),
        )

        if cursor.rowcount == 0:
            cursor.close(); cnx.close()
            return json_response({"error": "Submission not found."}, 404)

        cnx.commit()
        cursor.close(); cnx.close()
        return json_response({"success": "Grade submitted."}, 200)

    except Exception as e:
        print(e)
        return json_response({"error": str(e)}, 400)


@app.route("/students/<int:student_id>/average", methods=["GET"])
def get_student_average(student_id):
    try:
        cnx    = get_db()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute(
            "SELECT AVG(grade) AS overall_average FROM submission WHERE student_id = %s AND grade IS NOT NULL",
            (student_id,),
        )
        result = cursor.fetchone()
        cursor.close(); cnx.close()

        avg = result["overall_average"]
        return json_response(
            {"student_id": student_id, "overall_average": float(avg) if avg is not None else None},
            200,
        )

    except Exception as e:
        print(e)
        return json_response({"error": str(e)}, 400)



def run_report(query, key):
    try:
        cnx    = get_db()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute(query)
        rows = cursor.fetchall()
        cursor.close(); cnx.close()
        return json_response({key: rows}, 200)
    except Exception as e:
        print(e)
        return json_response({"error": str(e)}, 400)


@app.route("/reports/courses_50_plus_students", methods=["GET"])
def report_courses_50_plus():
    return run_report("SELECT * FROM v_courses_50_plus_students", "courses")


@app.route("/reports/students_5_plus_courses", methods=["GET"])
def report_students_5_plus():
    return run_report("SELECT * FROM v_students_5_plus_courses", "students")


@app.route("/reports/lecturers_3_plus_courses", methods=["GET"])
def report_lecturers_3_plus():
    return run_report("SELECT * FROM v_lecturers_3_plus_courses", "lecturers")


@app.route("/reports/top_10_enrolled_courses", methods=["GET"])
def report_top_10_courses():
    return run_report("SELECT * FROM v_top_10_enrolled_courses", "courses")


@app.route("/reports/top_10_students_by_average", methods=["GET"])
def report_top_10_students():
    return run_report("SELECT * FROM v_top_10_students_by_average", "students")



if __name__ == "__main__":
    app.run(debug=True)

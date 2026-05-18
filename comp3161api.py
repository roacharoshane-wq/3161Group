import bcrypt
from flask import Flask, request, make_response

from flask_httpauth import HTTPBasicAuth
from flask_cors import CORS
import mysql.connector
from dotenv import load_dotenv
import os

load_dotenv()
auth = HTTPBasicAuth()


app = Flask(__name__)

CORS(app)

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    return response

DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_NAME = os.getenv('DB_NAME')
DB_HOST = os.getenv('DB_HOST')



@auth.verify_password
def verify_password(username,password):
    if username == os.getenv('AD_USERNAME') and password==os.getenv('ADMIN_PASSWORD'):
        return username
    



def authenticate_user(cursor, role, email, password):
    """Return the user row if the email/password matches the bcrypt hash."""
    if role not in ('student', 'lecturer', 'admin'):
        return None

    cursor.execute(
        f"SELECT * FROM {role} WHERE email = %s",
        (email,)
    )
    user = cursor.fetchone()

    if user and bcrypt.checkpw(
        password.encode('utf-8'),
        user['password_hash'].encode('utf-8')
    ):
        return user

    return None






@app.route('/register_user', methods=['POST'])
def register_user():
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor()
        content = request.json

        role = content['role'].lower()
        email = content['email']
        password = content['password']
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        first_name = content['first_name']
        last_name = content['last_name']
        created_by_admin_id = content.get('created_by_admin_id')

        if role == 'admin':
            query = """
                INSERT INTO admin
                (email, password_hash, first_name, last_name, created_by_admin_id)
                VALUES (%s, %s, %s, %s, %s)
            """
            values = (email, password_hash, first_name, last_name, created_by_admin_id)

        elif role == 'lecturer':
            query = """
                INSERT INTO lecturer
                (email, password_hash, first_name, last_name, created_by_admin_id)
                VALUES (%s, %s, %s, %s, %s)
            """
            values = (email, password_hash, first_name, last_name, created_by_admin_id)

        elif role == 'student':
            student_no = content['student_no']
            query = """
                INSERT INTO student
                (student_no, email, password_hash, first_name, last_name, created_by_admin_id)
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            values = (student_no, email, password_hash, first_name, last_name, created_by_admin_id)

        else:
            return make_response({"error": "Invalid role. Use admin, lecturer, or student."}, 400)

        cursor.execute(query, values)
        cnx.commit()

        new_id = cursor.lastrowid

        cursor.close()
        cnx.close()

        return make_response({
            "success": "user account created",
            "role": role,
            "user_id": new_id
        }, 201)

    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)
    






@app.route('/login', methods=['POST'])
def login():
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )

        cursor = cnx.cursor(dictionary=True)

        content = request.json

        role = content['role'].lower()
        email = content['email']
        password = content['password']

        if role not in ('student', 'lecturer', 'admin'):
            return make_response(
                {"error": "Invalid role. Use admin, lecturer, or student."},
                400
            )

        cursor.execute(
            f"SELECT * FROM {role} WHERE email = %s",
            (email,)
        )

        user = cursor.fetchone()

        cursor.close()
        cnx.close()

        if user and bcrypt.checkpw(
            password.encode('utf-8'),
            user['password_hash'].encode('utf-8')
        ):

            return make_response({
                "success": "login successful",
                "role": role,
                "user": user
            }, 200)

        else:
            return make_response({
                "error": "Invalid email or password"
            }, 401)

    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)



@app.route('/courses', methods=['POST'])
def create_course():
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor(dictionary=True)
        content = request.json

        email = content['email']
        password = content['password']
        role = content['role'].lower()

        if role != 'admin':
            cursor.close()
            cnx.close()
            return make_response({"error": "Only admins can create courses."}, 403)

        admin = authenticate_user(cursor, role, email, password)

        if not admin:
            cursor.close()
            cnx.close()
            return make_response({"error": "Invalid admin credentials."}, 401)

        course_code = content['course_code']
        course_name = content['course_name']

        cursor.execute(
            """
            INSERT INTO course (course_code, course_name, created_by_admin_id)
            VALUES (%s, %s, %s)
            """,
            (course_code, course_name, admin['admin_id'])
        )
        cnx.commit()

        course_id = cursor.lastrowid

        cursor.close()
        cnx.close()

        return make_response({
            "success": "course created",
            "course_id": course_id
        }, 201)

    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)



@app.route('/courses', methods=['GET'])
def get_all_courses():
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor(dictionary=True)
 
        cursor.execute("SELECT * FROM course")
        courses = cursor.fetchall()
 
        cursor.close()
        cnx.close()
 
        return make_response({"courses": courses}, 200)
 
    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)
 






 
@app.route('/courses/student/<int:student_id>', methods=['GET'])
def get_courses_for_student(student_id):
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor(dictionary=True)
 
        cursor.execute(
            """
            SELECT c.* FROM course c
            JOIN course_student cs ON c.course_id = cs.course_id
            WHERE cs.student_id = %s
            """,
            (student_id,)
        )
        courses = cursor.fetchall()
 
        cursor.close()
        cnx.close()
 
        return make_response({"courses": courses}, 200)
 
    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)
 
 









@app.route('/courses/lecturer/<int:lecturer_id>', methods=['GET'])
def get_courses_for_lecturer(lecturer_id):
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor(dictionary=True)
 
        cursor.execute(
            """
            SELECT c.* FROM course c
            JOIN course_lecturer cl ON c.course_id = cl.course_id
            WHERE cl.lecturer_id = %s
            """,
            (lecturer_id,)
        )
        courses = cursor.fetchall()
 
        cursor.close()
        cnx.close()
 
        return make_response({"courses": courses}, 200)
 
    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)
 










@app.route('/courses/<int:course_id>/assign_lecturer', methods=['POST'])
def assign_lecturer(course_id):
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor(dictionary=True)
        content = request.json

        email = content['email']
        password = content['password']
        role = content['role'].lower()

        if role != 'admin':
            cursor.close()
            cnx.close()
            return make_response({"error": "Only admins can assign lecturers."}, 403)

        admin = authenticate_user(cursor, role, email, password)

        if not admin:
            cursor.close()
            cnx.close()
            return make_response({"error": "Invalid admin credentials."}, 401)

        lecturer_id = content['lecturer_id']

        cursor.execute(
            "SELECT * FROM course_lecturer WHERE course_id = %s",
            (course_id,)
        )
        if cursor.fetchone():
            cursor.close()
            cnx.close()
            return make_response({"error": "A lecturer is already assigned to this course."}, 409)

        cursor.execute(
            "SELECT COUNT(*) AS total FROM course_lecturer WHERE lecturer_id = %s",
            (lecturer_id,)
        )
        count = cursor.fetchone()['total']

        if count >= 5:
            cursor.close()
            cnx.close()
            return make_response({"error": "A lecturer cannot teach more than 5 courses."}, 409)

        cursor.execute(
            "INSERT INTO course_lecturer (course_id, lecturer_id) VALUES (%s, %s)",
            (course_id, lecturer_id)
        )
        cnx.commit()

        cursor.close()
        cnx.close()

        return make_response({"success": "Lecturer assigned to course."}, 201)

    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)




 



 
@app.route('/courses/<int:course_id>/register', methods=['POST'])
def register_for_course(course_id):
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor(dictionary=True)
        content = request.json

        email = content['email']
        password = content['password']
        role = content['role'].lower()

        if role != 'student':
            cursor.close()
            cnx.close()
            return make_response({"error": "Only students can register for courses."}, 403)

        student = authenticate_user(cursor, role, email, password)

        if not student:
            cursor.close()
            cnx.close()
            return make_response({"error": "Invalid student credentials."}, 401)

        cursor.execute(
            "SELECT COUNT(*) AS total FROM course_student WHERE student_id = %s",
            (student['student_id'],)
        )
        count = cursor.fetchone()['total']

        if count >= 6:
            cursor.close()
            cnx.close()
            return make_response({"error": "A student cannot register for more than 6 courses."}, 409)

        cursor.execute(
            "SELECT * FROM course_student WHERE course_id = %s AND student_id = %s",
            (course_id, student['student_id'])
        )
        if cursor.fetchone():
            cursor.close()
            cnx.close()
            return make_response({"error": "You are already registered for this course."}, 409)

        cursor.execute(
            "INSERT INTO course_student (course_id, student_id) VALUES (%s, %s)",
            (course_id, student['student_id'])
        )
        cnx.commit()

        cursor.close()
        cnx.close()

        return make_response({"success": "Registered for course."}, 201)

    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)




 
 







@app.route('/courses/<int:course_id>/members', methods=['GET'])
def get_course_members(course_id):
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor(dictionary=True)
 
        cursor.execute(
            """
            SELECT s.student_id, s.student_no, s.first_name, s.last_name, s.email
            FROM student s
            JOIN course_student cs ON s.student_id = cs.student_id
            WHERE cs.course_id = %s
            """,
            (course_id,)
        )
        students = cursor.fetchall()
 
        cursor.execute(
            """
            SELECT l.lecturer_id, l.first_name, l.last_name, l.email
            FROM lecturer l
            JOIN course_lecturer cl ON l.lecturer_id = cl.lecturer_id
            WHERE cl.course_id = %s
            """,
            (course_id,)
        )
        lecturers = cursor.fetchall()
 
        cursor.close()
        cnx.close()
 
        return make_response({
            "students": students,
            "lecturers": lecturers
        }, 200)
 
    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)
 
 




@app.route('/courses/<int:course_id>/calendar', methods=['GET'])
def get_course_calendar(course_id):
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor(dictionary=True)
 
        cursor.execute(
            "SELECT * FROM calendar_event WHERE course_id = %s ORDER BY event_at",
            (course_id,)
        )
        events = cursor.fetchall()
 
        cursor.close()
        cnx.close()
 
        return make_response({"events": events}, 200)
 
    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)
 
 












@app.route('/calendar/student/<int:student_id>', methods=['GET'])
def get_student_calendar_by_date(student_id):
    """
    Returns calendar events on a specific date for a student's enrolled courses.
    Query param: ?date=YYYY-MM-DD
    """
    try:
        event_date = request.args.get('date')
        if not event_date:
            return make_response({"error": "date query parameter required (YYYY-MM-DD)"}, 400)
 
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor(dictionary=True)
 
        cursor.execute(
            """
            SELECT ce.* FROM calendar_event ce
            JOIN course_student cs ON ce.course_id = cs.course_id
            WHERE cs.student_id = %s AND DATE(ce.event_at) = %s
            ORDER BY ce.event_at
            """,
            (student_id, event_date)
        )
        events = cursor.fetchall()
 
        cursor.close()
        cnx.close()
 
        return make_response({"events": events}, 200)
 
    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)
 
 



@app.route('/courses/<int:course_id>/calendar', methods=['POST'])
def create_calendar_event(course_id):
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor(dictionary=True)
        content = request.json
 
        email         = content['email']
        password = content['password']
        role          = content['role'].lower()
 
        if role != 'lecturer':
            cursor.close()
            cnx.close()
            return make_response({"error": "Only lecturers can create calendar events."}, 403)
 
        lecturer = authenticate_user(cursor, role, email, password)
 
        if not lecturer:
            cursor.close()
            cnx.close()
            return make_response({"error": "Invalid lecturer credentials."}, 401)
 
        title              = content['title']
        event_type         = content['event_type']        # 'assignment_due' or 'general'
        event_at           = content['event_at']          # 'YYYY-MM-DD HH:MM:SS'
        assignment_item_id = content.get('assignment_item_id')
 
        cursor.execute(
            """
            INSERT INTO calendar_event
            (course_id, title, event_type, event_at, created_by_lecturer_id, assignment_item_id)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (course_id, title, event_type, event_at, lecturer['lecturer_id'], assignment_item_id)
        )
        cnx.commit()
 
        event_id = cursor.lastrowid
 
        cursor.close()
        cnx.close()
 
        return make_response({
            "success": "Calendar event created.",
            "event_id": event_id
        }, 201)
 
    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)
 








@app.route('/courses/<int:course_id>/forums', methods=['GET'])
def get_forums(course_id):
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor(dictionary=True)
 
        cursor.execute(
            "SELECT * FROM discussion_forum WHERE course_id = %s",
            (course_id,)
        )
        forums = cursor.fetchall()
 
        cursor.close()
        cnx.close()
 
        return make_response({"forums": forums}, 200)
 
    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)
 
 






@app.route('/courses/<int:course_id>/forums', methods=['POST'])
def create_forum(course_id):
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor(dictionary=True)
        content = request.json
 
        email         = content['email']
        password = content['password']
        role          = content['role'].lower()
 
        if role != 'lecturer':
            cursor.close()
            cnx.close()
            return make_response({"error": "Only lecturers can create forums."}, 403)
 
        lecturer = authenticate_user(cursor, role, email, password)
 
        if not lecturer:
            cursor.close()
            cnx.close()
            return make_response({"error": "Invalid lecturer credentials."}, 401)
 
        title = content['title']
 
        cursor.execute(
            """
            INSERT INTO discussion_forum (course_id, title, created_by_lecturer_id)
            VALUES (%s, %s, %s)
            """,
            (course_id, title, lecturer['lecturer_id'])
        )
        cnx.commit()
 
        forum_id = cursor.lastrowid
 
        cursor.close()
        cnx.close()
 
        return make_response({
            "success": "Forum created.",
            "forum_id": forum_id
        }, 201)
 
    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)
 

@app.route('/forums/<int:forum_id>/threads', methods=['GET'])
def get_threads(forum_id):
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor(dictionary=True)
 
        cursor.execute(
            """
            SELECT * FROM discussion_thread
            WHERE forum_id = %s
            ORDER BY created_at
            """,
            (forum_id,)
        )
        threads = cursor.fetchall()
 
        cursor.close()
        cnx.close()
 
        return make_response({"threads": threads}, 200)
 
    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)
 
 


@app.route('/forums/<int:forum_id>/threads', methods=['POST'])
def create_thread(forum_id):
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor(dictionary=True)
        content = request.json
 
        email         = content['email']
        password = content['password']
        role          = content['role'].lower()
 
        if role not in ('student', 'lecturer'):
            cursor.close()
            cnx.close()
            return make_response({"error": "Only students or lecturers can post threads."}, 403)
 
        user = authenticate_user(cursor, role, email, password)
 
        if not user:
            cursor.close()
            cnx.close()
            return make_response({"error": "Invalid credentials."}, 401)
 
        title = content['title']
        body  = content['body']
 
        student_id  = user['student_id']  if role == 'student'  else None
        lecturer_id = user['lecturer_id'] if role == 'lecturer' else None
 
        cursor.execute(
            """
            INSERT INTO discussion_thread
            (forum_id, title, body, created_by_student_id, created_by_lecturer_id)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (forum_id, title, body, student_id, lecturer_id)
        )
        cnx.commit()
 
        thread_id = cursor.lastrowid
 
        cursor.close()
        cnx.close()
 
        return make_response({
            "success": "Thread created.",
            "thread_id": thread_id
        }, 201)
 
    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)
 
 






@app.route('/threads/<int:thread_id>/replies', methods=['GET'])
def get_replies(thread_id):
    """Recursively fetch all replies for a thread."""
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor(dictionary=True)
 
        cursor.execute(
            "SELECT * FROM discussion_thread WHERE thread_id = %s",
            (thread_id,)
        )
        thread = cursor.fetchone()
 
        if not thread:
            cursor.close()
            cnx.close()
            return make_response({"error": "Thread not found."}, 404)
 
        def fetch_replies(parent_id):
            cursor.execute(
                """
                SELECT * FROM discussion_reply
                WHERE thread_id = %s AND parent_reply_id = %s
                ORDER BY created_at
                """,
                (thread_id, parent_id)
            )
            children = cursor.fetchall()
            for child in children:
                child['replies'] = fetch_replies(child['reply_id'])
            return children
 
        # Top-level replies have parent_reply_id = NULL
        cursor.execute(
            """
            SELECT * FROM discussion_reply
            WHERE thread_id = %s AND parent_reply_id IS NULL
            ORDER BY created_at
            """,
            (thread_id,)
        )
        top_level = cursor.fetchall()
        for reply in top_level:
            reply['replies'] = fetch_replies(reply['reply_id'])
 
        cursor.close()
        cnx.close()
 
        return make_response({
            "thread": thread,
            "replies": top_level
        }, 200)
 
    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)
 
 






@app.route('/threads/<int:thread_id>/replies', methods=['POST'])
def reply_to_thread(thread_id):
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor(dictionary=True)
        content = request.json
 
        email         = content['email']
        password = content['password']
        role          = content['role'].lower()
 
        if role not in ('student', 'lecturer'):
            cursor.close()
            cnx.close()
            return make_response({"error": "Only students or lecturers can post replies."}, 403)
 
        user = authenticate_user(cursor, role, email, password)
 
        if not user:
            cursor.close()
            cnx.close()
            return make_response({"error": "Invalid credentials."}, 401)
 
        cursor.execute(
            "SELECT * FROM discussion_thread WHERE thread_id = %s",
            (thread_id,)
        )
        if not cursor.fetchone():
            cursor.close()
            cnx.close()
            return make_response({"error": "Thread not found."}, 404)
 
        body            = content['body']
        parent_reply_id = content.get('parent_reply_id')   # None = top-level reply
        student_id      = user['student_id']  if role == 'student'  else None
        lecturer_id     = user['lecturer_id'] if role == 'lecturer' else None
 
        cursor.execute(
            """
            INSERT INTO discussion_reply
            (thread_id, parent_reply_id, body, created_by_student_id, created_by_lecturer_id)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (thread_id, parent_reply_id, body, student_id, lecturer_id)
        )
        cnx.commit()
 
        reply_id = cursor.lastrowid
 
        cursor.close()
        cnx.close()
 
        return make_response({
            "success": "Reply posted.",
            "reply_id": reply_id
        }, 201)
 
    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)
 





@app.route('/courses/<int:course_id>/content', methods=['GET'])
def get_course_content(course_id):
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor(dictionary=True)
 
        cursor.execute(
            "SELECT * FROM section WHERE course_id = %s ORDER BY position",
            (course_id,)
        )
        sections = cursor.fetchall()
 
        for sec in sections:
            cursor.execute(
                "SELECT * FROM section_item WHERE section_id = %s ORDER BY created_at",
                (sec['section_id'],)
            )
            items = cursor.fetchall()
 
            for item in items:
                if item['item_type'] == 'link':
                    cursor.execute(
                        "SELECT url FROM section_link WHERE section_item_id = %s",
                        (item['section_item_id'],)
                    )
                    extra = cursor.fetchone()
                    item['url'] = extra['url'] if extra else None
 
                elif item['item_type'] == 'lecture_slide':
                    cursor.execute(
                        "SELECT file_url FROM section_lecture_slide WHERE section_item_id = %s",
                        (item['section_item_id'],)
                    )
                    extra = cursor.fetchone()
                    item['file_url'] = extra['file_url'] if extra else None
 
                elif item['item_type'] == 'assignment':
                    cursor.execute(
                        "SELECT description, max_score FROM assignment WHERE assignment_id = %s",
                        (item['section_item_id'],)
                    )
                    extra = cursor.fetchone()
                    if extra:
                        item['description'] = extra['description']
                        item['max_score']   = extra['max_score']
 
            sec['items'] = items
 
        cursor.close()
        cnx.close()
 
        return make_response({"sections": sections}, 200)
 
    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)
 
 














@app.route('/courses/<int:course_id>/sections', methods=['POST'])
def add_section(course_id):
    """Lecturer creates a new section for a course."""
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor(dictionary=True)
        content = request.json
 
        email         = content['email']
        password = content['password']
        role          = content['role'].lower()
 
        if role != 'lecturer':
            cursor.close()
            cnx.close()
            return make_response({"error": "Only lecturers can add sections."}, 403)
 
        lecturer = authenticate_user(cursor, role, email, password)
 
        if not lecturer:
            cursor.close()
            cnx.close()
            return make_response({"error": "Invalid lecturer credentials."}, 401)
 
        cursor.execute(
            "SELECT * FROM course_lecturer WHERE lecturer_id = %s AND course_id = %s",
            (lecturer['lecturer_id'], course_id)
        )
        if not cursor.fetchone():
            cursor.close()
            cnx.close()
            return make_response({"error": "You are not assigned to this course."}, 403)
 
        title    = content['title']
        position = content['position']
 
        cursor.execute(
            """
            INSERT INTO section (course_id, title, position, created_by_lecturer_id)
            VALUES (%s, %s, %s, %s)
            """,
            (course_id, title, position, lecturer['lecturer_id'])
        )
        cnx.commit()
 
        section_id = cursor.lastrowid
 
        cursor.close()
        cnx.close()
 
        return make_response({
            "success": "Section created.",
            "section_id": section_id
        }, 201)
 
    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)
 
 




@app.route('/sections/<int:section_id>/items', methods=['POST'])
def add_section_item(section_id):
    """
    Lecturer adds a link, lecture_slide, or assignment to a section.
    Body must include item_type and the matching fields:
      - link:          url
      - lecture_slide: file_url
      - assignment:    description, max_score
    """
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor(dictionary=True)
        content = request.json
 
        email         = content['email']
        password = content['password']
        role          = content['role'].lower()
 
        if role != 'lecturer':
            cursor.close()
            cnx.close()
            return make_response({"error": "Only lecturers can add content."}, 403)
 
        lecturer = authenticate_user(cursor, role, email, password)
 
        if not lecturer:
            cursor.close()
            cnx.close()
            return make_response({"error": "Invalid lecturer credentials."}, 401)
 
        item_type = content['item_type']   # link | lecture_slide | assignment
        title     = content['title']
 
        if item_type not in ('link', 'lecture_slide', 'assignment'):
            cursor.close()
            cnx.close()
            return make_response({"error": "item_type must be link, lecture_slide, or assignment."}, 400)
 
        cursor.execute(
            """
            INSERT INTO section_item (section_id, item_type, title, created_by_lecturer_id)
            VALUES (%s, %s, %s, %s)
            """,
            (section_id, item_type, title, lecturer['lecturer_id'])
        )
        cnx.commit()
        item_id = cursor.lastrowid
 
        if item_type == 'link':
            cursor.execute(
                "INSERT INTO section_link (section_item_id, url) VALUES (%s, %s)",
                (item_id, content['url'])
            )
 
        elif item_type == 'lecture_slide':
            cursor.execute(
                "INSERT INTO section_lecture_slide (section_item_id, file_url) VALUES (%s, %s)",
                (item_id, content['file_url'])
            )
 
        elif item_type == 'assignment':
            cursor.execute(
                """
                INSERT INTO assignment (assignment_id, description, max_score)
                VALUES (%s, %s, %s)
                """,
                (item_id, content.get('description', ''), content.get('max_score', 100))
            )
 
        cnx.commit()
 
        cursor.close()
        cnx.close()
 
        return make_response({
            "success": "Item added.",
            "section_item_id": item_id
        }, 201)
 
    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)
 












@app.route('/assignments/<int:assignment_id>/submit', methods=['POST'])
def submit_assignment(assignment_id):
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor(dictionary=True)
        content = request.json
 
        email         = content['email']
        password = content['password']
        role          = content['role'].lower()
 
        if role != 'student':
            cursor.close()
            cnx.close()
            return make_response({"error": "Only students can submit assignments."}, 403)
 
        student = authenticate_user(cursor, role, email, password)
 
        if not student:
            cursor.close()
            cnx.close()
            return make_response({"error": "Invalid student credentials."}, 401)
 
        content_url = content['content_url']
 
        cursor.execute(
            """
            INSERT INTO submission (assignment_id, student_id, content_url)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE
                content_url  = %s,
                submitted_at = NOW()
            """,
            (assignment_id, student['student_id'], content_url, content_url)
        )
        cnx.commit()
 
        submission_id = cursor.lastrowid
 
        cursor.close()
        cnx.close()
 
        return make_response({
            "success": "Assignment submitted.",
            "submission_id": submission_id
        }, 201)
 
    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)
 










 
@app.route('/assignments/<int:assignment_id>/grade', methods=['POST'])
def grade_assignment(assignment_id):
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor(dictionary=True)
        content = request.json
 
        email         = content['email']
        password = content['password']
        role          = content['role'].lower()
 
        if role != 'lecturer':
            cursor.close()
            cnx.close()
            return make_response({"error": "Only lecturers can submit grades."}, 403)
 
        lecturer = authenticate_user(cursor, role, email, password)
        if not lecturer:
            cursor.close()
            cnx.close()
            return make_response({"error": "Invalid lecturer credentials."}, 401)
 
        student_id = content['student_id']
        grade      = content['grade']
 
        cursor.execute(
            """
            UPDATE submission SET grade = %s
            WHERE assignment_id = %s AND student_id = %s
            """,
            (grade, assignment_id, student_id)
        )
 
        if cursor.rowcount == 0:
            cursor.close()
            cnx.close()
            return make_response({"error": "Submission not found."}, 404)
 
        cnx.commit()
 
        cursor.close()
        cnx.close()
 
        return make_response({"success": "Grade submitted."}, 200)
 
    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)
 
 
@app.route('/students/<int:student_id>/average', methods=['GET'])
def get_student_average(student_id):
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor(dictionary=True)
 
        cursor.execute(
            """
            SELECT AVG(grade) AS overall_average
            FROM submission
            WHERE student_id = %s AND grade IS NOT NULL
            """,
            (student_id,)
        )
        result = cursor.fetchone()
 
        cursor.close()
        cnx.close()
 
        return make_response({
            "student_id": student_id,
            "overall_average": float(result['overall_average'] or 0)
        }, 200)
 
    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)
 




@app.route('/reports/courses_50_plus_students', methods=['GET'])
def report_courses_50_plus():
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor(dictionary=True)
 
        cursor.execute("SELECT * FROM v_courses_50_plus_students")
        rows = cursor.fetchall()
 
        cursor.close()
        cnx.close()
 
        return make_response({"courses": rows}, 200)
 
    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)
 
 



@app.route('/reports/students_5_plus_courses', methods=['GET'])
def report_students_5_plus():
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor(dictionary=True)
 
        cursor.execute("SELECT * FROM v_students_5_plus_courses")
        rows = cursor.fetchall()
 
        cursor.close()
        cnx.close()
 
        return make_response({"students": rows}, 200)
 
    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)
 
 



@app.route('/reports/lecturers_3_plus_courses', methods=['GET'])
def report_lecturers_3_plus():
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor(dictionary=True)
 
        cursor.execute("SELECT * FROM v_lecturers_3_plus_courses")
        rows = cursor.fetchall()
 
        cursor.close()
        cnx.close()
 
        return make_response({"lecturers": rows}, 200)
 
    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)
 



 
@app.route('/reports/top_10_enrolled_courses', methods=['GET'])
def report_top_10_courses():
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor(dictionary=True)
 
        cursor.execute("SELECT * FROM v_top_10_enrolled_courses")
        rows = cursor.fetchall()
 
        cursor.close()
        cnx.close()
 
        return make_response({"courses": rows}, 200)
 
    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)
 
 



@app.route('/reports/top_10_students_by_average', methods=['GET'])
def report_top_10_students():
    try:
        cnx = mysql.connector.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        cursor = cnx.cursor(dictionary=True)
 
        cursor.execute("SELECT * FROM v_top_10_students_by_average")
        rows = cursor.fetchall()
 
        cursor.close()
        cnx.close()
 
        return make_response({"students": rows}, 200)
 
    except Exception as e:
        print(e)
        return make_response({"error": str(e)}, 400)
if __name__ == '__main__':
    app.run(debug=True)
